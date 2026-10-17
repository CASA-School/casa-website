import { todayInputValue } from '@/lib/dates';
import type { T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { normalizeIban, type BankAccountInput, type PersonInput } from '@/lib/admin/people';

/**
 * A person's and a bank account's form fields, read and checked — shared by the people module and the
 * staff register (0039), which edit the same person with their own rights.
 */

const SALUTATIONS = new Set(['mr', 'ms', 'mx', 'neutral']);

const field = (formData: FormData, name: string, max: number) => String(formData.get(name) ?? '').trim().slice(0, max) || null;

export function readPerson(formData: FormData, t: T): PersonInput | string {
  const text = (field: string, max: number) =>
    String(formData.get(field) ?? '')
      .trim()
      .slice(0, max);
  const firstName = text('firstName', 80);
  if (firstName.length < 1) return t('Ein Vorname ist nötig.', 'A first name is required.');
  const salutation = text('salutation', 10);
  if (salutation && !SALUTATIONS.has(salutation)) return t('Ungültige Anrede.', 'Invalid salutation.');
  const email = text('email', 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return t('Diese E-Mail-Adresse sieht nicht richtig aus.', 'That email address does not look right.');
  const birthDate = text('birthDate', 10);
  if (birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return t('Das Geburtsdatum muss ein Datum sein.', 'Date of birth must be a date.');
    // A date in the future is a typo, and a picker makes it easy to make.
    if (birthDate >= todayInputValue()) return t('Dieses Geburtsdatum liegt in der Zukunft.', 'That date of birth is in the future.');
    if (birthDate < '1900-01-01') return t('Dieses Geburtsdatum liegt zu weit zurück.', 'That date of birth is too long ago.');
  }
  // The rest of what SchoolMan knows about a learner comes with the edit form only.
  let facts: PersonInput['facts'];
  if (formData.get('withFacts') === '1') {
    const year = text('birthYear', 4);
    const birthYear = year ? Number(year) : null;
    if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()))
      return t('Das Geburtsjahr sieht nicht richtig aus.', 'That year of birth does not look right.');
    facts = {
      secondLastName: text('secondLastName', 80) || null,
      nickname: text('nickname', 60) || null,
      birthYear,
      birthPlace: text('birthPlace', 120) || null,
      birthCountry: text('birthCountry', 120) || null,
      motherTongue: text('motherTongue', 80) || null,
      occupation: text('occupation', 120) || null,
      passportNumber: text('passportNumber', 40) || null,
    };
  }
  return {
    salutation: salutation || null,
    firstName,
    lastName: text('lastName', 80) || null,
    birthDate: birthDate || null,
    nationality: text('nationality', 120) || null,
    email: email || null,
    phone: text('phone', 60) || null,
    facts,
  };
}

/** The account's fields, the IBAN checked for its shape; a message when it does not look right. */
export async function readBankAccount(formData: FormData): Promise<BankAccountInput | string> {
  const iban = normalizeIban(String(formData.get('iban') ?? ''));
  // Two letters, two check digits, then 11–30 letters and digits: the shape of every IBAN.
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
    const { t } = await getI18n();
    return t('Diese IBAN sieht nicht richtig aus.', 'That IBAN does not look right.');
  }
  return {
    holder: field(formData, 'holder', 120),
    iban,
    bic: field(formData, 'bic', 11)?.toUpperCase() ?? null,
    bankName: field(formData, 'bankName', 120),
    note: field(formData, 'note', 200),
  };
}
