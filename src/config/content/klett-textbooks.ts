/**
 * Ernst Klett Sprachen textbooks used in CASA's intensive courses.
 *
 * CASA teaches from two Klett series — `Netzwerk neu` up to B1 and `Kontext`
 * from B1+ — which matches the placement tests CASA already links to
 * (`src/components/sections/klett-level-tests.tsx`) and the book-price tiers in
 * `src/config/calculator/pricing.ts:95-99`.
 *
 * Titles, ISBNs and product URLs below were read directly out of the
 * klett-sprachen.de product-page markup on 2026-08-12 and independently
 * re-verified (HTTP 200, no redirect, ISBN present in the page body).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THERE ARE NO COVER IMAGES HERE — DO NOT "FIX" THIS BY ADDING THEM
 * ─────────────────────────────────────────────────────────────────────────────
 * `publisherCoverUrl` is recorded for future use but is deliberately NOT
 * rendered. Displaying Klett's cover artwork on this site needs written
 * permission, which CASA does not yet have:
 *
 *  - Klett's Impressum expressly reserves rights: "Any use, duplication,
 *    storage or reprinting is prohibited unless legally permitted or expressly
 *    authorised in advance by Ernst Klett Sprachen GmbH."
 *  - Their press page grants royalty-free use for the LOGO only, and only for
 *    editorial purposes. No equivalent grant exists for covers, and course
 *    marketing is not an editorial use.
 *  - Self-hosting a copy is the highest-risk option: CJEU C-161/17 (Renckhoff)
 *    held that re-uploading a freely available image to another website is a
 *    new communication to the public requiring authorisation — on facts that
 *    were literally a school website.
 *  - §51 UrhG (Bildzitat) does not help; decorative or recognition use is not a
 *    citation, and Germany has no broad fair-use doctrine to fall back on.
 *  - Klett's own reprint page warns that cover imagery may belong to third
 *    parties (their covers credit Getty/Shutterstock/iStock), so any permission
 *    must confirm Klett can grant for these specific ISBNs.
 *
 * TODO(casa): request written permission from pr@klett-sprachen.de (cc
 * abdruckanfrage@klett-sprachen.de), naming the ISBNs below, the page URL, the
 * display size, and that each cover links back to the Klett product page. When
 * the reply is on file, set `coverSrc` per entry and add an
 * "not affiliated with / endorsed by Ernst Klett Sprachen GmbH" note near the
 * covers. Until then the UI shows a designed stand-in that does not imitate
 * Klett artwork, and names the book in text — which is ordinary descriptive use.
 */

export type KlettSeries = 'netzwerk-neu' | 'kontext';

export type KlettTextbook = {
  /** CASA's CEFR label for the level this book is used at. */
  level: string;
  series: KlettSeries;
  seriesLabel: string;
  /** Short display title. */
  title: string;
  /** Full product title exactly as Klett publishes it. */
  fullTitle: string;
  /** ISBN-13 of the Kursbuch, verified against klett-sprachen.de. */
  isbn: string;
  /** Official product page on klett-sprachen.de. */
  productUrl: string;
  /**
   * Klett's own cover asset. NOT RENDERED — see the licensing note above.
   * Kept so that enabling covers is a one-line change once permission is on file.
   */
  publisherCoverUrl: string;
  /** Licensed local asset under /media/klett/. Absent → designed stand-in. */
  coverSrc?: string;
  /**
   * Permission gate. A cover is rendered ONLY when this is 'granted' AND
   * `coverSrc` is set. Kept as data rather than a code comment so the licensing
   * position survives refactors and cannot be quietly assumed away.
   */
  coverPermission: 'none' | 'requested' | 'granted';
};

export const seriesAccent: Record<KlettSeries, { bg: string }> = {
  'netzwerk-neu': { bg: 'var(--casa-blue)' },
  kontext: { bg: 'var(--casa-coral)' },
};

/** Keyed by the level ids used in `level-progression-timeline.tsx`. */
export const klettTextbookByLevelId: Record<string, KlettTextbook> = {
  a1: {
    level: 'A1',
    series: 'netzwerk-neu',
    seriesLabel: 'Netzwerk neu',
    title: 'Netzwerk neu A1',
    fullTitle: 'Netzwerk neu A1: Kursbuch mit Audios und Videos',
    isbn: '978-3-12-607156-7',
    productUrl: 'https://www.klett-sprachen.de/netzwerk-neu-a1/t-1/9783126071567',
    publisherCoverUrl:
      'https://res.cloudinary.com/pim-red/image/upload/q_auto,f_auto,w_720/v1690409761/klett/cover/9783126071567.jpg',
    coverPermission: 'none',
  },
  a2: {
    level: 'A2',
    series: 'netzwerk-neu',
    seriesLabel: 'Netzwerk neu',
    title: 'Netzwerk neu A2',
    fullTitle: 'Netzwerk neu A2: Kursbuch mit Audios und Videos',
    isbn: '978-3-12-607164-2',
    productUrl: 'https://www.klett-sprachen.de/netzwerk-neu-a2/t-1/9783126071642',
    publisherCoverUrl:
      'https://res.cloudinary.com/pim-red/image/upload/q_auto,f_auto,w_720/v1591222501/klett/cover/9783126071642.jpg',
    coverPermission: 'none',
  },
  b1: {
    level: 'B1',
    series: 'netzwerk-neu',
    seriesLabel: 'Netzwerk neu',
    title: 'Netzwerk neu B1',
    fullTitle: 'Netzwerk neu B1: Kursbuch mit Audios und Videos',
    isbn: '978-3-12-607172-7',
    productUrl: 'https://www.klett-sprachen.de/netzwerk-neu-b1/t-1/9783126071727',
    publisherCoverUrl:
      'https://res.cloudinary.com/pim-red/image/upload/q_auto,f_auto,w_720/v1690409748/klett/cover/9783126071727.jpg',
    coverPermission: 'none',
  },
  /** Not a tab on the timeline today, but CASA bills B1+ as its own step. */
  b1plus: {
    level: 'B1+',
    series: 'kontext',
    seriesLabel: 'Kontext',
    title: 'Kontext B1+',
    fullTitle: 'Kontext B1+: Kursbuch mit Audios und Videos',
    isbn: '978-3-12-605334-1',
    productUrl: 'https://www.klett-sprachen.de/kontext-b1/t-1/9783126053341',
    publisherCoverUrl:
      'https://res.cloudinary.com/pim-red/image/upload/q_auto,f_auto,w_720/v1632435314/klett/cover/9783126053341.jpg',
    coverPermission: 'none',
  },
  b2: {
    level: 'B2',
    series: 'kontext',
    seriesLabel: 'Kontext',
    title: 'Kontext B2',
    fullTitle: 'Kontext B2: Kursbuch mit Audios und Videos',
    isbn: '978-3-12-605342-6',
    productUrl: 'https://www.klett-sprachen.de/kontext-b2/t-1/9783126053426',
    publisherCoverUrl:
      'https://res.cloudinary.com/pim-red/image/upload/q_auto,f_auto,w_720/v1668813301/klett/cover/9783126053426.jpg',
    coverPermission: 'none',
  },
  c1: {
    level: 'C1',
    series: 'kontext',
    seriesLabel: 'Kontext',
    title: 'Kontext C1',
    fullTitle:
      'Kontext C1 – Hybride Ausgabe allango: Kursbuch mit Audios und Videos inklusive Lizenzschlüssel allango (24 Monate)',
    isbn: '978-3-12-605349-5',
    productUrl: 'https://www.klett-sprachen.de/kontext-c1-hybride-ausgabe-allango/t-1/9783126053495',
    publisherCoverUrl:
      'https://res.cloudinary.com/pim-red/image/upload/q_auto,f_auto,w_720/v1710890104/klett/cover/9783126053495.jpg',
    coverPermission: 'none',
  },
};
