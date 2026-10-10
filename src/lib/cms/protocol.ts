/**
 * The messages between the website editor and the page in its preview.
 *
 * The editor lives on the admin host and the page on the public one, so they
 * talk through `postMessage`, each checking the other's origin. The page side
 * is src/components/cms/edit-bridge.tsx; the editor side is
 * src/components/admin/website/editor.tsx.
 */

export type Rect = { x: number; y: number; width: number; height: number };

/** What a marker on the page says about a slot. */
export type SlotMarker = {
  label: string;
  /** Unpublished draft, or a translation the German has moved past. */
  state?: 'draft' | 'stale' | 'upcoming';
  comments?: number;
  /** Initials of a colleague who has this text open right now. */
  lockedBy?: string;
};

export type FromPage =
  | { type: 'cms:ready'; path: string; title: string; lang: string; keys: string[] }
  | { type: 'cms:keys'; keys: string[] }
  | { type: 'cms:select'; key: string; rect: Rect; text: string }
  | { type: 'cms:rect'; key: string; rect: Rect | null };

export type ToPage =
  | { type: 'cms:markers'; markers: Record<string, SlotMarker> }
  | { type: 'cms:select'; key: string | null }
  | { type: 'cms:preview'; key: string; value: string }
  | { type: 'cms:reveal'; key: string }
  | { type: 'cms:reload' };

export const isDataKey = (key: string) => key.startsWith('data:');
export const dataSource = (key: string) => key.slice('data:'.length);
