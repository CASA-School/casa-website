/**
 * What a colleague types to sign in: their full name or their Outlook address.
 *
 * A name is matched on a folded key — lower case, accents and spacing folded —
 * so „Natália Sostres", „natalia sostres" and „Natalia  Sostres" are one person.
 * Migration 0020 backfilled the same key in SQL for the accents CASA's names use;
 * this is the definition, and the Team screen recomputes it on every save.
 */

export function usernameKey(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[øØ]/g, 'o');
}

/**
 * The keys a typed name may match: as typed, and with ae/oe/ue read as ä/ö/ü,
 * for a keyboard without umlauts („Mueller" for „Müller"). The exact form wins
 * when both match different people.
 */
export function usernameCandidates(typed: string): string[] {
  const exact = usernameKey(typed);
  const spelledOut = usernameKey(typed.replace(/ae/gi, 'a').replace(/oe/gi, 'o').replace(/ue/gi, 'u'));
  return exact === spelledOut ? [exact] : [exact, spelledOut];
}

export const looksLikeEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());

/** The display form of a username: trimmed, single spaces. */
export const cleanUsername = (name: string) => name.trim().replace(/\s+/g, ' ');
