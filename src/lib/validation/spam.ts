/**
 * WHAT LOOKS LIKE SPAM (2026-10-21, Rahman: „what if it is spam, we need spam protection").
 *
 * Beside the honeypot and the per-visitor limit, two signs a person did not write it: a message
 * full of links, and a form sent faster than anyone types it. Such a submission is still stored,
 * marked „Spam" so it is in no list and sends no mail; a colleague can look at it and delete it
 * (/admin/enquiries, „Spam löschen"). Nothing is refused on a guess. Client-safe.
 */
const LINK = /(https?:\/\/|www\.|\[url=)/gi;

/** Faster than this from opening the form to sending it is not a person typing. */
export const MIN_FILL_MS = 3000;

export function looksLikeSpam({ message, elapsedMs }: { message: string; elapsedMs?: number | null }): boolean {
  if ((message.match(LINK) ?? []).length >= 3) return true;
  return typeof elapsedMs === 'number' && elapsedMs >= 0 && elapsedMs < MIN_FILL_MS;
}
