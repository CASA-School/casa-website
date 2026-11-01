import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

let build: Promise<string | null> | undefined;

/** Next's immutable build identity is shipped in the standalone container. No git/runtime secrets. */
export function workspaceVersion(): Promise<string | null> {
  if (process.env.NODE_ENV !== 'production') return Promise.resolve('development');
  build ??= readFile(join(process.cwd(), '.next/BUILD_ID'), 'utf8').then(value => value.trim() || null).catch(() => null);
  return build;
}
