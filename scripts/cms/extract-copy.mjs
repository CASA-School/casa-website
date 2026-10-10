#!/usr/bin/env node
/**
 * Builds the website editor's catalog of the site's copy:
 * src/config/cms/copy-catalog.json.
 *
 * Reads the source, finds every German/English pair the pages resolve through
 * `say` / `pick` / `pickTree` (src/lib/cms/copy.ts) — `say(locale, 'de', 'en')`
 * calls and `{ de, en }` object literals, nested or flat — and records each
 * under the same key the page computes (src/lib/cms/copy-key.ts), with the
 * files it is written in and the pages that render those files.
 *
 *   npm run cms:extract            writes the catalog
 *   npm run cms:extract -- --check exits 1 if the catalog is out of date
 *
 * A unit test runs the check, so a changed text without a new catalog fails.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

const OUT = path.join(root, 'src/config/cms/copy-catalog.json');
const SITE = 'src/app/(site)/[locale]';

// Must match src/lib/cms/copy-key.ts.
function fnv1a(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
function slug(text) {
  return (
    text
      .toLocaleLowerCase('de')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .slice(0, 4)
      .join('-')
      .slice(0, 32) || 'text'
  );
}
const copyKey = (de, en) => `t.${slug(de)}.${fnv1a(`${de}\u0001${en}`)}`;

// Must match SKIP and isText in src/lib/cms/copy.ts.
const SKIP = new Set(['amount', 'id', 'slug', 'key', 'href', 'src', 'url', 'icon', 'image', 'photo', 'tone', 'kind', 'type', 'variant', 'locale', 'code', 'level', 'textbook', 'objectPosition', 'objectPositionClassName', 'aspectRatio', 'email', 'phone', 'meaning', 'anchor', 'placeholder']);
const isText = (de, en) => {
  const sample = de || en;
  if (de === en && /^[a-z0-9_-]+$/.test(de)) return false;
  if (!/\p{L}{2,}/u.test(sample)) return false;
  if (/^(\/|https?:|mailto:|tel:|#)/.test(sample)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(sample)) return false;
  return true;
};

// What the editor never offers (the codemod's exclusions): search-engine data,
// emails, data and formatting layers, the legal texts, the closed placement test.
const EXCLUDE = [
  /^src\/(lib|components)\/(admin|cms)\//,
  /^src\/config\/cms\//,
  /^src\/lib\/(seo|structured-data|llms)\b/,
  /^src\/lib\/(api|assistant|notifications|validation|search|registration|placement|appointments|db)\//,
  /^src\/lib\/content\/(?!repository\.ts)/,
  /^src\/app\/\(site\)\/\[locale\]\/(privacy|terms|imprint)\//,
  /^src\/components\/patterns\/legal-utility-template/,
  /^src\/config\/placement\//,
  /^src\/components\/placement\//,
  /^src\/app\/\(site\)\/\[locale\]\/placement-test\/(test|result)\//,
  /^src\/config\/seo-pages/,
  /__tests__|\.test\./,
];

function walkDir(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkDir(full));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

const all = walkDir(path.join(root, 'src')).map((file) => path.relative(root, file).split(path.sep).join('/'));
const sources = new Map(all.map((rel) => [rel, ts.createSourceFile(rel, readFileSync(path.join(root, rel), 'utf8'), ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)]));

// --- import graph, for which pages render a file -----------------------------
function resolve(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (sources.has(candidate)) return candidate;
  }
  return null;
}
const imports = new Map();
for (const [rel, sf] of sources) {
  const deps = new Set();
  sf.forEachChild((node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) return;
      const target = resolve(rel, node.moduleSpecifier.text);
      if (target) deps.add(target);
    }
  });
  imports.set(rel, deps);
}
function reach(start, stop = () => false) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    for (const next of imports.get(queue.shift()) ?? []) {
      if (seen.has(next) || stop(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}
const pageOf = (rel) => {
  const inner = rel.slice(SITE.length, -'/page.tsx'.length);
  return inner === '' ? '/' : inner;
};
const pagesByFile = new Map();
for (const rel of all) {
  if (!rel.startsWith(`${SITE}/`) || !rel.endsWith('/page.tsx') || rel.includes('[...rest]')) continue;
  // Not through src/lib: the data layer imports every content module, which would
  // put every text on every page.
  for (const file of reach(rel, (next) => next.startsWith('src/lib/'))) {
    if (!pagesByFile.has(file)) pagesByFile.set(file, new Set());
    pagesByFile.get(file).add(pageOf(rel));
  }
}
// The layout's own chrome (header, footer, notice), not what the assistant pulls in.
const layoutFiles = reach(`${SITE}/layout.tsx`, (file) => /assistant/.test(file));

// --- the pairs -----------------------------------------------------------------
const literal = (node) => {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node)))) node = node.expression;
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) return node.text;
  return null;
};
const unwrap = (node) => {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node)))) node = node.expression;
  return node;
};
const propName = (prop) => (prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : null);
const propValue = (object, name) => {
  for (const prop of object.properties) {
    if (ts.isPropertyAssignment(prop) && propName(prop) === name) return prop.initializer;
    if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === name) return prop.name;
  }
  return null;
};

function identityOf(node) {
  node = unwrap(node);
  if (!node || !ts.isObjectLiteralExpression(node)) return null;
  for (const field of ['slug', 'id', 'code', 'key', 'pageKey']) {
    const value = propValue(node, field);
    const text = value && (literal(value) ?? (ts.isNumericLiteral(unwrap(value)) ? unwrap(value).text : null));
    if (text !== null && text !== undefined) return `${field}:${text}`;
  }
  return null;
}

const entries = new Map();
function add(de, en, file) {
  if (!isText(de, en)) return;
  const key = copyKey(de, en);
  const entry = entries.get(key) ?? { de, en, files: new Set() };
  entry.files.add(file);
  entries.set(key, entry);
}

/** The value an identifier stands for: a const in its file, or followed through an import. */
function resolveIdentifier(name, file, depth = 0) {
  const sf = sources.get(file);
  if (!sf || depth > 6) return null;
  for (const statement of sf.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
          return { node: declaration.initializer, file };
        }
      }
    }
    if (ts.isImportDeclaration(statement) && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
      for (const element of statement.importClause.namedBindings.elements) {
        if (element.name.text !== name) continue;
        const target = resolve(file, statement.moduleSpecifier.text);
        if (target) return resolveIdentifier((element.propertyName ?? element.name).text, target, depth + 1);
      }
    }
  }
  return null;
}

function follow(node, file) {
  node = unwrap(node);
  for (let hop = 0; node && hop < 8; hop += 1) {
    if (ts.isIdentifier(node)) {
      const found = resolveIdentifier(node.text, file);
      if (!found) break;
      node = unwrap(found.node);
      file = found.file;
      continue;
    }
    // A helper that reshapes a literal list, like toRecord('de', deSeeds): follow the list.
    if (ts.isCallExpression(node)) {
      const arg = node.arguments.map((candidate) => unwrap(candidate)).find((candidate) => ts.isIdentifier(candidate) || ts.isArrayLiteralExpression(candidate) || ts.isObjectLiteralExpression(candidate));
      if (!arg) break;
      node = arg;
      continue;
    }
    break;
  }
  return { node, file };
}

function pairTrees(deIn, enIn, file, enFileIn = file) {
  const left = follow(deIn, file);
  const right = follow(enIn, enFileIn);
  const de = left.node;
  const en = right.node;
  file = left.file;
  const enFile = right.file;
  if (!de || !en) return;
  const a = literal(de);
  const b = literal(en);
  if (a !== null && b !== null) return a !== b ? add(a, b, file) : undefined;
  if (ts.isArrayLiteralExpression(de) && ts.isArrayLiteralExpression(en)) {
    // Items pair by slug/id/code/key when they have one, as pickTree does at runtime.
    de.elements.forEach((element, index) => {
      const id = identityOf(follow(element, file).node);
      const other = id ? en.elements.find((candidate) => identityOf(follow(candidate, enFile).node) === id) : en.elements[index];
      if (other) pairTrees(element, other, file, enFile);
    });
    return;
  }
  if (ts.isObjectLiteralExpression(de) && ts.isObjectLiteralExpression(en)) {
    for (const prop of de.properties) {
      const isShorthand = ts.isShorthandPropertyAssignment(prop);
      if (!ts.isPropertyAssignment(prop) && !isShorthand) continue;
      const name = isShorthand ? prop.name.text : propName(prop);
      if (!name || SKIP.has(name)) continue;
      const other = propValue(en, name);
      if (other) pairTrees(isShorthand ? prop.name : prop.initializer, other, file, enFile);
    }
  }
}

for (const [rel, sf] of sources) {
  if (EXCLUDE.some((re) => re.test(rel))) continue;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'say' && node.arguments.length >= 3) {
      const de = literal(node.arguments[1]);
      const en = literal(node.arguments[2]);
      if (de !== null && en !== null) add(de, en, rel);
    }
    const parentName = node.parent && ts.isPropertyAssignment(node.parent) && node.parent.initializer === node ? propName(node.parent) : null;
    if (ts.isObjectLiteralExpression(node) && !(parentName && SKIP.has(parentName))) {
      const de = propValue(node, 'de');
      const en = propValue(node, 'en');
      if (de && en) pairTrees(de, en, rel);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const catalog = {};
for (const key of [...entries.keys()].sort()) {
  const { de, en, files } = entries.get(key);
  const pages = new Set();
  let everyPage = false;
  for (const file of files) {
    for (const page of pagesByFile.get(file) ?? []) pages.add(page);
    if (layoutFiles.has(file) || file.startsWith('src/components/assistant/')) everyPage = true;
    if (/\/(not-found|error)\.tsx$/.test(file)) pages.add('404');
  }
  catalog[key] = { de, en, files: [...files].sort(), pages: everyPage ? ['*'] : [...pages].sort() };
}

const json = `${JSON.stringify(catalog, null, 1)}\n`;
if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== json) {
    console.error('src/config/cms/copy-catalog.json is out of date. Run: npm run cms:extract');
    process.exit(1);
  }
  console.log(`copy catalog up to date (${Object.keys(catalog).length} texts)`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote ${Object.keys(catalog).length} texts to ${path.relative(root, OUT)}`);
}
