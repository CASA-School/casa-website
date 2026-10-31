import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { Bilingual } from './i18n';
import { linkPerson, listPerson } from './people';
import type { MatchFacts } from './person-match-rules';
import { toDateInputValue } from '@/lib/dates';

/**
 * Who sent a registration, decided (2026-10-31): the person the website made for it is someone already
 * at CASA — „Das ist …", the two become one (`linkPerson`, undone by „Trennen") — or someone new, put on
 * the register. Asked once per registration, on its page; the bookings made from it then belong to the
 * one person, with everything they did here before.
 */

/** What a registration says about its sender, as the matching rule compares it. */
export function registrationFacts(contact: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: Date | null;
  nationalityCode: string | null;
}): MatchFacts {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    birthDate: toDateInputValue(contact.birthDate) || null,
    emails: [contact.email],
    phones: [contact.phone],
    nationalityCode: contact.nationalityCode,
  };
}

type Sender = { person_id: string; merged_into: string | null; merged_name: string | null };

async function senderOf(registrationId: string): Promise<Sender | undefined> {
  return queryFirst<Sender>(
    `SELECT g.person_id, p.merged_into, (SELECT concat_ws(' ', m.first_name, m.last_name) FROM people m WHERE m.id = p.merged_into) AS merged_name
       FROM registrations g JOIN people p ON p.id = g.person_id WHERE g.id = $1`,
    [registrationId]
  );
}

/** „Das ist …": the sender is this person at CASA. A sender joined to someone else before is moved. */
export async function confirmRegistrationPerson(registrationId: string, personId: string, actor: StaffUser): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const sender = await senderOf(registrationId);
  if (!sender) return { ok: false, reason: { de: 'Diese Anmeldung hat keine Person.', en: 'This registration has no person.' } };
  const target = await queryFirst<{ id: string; name: string }>(
    `SELECT p.id, concat_ws(' ', p.first_name, p.last_name) AS name FROM people p WHERE p.id = canonical_person_id($1) AND p.deleted_at IS NULL`,
    [personId]
  );
  if (!target) return { ok: false, reason: { de: 'Diese Person gibt es nicht mehr.', en: 'That person no longer exists.' } };
  if (sender.merged_into === target.id) return { ok: true };
  if (sender.merged_into) await query(`UPDATE people SET merged_into = NULL WHERE id = $1`, [sender.person_id]);
  const result = await linkPerson({ duplicateId: sender.person_id, survivorId: target.id, actor });
  if (!result.ok) {
    if (sender.merged_into) await query(`UPDATE people SET merged_into = $2 WHERE id = $1`, [sender.person_id, sender.merged_into]);
    return result;
  }
  await logActivity({ actor, entity: 'registration', entityId: registrationId, action: 'registration_person_confirmed', detail: { person: target.id, name: target.name } });
  return { ok: true };
}

/** „Neue Person": nobody at CASA is the sender; they go on the register, and the question is answered. */
export async function newRegistrationPerson(registrationId: string, actor: StaffUser): Promise<boolean> {
  const sender = await senderOf(registrationId);
  if (!sender) return false;
  if (sender.merged_into) await query(`UPDATE people SET merged_into = NULL WHERE id = $1`, [sender.person_id]);
  await listPerson({ personId: sender.person_id, actor });
  await query(
    `UPDATE record_flags f SET resolved_at = now(), resolved_by = $3
      WHERE f.code = 'duplicate_candidate' AND f.resolved_at IS NULL
        AND ((f.entity = 'person' AND f.entity_id = $2)
          OR (f.entity = 'course_registration' AND f.entity_id IN (SELECT id FROM course_registrations WHERE registration_id = $1))
          OR (f.entity = 'exam_registration' AND f.entity_id IN (SELECT id FROM exam_registrations WHERE registration_id = $1)))`,
    [registrationId, sender.person_id, actor.id]
  );
  await logActivity({ actor, entity: 'registration', entityId: registrationId, action: 'registration_person_new' });
  return true;
}

/** „Trennen": the sender is not the person they were joined to after all. */
export async function separateRegistrationPerson(registrationId: string, actor: StaffUser): Promise<boolean> {
  const sender = await senderOf(registrationId);
  if (!sender?.merged_into) return false;
  await query(`UPDATE people SET merged_into = NULL WHERE id = $1`, [sender.person_id]);
  await logActivity({ actor, entity: 'person', entityId: sender.person_id, action: 'person_unlinked' });
  await logActivity({ actor, entity: 'registration', entityId: registrationId, action: 'registration_person_separated', detail: { name: sender.merged_name } });
  return true;
}
