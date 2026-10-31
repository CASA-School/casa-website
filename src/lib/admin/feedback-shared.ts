import type { Bilingual } from './i18n';

/**
 * What the feedback panel (a client component) and the server share: the kinds, the limits, how a
 * picture is recognised and how a browser is named. No database here — a client component must not
 * reach `db.ts` (CLAUDE.md), so this is the `configuration-labels.ts` pattern.
 */

export const FEEDBACK_KINDS = ['problem', 'missing', 'idea', 'question'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const isFeedbackKind = (value: unknown): value is FeedbackKind =>
  typeof value === 'string' && (FEEDBACK_KINDS as readonly string[]).includes(value);

/** Read with `pick(lang, FEEDBACK_KIND_LABELS[kind])`. */
export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, Bilingual> = {
  problem: { de: 'Funktioniert nicht', en: 'Something is wrong' },
  missing: { de: 'Fehlt hier', en: 'Missing here' },
  idea: { de: 'Idee', en: 'Idea' },
  question: { de: 'Frage', en: 'Question' },
};

/** The line under a kind's name in the panel: what it is for. */
export const FEEDBACK_KIND_HINTS: Record<FeedbackKind, Bilingual> = {
  problem: { de: 'Fehler, falsche Angabe', en: 'An error, a wrong value' },
  missing: { de: 'Gibt es in FileMaker', en: 'FileMaker has it' },
  idea: { de: 'Besser machen', en: 'Make it better' },
  question: { de: 'Wie geht das?', en: 'How does it work?' },
};

/** The text box's placeholder follows the kind chosen. */
export const FEEDBACK_KIND_PROMPTS: Record<FeedbackKind | 'none', Bilingual> = {
  none: { de: 'Was möchtest du uns sagen?', en: 'What would you like to tell us?' },
  problem: { de: 'Was ist passiert, und was hättest du erwartet?', en: 'What happened, and what did you expect?' },
  missing: { de: 'Was fehlt dir hier, und wo findest du es in FileMaker?', en: 'What is missing here, and where is it in FileMaker?' },
  idea: { de: 'Was würde dir die Arbeit leichter machen?', en: 'What would make your work easier?' },
  question: { de: 'Was möchtest du wissen?', en: 'What would you like to know?' },
};

export const FEEDBACK_LIMITS = {
  message: 5000,
  answer: 4000,
  files: 5,
  /** Per picture, as stored; the panel shrinks a screenshot well below it. */
  fileBytes: 5 * 1024 * 1024,
  /** A whole request: the pictures, the text and the form's own bytes. */
  requestBytes: 27 * 1024 * 1024,
} as const;

export type FeedbackImageType = 'image/png' | 'image/jpeg' | 'image/webp';

/** The picture's type, by its first bytes — never the name or the type a browser declares. */
export function feedbackImageType(bytes: Uint8Array): FeedbackImageType | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (bytes.length >= 8 && starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (bytes.length >= 3 && starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (bytes.length >= 12 && starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

/** „Chrome 141 · macOS", from a user agent; empty when it says nothing recognisable. */
export function describeBrowser(userAgent: string | null | undefined): string {
  if (!userAgent) return '';
  const version = (re: RegExp) => userAgent.match(re)?.[1]?.split('.')[0];
  const browser =
    (version(/Edg\/([\d.]+)/) && `Edge ${version(/Edg\/([\d.]+)/)}`) ||
    (version(/Firefox\/([\d.]+)/) && `Firefox ${version(/Firefox\/([\d.]+)/)}`) ||
    (version(/(?:Chrome|CriOS)\/([\d.]+)/) && `Chrome ${version(/(?:Chrome|CriOS)\/([\d.]+)/)}`) ||
    (/Safari\//.test(userAgent) && version(/Version\/([\d.]+)/) && `Safari ${version(/Version\/([\d.]+)/)}`) ||
    '';
  const system = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return [browser, system].filter(Boolean).join(' · ');
}

/** What the panel sends besides the text: where, on what, and what went wrong on the page. */
export type FeedbackContext = {
  /** The address with its query, as the colleague had it. */
  url?: string;
  /** „1440 × 900". */
  viewport?: string;
  /** „2560 × 1440 · 2×". */
  screen?: string;
  userAgent?: string;
  /** The workspace's language at the time. */
  lang?: 'de' | 'en';
  /** The pages before this one in the visit, oldest first. */
  trail?: { path: string; title: string }[];
  /** Errors the page met in the browser, newest last. */
  errors?: { message: string; at: string }[];
};

/** One of the sender's own, as „Mein Feedback" lists it. */
export type MyFeedback = {
  id: string;
  number: number;
  kind: FeedbackKind;
  message: string;
  pageTitle: string | null;
  status: 'new' | 'in_progress' | 'waiting' | 'done' | 'declined' | 'spam';
  submittedAt: string;
  answer: string | null;
  answeredAt: string | null;
  answeredBy: string | null;
  /** An answer they have not opened yet. */
  unread: boolean;
  files: string[];
};
