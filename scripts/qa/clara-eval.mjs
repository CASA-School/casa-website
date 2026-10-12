/**
 * Asks a running server the golden questions (src/lib/knowledge/__tests__/
 * golden-questions.json) through the public APIs, the way a visitor would:
 * the header search and CLARA. Measures what the unit test cannot — the index
 * with every rendered page in it, as production serves it.
 *
 *   npm run build && npx next start -p 3018      # then wait for "[knowledge] pages read" in its log
 *   npm run qa:clara [-- --base http://127.0.0.1:3018]
 *
 * Scores print to the terminal; every miss goes to output/golden/live-*.txt.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const BASE = baseIndex >= 0 ? args[baseIndex + 1] : 'http://127.0.0.1:3018';

const golden = JSON.parse(readFileSync(path.join(root, 'src/lib/knowledge/__tests__/golden-questions.json'), 'utf8'));
const pathOf = (href) => href.split(/[?#]/)[0];

let first = 0;
let topThree = 0;
const searchMisses = [];
for (const entry of golden) {
  const url = `${BASE}/api/search/suggest?q=${encodeURIComponent(entry.query)}&scope=all&limit=5&locale=${entry.locale}`;
  const { data } = await (await fetch(url)).json();
  const ranked = [...(data.answer ? [pathOf(data.answer.href)] : []), ...data.top.map((item) => pathOf(item.href))];
  if (entry.expect.includes(ranked[0])) first += 1;
  if (ranked.slice(0, 3).some((item) => entry.expect.includes(item))) topThree += 1;
  else searchMisses.push(`${entry.id}: "${entry.query}" → ${ranked.slice(0, 3).join(', ') || '(nothing)'} (want ${entry.expect.join(' | ')})`);
}

const questions = golden.filter((entry) => entry.kind === 'question');
let pointed = 0;
let factual = 0;
let withFacts = 0;
let latency = 0;
const claraMisses = [];
for (const entry of questions) {
  // The API allows 60 questions a minute from one address: wait when it says so.
  let response;
  let elapsed = 0;
  for (;;) {
    const started = Date.now();
    response = await fetch(`${BASE}/api/assistant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: entry.query }], locale: entry.locale }),
    });
    elapsed = Date.now() - started;
    if (response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  latency += elapsed;
  const { data } = await response.json();
  const paths = [data.cta.href, ...(data.quickLinks ?? []).map((link) => link.href), ...(data.basedOn ?? []), ...(data.cards ?? []).map((card) => card.href)].map(pathOf);
  const hit = paths.some((item) => entry.expect.includes(item));
  if (hit) pointed += 1;
  else claraMisses.push(`${entry.id}: "${entry.query}" → ${[...new Set(paths)].slice(0, 4).join(', ')} (want ${entry.expect.join(' | ')})`);
  const facts = entry.topic === 'next_start' ? [] : entry.facts;
  if (facts.length > 0) {
    withFacts += 1;
    const text = data.message.replace(/ /g, ' ');
    const missing = facts.filter((fact) => !text.toLowerCase().includes(fact.toLowerCase()));
    if (missing.length === 0) factual += 1;
    else claraMisses.push(`${entry.id}: lacks ${missing.join(', ')} — ${text.slice(0, 200)}`);
  }
}

const pct = (value, total) => `${Math.round((value / total) * 100)}%`;
console.log(`search: right page first ${pct(first, golden.length)}, in the top three ${pct(topThree, golden.length)}`);
console.log(`CLARA: points to the right page ${pct(pointed, questions.length)}, states the facts ${pct(factual, withFacts)}, ${Math.round(latency / questions.length)} ms a question`);
mkdirSync(path.join(root, 'output/golden'), { recursive: true });
writeFileSync(path.join(root, 'output/golden/live-search.txt'), `${searchMisses.join('\n')}\n`);
writeFileSync(path.join(root, 'output/golden/live-clara.txt'), `${claraMisses.join('\n')}\n`);
