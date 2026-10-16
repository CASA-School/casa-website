import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import type { Address, AddressKind, Country, PersonDetail, PersonPrivate } from '@/lib/admin/people';
import { OptionalSection } from '@/components/admin/optional-section';
import { addBankAccountAction, createPersonAction, savePrivateAction, saveAddressAction, updatePersonAction } from './actions';
import { toDateInputValue, todayInputValue } from '@/lib/dates';
import { DateFormField } from '@/components/admin/date-picker';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * One form for creating and editing a person, rendered inside a dialog.
 *
 * Progressive disclosure: a new person needs a name and a way to reach them;
 * salutation, date of birth, nationality and phone appear once a first name
 * and an email are in (`OptionalSection`). When editing, everything is shown —
 * the person opened Edit to go deeper — with the rest of what SchoolMan knows
 * about a learner below it (second surname, nickname, place and country of
 * birth, mother tongue, occupation, passport; some of it telc asks for).
 */
export async function PersonForm({ person, countries }: { person?: PersonDetail; countries: Country[] }) {
  const { t } = await getI18n();
  const SALUTATIONS = [
    ['', '—'],
    ['ms', t('Frau', 'Ms')],
    ['mr', t('Herr', 'Mr')],
    ['mx', 'Mx'],
    ['neutral', t('Keine Anrede', 'No salutation')],
  ] as const;
  const editing = Boolean(person);
  const primaryEmail =
    person?.emails.find((e) => e.isPrimary)?.address ?? person?.emails[0]?.address ?? '';
  const primaryPhone =
    person?.phones.find((p) => p.isPrimary)?.number ?? person?.phones[0]?.number ?? '';
  const nationality = person?.nationalityName ?? person?.nationalityRaw ?? '';

  const more = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('Anrede', 'Salutation')} htmlFor="person-salutation">
        <Select id="person-salutation" name="salutation" defaultValue={person?.salutation ?? ''}>
          {SALUTATIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('Geburtsdatum', 'Date of birth')} htmlFor="person-birth">
        <DateFormField
          id="person-birth"
          name="birthDate"
          max={todayInputValue()}
          defaultValue={toDateInputValue(person?.birthDate)}
        />
      </Field>
      <Field label={t('Nationalität', 'Nationality')} htmlFor="person-nationality">
        <Input
          id="person-nationality"
          name="nationality"
          list="person-countries"
          defaultValue={nationality}
          maxLength={120}
        />
        <datalist id="person-countries">
          {countries.map((c) => (
            <option key={c.code} value={c.nameEn} />
          ))}
        </datalist>
      </Field>
      <Field label={t('Telefon', 'Phone')} htmlFor="person-phone">
        <Input
          id="person-phone"
          name="phone"
          type="tel"
          defaultValue={primaryPhone}
          maxLength={60}
        />
      </Field>
    </div>
  );

  return (
    <form action={editing ? updatePersonAction : createPersonAction} className="space-y-3">
      {person ? <input type="hidden" name="personId" value={person.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Vorname', 'First name')} htmlFor="person-first">
          <Input
            id="person-first"
            name="firstName"
            required
            maxLength={80}
            defaultValue={person?.firstName ?? ''}
            autoFocus={!editing}
          />
        </Field>
        <Field label={t('Nachname', 'Last name')} htmlFor="person-last">
          <Input
            id="person-last"
            name="lastName"
            maxLength={80}
            defaultValue={person?.lastName ?? ''}
          />
        </Field>
      </div>
      <Field label={t('E-Mail', 'Email')} htmlFor="person-email">
        <Input
          id="person-email"
          name="email"
          type="email"
          maxLength={200}
          defaultValue={primaryEmail}
        />
      </Field>

      <OptionalSection
        requires={['firstName', 'email']}
        heading={t('Weitere Angaben', 'A few more details')}
        alwaysOpen={editing}
      >
        {more}
      </OptionalSection>

      {person ? (
        <fieldset className="space-y-3 border-t border-ws-line pt-4">
          <input type="hidden" name="withFacts" value="1" />
          <legend className="sr-only">{t('Mehr zur Person', 'More about the person')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('Zweiter Nachname', 'Second surname')} htmlFor="person-last2">
              <Input id="person-last2" name="secondLastName" maxLength={80} defaultValue={person.facts.secondLastName ?? ''} />
            </Field>
            <Field label={t('Rufname', 'Nickname')} htmlFor="person-nick">
              <Input id="person-nick" name="nickname" maxLength={60} defaultValue={person.facts.nickname ?? ''} />
            </Field>
            <Field label={t('Geburtsort', 'Place of birth')} htmlFor="person-birthplace">
              <Input id="person-birthplace" name="birthPlace" maxLength={120} defaultValue={person.facts.birthPlace ?? ''} />
            </Field>
            <Field label={t('Geburtsland', 'Country of birth')} htmlFor="person-birthcountry">
              <Input id="person-birthcountry" name="birthCountry" list="person-countries" maxLength={120} defaultValue={person.facts.birthCountryName ?? ''} />
            </Field>
            {person.birthDate ? null : (
              <Field label={t('Geburtsjahr', 'Year of birth')} hint={t('wenn das Datum fehlt', 'when the date is missing')} htmlFor="person-birthyear">
                <Input id="person-birthyear" name="birthYear" inputMode="numeric" maxLength={4} defaultValue={person.facts.birthYear ?? ''} />
              </Field>
            )}
            <Field label={t('Muttersprache', 'Mother tongue')} htmlFor="person-tongue">
              <Input id="person-tongue" name="motherTongue" maxLength={80} defaultValue={person.facts.motherTongue ?? ''} />
            </Field>
            <Field label={t('Beruf', 'Occupation')} htmlFor="person-occupation">
              <Input id="person-occupation" name="occupation" maxLength={120} defaultValue={person.facts.occupation ?? ''} />
            </Field>
            <Field label={t('Passnummer', 'Passport number')} htmlFor="person-passport">
              <Input id="person-passport" name="passportNumber" maxLength={40} defaultValue={person.facts.passportNumber ?? ''} />
            </Field>
          </div>
        </fieldset>
      ) : null}

      <div className="flex justify-end pt-1">
        <Button type="submit">{editing ? t('Speichern', 'Save') : t('Person hinzufügen', 'Add person')}</Button>
      </div>
    </form>
  );
}

/** One of a person's two addresses — at home, or in Bremen while here. Emptied, it is removed. */
export async function AddressForm({ personId, kind, address, countries }: { personId: string; kind: AddressKind; address?: Address; countries: Country[] }) {
  const { t } = await getI18n();
  const id = (name: string) => `address-${kind}-${name}`;
  return (
    <form action={saveAddressAction} className="space-y-3">
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="kind" value={kind} />
      <Field label={t('Straße und Hausnummer', 'Street and number')} htmlFor={id('street')}>
        <Input id={id('street')} name="street" maxLength={160} defaultValue={address?.street ?? ''} autoFocus />
      </Field>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field label={t('PLZ', 'Postcode')} htmlFor={id('postcode')}>
          <Input id={id('postcode')} name="postcode" maxLength={20} defaultValue={address?.postcode ?? ''} />
        </Field>
        <Field label={t('Ort', 'City')} htmlFor={id('city')}>
          <Input id={id('city')} name="city" maxLength={120} defaultValue={address?.city ?? (kind === 'local' ? 'Bremen' : '')} />
        </Field>
      </div>
      <Field label={t('Land', 'Country')} htmlFor={id('country')}>
        <Input id={id('country')} name="country" list={id('countries')} maxLength={120} defaultValue={address?.countryName ?? (kind === 'local' ? 'Germany' : '')} />
        <datalist id={id('countries')}>
          {countries.map((c) => (
            <option key={c.code} value={c.nameEn} />
          ))}
        </datalist>
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </div>
    </form>
  );
}

/** Tax, pension and health-insurance numbers — protected (`private_data`). */
export async function PrivateForm({ personId, data }: { personId: string; data: PersonPrivate }) {
  const { t } = await getI18n();
  return (
    <form action={savePrivateAction} className="space-y-3">
      <input type="hidden" name="personId" value={personId} />
      <Field label={t('Steuer-ID', 'Tax ID')} htmlFor="private-tax">
        <Input id="private-tax" name="taxId" maxLength={40} defaultValue={data.taxId ?? ''} autoComplete="off" />
      </Field>
      <Field label={t('Rentenversicherungsnummer', 'Pension insurance number')} htmlFor="private-pension">
        <Input id="private-pension" name="pensionInsuranceNumber" maxLength={40} defaultValue={data.pensionInsuranceNumber ?? ''} autoComplete="off" />
      </Field>
      <Field label={t('Krankenversicherungsnummer', 'Health insurance number')} htmlFor="private-health">
        <Input id="private-health" name="healthInsuranceNumber" maxLength={40} defaultValue={data.healthInsuranceNumber ?? ''} autoComplete="off" />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </div>
    </form>
  );
}

/** A bank account — for a refund, a host's rent, a salary. Protected. */
export async function BankAccountForm({ personId, holder }: { personId: string; holder: string }) {
  const { t } = await getI18n();
  return (
    <form action={addBankAccountAction} className="space-y-3">
      <input type="hidden" name="personId" value={personId} />
      <Field label="IBAN" htmlFor="bank-iban">
        <Input id="bank-iban" name="iban" required maxLength={42} autoComplete="off" className="font-mono" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Kontoinhaber', 'Account holder')} htmlFor="bank-holder">
          <Input id="bank-holder" name="holder" maxLength={120} defaultValue={holder} />
        </Field>
        <Field label="BIC" htmlFor="bank-bic">
          <Input id="bank-bic" name="bic" maxLength={11} autoComplete="off" className="font-mono" />
        </Field>
      </div>
      <Field label={t('Bank', 'Bank')} htmlFor="bank-name">
        <Input id="bank-name" name="bankName" maxLength={120} />
      </Field>
      <Field label={t('Notiz', 'Note')} htmlFor="bank-note">
        <Textarea id="bank-note" name="note" rows={2} maxLength={200} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Konto hinzufügen', 'Add account')}</Button>
      </div>
    </form>
  );
}
