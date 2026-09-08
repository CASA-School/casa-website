import fs from 'node:fs/promises';
import path from 'node:path';

import { connect, requireConnectionString } from './client.mjs';

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: node scripts/db/apply-sql-directory.mjs <directory>');
  process.exit(1);
}

requireConnectionString();

const absoluteDir = path.resolve(process.cwd(), targetDir);
const entries = (await fs.readdir(absoluteDir))
  .filter((entry) => entry.endsWith('.sql'))
  .sort();

const client = await connect();

try {
  for (const entry of entries) {
    const filePath = path.join(absoluteDir, entry);
    const sql = await fs.readFile(filePath, 'utf8');
    process.stdout.write(`Applying ${path.relative(process.cwd(), filePath)}\n`);
    await client.query(sql);
  }
} finally {
  await client.end();
}
