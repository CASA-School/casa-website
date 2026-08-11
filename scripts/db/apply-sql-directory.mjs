import fs from 'node:fs/promises';
import path from 'node:path';

import { Client, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: node scripts/db/apply-sql-directory.mjs <directory>');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const absoluteDir = path.resolve(process.cwd(), targetDir);
const entries = (await fs.readdir(absoluteDir))
  .filter((entry) => entry.endsWith('.sql'))
  .sort();

const client = new Client({ connectionString });

try {
  await client.connect();

  for (const entry of entries) {
    const filePath = path.join(absoluteDir, entry);
    const sql = await fs.readFile(filePath, 'utf8');
    process.stdout.write(`Applying ${path.relative(process.cwd(), filePath)}\n`);
    await client.query(sql);
  }
} finally {
  await client.end();
}
