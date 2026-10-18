import { createOrganisationAction, saveCommissionAction, saveContactAction, updateOrganisationAction } from './actions';
import { DialogFooter } from '@/components/admin/dialogs';
import { OptionalSection } from '@/components/admin/optional-section';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import { pick, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { CONTACT_SALUTATION_LABELS, CONTACT_SALUTATIONS, ORGANISATION_KIND_CHOICES, ORGANISATION_KIND_LABELS } from '@/lib/admin/organisation-labels';
import type { CommissionTerm, OrganisationContact, OrganisationDetail } from '@/lib/admin/organisations';

/**
 * The organisations module's forms, each in a dialog. A new organisation needs its name and what it is;
 * where it is and how to reach it open once both are in. The rest — an agency's agreement, a note — is
 * on its page.
 */

type Country = { code: string; name: Bilingual };
type ChargeType = { code: string; name: Bilingual };

function CountryOptions({ countries, lang }: { countries: readonly Country[]; lang: WsLang }) {
  return (
    <>
      <option value="">—</option>
      {[...countries]
        .sort((a, b) => pick(lang, a.name).localeCompare(pick(lang, b.name), lang))
        .map((c) => (
          <option key={c.code} value={c.code}>
            {pick(lang, c.name)}
          </option>
        ))}
    </>
  );
}

/** Where it is and how to reach it: the same fields when it is made and when it is changed. */
async function ReachFields({ organisation, countries, prefix }: { organisation?: OrganisationDetail; countries: readonly Country[]; prefix: string }) {
  const { t, lang } = await getI18n();
  const id = (field: string) => `${prefix}-${field}`;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Land', 'Country')} htmlFor={id('country')}>
          <Select id={id('country')} name="countryCode" defaultValue={organisation?.countryCode ?? ''}>
            <CountryOptions countries={countries} lang={lang} />
          </Select>
        </Field>
        <Field label={t('Wir schreiben auf', 'We write in')} htmlFor={id('language')}>
          <Select id={id('language')} name="language" defaultValue={organisation?.language ?? 'de'}>
            <option value="de">{t('Deutsch', 'German')}</option>
            <option value="en">{t('Englisch', 'English')}</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('E-Mail', 'Email')} htmlFor={id('email')}>
          <Input id={id('email')} name="email" type="email" maxLength={200} defaultValue={organisation?.email ?? ''} />
        </Field>
        <Field label={t('Telefon', 'Phone')} htmlFor={id('phone')}>
          <Input id={id('phone')} name="phone" maxLength={60} defaultValue={organisation?.phone ?? ''} />
        </Field>
      </div>
      <Field label={t('Adresse', 'Address')} htmlFor={id('address')}>
        <Textarea id={id('address')} name="address" rows={3} maxLength={500} defaultValue={organisation?.address ?? ''} />
      </Field>
    </div>
  );
}

async function KindSelect({ id, value, required = false }: { id: string; value?: string; required?: boolean }) {
  const { t, lang } = await getI18n();
  return (
    <Select id={id} name="kind" required={required} defaultValue={value ?? ''}>
      {value ? null : (
        <option value="" disabled>
          {t('Bitte wählen', 'Choose')}
        </option>
      )}
      {ORGANISATION_KIND_CHOICES.map((k) => (
        <option key={k} value={k}>
          {pick(lang, ORGANISATION_KIND_LABELS[k])}
        </option>
      ))}
    </Select>
  );
}

export async function NewOrganisationForm({ countries }: { countries: readonly Country[] }) {
  const { t } = await getI18n();
  return (
    <form action={createOrganisationAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label={t('Name', 'Name')} htmlFor="org-name">
          <Input id="org-name" name="name" required maxLength={200} autoFocus />
        </Field>
        <Field label={t('Art', 'Kind')} htmlFor="org-kind">
          <KindSelect id="org-kind" required />
        </Field>
      </div>
      <OptionalSection requires={['name', 'kind']} heading={t('Adresse und Kontakt', 'Address and contact')}>
        <ReachFields countries={countries} prefix="org-new" />
      </OptionalSection>
      <DialogFooter>
        <Button type="submit">{t('Anlegen', 'Create')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function EditOrganisationForm({ organisation, countries }: { organisation: OrganisationDetail; countries: readonly Country[] }) {
  const { t } = await getI18n();
  return (
    <form action={updateOrganisationAction} className="space-y-4">
      <input type="hidden" name="organisationId" value={organisation.id} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label={t('Name', 'Name')} htmlFor="org-edit-name">
          <Input id="org-edit-name" name="name" required maxLength={200} defaultValue={organisation.name} />
        </Field>
        <Field label={t('Art', 'Kind')} htmlFor="org-edit-kind">
          <KindSelect id="org-edit-kind" value={organisation.kind} />
        </Field>
      </div>
      <ReachFields organisation={organisation} countries={countries} prefix="org-edit" />
      <Field label={t('Vereinbarung', 'Agreement')} htmlFor="org-edit-agreement">
        <Textarea id="org-edit-agreement" name="agreement" rows={3} maxLength={2000} defaultValue={organisation.agreement ?? ''} />
      </Field>
      <Field label={t('Notiz', 'Note')} htmlFor="org-edit-note">
        <Textarea id="org-edit-note" name="note" rows={3} maxLength={2000} defaultValue={organisation.note ?? ''} />
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function ContactForm({ organisationId, contact }: { organisationId: string; contact?: OrganisationContact }) {
  const { t, lang } = await getI18n();
  const id = (field: string) => `contact-${contact?.id ?? 'new'}-${field}`;
  return (
    <form action={saveContactAction} className="space-y-3">
      <input type="hidden" name="organisationId" value={organisationId} />
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]">
        <Field label={t('Anrede', 'Salutation')} htmlFor={id('salutation')}>
          <Select id={id('salutation')} name="salutation" defaultValue={contact?.salutation ?? 'none'}>
            {CONTACT_SALUTATIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'none' ? '—' : pick(lang, CONTACT_SALUTATION_LABELS[s])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Vorname', 'First name')} htmlFor={id('first')}>
          <Input id={id('first')} name="firstName" maxLength={80} defaultValue={contact?.firstName ?? ''} autoFocus={!contact} />
        </Field>
        <Field label={t('Nachname', 'Last name')} htmlFor={id('last')}>
          <Input id={id('last')} name="lastName" maxLength={80} defaultValue={contact?.lastName ?? ''} />
        </Field>
      </div>
      <Field label={t('Funktion', 'Job title')} htmlFor={id('role')}>
        <Input id={id('role')} name="role" maxLength={120} defaultValue={contact?.role ?? ''} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('E-Mail', 'Email')} htmlFor={id('email')}>
          <Input id={id('email')} name="email" type="email" maxLength={200} defaultValue={contact?.email ?? ''} />
        </Field>
        <Field label={t('Telefon', 'Phone')} htmlFor={id('phone')}>
          <Input id={id('phone')} name="phone" maxLength={60} defaultValue={contact?.phone ?? ''} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="submit">{contact ? t('Speichern', 'Save') : t('Kontakt hinzufügen', 'Add contact')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function CommissionForm({ organisationId, chargeTypes, term }: { organisationId: string; chargeTypes: readonly ChargeType[]; term?: CommissionTerm }) {
  const { t, lang } = await getI18n();
  const id = (field: string) => `commission-${term?.id ?? 'new'}-${field}`;
  // A term on a kind of charge no longer offered keeps it as a choice.
  const choices = term?.chargeTypeCode && !chargeTypes.some((c) => c.code === term.chargeTypeCode) && term.chargeType
    ? [{ code: term.chargeTypeCode, name: term.chargeType }, ...chargeTypes]
    : chargeTypes;
  return (
    <form action={saveCommissionAction} className="space-y-3">
      <input type="hidden" name="organisationId" value={organisationId} />
      {term ? <input type="hidden" name="termId" value={term.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Field label={t('Provision in %', 'Commission in %')} htmlFor={id('percentage')}>
          <Input
            id={id('percentage')}
            name="percentage"
            inputMode="decimal"
            required
            maxLength={6}
            defaultValue={term ? String(term.percentage).replace('.', lang === 'de' ? ',' : '.') : ''}
            autoFocus={!term}
          />
        </Field>
        <Field label={t('Auf', 'On')} htmlFor={id('charge')}>
          <Select id={id('charge')} name="chargeTypeCode" defaultValue={term?.chargeTypeCode ?? 'tuition'}>
            {choices.map((c) => (
              <option key={c.code} value={c.code}>
                {pick(lang, c.name)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t('Notiz', 'Note')} htmlFor={id('note')}>
        <Textarea id={id('note')} name="note" rows={2} maxLength={300} defaultValue={term?.note ?? ''} />
      </Field>
      <DialogFooter>
        <Button type="submit">{term ? t('Speichern', 'Save') : t('Provision eintragen', 'Add commission')}</Button>
      </DialogFooter>
    </form>
  );
}
