'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { readBankAccount, readPerson } from '../people/person-input';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { removeLicence, saveLicence } from '@/lib/admin/examiners';
import { isAbsenceReason, isLevel, isShift, isWeekday, LEVELS, SHIFTS, WEEKDAYS } from '@/lib/admin/kursplanung/types';
import { addBankAccount, removeBankAccount, saveAddress, updateBankAccount, updatePerson, type AddressKind } from '@/lib/admin/people';
import { isContractKind, suggestShortName } from '@/lib/admin/staff-labels';
import {
  addAbsence,
  createStaffMember,
  deleteStaffMember,
  getStaffMember,
  linkAccount,
  removeAbsence,
  removeContract,
  saveContract,
  saveHrNumbers,
  setStaffActive,
  setStaffRoles,
  setTeachingRules,
  staffRoles,
} from '@/lib/admin/staff-members';

/**
 * The staff register's mutations (0039). The register — a colleague, their roles, their teaching rules,
 * their days away, their examiner licences, leaving — is `staff` at `edit`; deleting one entered by
 * mistake, or a licence, `full`. Contracts,
 * HR numbers and bank details are `staff_private`: `edit` to write, `full` to remove. Linking a workspace
 * account also needs the accounts' own module (`team`).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const id = (formData: FormData, field: string): string => {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
};
const text = (formData: FormData, field: string, max: number) => String(formData.get(field) ?? '').trim().slice(0, max) || null;
const date = (formData: FormData, field: string) => {
  const value = String(formData.get(field) ?? '');
  return DATE.test(value) ? value : null;
};
const number = (formData: FormData, field: string) => {
  const raw = String(formData.get(field) ?? '').trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 60 ? Math.round(n * 10) / 10 : null;
};

const KURSPLANUNG_TEACHERS = '/admin/kursplanung/lehrkraefte';

const page = (staffId: string, tab?: string) => `/admin/staff/${staffId}${tab ? `?tab=${tab}` : ''}`;

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

function done(path: string): never {
  revalidatePath('/admin', 'layout');
  redirect(path);
}

/** The roles ticked on a form, only those the vocabulary has. */
async function readRoles(formData: FormData): Promise<string[]> {
  const known = new Set((await staffRoles()).map((r) => r.code));
  return formData
    .getAll('roles')
    .map(String)
    .filter((code) => known.has(code));
}

/** The person this staff row is about — never another one, whatever the form says. */
async function personOf(staffId: string): Promise<string> {
  const member = await getStaffMember(staffId);
  if (!member) throw new Error('Unknown staff member');
  return member.personId;
}

export async function createStaffAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const { t, lang } = await getI18n();
  const back = '/admin/staff';
  const firstName = text(formData, 'firstName', 80);
  if (!firstName) fail(back, t('Ein Vorname ist nötig.', 'A first name is required.'));
  const lastName = text(formData, 'lastName', 80);
  const email = text(formData, 'email', 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(back, t('Diese E-Mail-Adresse sieht nicht richtig aus.', 'That email address does not look right.'));
  const salutation = text(formData, 'salutation', 10);
  const kind = String(formData.get('contractKind') ?? '');
  const result = await createStaffMember(
    {
      salutation: salutation && ['mr', 'ms', 'mx', 'neutral'].includes(salutation) ? salutation : null,
      firstName,
      lastName,
      email,
      phone: text(formData, 'phone', 60),
      shortName: text(formData, 'shortName', 40) ?? suggestShortName(firstName, lastName),
      roles: await readRoles(formData),
      contract: isContractKind(kind) ? { kind, validFrom: date(formData, 'contractFrom') } : null,
    },
    actor
  );
  if (!result.ok) fail(back, pick(lang, result.reason));
  // From Kursplanung's teacher list: back there, with the new teacher's rules open.
  if (formData.get('returnTo') === KURSPLANUNG_TEACHERS) done(`${KURSPLANUNG_TEACHERS}?teacher=${result.id}`);
  done(page(result.id!));
}

export async function saveStaffRolesAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  await setStaffRoles(staffId, await readRoles(formData), actor);
  done(page(staffId));
}

/** The board's rules: Kursplanung fits a teacher's piece by them. */
export async function saveTeachingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  const back = page(staffId, 'teaching');
  const { t, lang } = await getI18n();
  const shortName = text(formData, 'shortName', 40);
  if (!shortName) fail(back, t('Ein Kürzel ist nötig.', 'A short name is required.'));
  const shifts = SHIFTS.filter((s) => formData.getAll('shifts').includes(s));
  if (!shifts.length || !shifts.every(isShift)) fail(back, t('Mindestens eine Schicht.', 'At least one shift.'));
  const weekdays = WEEKDAYS.filter((d) => formData.getAll('weekdays').includes(d));
  if (!weekdays.length || !weekdays.every(isWeekday)) fail(back, t('Mindestens ein Wochentag.', 'At least one weekday.'));
  const daysPerWeek = Number(formData.get('daysPerWeek'));
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 5) fail(back, t('Tage pro Woche: 1 bis 5.', 'Days per week: 1 to 5.'));
  const levels = LEVELS.filter((l) => formData.getAll('levels').includes(l)).filter(isLevel);
  const result = await setTeachingRules(staffId, { shortName, shifts, daysPerWeek, weekdays, levels, note: text(formData, 'note', 200) }, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

/** Left CASA — or back. Nothing is deleted: Kursplanung's history keeps their name. */
export async function setStaffActiveAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  await setStaffActive(staffId, formData.get('active') === '1', actor);
  done(page(staffId));
}

/** Their workspace account, chosen among those nobody on the register uses — or none. */
export async function linkAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  const { t, lang } = await getI18n();
  if (!canAccess(actor, 'team', 'edit')) fail(page(staffId), t('Konten verwalten nur Inhaber und Administratoren.', 'Only owners and administrators manage accounts.'));
  const raw = String(formData.get('staffUserId') ?? '');
  const result = await linkAccount(staffId, UUID.test(raw) ? raw : null, actor);
  if (!result.ok) fail(page(staffId), pick(lang, result.reason));
  done(page(staffId));
}

export async function addAbsenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  const back = page(staffId, 'teaching');
  const { t, lang } = await getI18n();
  const from = date(formData, 'from');
  const to = date(formData, 'to') ?? from;
  const reason = String(formData.get('reason') ?? '');
  if (!from || !to) fail(back, t('Bitte gib die Tage an.', 'Give the days.'));
  if (!isAbsenceReason(reason)) fail(back, t('Bitte wähle einen Grund.', 'Choose a reason.'));
  const result = await addAbsence(staffId, from, to, reason, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

/** A stretch of days away taken back — a correction, like taking back an offered place. */
export async function takeBackAbsenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  const from = date(formData, 'from');
  const to = date(formData, 'to');
  if (from && to) await removeAbsence(staffId, from, to, actor);
  done(page(staffId, 'teaching'));
}

/** Gone, for a colleague entered by mistake, with the confirmation. */
export async function deleteStaffAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'full');
  const staffId = id(formData, 'staffId');
  if (formData.get('confirmed') !== '1') redirect(page(staffId));
  const result = await deleteStaffMember(staffId, actor);
  if (!result.ok) fail(page(staffId), pick((await getI18n()).lang, result.reason));
  done('/admin/staff');
}

// ---------------------------------------------------------- the person

/** Their name, contact and the rest: the people module's fields, under the register's right. */
export async function updateStaffPersonAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  const back = page(staffId, 'details');
  const { t } = await getI18n();
  const input = readPerson(formData, t);
  if (typeof input === 'string') fail(back, input);
  await updatePerson(await personOf(staffId), input, actor);
  done(back);
}

export async function saveStaffAddressAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  const kind = String(formData.get('kind') ?? '');
  if (kind !== 'home' && kind !== 'local') throw new Error('Invalid address kind');
  await saveAddress(
    await personOf(staffId),
    kind as AddressKind,
    { street: text(formData, 'street', 160), postcode: text(formData, 'postcode', 20), city: text(formData, 'city', 120), country: text(formData, 'country', 120) },
    actor
  );
  done(page(staffId, 'details'));
}

// ------------------------------------------------- contracts, HR numbers, bank

export async function saveContractAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff_private', 'edit');
  const staffId = id(formData, 'staffId');
  const back = page(staffId, 'contracts');
  const { t, lang } = await getI18n();
  const kind = String(formData.get('kind') ?? '');
  if (!isContractKind(kind)) fail(back, t('Bitte wähle die Art des Vertrags.', 'Choose the kind of contract.'));
  const raw = String(formData.get('contractId') ?? '');
  const result = await saveContract(
    staffId,
    UUID.test(raw) ? raw : null,
    {
      kind,
      validFrom: date(formData, 'validFrom'),
      validTo: date(formData, 'validTo'),
      weeklyHours: number(formData, 'weeklyHours'),
      weeklyUnits: number(formData, 'weeklyUnits'),
      note: text(formData, 'note', 300),
    },
    actor
  );
  if (!result.ok) fail(back, pick(lang, result.reason));
  done(back);
}

export async function removeContractAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff_private', 'full');
  const staffId = id(formData, 'staffId');
  if (formData.get('confirmed') !== '1') redirect(page(staffId, 'contracts'));
  await removeContract(staffId, id(formData, 'contractId'), actor);
  done(page(staffId, 'contracts'));
}

export async function saveHrNumbersAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff_private', 'edit');
  const staffId = id(formData, 'staffId');
  await saveHrNumbers(
    staffId,
    await personOf(staffId),
    { taxId: text(formData, 'taxId', 40), pensionNumber: text(formData, 'pensionNumber', 40), healthNumber: text(formData, 'healthNumber', 40) },
    actor
  );
  done(page(staffId, 'contracts'));
}

export async function addStaffBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff_private', 'edit');
  const staffId = id(formData, 'staffId');
  const input = await readBankAccount(formData);
  if (typeof input === 'string') fail(page(staffId, 'bank'), input);
  await addBankAccount(await personOf(staffId), input, actor);
  done(page(staffId, 'bank'));
}

export async function updateStaffBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff_private', 'edit');
  const staffId = id(formData, 'staffId');
  const input = await readBankAccount(formData);
  if (typeof input === 'string') fail(page(staffId, 'bank'), input);
  await updateBankAccount(await personOf(staffId), id(formData, 'accountId'), input, actor);
  done(page(staffId, 'bank'));
}

export async function removeStaffBankAccountAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff_private', 'full');
  const staffId = id(formData, 'staffId');
  if (formData.get('confirmed') !== '1') redirect(page(staffId, 'bank'));
  await removeBankAccount(await personOf(staffId), id(formData, 'accountId'), actor);
  done(page(staffId, 'bank'));
}

// ------------------------------------------------------------- licences

/** A telc licence for one exam, with its number and period (0039). */
export async function saveLicenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'edit');
  const staffId = id(formData, 'staffId');
  const back = page(staffId, 'exams');
  const raw = String(formData.get('licenceId') ?? '');
  const result = await saveLicence(
    staffId,
    UUID.test(raw) ? raw : null,
    { examTypeId: id(formData, 'examTypeId'), number: text(formData, 'number', 60), validFrom: date(formData, 'validFrom'), validTo: date(formData, 'validTo'), note: text(formData, 'note', 300) },
    actor
  );
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  done(back);
}

export async function removeLicenceAction(formData: FormData): Promise<void> {
  const actor = await requireModule('staff', 'full');
  const staffId = id(formData, 'staffId');
  if (formData.get('confirmed') !== '1') redirect(page(staffId, 'exams'));
  await removeLicence(staffId, id(formData, 'licenceId'), actor);
  done(page(staffId, 'exams'));
}
