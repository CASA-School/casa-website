#!/usr/bin/env node
/**
 * Ports the CASA placement-test item bank from the upstream handoff Markdown
 * into typed, server-only TypeScript.
 *
 * WHY A SCRIPT AND NOT A PASTE
 * ----------------------------
 * The upstream package generated `TEACHER_REVIEW_BOOK.md` from JSON records we
 * do not have a copy of (see docs/PLACEMENT_TEST_IMPLEMENTATION.md §2). The
 * Markdown is therefore the only authoritative source on this machine, and the
 * port direction is Markdown -> TS. Keeping it as a committed script means a
 * reviewer can re-run it and diff, and that a corrected upstream book can be
 * re-ported instead of hand-patched in 163 places.
 *
 * The parse is deliberately strict: every field the book can carry is either
 * consumed or causes a throw. A silently dropped answer key would be a scoring
 * bug that no test would catch, so "unknown shape" must fail the build.
 *
 * Usage:  node scripts/placement/port-item-bank.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const SOURCE = resolve(HERE, 'source-item-bank.md');
const OUT_DIR = resolve(REPO, 'src/config/placement/content');

/**
 * Checksums from the upstream VERIFICATION_REPORT.md. The port is only trusted
 * when it reproduces these exactly.
 */
const EXPECTED = {
  items: 163,
  modules: 12,
  readingStimuli: 33,
  listeningStimuli: 33,
  writingPrompts: 18,
  speakingPrompts: 12,
};

/** Module composition the book declares in its own `Kind:` lines. */
const EXPECTED_MODULE_SIZES = { router: [15], level: [18, 18, 18, 18, 18, 18], boundary: [8, 8, 8, 8, 8] };

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function fail(message, context) {
  throw new Error(`[port-item-bank] ${message}${context ? `\n  at: ${context}` : ''}`);
}

/** Pulls the single backtick-quoted value out of a string, or null. */
function tick(text) {
  const match = /`([^`]*)`/.exec(text);
  return match ? match[1] : null;
}

/** All backtick-quoted values, in order. */
function ticks(text) {
  return [...text.matchAll(/`([^`]*)`/g)].map((match) => match[1]);
}

/**
 * Splits the book into top-level `## ` sections, keeping their bodies. The book
 * mixes module sections with `# Production tasks` and its `## ` subsections, so
 * we track the current `# ` heading too.
 */
function splitSections(lines) {
  const sections = [];
  let part = 'modules';
  let current = null;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      part = line.slice(2).trim();
      continue;
    }
    if (line.startsWith('## ')) {
      current = { part, heading: line.slice(3).trim(), body: [] };
      sections.push(current);
      continue;
    }
    if (current) current.body.push(line);
  }

  return sections;
}

/** Splits a section body into `### ` blocks. */
function splitBlocks(body) {
  const blocks = [];
  let current = null;
  const preamble = [];

  for (const line of body) {
    if (line.startsWith('### ')) {
      current = { heading: line.slice(4).trim(), body: [] };
      blocks.push(current);
      continue;
    }
    (current ? current.body : preamble).push(line);
  }

  return { preamble, blocks };
}

/** Reads a fenced ```text block starting at `index`; returns [content, nextIndex]. */
function readFence(body, index, context) {
  if (!body[index]?.startsWith('```')) fail('expected a fenced block', context);
  const collected = [];
  let cursor = index + 1;
  while (cursor < body.length && !body[cursor].startsWith('```')) {
    collected.push(body[cursor]);
    cursor += 1;
  }
  if (cursor >= body.length) fail('unterminated fenced block', context);
  return [collected.join('\n').trim(), cursor + 1];
}

/** Collects `- \`key\` text` list rows into {key, text} pairs. */
function readKeyedList(body, index) {
  const rows = [];
  let cursor = index;
  while (cursor < body.length) {
    const match = /^- `([^`]+)`\s+(.*)$/.exec(body[cursor]);
    if (!match) break;
    rows.push({ key: match[1], text: match[2].trim() });
    cursor += 1;
  }
  return [rows, cursor];
}

// ---------------------------------------------------------------------------
// stimulus + item parsing
// ---------------------------------------------------------------------------

const stimuli = new Map();

/**
 * Registers a stimulus the first time it is seen and cross-checks every later
 * sighting. 23 reading and 18 listening stimuli are shared by two items each,
 * so a mismatch between two sightings means the book itself drifted.
 */
function registerStimulus(stimulus, context) {
  const existing = stimuli.get(stimulus.id);
  if (!existing) {
    stimuli.set(stimulus.id, stimulus);
    return;
  }
  const before = JSON.stringify(existing);
  const after = JSON.stringify(stimulus);
  if (before !== after) fail(`stimulus ${stimulus.id} differs between sightings`, context);
}

/**
 * Parses one `### N. ITEM-ID` block.
 *
 * The block is a flat sequence of labelled fields rather than nested structure,
 * so this walks the lines once and dispatches on the label. Anything that looks
 * like a field but is not recognised throws, so an upstream format change
 * surfaces as a failed port instead of a missing answer key.
 */
function parseItem(block, module) {
  const headingMatch = /^\d+\.\s+(\S+)$/.exec(block.heading);
  if (!headingMatch) fail(`unparseable item heading "${block.heading}"`, module.id);
  const id = headingMatch[1];
  const context = `${module.id} / ${id}`;

  const body = block.body;
  let cursor = 0;

  // Skip blanks up to the metadata line.
  while (cursor < body.length && body[cursor].trim() === '') cursor += 1;

  // `LEVEL` / `BAND` · `stage` · `skill` · `responseType`
  const metaTicks = ticks(body[cursor] ?? '');
  if (metaTicks.length !== 5) fail(`expected 5 metadata values, got ${metaTicks.length}`, context);
  const [level, band, stage, skill, responseType] = metaTicks;
  cursor += 1;

  const item = {
    id,
    moduleId: module.id,
    level,
    band,
    stage,
    skill,
    responseType,
    construct: null,
    stimulusId: null,
    prompt: null,
    options: null,
    blanks: null,
    tokens: null,
    matching: null,
    inputConstraints: null,
    answer: null,
    tags: [],
  };

  while (cursor < body.length) {
    const line = body[cursor];
    const trimmed = line.trim();

    if (trimmed === '' || trimmed === '---') {
      cursor += 1;
      continue;
    }

    // ---- single-line labelled fields ------------------------------------
    if (trimmed.startsWith('**Construct:**')) {
      item.construct = trimmed.slice('**Construct:**'.length).trim();
      cursor += 1;
      continue;
    }

    if (trimmed.startsWith('**Tags:**')) {
      item.tags = trimmed
        .slice('**Tags:**'.length)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      cursor += 1;
      continue;
    }

    if (trimmed.startsWith('**Input constraints:**')) {
      const raw = tick(trimmed.slice('**Input constraints:**'.length));
      if (!raw) fail('input constraints without a value', context);
      item.inputConstraints = JSON.parse(raw);
      cursor += 1;
      continue;
    }

    if (trimmed.startsWith('**Correct response:**')) {
      item.answer = trimmed.slice('**Correct response:**'.length).trim();
      cursor += 1;
      continue;
    }

    // Reviewer notes are a fixed generated reminder string, identical on all
    // 163 items. Nothing to carry over.
    if (trimmed.startsWith('**Reviewer notes:**')) {
      cursor += 1;
      continue;
    }

    // ---- stimulus --------------------------------------------------------
    const stimulusMatch = /^\*\*Stimulus `([^`]+)` — (.+)\*\*$/.exec(trimmed);
    if (stimulusMatch) {
      const [, stimulusId, title] = stimulusMatch;
      item.stimulusId = stimulusId;
      cursor += 1;
      while (cursor < body.length && body[cursor].trim() === '') cursor += 1;

      // Listening stimuli lead with an audio path; reading stimuli lead with
      // the text fence directly.
      if (body[cursor]?.startsWith('Audio path:')) {
        const audioTicks = ticks(body[cursor]);
        if (audioTicks.length !== 2) fail(`audio line shape for ${stimulusId}`, context);
        const [audioPath, maxPlays] = audioTicks;
        cursor += 1;
        while (cursor < body.length && body[cursor].trim() === '') cursor += 1;

        if (body[cursor]?.trim() !== '**Internal transcript**') {
          fail(`listening stimulus ${stimulusId} without a transcript`, context);
        }
        cursor += 1;
        while (cursor < body.length && body[cursor].trim() === '') cursor += 1;

        const [transcript, afterFence] = readFence(body, cursor, context);
        cursor = afterFence;
        while (cursor < body.length && body[cursor].trim() === '') cursor += 1;

        let recordingDirection = null;
        if (body[cursor]?.trim().startsWith('**Recording direction:**')) {
          recordingDirection = body[cursor].trim().slice('**Recording direction:**'.length).trim();
          cursor += 1;
        }

        registerStimulus(
          {
            id: stimulusId,
            kind: 'listening',
            title,
            audioPath,
            maxPlays: Number(maxPlays),
            transcript,
            recordingDirection,
          },
          context
        );
        continue;
      }

      const [text, afterFence] = readFence(body, cursor, context);
      cursor = afterFence;
      registerStimulus({ id: stimulusId, kind: 'reading', title, text }, context);
      continue;
    }

    // ---- prompt ----------------------------------------------------------
    if (trimmed === '**Prompt**') {
      cursor += 1;
      while (cursor < body.length && body[cursor].trim() === '') cursor += 1;
      const collected = [];
      while (cursor < body.length) {
        const next = body[cursor];
        if (next.trim() === '' || next.trim().startsWith('**')) break;
        collected.push(next);
        cursor += 1;
      }
      item.prompt = collected.join('\n').trim();
      continue;
    }

    // ---- option-style blocks --------------------------------------------
    if (trimmed === '**Options**') {
      cursor += 1;
      const [rows, next] = readKeyedList(body, cursor);
      item.options = rows;
      cursor = next;
      continue;
    }

    if (trimmed === '**Blank options**') {
      cursor += 1;
      const blanks = [];
      while (cursor < body.length) {
        // `- \`b1\`: \`a\` fährt; \`b\` fahrt; ...`
        const match = /^- `([^`]+)`:\s+(.*)$/.exec(body[cursor]);
        if (!match) break;
        const [, blankId, rest] = match;
        const options = rest.split(';').map((chunk) => {
          const parts = /^\s*`([^`]+)`\s+(.*)$/.exec(chunk);
          if (!parts) fail(`blank option shape "${chunk}"`, context);
          return { key: parts[1], text: parts[2].trim() };
        });
        blanks.push({ id: blankId, options });
        cursor += 1;
      }
      item.blanks = blanks;
      continue;
    }

    if (trimmed === '**Tokens shown in shuffled order**') {
      cursor += 1;
      const [rows, next] = readKeyedList(body, cursor);
      item.tokens = rows.map((row) => ({ id: row.key, text: row.text }));
      cursor = next;
      continue;
    }

    if (trimmed === '**Left side**') {
      cursor += 1;
      const [left, next] = readKeyedList(body, cursor);
      cursor = next;
      while (cursor < body.length && body[cursor].trim() === '') cursor += 1;
      if (body[cursor]?.trim() !== '**Right side**') fail('left side without right side', context);
      cursor += 1;
      const [right, afterRight] = readKeyedList(body, cursor);
      cursor = afterRight;
      item.matching = {
        left: left.map((row) => ({ id: row.key, text: row.text })),
        right: right.map((row) => ({ id: row.key, text: row.text })),
      };
      continue;
    }

    fail(`unrecognised line "${trimmed.slice(0, 60)}"`, context);
  }

  if (!item.prompt) fail('item without a prompt', context);
  if (!item.answer) fail('item without a correct response', context);
  if (!item.construct) fail('item without a construct', context);

  item.answer = parseAnswer(item, context);
  return item;
}

/**
 * Turns the book's human-readable "Correct response" line into a machine key.
 *
 * The book writes answers for a reader, not a scorer — options as `` `b` — text ``,
 * token order as prose joined by arrows. Resolving the prose back to ids here
 * (rather than at scoring time) means a mismatch between the answer line and
 * the option list fails the port instead of silently marking learners wrong.
 */
function parseAnswer(item, context) {
  const raw = item.answer;

  switch (item.responseType) {
    case 'single_choice': {
      const key = tick(raw);
      if (!key) fail(`single_choice answer without a key: "${raw}"`, context);
      if (!item.options?.some((option) => option.key === key)) {
        fail(`single_choice answer "${key}" is not an option`, context);
      }
      return { type: 'single_choice', optionKey: key };
    }

    case 'multiple_choice': {
      const keys = raw
        .split(';')
        .map((chunk) => tick(chunk))
        .filter(Boolean);
      if (keys.length < 2) fail(`multiple_choice answer with ${keys.length} keys`, context);
      for (const key of keys) {
        if (!item.options?.some((option) => option.key === key)) {
          fail(`multiple_choice answer "${key}" is not an option`, context);
        }
      }
      return { type: 'multiple_choice', optionKeys: keys };
    }

    case 'short_text': {
      if (!raw.startsWith('Accepted:')) fail(`short_text answer shape: "${raw}"`, context);
      const accepted = ticks(raw.slice('Accepted:'.length));
      if (accepted.length === 0) fail('short_text answer with no accepted values', context);
      return { type: 'short_text', accepted };
    }

    case 'inline_cloze': {
      // `b1` = fährt; `b2` = ab
      const pairs = raw.split(';').map((chunk) => {
        const match = /^\s*`([^`]+)`\s*=\s*(.+?)\s*$/.exec(chunk);
        if (!match) fail(`inline_cloze answer chunk "${chunk}"`, context);
        return { blankId: match[1], text: match[2] };
      });

      const resolved = pairs.map(({ blankId, text }) => {
        const blank = item.blanks?.find((candidate) => candidate.id === blankId);
        if (!blank) fail(`inline_cloze answer names unknown blank "${blankId}"`, context);
        const option = blank.options.find((candidate) => candidate.text === text);
        if (!option) fail(`inline_cloze answer "${text}" is not an option of ${blankId}`, context);
        return { blankId, optionKey: option.key };
      });

      return { type: 'inline_cloze', blanks: resolved };
    }

    case 'order_tokens': {
      const segments = raw.split('→').map((segment) => segment.trim());
      const order = segments.map((segment) => {
        const token = item.tokens?.find((candidate) => candidate.text === segment);
        if (!token) fail(`order_tokens answer segment "${segment}" matches no token`, context);
        return token.id;
      });
      if (order.length !== item.tokens?.length) {
        fail(`order_tokens answer covers ${order.length} of ${item.tokens?.length} tokens`, context);
      }
      return { type: 'order_tokens', order };
    }

    case 'matching': {
      const pairs = raw.split(';').map((chunk) => {
        const [leftText, rightText] = chunk.split('→').map((part) => part.trim());
        const left = item.matching?.left.find((candidate) => candidate.text === leftText);
        const right = item.matching?.right.find((candidate) => candidate.text === rightText);
        if (!left) fail(`matching answer left "${leftText}" not found`, context);
        if (!right) fail(`matching answer right "${rightText}" not found`, context);
        return { leftId: left.id, rightId: right.id };
      });
      if (pairs.length !== item.matching?.left.length) {
        fail('matching answer does not cover every left row', context);
      }
      return { type: 'matching', pairs };
    }

    default:
      return fail(`unsupported response type "${item.responseType}"`, context);
  }
}

// ---------------------------------------------------------------------------
// production tasks + rubrics
// ---------------------------------------------------------------------------

function parseProductionPrompt(block, kind) {
  const headingMatch = /^(\S+)\s+—\s+(.+)$/.exec(block.heading);
  if (!headingMatch) fail(`unparseable production heading "${block.heading}"`);
  const [, id, title] = headingMatch;

  const body = block.body;
  let cursor = 0;
  while (cursor < body.length && body[cursor].trim() === '') cursor += 1;

  const metaLine = body[cursor] ?? '';
  if (!metaLine.startsWith('Target:')) fail(`production meta line for ${id}`);
  const metaTicks = ticks(metaLine);
  cursor += 1;

  const prompt = { id, kind, title, targetLevel: metaTicks[0], bands: metaTicks[1].split(',').map((b) => b.trim()) };

  if (kind === 'writing') {
    const words = metaTicks[2];
    const [min, max] = words.split(/[–-]/).map((part) => Number(part.trim()));
    prompt.suggestedWords = { min, max };
  } else {
    prompt.preparationSeconds = Number(metaTicks[2].replace('s', ''));
    prompt.responseSeconds = Number(metaTicks[3].replace('s', ''));
  }

  const instruction = [];
  while (cursor < body.length) {
    const line = body[cursor];
    if (line.trim().startsWith('**')) break;
    if (line.trim() !== '') instruction.push(line.trim());
    cursor += 1;
  }
  prompt.instruction = instruction.join(' ').trim();

  prompt.requiredContent = [];
  prompt.sourceText = null;
  prompt.reviewFocus = [];

  while (cursor < body.length) {
    const trimmed = body[cursor].trim();

    if (trimmed === '' || trimmed === '---') {
      cursor += 1;
      continue;
    }

    if (trimmed === '**Required content**') {
      cursor += 1;
      while (cursor < body.length && body[cursor].startsWith('- ')) {
        prompt.requiredContent.push(body[cursor].slice(2).trim());
        cursor += 1;
      }
      continue;
    }

    if (trimmed === '**Source text**') {
      cursor += 1;
      const collected = [];
      while (cursor < body.length) {
        const next = body[cursor].trim();
        if (next.startsWith('**') || next === '---') break;
        if (next !== '') collected.push(next);
        cursor += 1;
      }
      prompt.sourceText = collected.join('\n');
      continue;
    }

    if (trimmed.startsWith('**Review focus:**')) {
      prompt.reviewFocus = trimmed
        .slice('**Review focus:**'.length)
        .split(',')
        .map((focus) => focus.trim())
        .filter(Boolean);
      cursor += 1;
      continue;
    }

    fail(`unrecognised production line "${trimmed.slice(0, 60)}" in ${id}`);
  }

  if (prompt.requiredContent.length === 0) fail(`${id} has no required content`);
  return prompt;
}

function parseRubric(section) {
  const { preamble, blocks } = splitBlocks(section.body);
  const header = preamble.find((line) => line.startsWith('Rubric:')) ?? '';
  const headerTicks = ticks(header);
  if (headerTicks.length !== 2) fail(`rubric header "${header}"`);

  const criteria = blocks.map((block) => {
    const match = /^(.+?)\s+\(`([^`]+)`\)$/.exec(block.heading);
    if (!match) fail(`rubric criterion heading "${block.heading}"`);
    const descriptors = {};
    for (const line of block.body) {
      const row = /^- \*\*(\d+):\*\*\s+(.+)$/.exec(line.trim());
      if (row) descriptors[Number(row[1])] = row[2].trim();
    }
    if (Object.keys(descriptors).length !== 5) {
      fail(`rubric criterion ${match[2]} has ${Object.keys(descriptors).length} descriptors, expected 5`);
    }
    return { key: match[2], label: match[1].trim(), descriptors };
  });

  return { id: headerTicks[0], version: Number(headerTicks[1]), criteria };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const lines = readFileSync(SOURCE, 'utf8').split('\n');
const sections = splitSections(lines);

const modules = [];
const items = [];
const writingPrompts = [];
const speakingPrompts = [];
let writingRubric = null;
let speakingRubric = null;

for (const section of sections) {
  // Module sections carry a `Kind:` line; the review-status preamble does not.
  const { preamble, blocks } = splitBlocks(section.body);
  const kindLine = preamble.find((line) => line.startsWith('Kind:'));

  if (kindLine) {
    const headingMatch = /^(\S+)\s+—\s+(.+)$/.exec(section.heading);
    if (!headingMatch) fail(`unparseable module heading "${section.heading}"`);
    const kindTicks = ticks(kindLine);
    // Named `moduleDef`, not `module`: the repo's Next lint config forbids
    // assigning to `module` even in an ESM script.
    const declaredItemCount = Number(kindTicks[1]);
    const moduleDef = {
      id: headingMatch[1],
      title: headingMatch[2],
      kind: kindTicks[0],
      stages: kindTicks[2].split(',').map((stage) => stage.trim()),
      itemIds: [],
    };

    for (const block of blocks) {
      const item = parseItem(block, moduleDef);
      items.push(item);
      moduleDef.itemIds.push(item.id);
    }

    if (moduleDef.itemIds.length !== declaredItemCount) {
      fail(`module ${moduleDef.id} declares ${declaredItemCount} items but has ${moduleDef.itemIds.length}`);
    }
    modules.push(moduleDef);
    continue;
  }

  if (section.heading === 'Writing prompts') {
    for (const block of blocks) writingPrompts.push(parseProductionPrompt(block, 'writing'));
    continue;
  }
  if (section.heading === 'Speaking prompts') {
    for (const block of blocks) speakingPrompts.push(parseProductionPrompt(block, 'speaking'));
    continue;
  }
  if (section.heading === 'Writing rubric') {
    writingRubric = parseRubric(section);
    continue;
  }
  if (section.heading === 'Speaking rubric') {
    speakingRubric = parseRubric(section);
    continue;
  }
  // "Review status" and any other prose section: nothing machine-readable.
}

// ---- checksums ------------------------------------------------------------

const readingStimuli = [...stimuli.values()].filter((stimulus) => stimulus.kind === 'reading');
const listeningStimuli = [...stimuli.values()].filter((stimulus) => stimulus.kind === 'listening');

const actual = {
  items: items.length,
  modules: modules.length,
  readingStimuli: readingStimuli.length,
  listeningStimuli: listeningStimuli.length,
  writingPrompts: writingPrompts.length,
  speakingPrompts: speakingPrompts.length,
};

for (const [key, expected] of Object.entries(EXPECTED)) {
  if (actual[key] !== expected) {
    fail(`checksum mismatch: ${key} = ${actual[key]}, upstream reports ${expected}`);
  }
}

for (const [kind, sizes] of Object.entries(EXPECTED_MODULE_SIZES)) {
  const found = modules.filter((module) => module.kind === kind).map((module) => module.itemIds.length);
  if (JSON.stringify(found) !== JSON.stringify(sizes)) {
    fail(`module composition for "${kind}": got ${JSON.stringify(found)}, expected ${JSON.stringify(sizes)}`);
  }
}

if (!writingRubric || !speakingRubric) fail('a rubric is missing');

// Every stimulus reference must resolve, and every stimulus must be used.
const referenced = new Set(items.map((item) => item.stimulusId).filter(Boolean));
for (const id of referenced) if (!stimuli.has(id)) fail(`item references unknown stimulus ${id}`);
for (const id of stimuli.keys()) if (!referenced.has(id)) fail(`stimulus ${id} is never used`);

// Ids must be unique.
const seen = new Set();
for (const item of items) {
  if (seen.has(item.id)) fail(`duplicate item id ${item.id}`);
  seen.add(item.id);
}

// ---- emit -----------------------------------------------------------------

const BANNER = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by \`node scripts/placement/port-item-bank.mjs\` from
 * \`scripts/placement/source-item-bank.md\` (the upstream CASA placement-test
 * teacher review book). Re-run the script instead of patching this file, or the
 * next port silently reverts your change.
 *
 * SERVER ONLY. This module carries answer keys and, for listening items,
 * protected transcripts. It must never be imported from a \`'use client'\`
 * module — \`src/lib/placement/__tests__/answer-containment.test.ts\` enforces
 * that. Client payloads are produced by \`src/lib/placement/sanitise.ts\`.
 */
`;

function emit(value, indent = 0) {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const simple = value.every((entry) => typeof entry === 'string' || typeof entry === 'number');
    if (simple) return `[${value.map((entry) => emit(entry)).join(', ')}]`;
    return `[\n${value.map((entry) => `${padInner}${emit(entry, indent + 1)}`).join(',\n')},\n${pad}]`;
  }

  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  if (entries.length === 0) return '{}';
  return `{\n${entries
    .map(([key, entryValue]) => `${padInner}${JSON.stringify(key)}: ${emit(entryValue, indent + 1)}`)
    .join(',\n')},\n${pad}}`;
}

mkdirSync(OUT_DIR, { recursive: true });

// Items keep only what the engine or the UI needs; the review-book reminder
// string and the per-item reviewer prose are dropped.
const emittedItems = items.map((item) => ({
  id: item.id,
  moduleId: item.moduleId,
  level: item.level,
  band: item.band,
  stage: item.stage,
  skill: item.skill,
  responseType: item.responseType,
  construct: item.construct,
  stimulusId: item.stimulusId,
  prompt: item.prompt,
  options: item.options,
  blanks: item.blanks,
  tokens: item.tokens,
  matching: item.matching,
  inputConstraints: item.inputConstraints,
  answer: item.answer,
  tags: item.tags,
}));

writeFileSync(
  resolve(OUT_DIR, 'items.server.ts'),
  `${BANNER}
import type { PlacementItem } from '@/lib/placement/types';

export const PLACEMENT_ITEMS: readonly PlacementItem[] = ${emit(emittedItems)} as const;
`,
  'utf8'
);

writeFileSync(
  resolve(OUT_DIR, 'stimuli.server.ts'),
  `${BANNER}
import type { PlacementStimulus } from '@/lib/placement/types';

export const PLACEMENT_STIMULI: readonly PlacementStimulus[] = ${emit([...stimuli.values()])} as const;
`,
  'utf8'
);

writeFileSync(
  resolve(OUT_DIR, 'modules.server.ts'),
  `${BANNER}
import type { PlacementModule } from '@/lib/placement/types';

export const PLACEMENT_MODULES: readonly PlacementModule[] = ${emit(modules)} as const;
`,
  'utf8'
);

writeFileSync(
  resolve(OUT_DIR, 'production.server.ts'),
  `${BANNER}
import type { PlacementProductionPrompt, PlacementRubric } from '@/lib/placement/types';

export const PLACEMENT_WRITING_PROMPTS: readonly PlacementProductionPrompt[] = ${emit(writingPrompts)} as const;

export const PLACEMENT_SPEAKING_PROMPTS: readonly PlacementProductionPrompt[] = ${emit(speakingPrompts)} as const;

export const PLACEMENT_WRITING_RUBRIC: PlacementRubric = ${emit(writingRubric)} as const;

export const PLACEMENT_SPEAKING_RUBRIC: PlacementRubric = ${emit(speakingRubric)} as const;
`,
  'utf8'
);

const byType = items.reduce((accumulator, item) => {
  accumulator[item.responseType] = (accumulator[item.responseType] ?? 0) + 1;
  return accumulator;
}, {});

console.log('[port-item-bank] ok');
console.log(`  modules            ${actual.modules}`);
console.log(`  items              ${actual.items}`);
console.log(`  reading stimuli    ${actual.readingStimuli}`);
console.log(`  listening stimuli  ${actual.listeningStimuli}`);
console.log(`  writing prompts    ${actual.writingPrompts}`);
console.log(`  speaking prompts   ${actual.speakingPrompts}`);
console.log(`  response types     ${JSON.stringify(byType)}`);
