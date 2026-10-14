import type { Bilingual } from '@/lib/admin/i18n';

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

/** The kind's name in the website editor, in the workspace's two languages. */
export const KIND_LABELS: Record<SlotKind, Bilingual> = {
  heading: { de: 'Überschrift', en: 'Heading' },
  lead: { de: 'Text', en: 'Text' },
  paragraph: { de: 'Absatz', en: 'Paragraph' },
  point: { de: 'Aufzählungspunkt', en: 'Point' },
  label: { de: 'Beschriftung', en: 'Label' },
  button: { de: 'Schaltfläche', en: 'Button' },
  'card-title': { de: 'Kartentitel', en: 'Card title' },
  'card-text': { de: 'Kartentext', en: 'Card text' },
  note: { de: 'Hinweis', en: 'Note' },
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
