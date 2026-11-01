'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { BookingStatus, Payer } from '@/lib/admin/bookings';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { isUuid } from '@/lib/admin/ids';
import { personCandidates, type PersonCandidate } from '@/lib/admin/person-match';
import { bookRegistration } from '@/lib/admin/registration-booking';
import { confirmRegistrationPerson, newRegistrationPerson, registrationFacts, senderUndecided, separateRegistrationPerson } from '@/lib/admin/registration-person';
import { dismissSchoolmanBooking, linkToSchoolmanBooking, unlinkSchoolmanBooking } from '@/lib/admin/registration-schoolman';
import { editRegistration, getRegistration, setLineDeclined, type RegistrationEdit } from '@/lib/admin/registrations';

const SALUTATIONS = ['mr', 'ms', 'mx', 'neutral'] as const;
const STATUSES: readonly BookingStatus[] = ['reserved', 'confirmed'];
const PAYERS: readonly Payer[] = ['self', 'agency', 'company', 'other'];
const CODE = /^[a-z_]{2,40}$/;
const text = (formData: FormData, key: string, max = 200) => String(formData.get(key) ?? '').trim().slice(0, max);

function registrationId(formData: FormData): string {
  const id = String(formData.get('id') ?? '');
  if (!isUuid(id)) throw new Error('Invalid id');
  return id;
}

/**
 * „Daten bearbeiten" on an Anmeldung (0076, 0097): a colleague completes or corrects what was sent, on
 * every line at once; the visitor's own values are kept beside it. A server action is a public endpoint,
 * so it asks for `registrations` at `edit` itself (CLAUDE.md hard rule 7).
 */
export async function editRegistrationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  const back = `/admin/registrations/${id}`;
  const { lang } = await getI18n();
  const salutation = text(formData, 'salutation');
  const birthDate = text(formData, 'birthDate', 10);
  const accommodationType = text(formData, 'accommodationType');
  const input: RegistrationEdit = {
    salutation: (SALUTATIONS as readonly string[]).includes(salutation) ? (salutation as RegistrationEdit['salutation']) : 'neutral',
    firstName: text(formData, 'firstName'),
    lastName: text(formData, 'lastName'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone', 40),
    nationality: text(formData, 'nationality', 80),
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : null,
    visaRequired: formData.get('visaRequired') === 'on',
    accommodationRequired: formData.get('accommodationRequired') === 'on',
    accommodationType: accommodationType === 'flat' || accommodationType === 'host' ? accommodationType : null,
    allergies: text(formData, 'allergies', 500) || null,
    notes: text(formData, 'notes', 2000) || null,
  };
  if (!input.firstName || !input.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    redirect(`${back}?error=${encodeURIComponent(pick(lang, { de: 'Vorname, Nachname und eine gültige E-Mail-Adresse sind nötig.', en: 'First name, last name and a valid email address are needed.' }))}`);
  }
  const result = await editRegistration(id, input, actor);
  revalidatePath('/admin/registrations', 'layout');
  redirect(result.ok ? back : `${back}?error=${encodeURIComponent(pick(lang, result.reason))}`);
}

/** „Absagen" on one line, confirmed first; „Wieder öffnen" undoes it. Registrations work: `registrations` at `edit`. */
export async function setLineDeclinedAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  const back = `/admin/registrations/${id}`;
  const lineId = String(formData.get('lineId') ?? '');
  if (!isUuid(lineId)) throw new Error('Invalid lineId');
  const kind = formData.get('kind') === 'exam' ? 'exam' : 'course';
  const declined = formData.get('declined') === '1';
  if (declined && formData.get('confirmed') !== '1') redirect(back);
  const result = await setLineDeclined(id, kind, lineId, declined, actor);
  revalidatePath('/admin/registrations', 'layout');
  const { lang } = await getI18n();
  redirect(result.ok ? back : `${back}?error=${encodeURIComponent(pick(lang, result.reason))}`);
}

/**
 * „Alle buchen": the ticked lines, one booking each (lib/admin/registration-booking). It books, so it asks
 * for `bookings` at `edit`, as the booking wizard does.
 */
export async function bookRegistrationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const id = registrationId(formData);
  const back = `/admin/registrations/${id}`;
  const { t, lang } = await getI18n();
  const lineIds = formData.getAll('lineIds').map(String).filter(isUuid);
  if (await senderUndecided({ registration: id })) redirect(`${back}?error=${encodeURIComponent(t('Erst die Person klären: schon bei CASA oder neu.', 'Confirm the person first: already at CASA, or new.'))}`);
  if (!lineIds.length) redirect(`${back}?error=${encodeURIComponent(t('Wähle mindestens eine Position.', 'Choose at least one line.'))}`);
  const status = String(formData.get('status') ?? 'reserved');
  const payer = String(formData.get('payer') ?? 'self');
  if (!(STATUSES as readonly string[]).includes(status) || !(PAYERS as readonly string[]).includes(payer)) throw new Error('Invalid choice');
  const typeCode = text(formData, 'accommodationTypeCode', 40);
  const roomTypeCode = text(formData, 'roomTypeCode', 40);
  const cateringCode = text(formData, 'cateringCode', 40);
  const result = await bookRegistration(
    id,
    {
      lineIds,
      status: status as BookingStatus,
      payer: payer as Payer,
      payerName: payer === 'self' ? null : text(formData, 'payerName', 120) || null,
      includeEnrolmentFee: formData.get('includeEnrolmentFee') === '1',
      accommodation: CODE.test(typeCode)
        ? { typeCode, roomTypeCode: CODE.test(roomTypeCode) ? roomTypeCode : null, cateringCode: CODE.test(cateringCode) ? cateringCode : null }
        : null,
    },
    actor
  );
  revalidatePath('/admin', 'layout');
  if (!result) redirect(`${back}?error=${encodeURIComponent(t('Diese Anmeldung hat noch keine Person.', 'This registration has no person yet.'))}`);
  const skipped = result.skipped.map((s) => `${s.line} (${pick(lang, s.reason)})`).join(', ');
  const notice = [
    result.booked === 1 ? t('1 Buchung angelegt.', '1 booking created.') : t(`${result.booked} Buchungen angelegt.`, `${result.booked} bookings created.`),
    skipped ? t(`Nicht gebucht: ${skipped}.`, `Not booked: ${skipped}.`) : null,
  ]
    .filter(Boolean)
    .join(' ');
  redirect(`${back}?${result.skipped.length ? 'error' : 'notice'}=${encodeURIComponent(notice)}`);
}

/** The line and the SchoolMan booking a form names (0113). */
function schoolmanLink(formData: FormData) {
  const lineId = String(formData.get('lineId') ?? '');
  const bookingId = String(formData.get('bookingId') ?? '');
  if (!isUuid(lineId)) throw new Error('Invalid lineId');
  return { lineId, bookingId: isUuid(bookingId) ? bookingId : null, kind: formData.get('kind') === 'exam' ? ('exam' as const) : ('course' as const) };
}

/**
 * „Verknüpfen" on „In SchoolMan gebucht?" (0113): the booking a colleague made in SchoolMan is the line's.
 * It settles the line and links the website's person into SchoolMan's, so it asks for `registrations` at
 * `edit` (CLAUDE.md hard rule 7); the rule that offered the booking is checked again on the server.
 */
export async function linkSchoolmanBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  const back = `/admin/registrations/${id}`;
  const { lineId, bookingId, kind } = schoolmanLink(formData);
  if (!bookingId) throw new Error('Invalid bookingId');
  const ok = await linkToSchoolmanBooking(id, kind, lineId, bookingId, actor);
  revalidatePath('/admin/registrations', 'layout');
  const { t } = await getI18n();
  redirect(ok ? `${back}#line-${lineId}` : `${back}?error=${encodeURIComponent(t('Diese Buchung lässt sich nicht mehr verknüpfen.', 'This booking can no longer be linked.'))}`);
}

/** „Nicht dieselbe": that SchoolMan booking is not offered for the line again. */
export async function dismissSchoolmanBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  const { lineId, bookingId } = schoolmanLink(formData);
  if (!bookingId) throw new Error('Invalid bookingId');
  await dismissSchoolmanBooking(id, lineId, bookingId, actor);
  revalidatePath(`/admin/registrations/${id}`);
  redirect(`/admin/registrations/${id}`);
}

/** „Verknüpfung lösen": a line linked to the wrong SchoolMan booking is open again; only after the confirmation. */
export async function unlinkSchoolmanBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  const back = `/admin/registrations/${id}`;
  const { lineId, kind } = schoolmanLink(formData);
  if (formData.get('confirmed') !== '1') redirect(back);
  const ok = await unlinkSchoolmanBooking(id, kind, lineId, actor);
  revalidatePath('/admin/registrations', 'layout');
  const { t } = await getI18n();
  redirect(ok ? `${back}#line-${lineId}` : `${back}?error=${encodeURIComponent(t('Diese Position ist mit keiner Buchung aus SchoolMan verknüpft.', 'This line is not linked to a SchoolMan booking.'))}`);
}


/**
 * The side panel's search (2026-10-31): a colleague's own words — a name, an address, a phone or
 * customer number — judged against what the registration says. Reads only.
 */
export async function searchRegistrationPeopleAction(id: string, text: string): Promise<PersonCandidate[]> {
  await requireModule('registrations');
  if (!isUuid(id)) return [];
  const registration = await getRegistration(id);
  if (!registration) return [];
  return personCandidates(registrationFacts(registration.contact), { excludeId: registration.personId, text: text.slice(0, 80), limit: 12 });
}

/** „Das ist …": the sender is this person at CASA. */
export async function confirmRegistrationPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  const personId = String(formData.get('personId') ?? '');
  if (!isUuid(personId)) throw new Error('Invalid personId');
  const result = await confirmRegistrationPerson(id, personId, actor);
  revalidatePath('/admin', 'layout');
  const { lang } = await getI18n();
  redirect(result.ok ? `/admin/registrations/${id}` : `/admin/registrations/${id}?error=${encodeURIComponent(pick(lang, result.reason))}`);
}

/** „Neue Person": nobody at CASA; the sender goes on the register. */
export async function newRegistrationPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  await newRegistrationPerson(id, actor);
  revalidatePath('/admin', 'layout');
  redirect(`/admin/registrations/${id}`);
}

/** „Trennen": the sender is not who they were taken for. */
export async function separateRegistrationPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('registrations', 'edit');
  const id = registrationId(formData);
  await separateRegistrationPerson(id, actor);
  revalidatePath('/admin', 'layout');
  redirect(`/admin/registrations/${id}`);
}
