/**
 * The "new website" notice (2026-10-09).
 *
 * A small card in the bottom-left corner telling visitors that this is CASA's
 * new website, that it is still being improved, and where to say what is
 * missing. It runs on the preview (neu.casa-bremen.de) now and for six to eight
 * weeks after the switch from the old site, then goes: set `enabled` to false.
 *
 * Deliberately not a bar across the top: every hero fills the viewport minus
 * the navbar, and a banner announcing that things may not work reads as a
 * warning at exactly the moment a visitor decides whether to trust the school.
 *
 * Closing it holds for the rest of the visit, in memory. It is not remembered
 * across visits, because the privacy policy (§5) states that the public site
 * stores nothing in the browser; remembering it would need that section
 * changed first.
 */
export const NEW_SITE_NOTICE = {
  enabled: true,
  /** Opens the contact form on this topic (`topicCatalog` in the contact page). */
  feedbackTopic: 'website-feedback',
} as const;
