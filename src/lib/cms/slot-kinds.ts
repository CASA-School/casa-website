/** What kind of text a slot holds, and how long that kind may be. */

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
  lead: 'Text',
  paragraph: 'Paragraph',
  point: 'Point',
  label: 'Label',
  button: 'Button',
  'card-title': 'Card title',
  'card-text': 'Card text',
  note: 'Note',
};

/** The limit for each kind, before a slot's own default pushes it up (catalog.ts, slotMax). */
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
