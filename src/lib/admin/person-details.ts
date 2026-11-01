import 'server-only';

import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { toDateInputValue } from '@/lib/dates';
import type { StaffUser } from './auth';
import { personContacts, removeContact, saveEmail, savePhone } from './contacts';
import { withTransaction } from './db';
import { getPerson, saveAddress, updatePerson, type PersonDetail, type PersonInput } from './people';
import type { PersonDetailsValues } from './person-details-input';

type Contacts = Awaited<ReturnType<typeof personContacts>>;

/** One serializable snapshot for the editor and its optimistic concurrency check. */
export function personDetailsValues(person: PersonDetail, contacts: Contacts): PersonDetailsValues {
  const preferredEmail = contacts.emails.find(e => e.isPrimary)?.id;
  const preferredPhone = contacts.phones.find(p => p.isPrimary)?.id;
  const address = (kind: 'local' | 'home') => {
    const a = person.addresses.find(a => a.kind === kind);
    return { street: a?.street ?? '', postcode: a?.postcode ?? '', city: a?.city ?? '', country: a?.countryName ?? '' };
  };
  const values = {
    personId: person.id,
    revision: '',
    person: {
      firstName: person.firstName, lastName: person.lastName ?? '',
      salutation: (person.salutation ?? '') as PersonDetailsValues['person']['salutation'],
      birthDate: toDateInputValue(person.birthDate), nationality: person.nationalityName ?? person.nationalityRaw ?? '',
      secondLastName: person.facts.secondLastName ?? '', nickname: person.facts.nickname ?? '',
      birthYear: person.facts.birthYear?.toString() ?? '', birthPlace: person.facts.birthPlace ?? '',
      birthCountry: person.facts.birthCountryName ?? '', motherTongue: person.facts.motherTongue ?? '',
      occupation: person.facts.occupation ?? '', passportNumber: person.facts.passportNumber ?? '',
    },
    emails: contacts.emails.map(e => ({ id: e.id, address: e.address, kind: e.kind, note: e.note ?? '', primary: e.id === preferredEmail, remove: false })),
    phones: contacts.phones.map(p => ({ id: p.id, number: p.number, kind: p.kind, primary: p.id === preferredPhone, remove: false })),
    addresses: { local: address('local'), home: address('home') },
  };
  // Preserve raw primary flags too: a linked record may have more than one.
  values.revision = createHash('sha256').update(JSON.stringify({ values, contacts })).digest('hex');
  return values;
}

/** All writes and their existing audit events use the same transaction. */
export async function savePersonDetails(values: PersonDetailsValues, input: PersonInput, actor: StaffUser): Promise<'saved' | 'changed' | 'invalid'> {
  return withTransaction(async client => {
    const locked = await client.query(
      `SELECT id FROM people WHERE id = $1 AND deleted_at IS NULL AND merged_into IS NULL FOR UPDATE`, [values.personId]
    );
    if (!locked.rowCount) return 'changed';
    const [person, contacts] = await Promise.all([getPerson(values.personId, client), personContacts(values.personId, client)]);
    if (!person) return 'changed';
    const current = personDetailsValues(person, contacts);
    if (current.revision !== values.revision) return 'changed';
    // Existing contact values are immutable; only their label/preference changes.
    // Ownership is checked before any write, including removals over linked records.
    if (values.emails.some(e => e.id && !current.emails.some(old => old.id === e.id && old.address === e.address)) ||
        values.phones.some(p => p.id && !current.phones.some(old => old.id === p.id && old.number === p.number))) return 'invalid';

    if (!isDeepStrictEqual(values.person, current.person)) await updatePerson(person.id, input, actor, client);
    for (const [channel, rows, before] of [
      ['email', values.emails, current.emails], ['phone', values.phones, current.phones],
    ] as const) {
      // Choose the preferred row last: its existing helper clears other primary flags.
      const ordered = [...rows].sort((a, b) => Number(a.primary) - Number(b.primary));
      for (const row of ordered) {
        const old = before.find(e => e.id === row.id);
        if (row.id && row.remove) {
          if (!await removeContact(person.id, channel, row.id, actor, client)) throw new Error('Contact changed while saving');
        } else if (!row.remove && !isDeepStrictEqual(row, old)) {
          const result = channel === 'email'
            ? await saveEmail(person.id, row.id, { ...(row as PersonDetailsValues['emails'][number]), note: (row as PersonDetailsValues['emails'][number]).note || null }, actor, client)
            : await savePhone(person.id, row.id, row as PersonDetailsValues['phones'][number], actor, client);
          if (!result.ok) throw new Error('Contact changed while saving');
        }
      }
    }
    for (const kind of ['local', 'home'] as const) {
      if (!isDeepStrictEqual(values.addresses[kind], current.addresses[kind])) {
        const a = values.addresses[kind];
        await saveAddress(person.id, kind, { street: a.street || null, postcode: a.postcode || null, city: a.city || null, country: a.country || null }, actor, client);
      }
    }
    return 'saved';
  });
}
