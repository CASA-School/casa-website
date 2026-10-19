/**
 * The office Mac's half of the SchoolMan bridge (2026-10-19; docs/FILEMAKER_BRIDGE.md §8): runs every
 * reader against SchoolMan, open in FileMaker Pro (read-only, as always), seals their output under the
 * run's key (`bridge-bundle.mjs`) and uploads it for the import job. Nothing readable is written to
 * disk; the output stays in memory until it is sealed. Prints counts and sizes only.
 *
 *   BRIDGE_KEY=<64 hex> BRIDGE_UPLOAD_URL=<blob SAS, create+write> node scripts/filemaker/bridge-pack.mjs
 *   BRIDGE_KEY=<64 hex> node scripts/filemaker/bridge-pack.mjs --file <sealed.bin>      (to test locally)
 *   … --only courses,course-learners                                                     (some steps)
 *
 * Run through `infra/azure/bridge.sh`, which makes the key and the upload address.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { seal } from './bridge-bundle.mjs';
import { BRIDGE_STEPS } from './bridge-steps.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : undefined;
};
const only = arg('--only')?.split(',').map((s) => s.trim()).filter(Boolean);
const file = arg('--file');
const key = process.env.BRIDGE_KEY;
const uploadUrl = process.env.BRIDGE_UPLOAD_URL;

if (!file && !uploadUrl) {
  console.error('Set BRIDGE_UPLOAD_URL, or pass --file to keep the sealed bundle here.');
  process.exit(2);
}
const unknown = (only ?? []).filter((name) => !BRIDGE_STEPS.some((s) => s.name === name));
if (unknown.length) {
  console.error(`Unknown step: ${unknown.join(', ')}`);
  process.exit(2);
}

/** A reader's stdout, kept in memory; its stderr (counts) passes through. */
function read(reader) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-I', path.join(HERE, reader)], { stdio: ['ignore', 'pipe', 'inherit'] });
    const chunks = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks).toString('utf8')) : reject(new Error(`${reader} exited with ${code}`))));
  });
}

const readAt = new Date().toISOString();
const steps = [];
for (const step of BRIDGE_STEPS.filter((s) => !only || only.includes(s.name))) {
  const started = Date.now();
  const input = await read(step.reader);
  JSON.parse(input); // a reader that printed something else fails here, not in Azure
  steps.push({ name: step.name, input });
  console.log(`  read ${step.name.padEnd(16)} ${(input.length / 1024).toFixed(0).padStart(7)} KB  ${((Date.now() - started) / 1000).toFixed(0)} s`);
}

const sealed = seal({ version: 1, readAt, steps }, key);
if (file) {
  writeFileSync(file, sealed);
  console.log(`  sealed ${steps.length} steps, ${(sealed.length / 1024).toFixed(0)} KB → ${file}`);
} else {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', 'x-ms-version': '2021-08-06', 'content-type': 'application/octet-stream' },
    body: sealed,
  });
  if (!response.ok) {
    console.error(`Upload failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }
  console.log(`  uploaded ${steps.length} steps, ${(sealed.length / 1024).toFixed(0)} KB sealed`);
}
