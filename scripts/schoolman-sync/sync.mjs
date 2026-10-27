#!/usr/bin/env node
/**
 * The SchoolMan sync service (2026-10-27): reads SchoolMan over the Data API as WorkspaceSync and sends
 * the records to the workspace's copy (migration 0090, /api/schoolman/sync). Read-only by code: it signs
 * in, GETs and _finds on the 68 `Sync_<Table>` layouts (scripts/filemaker/sync-layouts.json) and signs
 * out — no PATCH, no POST to a record, no script call, whatever the account may do.
 *
 *   node scripts/schoolman-sync/sync.mjs --full      every record of every table, then what SchoolMan no longer has goes
 *   node scripts/schoolman-sync/sync.mjs             runs on: what changed every minute, every table at 02:15
 *   node scripts/schoolman-sync/sync.mjs --once      one round of changes, then stops
 *   node scripts/schoolman-sync/sync.mjs --table Booking --full
 *
 * Secrets never touch a command line, a file in the repository or the log: the account's password and the
 * signing key come from the environment (FM_PASSWORD, SCHOOLMAN_SYNC_KEY) or, on a Mac, from the Keychain
 * (items `casa-workspacesync` and `casa-schoolman-sync-key`). The log holds counts only, never a value.
 * docs/FILEMAKER_BRIDGE.md §9 has the design.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sign } from './signature.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAYOUTS = JSON.parse(readFileSync(join(HERE, '../filemaker/sync-layouts.json'), 'utf8'));
const FM = process.env.FM_HOST ?? 'https://10.0.60.10';
const DATABASE = process.env.FM_DATABASE ?? 'SchoolMan';
const ACCOUNT = process.env.FM_ACCOUNT ?? 'WorkspaceSync';
const TARGET = process.env.SCHOOLMAN_SYNC_URL ?? 'https://neu.casa-bremen.de/api/schoolman/sync';
// The server's certificate names Werner's old Mini, not 10.0.60.10: it is pinned by its fingerprint instead.
const PIN = (process.env.FM_CERT_SHA256 ?? '').toUpperCase();
const STATE = process.env.SCHOOLMAN_SYNC_STATE ?? join(homedir(), '.casa-schoolman-sync', 'state.json');
const PAGE = 1000;
const BATCH = 500;
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const only = args.includes('--table') ? args[args.indexOf('--table') + 1] : null;

const secret = (env, item) => {
  if (process.env[env]) return process.env[env];
  try {
    return execFileSync('security', ['find-generic-password', '-s', item, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error(`${env} not set and no Keychain item ${item}`);
  }
};
const log = (...parts) => console.log(new Date().toISOString().slice(11, 19), ...parts);

// ------------------------------------------------------------------ the Data API, read-only

const agent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false,
  checkServerIdentity: (_host, cert) => {
    const seen = cert.fingerprint256.replaceAll(':', '');
    if (!PIN) return undefined; // no pin given: the first run prints the fingerprint to pin
    return seen === PIN.replaceAll(':', '') ? undefined : new Error(`certificate ${seen} is not the pinned one`);
  },
});

function request(method, url, { headers = {}, body, tls = url.startsWith(FM) } = {}) {
  return new Promise((resolve, reject) => {
    const req = (url.startsWith('http:') ? http : https).request(url, { method, headers, agent: tls ? agent : undefined, timeout: 120_000 }, (res) => {
      // Read now: with keep-alive the socket is handed back before 'end'.
      const cert = tls ? res.socket?.getPeerCertificate?.()?.fingerprint256 : null;
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          // left null: the caller reports the status
        }
        resolve({ status: res.statusCode, json, cert });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`${method} ${url.replace(/\?.*/, '')} timed out`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const base = `${FM}/fmi/data/vLatest/databases/${encodeURIComponent(DATABASE)}`;
let token = null;

async function signIn() {
  const basic = Buffer.from(`${ACCOUNT}:${secret('FM_PASSWORD', 'casa-workspacesync')}`).toString('base64');
  const r = await request('POST', `${base}/sessions`, { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' }, body: '{}' });
  if (!PIN && r.cert) log(`FileMaker Server certificate: ${r.cert} — set FM_CERT_SHA256 to pin it`);
  token = r.json?.response?.token ?? null;
  if (!token) throw new Error(`sign-in refused: HTTP ${r.status}, FileMaker ${r.json?.messages?.[0]?.code}`);
}

async function signOut() {
  if (token) await request('DELETE', `${base}/sessions/${token}`).catch(() => {});
  token = null;
}

/** A GET or _find on a layout; signs in again once when the session has lapsed (FileMaker 952). */
async function dataApi(method, path, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!token) await signIn();
    const r = await request(method, `${base}${path}`, {
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const code = r.json?.messages?.[0]?.code;
    if (code === '952') {
      token = null;
      continue;
    }
    if (code === '401') return { data: [], found: 0 }; // „no records match"
    if (r.status !== 200 || code !== '0') throw new Error(`${method} ${path.replace(/\?.*/, '')}: HTTP ${r.status}, FileMaker ${code}`);
    return { data: r.json.response.data, found: r.json.response.dataInfo?.foundCount ?? r.json.response.dataInfo?.totalRecordCount ?? 0 };
  }
  throw new Error('session lapsed twice');
}

/** Every record of a layout, or those a find returns, page by page. */
async function* records(layout, query) {
  for (let offset = 1; ; offset += PAGE) {
    const page = query
      ? await dataApi('POST', `/layouts/${encodeURIComponent(layout)}/_find`, { query, offset: String(offset), limit: String(PAGE) })
      : await dataApi('GET', `/layouts/${encodeURIComponent(layout)}/records?_offset=${offset}&_limit=${PAGE}`);
    for (const r of page.data) yield { recordId: String(r.recordId), modId: String(r.modId), fieldData: r.fieldData };
    if (page.data.length < PAGE) return;
  }
}

// ------------------------------------------------------------------ the workspace's copy

async function send(table, batch, complete) {
  const body = JSON.stringify({ table, records: batch, ...(complete ? { complete: { recordIds: complete } } : {}) });
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await request('POST', TARGET, {
      headers: { 'Content-Type': 'application/json', 'x-schoolman-signature': sign(secret('SCHOOLMAN_SYNC_KEY', 'casa-schoolman-sync-key'), body) },
      body,
      tls: false,
    }).catch((error) => ({ status: 0, json: { error: { message: error.message } } }));
    if (r.status === 200) return r.json.data;
    if (r.status && r.status < 500) throw new Error(`workspace refused ${table}: HTTP ${r.status} ${r.json?.error?.code ?? ''}`);
    await new Promise((done) => setTimeout(done, 5000 * (attempt + 1)));
  }
  throw new Error(`workspace unreachable for ${table}`);
}

// What was sent last time, per table and record: its modId. Only records whose modId moved are sent.
let state = { tables: {} };
try {
  state = JSON.parse(readFileSync(STATE, 'utf8'));
} catch {
  // first run
}
const saveState = () => {
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(state), { mode: 0o600 });
};

/** One table: a complete read (`query` null) or the records a find returns; sends what changed. */
async function syncTable(table, query) {
  const { layout } = LAYOUTS[table];
  const seen = state.tables[table];
  const ids = new Set();
  let batch = [];
  let read = 0;
  let sent = 0;
  let changed = 0;
  let newest = seen.last;
  const change = LAYOUTS[table].change;
  for await (const r of records(layout, query)) {
    read++;
    ids.add(r.recordId);
    if (change && r.fieldData[change] && (!newest || stamp(r.fieldData[change]) > stamp(newest))) newest = r.fieldData[change];
    if (seen.mods[r.recordId] === r.modId) continue;
    batch.push(r);
    if (batch.length === BATCH) {
      changed += (await send(table, batch)).changed;
      for (const b of batch) seen.mods[b.recordId] = b.modId;
      sent += batch.length;
      batch = [];
    }
  }
  const done = await send(table, batch, query ? null : [...ids]);
  changed += done.changed;
  for (const b of batch) seen.mods[b.recordId] = b.modId;
  sent += batch.length;
  if (!query) for (const id of Object.keys(seen.mods)) if (!ids.has(id)) delete seen.mods[id];
  seen.last = newest;
  if (!query) seen.complete = new Date().toISOString();
  saveState();
  return { read, sent, changed, removed: done.removed ?? 0 };
}

// FileMaker's own formats: MM/DD/YYYY and MM/DD/YYYY HH:MM:SS. Compared as YYYYMMDDHHMMSS.
const stamp = (v) => {
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}):(\d{2}))?/);
  return m ? `${m[3]}${m[1].padStart(2, '0')}${m[2].padStart(2, '0')}${(m[4] ?? '0').padStart(2, '0')}${m[5] ?? '00'}${m[6] ?? '00'}` : '';
};
const fmDate = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
const fmStamp = (d) => `${fmDate(d)} ${[d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')}`;
const fromFm = (v) => {
  const s = stamp(v);
  return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14));
};

/**
 * What changed since the last round: a table with a change time from two minutes before the newest it
 * has seen; one with a change date, everything changed since that day; one without, all of it (they are small).
 */
function changedSince(table) {
  const { change, changeKind } = LAYOUTS[table];
  const last = state.tables[table]?.last;
  if (!change || !last || changeKind === 'none') return null;
  if (changeKind === 'timestamp') return [{ [change]: `>=${fmStamp(new Date(fromFm(last).getTime() - 120_000))}` }];
  return [{ [change]: `>=${fmDate(fromFm(last))}` }];
}

async function round(full) {
  const tables = (only ? [only] : Object.keys(LAYOUTS)).filter((t) => LAYOUTS[t]);
  const totals = { read: 0, sent: 0, changed: 0, removed: 0 };
  const started = Date.now();
  for (const table of tables) {
    // A table with a change date only is asked every five minutes, one without any read whole every half hour.
    // A layout given more fields is sent again whole: its records' modIds did not move, their data did.
    const shape = createHash('sha256').update(LAYOUTS[table].fields.join()).digest('hex').slice(0, 12);
    if (state.tables[table]?.shape !== shape) state.tables[table] = { mods: {}, last: null, shape };
    const query = full ? null : changedSince(table);
    const kind = LAYOUTS[table].changeKind;
    const waited = (key, minutes) => Date.now() - Date.parse(state.tables[table]?.[key] ?? 0) < minutes * 60_000;
    if (!full && !query && waited('complete', 30)) continue;
    if (!full && query && kind === 'date' && waited('asked', 5)) continue;
    if (state.tables[table]) state.tables[table].asked = new Date().toISOString();
    try {
      const r = await syncTable(table, query);
      for (const k of Object.keys(totals)) totals[k] += r[k];
      if (r.sent || r.removed) log(`${table}: ${r.read} read, ${r.sent} sent, ${r.changed} changed, ${r.removed} removed`);
    } catch (error) {
      log(`${table}: ${error.message}`);
    }
  }
  log(`${full ? 'complete' : 'changes'}: ${totals.read} read, ${totals.sent} sent, ${totals.changed} changed, ${totals.removed} removed in ${Math.round((Date.now() - started) / 1000)} s`);
}

const fingerprint = createHash('sha256').update(JSON.stringify(LAYOUTS)).digest('hex').slice(0, 8);
log(`SchoolMan sync, ${Object.keys(LAYOUTS).length} tables (layouts ${fingerprint}) → ${new URL(TARGET).host}`);
process.on('SIGINT', () => signOut().then(() => process.exit(0)));
process.on('SIGTERM', () => signOut().then(() => process.exit(0)));

try {
  if (flag('--full') || flag('--once')) {
    await round(flag('--full'));
  } else {
    let lastNight = null;
    for (;;) {
      const now = new Date();
      const night = now.getHours() === 2 && now.getMinutes() >= 15 && lastNight !== now.toDateString();
      await round(night || !Object.keys(state.tables).length);
      if (night) lastNight = now.toDateString();
      await new Promise((done) => setTimeout(done, 60_000));
    }
  }
} finally {
  await signOut();
}
