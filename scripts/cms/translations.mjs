/**
 * The prepared languages' translations (docs/TRANSLATIONS.md).
 *
 *   npm run cms:translations                 how complete each language is
 *   npm run cms:translations -- todo         write what is missing as work batches
 *   npm run cms:translations -- check        check finished batches, store nothing (--batch 3,4)
 *   npm run cms:translations -- merge        check finished batches and store them
 *
 * Options: `--locale tr,ar` limits a command to some languages; `--size 120`
 * sets the texts per batch.
 *
 * The source is the website editor's catalog, the same 2,000-odd texts staff can
 * edit, read from the TypeScript through jiti. A translation is stored against
 * the slot key, which is made from the German and English defaults, so a text
 * whose German changes in the code is missing again until the next run. One
 * whose key changed but whose German did not (only the English moved) keeps its
 * translation without a run.
 *
 * Batches live in output/translations/<locale>/ (gitignored): todo-NN.json is
 * what to translate, done-NN.json is { key: translation } for merge. Merge
 * refuses a text that lost or invented a {placeholder}, that is empty, or that
 * is not in the language's script; it stores the rest and drops translations
 * whose text left the site.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createJiti } from 'jiti';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const jiti = createJiti(import.meta.url, { alias: { '@': path.join(root, 'src') } });

const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) ?? 'status';
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const { PREPARED_LOCALES } = await jiti.import(path.join(root, 'src/config/cms/translation-locales.ts'));
const { catalog } = await jiti.import(path.join(root, 'src/lib/cms/catalog.ts'));
const { placeholders } = await jiti.import(path.join(root, 'src/lib/cms/copy-key.ts'));

const only = option('locale')?.split(',').map((code) => code.trim());
const LOCALES = PREPARED_LOCALES.filter((code) => !only || only.includes(code));
const SIZE = Number(option('size') ?? 120);

/** What the language must be written in: a text with letters and none of these is refused. */
const SCRIPT = {
  ar: /[؀-ۿ]/,
  ru: /[Ѐ-ӿ]/,
  uk: /[Ѐ-ӿ]/,
};

const fileOf = (code) => path.join(root, 'src/config/cms/translations', `${code}.json`);
const workDir = (code) => path.join(root, 'output/translations', code);
const read = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

const slots = [...catalog().values()];
const byKey = new Map(slots.map((slot) => [slot.key, slot]));

function problem(code, slot, text) {
  if (typeof text !== 'string' || !text.trim()) return 'empty';
  const want = placeholders(slot.defaults.de).join(',');
  const got = placeholders(text).join(',');
  if (want !== got) return `placeholders ${got || '(none)'} instead of ${want || '(none)'}`;
  const words = text.replace(/\{[^}]*\}/g, '');
  // A name or a code may stay as written (telc Deutsch B2, CASA, A1–C1); anything else is in the language's script.
  if (SCRIPT[code] && /\p{L}{2,}/u.test(words) && !SCRIPT[code].test(words) && text !== slot.defaults.de && text !== slot.defaults.en) {
    return 'not in the language’s script';
  }
  return null;
}

/** The stored file with translations that left the site removed, and moved keys carried over. */
function reconcile(code) {
  const stored = read(fileOf(code), {});
  const byGerman = new Map(Object.values(stored).map((entry) => [entry.de, entry.text]));
  const next = {};
  let carried = 0;
  for (const slot of slots) {
    const entry = stored[slot.key];
    if (entry?.text && entry.de === slot.defaults.de) next[slot.key] = entry;
    else if (byGerman.has(slot.defaults.de)) {
      next[slot.key] = { de: slot.defaults.de, text: byGerman.get(slot.defaults.de) };
      carried += 1;
    }
  }
  const dropped = Object.keys(stored).filter((key) => !next[key]).length;
  return { next, carried, dropped };
}

function status() {
  console.log(`${slots.length} texts on the site.\n`);
  for (const code of LOCALES) {
    const { next, carried, dropped } = reconcile(code);
    const done = Object.keys(next).length;
    const long = slots.filter((slot) => next[slot.key] && next[slot.key].text.length > slot.max).length;
    console.log(
      `  ${code}  ${String(done).padStart(5)} / ${slots.length}  missing ${slots.length - done}` +
        (carried ? `  · ${carried} carried over` : '') +
        (dropped ? `  · ${dropped} no longer on the site` : '') +
        (long ? `  · ${long} over their length` : '')
    );
  }
}

function todo() {
  for (const code of LOCALES) {
    const { next } = reconcile(code);
    const missing = slots
      .filter((slot) => !next[slot.key])
      .map((slot) => ({
        key: slot.key,
        de: slot.defaults.de,
        en: slot.defaults.en,
        kind: slot.kind,
        max: slot.max,
        where: slot.section === slot.scope ? slot.section : `${slot.section} · ${slot.scope}`,
      }));
    const dir = workDir(code);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (let index = 0; index * SIZE < missing.length; index += 1) {
      const batch = missing.slice(index * SIZE, (index + 1) * SIZE);
      writeFileSync(path.join(dir, `todo-${String(index + 1).padStart(2, '0')}.json`), `${JSON.stringify(batch, null, 2)}\n`);
    }
    console.log(`  ${code}  ${missing.length} to translate in ${Math.ceil(missing.length / SIZE)} batches → output/translations/${code}/`);
  }
}

/** Checks finished batches without storing anything: what merge would refuse, and texts over their length. */
function check() {
  let refused = 0;
  for (const code of LOCALES) {
    const dir = workDir(code);
    const done = existsSync(dir) ? readdirSync(dir).filter((name) => /^done-\d+\.json$/.test(name)).sort() : [];
    const wanted = (option('batch') ?? '').split(',').filter(Boolean).map((n) => `done-${n.padStart(2, '0')}.json`);
    let count = 0;
    for (const name of done.filter((candidate) => !wanted.length || wanted.includes(candidate))) {
      const todoName = name.replace('done-', 'todo-');
      const todoKeys = read(path.join(dir, todoName), []).map((item) => item.key);
      let batch;
      try {
        batch = read(path.join(dir, name), {});
      } catch (error) {
        console.log(`  ${code} ${name}: not valid JSON (${error.message})`);
        refused += 1;
        continue;
      }
      for (const key of todoKeys) {
        if (key in batch) continue;
        console.log(`  ${code} ${name}: missing ${key}`);
        refused += 1;
      }
      for (const [key, text] of Object.entries(batch)) {
        const slot = byKey.get(key);
        const issue = slot ? problem(code, slot, text) : 'unknown key';
        if (issue) {
          console.log(`  ${code} ${name}: ${key}: ${issue}`);
          refused += 1;
        } else if (text.length > slot.max) console.log(`  ${code} ${name}: ${key}: ${text.length} characters, limit ${slot.max}`);
        count += 1;
      }
    }
    console.log(`  ${code}  ${count} checked`);
  }
  if (refused) process.exitCode = 1;
}

function merge() {
  let refused = 0;
  for (const code of LOCALES) {
    const { next } = reconcile(code);
    const dir = workDir(code);
    const done = existsSync(dir) ? readdirSync(dir).filter((name) => /^done-\d+\.json$/.test(name)).sort() : [];
    let added = 0;
    for (const name of done) {
      const batch = read(path.join(dir, name), {});
      for (const [key, text] of Object.entries(batch)) {
        const slot = byKey.get(key);
        if (!slot) {
          console.log(`  ${code} ${name}: unknown key ${key}`);
          refused += 1;
          continue;
        }
        const issue = problem(code, slot, text);
        if (issue) {
          console.log(`  ${code} ${name}: ${key}: ${issue}`);
          refused += 1;
          continue;
        }
        next[key] = { de: slot.defaults.de, text: text.trim() };
        added += 1;
      }
    }
    writeFileSync(fileOf(code), `${JSON.stringify(sorted(next), null, 2)}\n`);
    console.log(`  ${code}  ${added} stored from ${done.length} batches · ${Object.keys(next).length} / ${slots.length}`);
  }
  if (refused) {
    console.log(`\n${refused} refused; fix them in their done file and merge again.`);
    process.exitCode = 1;
  }
}

const run = { status, todo, check, merge }[command];
if (run) run();
else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 2;
}
