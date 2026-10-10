/**
 * Content trees: the shape of a piece of page copy, and how staff edits lie on it.
 *
 * Most of the site's copy is not one string but a localised object a config
 * function returns: a course's audience heading and its bullets, its learning
 * goals per level, its fees and conditions. A tree names which string leaves of
 * such an object are editable, by path, with a label, a kind and a length limit.
 *
 * The same field list does two things. `flattenTree` reads the object for every
 * language into slots for the catalog (what the editor lists, searches and
 * compares). `overlayTree` returns a copy of the object for rendering, each
 * editable leaf passed through a resolver that substitutes the live or draft
 * value and, in the editor, tags it. A leaf no field names is never touched:
 * level codes, textbook ids, prices and hrefs stay what the code says.
 */

export type SlotKind =
  | 'heading'
  | 'lead'
  | 'paragraph'
  | 'point'
  | 'label'
  | 'button'
  | 'card-title'
  | 'card-text'
  | 'note';

export const KIND_LABELS: Record<SlotKind, string> = {
  heading: 'Heading',
  lead: 'Lead',
  paragraph: 'Paragraph',
  point: 'Point',
  label: 'Label',
  button: 'Button',
  'card-title': 'Card title',
  'card-text': 'Card text',
  note: 'Note',
};

/** How long each kind of text may be, before any slot's own default pushes it up. */
export const KIND_MAX: Record<SlotKind, number> = {
  heading: 70,
  lead: 200,
  paragraph: 480,
  point: 130,
  label: 40,
  button: 32,
  'card-title': 40,
  'card-text': 200,
  note: 140,
};

type Segment = string | number;

export type FieldContext = { index: number; parent: Record<string, unknown> };

export type FieldSpec = {
  /** Dotted path from the tree's root; `*` stands for any array index. */
  path: string;
  label: string | ((context: FieldContext) => string);
  kind: SlotKind;
  /** The part of the page it sits in, when it differs from the tree's. */
  section?: string;
  max?: number;
  /** Not text but a value kept elsewhere in the workspace, e.g. `Prices`. Shown, never edited here. */
  data?: string;
};

export type TreeLeaf = { key: string; path: string; value: string; field: FieldSpec; label: string };

function fieldFor(fields: readonly FieldSpec[], path: Segment[]): FieldSpec | undefined {
  return fields.find((field) => {
    const pattern = field.path.split('.');
    return (
      pattern.length === path.length &&
      pattern.every((part, i) => (part === '*' ? typeof path[i] === 'number' : part === String(path[i])))
    );
  });
}

function labelFor(field: FieldSpec, path: Segment[], parent: Record<string, unknown>): string {
  if (typeof field.label === 'string') return field.label;
  const numeric = path.filter((segment): segment is number => typeof segment === 'number');
  return field.label({ index: (numeric[numeric.length - 1] ?? 0) + 1, parent });
}

function walk(
  node: unknown,
  path: Segment[],
  parent: Record<string, unknown>,
  fields: readonly FieldSpec[],
  visit: (path: Segment[], value: string, field: FieldSpec, parent: Record<string, unknown>) => string
): unknown {
  if (typeof node === 'string') {
    const field = fieldFor(fields, path);
    return field ? visit(path, node, field, parent) : node;
  }
  if (Array.isArray(node)) {
    return node.map((item, index) => walk(item, [...path, index], parent, fields, visit));
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(record)) {
      out[name] = walk(value, [...path, name], record, fields, visit);
    }
    return out;
  }
  return node;
}

export const treeKey = (prefix: string, path: Segment[] | string) =>
  `${prefix}.${Array.isArray(path) ? path.join('.') : path}`;

/** Every editable leaf of `tree`, with its key under `prefix`. */
export function flattenTree(tree: unknown, prefix: string, fields: readonly FieldSpec[]): TreeLeaf[] {
  const leaves: TreeLeaf[] = [];
  walk(tree, [], {}, fields, (path, value, field, parent) => {
    leaves.push({ key: treeKey(prefix, path), path: path.join('.'), value, field, label: labelFor(field, path, parent) });
    return value;
  });
  return leaves;
}

/**
 * A copy of `tree` with each editable leaf replaced by `resolve(key, value, field)`.
 * `null` and `undefined` come back as they went in, so a course without the
 * section keeps rendering its fallback.
 */
export function overlayTree<T>(
  tree: T,
  prefix: string,
  fields: readonly FieldSpec[],
  resolve: (key: string, value: string, field: FieldSpec) => string
): T {
  if (tree === null || tree === undefined) return tree;
  return walk(tree, [], {}, fields, (path, value, field) => resolve(treeKey(prefix, path), value, field)) as T;
}
