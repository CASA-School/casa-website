import { teamContactById } from '@/config/content/team-spotlights';
import type { ContentLocale } from '@/lib/content/types';

/**
 * WHO ANSWERS, PER SURFACE — one list, for every "Your decision" card.
 *
 * Before this, the named contact lived in three places and covered one page.
 * /courses/german-for-groups had Ina Eismann in `courseProfiles`,
 * /accommodation/[type] had Mareike Thomeczek written inline in its own JSX, and
 * /exams/[code] had nobody — so an exam candidate's card ended on "Session dates
 * and deadlines are updated continuously", which answers no question and names
 * no one. Everything else fell back to the shared office inbox.
 *
 * ASSIGNED BY CASA on 2026-09-08. This is the operative allocation, and where it
 * differs from what casa-bremen.de/ueber-uns/casa-team currently prints, this
 * list wins — a published team page goes stale, and the person who told us this
 * works there. Three of the assignments do differ from that page's `areas`,
 * flagged individually below so the next reader can re-confirm rather than
 * assume.
 *
 * NAMES ARE NOT WRITTEN HERE. Each entry points at a `TEAM` id and the name is
 * read from config/content/team-spotlights.ts, which is the verified roster.
 * That is deliberate: "Natàlia Sostres" and "Meike Große Hundrup" both carry
 * characters that are easy to lose (the à sits on the second a; the surname
 * takes ß, not ss), and a second hand-typed copy of a colleague's name is a
 * spelling that will eventually disagree with the first.
 *
 * EMAIL. CASA publishes role inboxes, not individual mailboxes — the single
 * exception is i.eismann@casa-bremen.de, printed on the group-courses page. So
 * every other entry routes to a published inbox, and none of these addresses is
 * invented. Give someone a personal address here only once CASA publishes it.
 */
export type CasaContact = {
  /** Id in the verified roster; the displayed name comes from there. */
  teamId: string;
  /** What this person does FOR THIS SURFACE, not their full job title. */
  role: { en: string; de: string };
  /**
   * NOT RENDERED. Kept as data, deliberately.
   *
   * The decision card used to print this address and no longer does — a card
   * meant to hold a few important facts was ending on a 28-character mailto.
   * The values stay here because two of them are not recorded anywhere else in
   * this repository (accommodation@ was found in the footer of CASA's own
   * check-in form, and i.eismann@ is the one individual mailbox CASA
   * publishes), and because the booking flow will want a fallback route.
   *
   * It is intentionally absent from `ResolvedContact`, so it cannot reach a
   * component by accident.
   */
  email: string;
  /**
   * Whether this person offers a scheduled call.
   *
   * Not everyone will: it is a real commitment on a real calendar. The two so
   * far are Ina Eismann for group programmes and Meike Große Hundrup for
   * Firmenunterricht — both cases where the buyer is scoping a programme for
   * other people rather than picking a level, which is where a call beats a
   * form. Omit the field and the card shows no button.
   */
  booking?: true;
  /** Kept so the next person can re-check rather than re-guess. */
  source: string;
};

const CONTACTS = {
  /* Printed on casa-bremen.de as the contact for group quotes, with her own
     address — the one individual mailbox CASA publishes. */
  groups: {
    teamId: 'ina-eismann',
    role: { en: 'Group programmes', de: 'Gruppenprogramme' },
    email: 'i.eismann@casa-bremen.de',
    booking: true,
    source: 'casa-bremen.de group-courses page; re-confirmed by CASA 2026-09-08',
  },

  /* Replaces Mareike Thomeczek, who was written inline on /accommodation/[type].
     The team page lists Natàlia under "Kurse & telc Prüfungen" and Mareike under
     "Kurse & Unterkunft", so this reverses what that page implies — CASA's
     instruction, 2026-09-08. Worth re-confirming at launch. */
  accommodation: {
    teamId: 'natalia-sostres',
    role: { en: 'Courses & accommodation', de: 'Kurse & Unterkunft' },
    email: 'accommodation@casa-bremen.de',
    source: 'assigned by CASA 2026-09-08 (team page still shows telc exams)',
  },

  /* CASA's own team page already lists intensive courses among her areas, so
     this is the one assignment that agrees with what is published. Same person
     as `accommodation` below — the role differs by surface, which is the point
     of keying contacts by surface rather than by person. */
  intensive: {
    teamId: 'natalia-sostres',
    role: { en: 'Intensive courses', de: 'Intensivkurse' },
    email: 'info@casa-bremen.de',
    source: 'casa-bremen.de team page areas; assigned by CASA 2026-09-08',
  },

  /* Her published areas already include evening and special courses. */
  eveningAndSpecial: {
    teamId: 'alissa-trouillet',
    role: { en: 'Evening & special courses', de: 'Abend- & Spezialkurse' },
    email: 'info@casa-bremen.de',
    source: 'casa-bremen.de team page areas; confirmed by CASA 2026-09-08',
  },

  /* Bildungszeit and the medical course. The team page prints no `areas` for her
     at all, and puts the medical/nursing courses with Alissa Trouillet — so both
     of these are CASA's instruction rather than anything published.

     No `booking`: these two are bought by an individual learner deciding on a
     course, and the register/quote button beside these facts is the action they
     came for. */
  professional: {
    teamId: 'meike-grosse-hundrup',
    role: { en: 'Courses & advice', de: 'Kurse & Beratung' },
    email: 'info@casa-bremen.de',
    source: 'assigned by CASA 2026-09-08 (not on the public team page)',
  },

  /* SAME PERSON AS `professional`, SPLIT OFF FOR THE BOOKING FLAG.
     
     Firmenunterricht is Meike Große Hundrup too, but it is the one of her three
     formats that offers a call — the second in the flow after Ina Eismann's
     group programmes, and for the same reason: a company buying training for its
     staff is scoping a programme, not picking a level, and that is a
     conversation rather than a form.
     
     Keying by surface rather than by person is what makes this a new entry
     instead of a condition inside a component. Bildungszeit and the medical
     course keep `professional` and show no button.
     
     The team page attributes Firmenunterricht to Tanja Langenickel; CASA's
     instruction of 2026-09-08 overrides that, as recorded above. */
  company: {
    teamId: 'meike-grosse-hundrup',
    role: { en: 'Company training', de: 'Firmenunterricht' },
    email: 'info@casa-bremen.de',
    booking: true,
    source: 'assigned by CASA 2026-09-08; call offered from 2026-09-08',
  },

  /* The team page gives telc exams to Natàlia Sostres and lists Tanja under
     "Kurse & Kooperationen, Firmenunterricht". CASA's instruction, 2026-09-08. */
  exams: {
    teamId: 'tanja-langenickel',
    role: { en: 'telc examinations', de: 'telc Prüfungen' },
    email: 'info@casa-bremen.de',
    source: 'assigned by CASA 2026-09-08 (team page still shows Firmenunterricht)',
  },
} as const satisfies Record<string, CasaContact>;

export type CasaContactKey = keyof typeof CONTACTS;

/** Every assignment, so a test can walk the list rather than restate it. */
export const CASA_CONTACT_KEYS = Object.keys(CONTACTS) as CasaContactKey[];

/** The shared office, for any surface with no named owner yet. */
export const OFFICE_CONTACT = {
  name: 'CASA Bremen',
  role: { en: 'Course advice team', de: 'Kursberatung' },
  email: 'info@casa-bremen.de',
} as const;

/** What a card is given: no address, and whether to offer a call. */
export type ResolvedContact = { name: string; role: string; booking: boolean };

/** Resolves a key to the name on the verified roster plus this surface's role. */
export function getCasaContact(key: CasaContactKey, locale: ContentLocale): ResolvedContact {
  const entry = CONTACTS[key];

  return {
    name: teamContactById(entry.teamId)?.name ?? OFFICE_CONTACT.name,
    role: entry.role[locale],
    booking: (entry as CasaContact).booking === true,
  };
}
