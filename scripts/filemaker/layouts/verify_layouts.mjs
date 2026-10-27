/**
 * Every Sync_ layout read once as WorkspaceSync over the Data API: are all its fields there? Prints the server
 * certificate's fingerprint (pin it as FM_CERT_SHA256), counts and field names only.
 *
 *   node scripts/filemaker/layouts/verify_layouts.mjs      (password from the Keychain item casa-workspacesync)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import https from 'node:https';
const L = JSON.parse(readFileSync(new URL('../sync-layouts.json', import.meta.url), 'utf8'));
const base = 'https://10.0.60.10/fmi/data/vLatest/databases/SchoolMan';
const agent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
const req = (method, url, headers = {}, body) => new Promise((ok, no) => {
  const r = https.request(url, { method, headers, agent }, (res) => { const cert = res.socket?.getPeerCertificate?.()?.fingerprint256; const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => ok({ status: res.statusCode, json: JSON.parse(Buffer.concat(c).toString() || 'null'), cert })); });
  r.on('error', no); if (body) r.write(body); r.end();
});
const pw = execFileSync('security', ['find-generic-password', '-s', 'casa-workspacesync', '-w'], { encoding: 'utf8' }).trim();
const s = await req('POST', `${base}/sessions`, { Authorization: 'Basic ' + Buffer.from(`WorkspaceSync:${pw}`).toString('base64'), 'Content-Type': 'application/json' }, '{}');
console.log('sign in', s.status, s.json?.messages?.[0]?.code, '| certificate', s.cert);
const token = s.json.response.token;
let good = 0, total = 0;
for (const { layout, fields } of Object.values(L)) {
  const r = await req('GET', `${base}/layouts/${layout}/records?_limit=1`, { Authorization: `Bearer ${token}` });
  const code = r.json?.messages?.[0]?.code;
  const keys = Object.keys(r.json?.response?.data?.[0]?.fieldData ?? {});
  const missing = fields.filter((f) => !keys.includes(f));
  const n = r.json?.response?.dataInfo?.totalRecordCount ?? 0;
  total += n;
  if (code === '0' && !missing.length && keys.length === fields.length) good++;
  else console.log(`  ${layout}: FileMaker ${code}, ${keys.length}/${fields.length} fields${missing.length ? ', missing ' + missing.join(' ') : ''}`);
}
await req('DELETE', `${base}/sessions/${token}`);
console.log(`${good} of ${Object.keys(L).length} layouts complete, ${total} records in all`);
