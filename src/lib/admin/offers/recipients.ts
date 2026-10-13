import 'server-only';

import type { PoolClient } from 'pg';

import type { StaffUser } from '../auth';
import { query, queryFirst } from '../db';
import { normalizeEmail } from '../normalize';
import { toDateInputValue } from '@/lib/dates';

import { stayedBeforeSql, studiedBeforeSql } from './course-catalogue';
import { choicesFromBrief, participantsFromBrief } from './from-enquiry';
import { comparableName, countryFromEmail, guessKind, languageFor, organisationDomain, sameName } from './recipient-guess';
import { normaliseStay } from './schema';
import { ORGANISATION_KINDS, formatOfferNumber, type OfferLanguage, type OrganisationKind, type Salutation } from './types';
import type {
  ContactInput,
  NewOfferInput,
  OrganisationContact,
  OrganisationForOffer,
  PersonHit,
  RecipientFilter,
  RecipientHit,
  RecipientMatch,
  WizardStart,
} from './wizard';

/**
 * Who an offer is for: the schools, agencies, companies and public bodies in
 * `organisations` with their contacts, and the learners in `people`. The new
 * offer's wizard searches them, warns before a second copy of one is made, and
 * creates the one that is really new (docs/OFFERS.md §New offer).
 */

const KIND_WORD: Record<OrganisationKind, string> = {
  school: 'School',
  agency: 'Agency',
  company: 'Company',
  public_body: 'Public body',
  other: 'Organisation',
};

const day = (d: Date) => toDateInputValue(d).split('-').reverse().join('.');
const trimCode = (c: string | null) => (c ? c.trim() : null);
const fullName = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(' ');
const peopleSalutation = (s: string | null): Salutation => (s === 'ms' || s === 'mr' ? s : 'none');

// ----------------------------------------------------------------- search

/**
 * What matches what is typed: group and company enquiries still waiting for
 * an offer, organisations (by their name, or a contact's name or address),
 * and learners (by name or address). With nothing typed, the enquiries
 * waiting and the organisations written to last.
 */
export async function findRecipients(q: string, filter: RecipientFilter = 'all'): Promise<RecipientHit[]> {
  const term = q.trim().toLowerCase();
  const like = `%${term}%`;
  const orgKind = filter === 'all' || filter === 'person' ? null : filter;

  const [enquiries, orgs, people] = await Promise.all([
    filter === 'all'
      ? query<{ id: string; kind: 'group' | 'company' | 'general'; first_name: string; last_name: string | null; brief: Record<string, unknown> | null; submitted_at: Date }>(
          `SELECT e.id, e.kind, e.first_name, e.last_name, e.organiser_brief AS brief, e.submitted_at
             FROM enquiries e
            WHERE e.kind IN ('group', 'company')
              AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.enquiry_id = e.id AND o.deleted_at IS NULL)
              AND ($1 = '' OR lower(coalesce(e.organiser_brief->>'organisationName', '') || ' ' || e.first_name || ' ' || coalesce(e.last_name, '') || ' ' || e.email) LIKE $2)
            ORDER BY e.submitted_at DESC LIMIT 5`,
          [term, like]
        )
      : Promise.resolve([]),
    filter === 'person'
      ? Promise.resolve([])
      : query<{ id: string; name: string; kind: OrganisationKind; language: OfferLanguage; country_code: string | null; country: string | null; contact: string | null; offers: string; last: Date | null }>(
          `SELECT g.id, g.name, g.kind, g.language, g.country_code, c.name_en AS country,
                  (SELECT nullif(concat_ws(' ', oc.first_name, oc.last_name), '') FROM organisation_contacts oc
                    WHERE oc.organisation_id = g.id ORDER BY oc.last_written_at DESC LIMIT 1) AS contact,
                  (SELECT count(*) FROM offers o WHERE o.organisation_id = g.id AND o.deleted_at IS NULL) AS offers,
                  (SELECT max(o.created_at) FROM offers o WHERE o.organisation_id = g.id AND o.deleted_at IS NULL) AS last
             FROM organisations g
             LEFT JOIN countries c ON c.code = g.country_code
            WHERE ($1 = '' OR lower(g.name) LIKE $2
                   OR EXISTS (SELECT 1 FROM organisation_contacts oc WHERE oc.organisation_id = g.id
                                AND (lower(concat_ws(' ', oc.first_name, oc.last_name)) LIKE $2 OR lower(oc.email) LIKE $2)))
              AND ($3::text IS NULL OR g.kind = $3)
            ORDER BY last DESC NULLS LAST, lower(g.name) LIMIT $4`,
          [term, like, orgKind, term ? 8 : 5]
        ),
    (filter === 'all' && term.length >= 2) || filter === 'person'
      ? query<PersonRow>(
          `SELECT p.id, p.salutation::text AS salutation, p.first_name, p.last_name, p.nationality_code,
                  (SELECT address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at DESC LIMIT 1) AS email,
                  (SELECT number FROM phones ph WHERE ph.person_id = p.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1) AS phone,
                  (SELECT count(*) FROM bookings b WHERE b.person_id = p.id AND b.deleted_at IS NULL) AS bookings,
                  ${studiedBeforeSql('p.id')} AS studied, ${stayedBeforeSql('p.id')} AS stayed
             FROM people p
            WHERE p.deleted_at IS NULL AND p.merged_into IS NULL
              AND ($1 = '' OR lower(p.first_name || ' ' || coalesce(p.last_name, '')) LIKE $2
                   OR EXISTS (SELECT 1 FROM emails e WHERE e.person_id = p.id AND lower(e.address) LIKE $2))
            ORDER BY p.updated_at DESC LIMIT 8`,
          [term, like]
        )
      : Promise.resolve([]),
  ]);

  return [
    ...enquiries.map((e): RecipientHit => {
      const org = typeof e.brief?.organisationName === 'string' ? (e.brief.organisationName as string) : '';
      const size = e.brief?.groupSize ? `${e.brief.groupSize} people` : '';
      const when = typeof e.brief?.preferredDates === 'string' ? (e.brief.preferredDates as string) : '';
      return {
        type: 'enquiry',
        id: e.id,
        name: org || fullName(e.first_name, e.last_name),
        detail: [e.kind === 'company' ? 'Company enquiry' : 'Group enquiry', day(e.submitted_at), size, when].filter(Boolean).join(' · '),
        enquiryKind: e.kind,
      };
    }),
    ...orgs.map((o): RecipientHit => {
      const n = Number(o.offers);
      return {
        type: 'organisation',
        id: o.id,
        name: o.name,
        kind: o.kind,
        detail: [KIND_WORD[o.kind], o.country, o.contact, n ? `${n === 1 ? '1 offer' : `${n} offers`}${o.last ? `, last ${day(o.last)}` : ''}` : ''].filter(Boolean).join(' · '),
        language: o.language,
        countryCode: trimCode(o.country_code),
      };
    }),
    ...people.map((p): RecipientHit => personHit(p)),
  ];
}

type PersonRow = {
  id: string;
  salutation: string | null;
  first_name: string;
  last_name: string | null;
  nationality_code: string | null;
  email: string | null;
  phone: string | null;
  bookings: string;
  studied: boolean;
  stayed: boolean;
};

function personHit(p: PersonRow): PersonHit {
  const bookings = Number(p.bookings ?? 0);
  return {
    type: 'person',
    id: p.id,
    name: fullName(p.first_name, p.last_name),
    detail: [bookings ? `Student · ${bookings === 1 ? '1 booking' : `${bookings} bookings`}` : 'Person', p.email].filter(Boolean).join(' · '),
    salutation: peopleSalutation(p.salutation),
    firstName: p.first_name,
    lastName: p.last_name ?? '',
    email: p.email,
    countryCode: trimCode(p.nationality_code),
    phone: p.phone,
    bookings,
    studiedBefore: Boolean(p.studied),
    stayedBefore: Boolean(p.stayed),
  };
}

// ------------------------------------------------------- one organisation

export async function organisationForOffer(id: string): Promise<OrganisationForOffer | null> {
  const org = await queryFirst<{ id: string; name: string; kind: OrganisationKind; address: string | null; country_code: string | null; language: OfferLanguage }>(
    `SELECT id, name, kind, address, country_code, language FROM organisations WHERE id = $1`,
    [id]
  );
  if (!org) return null;
  const [contacts, last] = await Promise.all([
    query<{ id: string; salutation: Salutation; first_name: string | null; last_name: string | null; email: string | null }>(
      `SELECT id, salutation, first_name, last_name, email FROM organisation_contacts
        WHERE organisation_id = $1 ORDER BY last_written_at DESC LIMIT 12`,
      [id]
    ),
    queryFirst<{ id: string; year: number; seq: number; kind: 'group' | 'individual'; title: string; group_name: string | null; stay: unknown; participants: number | null; escorts: number; status: string; arrival: Date | null; created_at: Date }>(
      `SELECT id, year, seq, kind, title, group_name, stay, participants, escorts, status, arrival, created_at
         FROM offers WHERE organisation_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [id]
    ),
  ]);
  return {
    id: org.id,
    name: org.name,
    kind: org.kind,
    address: org.address ?? '',
    countryCode: trimCode(org.country_code),
    language: org.language,
    contacts: contacts.map(contactFromRow),
    lastOffer: last
      ? {
          id: last.id,
          number: formatOfferNumber(last.year, last.seq),
          kind: last.kind,
          title: last.title,
          groupName: last.group_name ?? '',
          package: normaliseStay(last.stay).choices.package,
          participants: last.participants,
          escorts: last.escorts,
          status: last.status,
          year: String((last.arrival ?? last.created_at).getFullYear()),
        }
      : null,
  };
}

function contactFromRow(c: { id: string; salutation: Salutation; first_name: string | null; last_name: string | null; email: string | null }): OrganisationContact {
  return { id: c.id, salutation: c.salutation, firstName: c.first_name ?? '', lastName: c.last_name ?? '', email: c.email ?? '' };
}

// --------------------------------------------------------- a second copy?

/**
 * Recipients CASA already has that a new one may be: an organisation with the
 * same name written another way, one whose contacts write from the same mail
 * domain, anyone with the same address, a learner with the same name.
 */
export async function matchRecipients({ name, email }: { name: string; email: string }): Promise<RecipientMatch[]> {
  const out: RecipientMatch[] = [];
  const seen = new Set<string>();
  const add = (m: RecipientMatch) => {
    if (seen.has(`${m.type}:${m.id}`)) return;
    seen.add(`${m.type}:${m.id}`);
    out.push(m);
  };

  const address = email.trim() ? normalizeEmail(email) : '';
  const domain = organisationDomain(email);
  const tokens = comparableName(name).split(' ').filter((t) => t.length >= 3).sort((a, b) => b.length - a.length);

  const [byName, byDomain, byAddress, peopleByAddress, peopleByName] = await Promise.all([
    tokens.length
      ? query<{ id: string; name: string }>(`SELECT id, name FROM organisations WHERE lower(name) LIKE $1 LIMIT 40`, [`%${tokens[0]}%`])
      : Promise.resolve([]),
    domain
      ? query<{ id: string; name: string }>(
          `SELECT DISTINCT g.id, g.name FROM organisations g JOIN organisation_contacts oc ON oc.organisation_id = g.id
            WHERE lower(oc.email) LIKE $1 LIMIT 5`,
          [`%@${domain}`]
        )
      : Promise.resolve([]),
    address
      ? query<{ id: string; name: string }>(
          `SELECT DISTINCT g.id, g.name FROM organisations g JOIN organisation_contacts oc ON oc.organisation_id = g.id
            WHERE lower(oc.email) = $1 LIMIT 5`,
          [address]
        )
      : Promise.resolve([]),
    address
      ? query<{ id: string; first_name: string; last_name: string | null }>(
          `SELECT DISTINCT p.id, p.first_name, p.last_name FROM emails e JOIN people p ON p.id = canonical_person_id(e.person_id)
            WHERE e.normalized = $1 AND p.deleted_at IS NULL LIMIT 5`,
          [address]
        )
      : Promise.resolve([]),
    name.trim().split(/\s+/).length >= 2
      ? query<{ id: string; first_name: string; last_name: string | null }>(
          `SELECT id, first_name, last_name FROM people
            WHERE deleted_at IS NULL AND merged_into IS NULL
              AND lower(first_name || ' ' || coalesce(last_name, '')) = $1 LIMIT 5`,
          [name.trim().toLowerCase().replace(/\s+/g, ' ')]
        )
      : Promise.resolve([]),
  ]);

  for (const o of byAddress) add({ type: 'organisation', id: o.id, name: o.name, reason: 'Has this address' });
  for (const p of peopleByAddress) add({ type: 'person', id: p.id, name: fullName(p.first_name, p.last_name), reason: 'Has this address' });
  for (const o of byName.filter((o) => sameName(o.name, name))) add({ type: 'organisation', id: o.id, name: o.name, reason: 'The same name' });
  for (const o of byDomain) add({ type: 'organisation', id: o.id, name: o.name, reason: `Writes from @${domain}` });
  for (const p of peopleByName) add({ type: 'person', id: p.id, name: fullName(p.first_name, p.last_name), reason: 'The same name' });
  return out.slice(0, 5);
}

// ---------------------------------------------------- opened from a record

async function personById(id: string): Promise<PersonHit | null> {
  const p = await queryFirst<PersonRow>(
    `SELECT p.id, p.salutation::text AS salutation, p.first_name, p.last_name, p.nationality_code,
            (SELECT address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at DESC LIMIT 1) AS email,
            (SELECT number FROM phones ph WHERE ph.person_id = p.id ORDER BY ph.is_primary DESC, ph.created_at DESC LIMIT 1) AS phone,
            (SELECT count(*) FROM bookings b WHERE b.person_id = p.id AND b.deleted_at IS NULL) AS bookings,
            ${studiedBeforeSql('p.id')} AS studied, ${stayedBeforeSql('p.id')} AS stayed
       FROM people p WHERE p.id = canonical_person_id($1) AND p.deleted_at IS NULL`,
    [id]
  );
  return p ? personHit(p) : null;
}

const asOrganisationKind = (k: string | null, fallback: OrganisationKind): OrganisationKind =>
  k && (ORGANISATION_KINDS as readonly string[]).includes(k) ? (k as OrganisationKind) : fallback;

/**
 * Where the wizard starts when "Make an offer" is pressed on a record. A group
 * enquiry brings its organiser — matched to the organisation CASA already has,
 * or as a new one with its kind and country guessed — and its brief: the
 * package, the size, the weeks.
 */
export async function wizardStart(from: { enquiryId?: string; personId?: string; organisationId?: string }): Promise<WizardStart | null> {
  if (from.enquiryId) {
    const e = await queryFirst<{ id: string; kind: 'general' | 'group' | 'company'; locale: string; first_name: string; last_name: string | null; email: string; person_id: string | null; brief: Record<string, unknown> | null }>(
      `SELECT id, kind, locale, first_name, last_name, email, person_id, organiser_brief AS brief FROM enquiries WHERE id = $1`,
      [from.enquiryId]
    );
    if (!e) return null;
    const group = e.kind === 'group';
    const contact: ContactInput = { salutation: 'none', firstName: e.first_name, lastName: e.last_name ?? '', email: e.email };
    const orgName = typeof e.brief?.organisationName === 'string' ? e.brief.organisationName.trim() : '';
    const country = countryFromEmail(e.email);
    const preferred = typeof e.brief?.preferredDates === 'string' ? e.brief.preferredDates.trim() : '';
    const base = {
      enquiryId: e.id,
      enquiryNote: preferred ? `Preferred dates: ${preferred}` : null,
      kind: group ? ('group' as const) : ('individual' as const),
      group: group
        ? (() => {
            const c = choicesFromBrief(e.brief);
            return { package: c.package, weeks: c.weeks, participants: participantsFromBrief(e.brief) };
          })()
        : null,
      language: e.locale === 'de' ? ('de' as const) : languageFor(country),
    };

    if (orgName) {
      const candidates = await query<{ id: string; name: string }>(
        `SELECT id, name FROM organisations WHERE lower(name) LIKE $1 LIMIT 40`,
        [`%${comparableName(orgName).split(' ').sort((a, b) => b.length - a.length)[0] ?? ''}%`]
      );
      const known = candidates.find((o) => sameName(o.name, orgName));
      const organisation = known ? await organisationForOffer(known.id) : null;
      if (organisation) {
        const contactId = organisation.contacts.find((c) => c.email.toLowerCase() === e.email.toLowerCase())?.id ?? null;
        return { ...base, recipient: { type: 'organisation', organisation, contactId, newContact: contactId ? null : contact } };
      }
      const guessed = guessKind(orgName);
      return {
        ...base,
        recipient: {
          type: 'new-organisation',
          name: orgName,
          kind: asOrganisationKind(guessed === 'person' ? null : guessed, e.kind === 'company' ? 'company' : 'school'),
          countryCode: country,
          contact,
        },
      };
    }
    const person = e.person_id ? await personById(e.person_id) : null;
    return { ...base, recipient: person ? { type: 'person', person } : null };
  }

  if (from.personId) {
    const person = await personById(from.personId);
    if (!person) return null;
    return { recipient: { type: 'person', person }, enquiryId: null, enquiryNote: null, kind: 'individual', group: null, language: 'de' };
  }

  if (from.organisationId) {
    const organisation = await organisationForOffer(from.organisationId);
    if (!organisation) return null;
    const group = organisation.kind === 'school' || organisation.kind === 'agency';
    return {
      recipient: { type: 'organisation', organisation, contactId: organisation.contacts[0]?.id ?? null, newContact: null },
      enquiryId: null,
      enquiryNote: null,
      kind: group ? 'group' : 'individual',
      group: null,
      language: organisation.language,
    };
  }
  return null;
}

// ------------------------------------------------------------- creating

export type ResolvedRecipient = {
  organisationId: string | null;
  personId: string | null;
  name: string;
  salutation: Salutation;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  countryCode: string | null;
};

const hasContact = (c: ContactInput | null): c is ContactInput => Boolean(c && (c.firstName || c.lastName || c.email));

/** A contact at an organisation, found again by their address and brought up to date. */
export async function upsertContact(client: PoolClient, organisationId: string, c: ContactInput, actor: StaffUser | null): Promise<string> {
  const email = c.email.trim() || null;
  if (email) {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO organisation_contacts (organisation_id, salutation, first_name, last_name, email, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (organisation_id, lower(email)) WHERE email IS NOT NULL
       DO UPDATE SET salutation = EXCLUDED.salutation,
                     first_name = coalesce(EXCLUDED.first_name, organisation_contacts.first_name),
                     last_name = coalesce(EXCLUDED.last_name, organisation_contacts.last_name),
                     last_written_at = timezone('utc', now())
       RETURNING id`,
      [organisationId, c.salutation, c.firstName.trim() || null, c.lastName.trim() || null, email, actor?.id ?? null]
    );
    return rows[0].id;
  }
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO organisation_contacts (organisation_id, salutation, first_name, last_name, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [organisationId, c.salutation, c.firstName.trim() || null, c.lastName.trim() || null, actor?.id ?? null]
  );
  return rows[0].id;
}

/**
 * The recipient of a new offer, found or created inside the offer's own
 * transaction. A new learner whose address CASA already has is that learner,
 * not a second row.
 */
export async function resolveRecipient(client: PoolClient, r: NewOfferInput['recipient'], language: OfferLanguage, actor: StaffUser): Promise<ResolvedRecipient> {
  if (r.type === 'organisation' || r.type === 'new-organisation') {
    let orgId: string;
    let name: string;
    let address: string;
    let countryCode: string | null;
    if (r.type === 'organisation') {
      const { rows } = await client.query<{ id: string; name: string; address: string | null; country_code: string | null }>(
        `SELECT id, name, address, country_code FROM organisations WHERE id = $1`,
        [r.id]
      );
      if (!rows[0]) throw new Error('This organisation no longer exists.');
      ({ id: orgId, name } = rows[0]);
      address = rows[0].address ?? '';
      countryCode = trimCode(rows[0].country_code);
    } else {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO organisations (name, kind, address, country_code, language, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [r.name, r.kind, r.address.trim() || null, r.countryCode, language, actor.id]
      );
      orgId = rows[0].id;
      name = r.name;
      address = r.address.trim();
      countryCode = r.countryCode;
    }

    let contact: ContactInput | null = r.type === 'organisation' ? r.newContact : r.contact;
    if (r.type === 'organisation' && r.contactId) {
      const { rows } = await client.query<{ id: string; salutation: Salutation; first_name: string | null; last_name: string | null; email: string | null }>(
        `SELECT id, salutation, first_name, last_name, email FROM organisation_contacts WHERE id = $1 AND organisation_id = $2`,
        [r.contactId, orgId]
      );
      contact = rows[0] ? { ...contactFromRow(rows[0]) } : null;
    } else if (hasContact(contact)) {
      await upsertContact(client, orgId, contact, actor);
    }
    return {
      organisationId: orgId,
      personId: null,
      name,
      salutation: contact?.salutation ?? 'none',
      firstName: contact?.firstName ?? '',
      lastName: contact?.lastName ?? '',
      email: contact?.email ?? '',
      address,
      countryCode,
    };
  }

  let personId: string | null = r.type === 'person' ? r.id : null;
  if (r.type === 'new-person') {
    if (r.email) {
      const { rows } = await client.query<{ id: string }>(
        `SELECT canonical_person_id(e.person_id) AS id FROM emails e JOIN people p ON p.id = e.person_id
          WHERE e.normalized = $1 AND p.deleted_at IS NULL LIMIT 1`,
        [normalizeEmail(r.email)]
      );
      personId = rows[0]?.id ?? null;
    }
    if (!personId) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO people (salutation, first_name, last_name, nationality_code, created_by)
         VALUES ($1::salutation, $2, $3, $4, $5) RETURNING id`,
        [r.salutation === 'none' ? null : r.salutation, r.firstName, r.lastName || null, r.countryCode, `staff:${actor.id}`]
      );
      personId = rows[0].id;
      if (r.email) {
        await client.query(`INSERT INTO emails (person_id, address, normalized) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [
          personId,
          r.email,
          normalizeEmail(r.email),
        ]);
      }
      await client.query(
        `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action) VALUES ($1, $2, 'person', $3, 'person_created')`,
        [actor.id, actor.name, personId]
      );
    }
  }

  const { rows } = await client.query<{ id: string; salutation: string | null; first_name: string; last_name: string | null; nationality_code: string | null; email: string | null }>(
    `SELECT p.id, p.salutation::text AS salutation, p.first_name, p.last_name, p.nationality_code,
            (SELECT address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at DESC LIMIT 1) AS email
       FROM people p WHERE p.id = canonical_person_id($1) AND p.deleted_at IS NULL`,
    [personId]
  );
  const p = rows[0];
  if (!p) throw new Error('This person no longer exists.');
  return {
    organisationId: null,
    personId: p.id,
    name: fullName(p.first_name, p.last_name),
    salutation: peopleSalutation(p.salutation),
    firstName: p.first_name,
    lastName: p.last_name ?? '',
    email: p.email ?? '',
    address: '',
    countryCode: trimCode(p.nationality_code),
  };
}
