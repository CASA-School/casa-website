#!/usr/bin/env node
/**
 * Runs before `next dev` and says, loudly, WHICH code the server is about to serve.
 *
 * WHY THIS EXISTS. On 2026-09-08 the same mistake was made twice in one
 * afternoon, once by a person and once by an agent: `npm run dev` was started
 * inside `.claude/worktrees/<something>`, the browser showed a site from weeks
 * earlier, and both of us spent time debugging code that was never executing.
 * Three things line up to make that easy:
 *
 *   1. Every `.claude/launch.json` in this repo — the main checkout and all five
 *      worktrees — is configured on port 3002. The URL identifies nothing.
 *   2. A worktree is auto-seeded from whatever local `main` pointed at when it
 *      was created, so it can be tens of commits behind on day one. Recorded in
 *      the project memory: one was 61 behind and 117 ahead, and a whole feature
 *      was built inside it against a design system `main` had already replaced.
 *   3. Nothing in the dev output names the branch. Next prints the port.
 *
 * So this prints the checkout, branch and commit, and REFUSES to start when the
 * checkout is behind `casa/main` — the one case where the browser lies to you.
 * `CASA_DEV_ALLOW_STALE=1` runs an old branch on purpose (a bisect, a regression
 * check).
 *
 * No network: it compares against the local `casa/main` ref and reports how old
 * that ref is, so a slow or offline `git fetch` can never block `npm run dev`.
 */
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const BASE = 'casa/main';
const ESC = String.fromCharCode(27);
const sgr = (code) => (s) => `${ESC}[${code}m${s}${ESC}[0m`;
const bold = sgr(1);
const dim = sgr(2);
const red = sgr(31);
const yellow = sgr(33);

const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const root = git('rev-parse', '--show-toplevel');
// Not a git checkout (a container build, a tarball) — nothing to compare against.
if (!root) process.exit(0);

const branch = git('rev-parse', '--abbrev-ref', 'HEAD') || '(detached)';
const head = git('rev-parse', '--short', 'HEAD');
const headDate = git('log', '-1', '--format=%cd', '--date=format:%Y-%m-%d %H:%M');
const commonDir = git('rev-parse', '--path-format=absolute', '--git-common-dir');
const isWorktree = commonDir !== git('rev-parse', '--path-format=absolute', '--git-dir');
const mainCheckout = commonDir.replace(/\/\.git\/?$/, '');
const dirty = git('status', '--porcelain') ? ' + uncommitted changes' : '';

console.log('');
console.log(bold('  CASA dev server'));
console.log(`  checkout  ${basename(root)}${isWorktree ? dim('  (worktree, NOT the main checkout)') : ''}`);
console.log(dim(`            ${root}`));
console.log(`  branch    ${bold(branch)}  ${head}  ${dim(headDate)}${dirty}`);

const hasBase = git('rev-parse', '--verify', '--quiet', BASE);
if (!hasBase) {
  console.log(yellow(`  warning   no ${BASE} ref — cannot tell whether this checkout is current`));
  console.log('');
  process.exit(0);
}

const behind = Number(git('rev-list', '--count', `HEAD..${BASE}`) || 0);
const ahead = Number(git('rev-list', '--count', `${BASE}..HEAD`) || 0);
const baseDate = git('log', '-1', '--format=%cd', '--date=format:%Y-%m-%d %H:%M', BASE);
console.log(`  vs ${BASE}  ${behind} behind - ${ahead} ahead   ${dim(`ref fetched ${baseDate}`)}`);

if (behind === 0) {
  console.log('');
  process.exit(0);
}

console.log('');
console.log(red(bold(`  ${behind} commit${behind === 1 ? '' : 's'} behind ${BASE} — the browser would show stale code.`)));
console.log('');
console.log('  Bring it up to date:');
console.log(bold(`    git fetch casa && git merge --ff-only ${BASE}`));
console.log('  or serve the main checkout instead:');
console.log(bold(`    cd ${mainCheckout} && npm run dev`));
console.log('');
console.log(dim('  Running an old branch on purpose? CASA_DEV_ALLOW_STALE=1 npm run dev'));
console.log('');

if (process.env.CASA_DEV_ALLOW_STALE !== '1') process.exit(1);
console.log(yellow('  CASA_DEV_ALLOW_STALE=1 - starting anyway.'));
console.log('');
