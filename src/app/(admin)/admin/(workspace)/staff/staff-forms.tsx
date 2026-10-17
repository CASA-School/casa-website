import type { ReactNode } from 'react';

import {
  addAbsenceAction,
  createStaffAction,
  linkAccountAction,
  saveContractAction,
  saveHrNumbersAction,
  saveLicenceAction,
  saveStaffRolesAction,
  saveTeachingAction,
} from './actions';
import { DateFormField } from '@/components/admin/date-picker';
import { OptionalSection } from '@/components/admin/optional-section';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import type { StaffLicence } from '@/lib/admin/examiners';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { ABSENCE_LABELS, ABSENCE_REASONS, LEVELS, SHIFTS, WEEKDAY_LABELS, WEEKDAYS } from '@/lib/admin/kursplanung/types';
import { CONTRACT_KIND_LABELS, CONTRACT_KINDS } from '@/lib/admin/staff-labels';
import type { StaffContract, StaffDetail, StaffHrNumbers, StaffRole } from '@/lib/admin/staff-members';

/**
 * The staff register's forms (0039), each in a dialog. A new colleague needs a name and what they do;
 * the contact, the board's short name and the first contract open once a first name is in.
 */

const box = 'size-4 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]';

/** Choices as a grid of ticks: roles, shifts, weekdays, levels. */
function Ticks({ name, options, checked, columns = 2 }: { name: string; options: readonly { value: string; label: string }[]; checked: readonly string[]; columns?: 2 | 3 | 5 | 7 }) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 5: 'grid-cols-5', 7: 'grid-cols-4 sm:grid-cols-7' }[columns];
  return (
    <div className={`grid gap-x-4 gap-y-2 ${cols}`}>
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 text-[0.86rem]">
          <input type="checkbox" name={name} value={o.value} defaultChecked={checked.includes(o.value)} className={box} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function Foot({ children }: { children: ReactNode }) {
  return <div className="flex justify-end pt-1">{children}</div>;
}

export async function NewStaffForm({ roles, preset = [], returnTo }: { roles: StaffRole[]; preset?: string[]; returnTo?: string }) {
  const { t, lang } = await getI18n();
  return (
    <form action={createStaffAction} className="space-y-4">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Vorname', 'First name')} htmlFor="staff-first">
          <Input id="staff-first" name="firstName" required maxLength={80} autoFocus />
        </Field>
        <Field label={t('Nachname', 'Last name')} htmlFor="staff-last">
          <Input id="staff-last" name="lastName" maxLength={80} />
        </Field>
      </div>
      <Field label={t('Aufgaben', 'Roles')}>
        <Ticks name="roles" options={roles.map((r) => ({ value: r.code, label: pick(lang, r.name) }))} checked={preset} columns={3} />
      </Field>
      <OptionalSection requires={['firstName']} heading={t('Kontakt und Vertrag', 'Contact and contract')}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('E-Mail', 'Email')} htmlFor="staff-email">
              <Input id="staff-email" name="email" type="email" maxLength={200} />
            </Field>
            <Field label={t('Telefon', 'Phone')} htmlFor="staff-phone">
              <Input id="staff-phone" name="phone" maxLength={60} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('Kürzel', 'Short name')} htmlFor="staff-short">
              <Input id="staff-short" name="shortName" maxLength={40} placeholder={t('z. B. Anna K', 'e.g. Anna K')} />
            </Field>
            <Field label={t('Vertrag', 'Contract')} htmlFor="staff-contract">
              <Select id="staff-contract" name="contractKind" defaultValue="">
                <option value="">—</option>
                {CONTRACT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {pick(lang, CONTRACT_KIND_LABELS[k])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Seit', 'Since')} htmlFor="staff-from">
              <DateFormField id="staff-from" name="contractFrom" />
            </Field>
          </div>
        </div>
      </OptionalSection>
      <Foot>
        <Button type="submit">{t('Anlegen', 'Create')}</Button>
      </Foot>
    </form>
  );
}

export async function RolesForm({ staffId, roles, checked }: { staffId: string; roles: StaffRole[]; checked: string[] }) {
  const { t, lang } = await getI18n();
  return (
    <form action={saveStaffRolesAction} className="space-y-4">
      <input type="hidden" name="staffId" value={staffId} />
      <Ticks name="roles" options={roles.map((r) => ({ value: r.code, label: pick(lang, r.name) }))} checked={checked} columns={3} />
      <Foot>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </Foot>
    </form>
  );
}

/** What Kursplanung fits a teacher's piece by: the short name on the board, shifts, days, weekdays, levels. */
export async function TeachingForm({ member }: { member: StaffDetail }) {
  const { t, lang } = await getI18n();
  const shiftLabel = { morning: t('Vormittag', 'Morning'), afternoon: t('Nachmittag', 'Afternoon') };
  return (
    <form action={saveTeachingAction} className="space-y-4">
      <input type="hidden" name="staffId" value={member.id} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field label={t('Kürzel auf dem Plan', 'Short name on the board')} htmlFor="teach-short">
          <Input id="teach-short" name="shortName" required maxLength={40} defaultValue={member.shortName} />
        </Field>
        <Field label={t('Tage pro Woche', 'Days per week')} htmlFor="teach-days">
          <Select id="teach-days" name="daysPerWeek" defaultValue={String(member.teaching.daysPerWeek)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t('Schichten', 'Shifts')}>
        <Ticks name="shifts" options={SHIFTS.map((s) => ({ value: s, label: shiftLabel[s] }))} checked={member.teaching.shifts} />
      </Field>
      <Field label={t('Mögliche Wochentage', 'Possible weekdays')}>
        <Ticks name="weekdays" options={WEEKDAYS.map((d) => ({ value: d, label: pick(lang, WEEKDAY_LABELS[d]) }))} checked={member.teaching.weekdays} columns={5} />
      </Field>
      <Field label={t('Niveaus', 'Levels')}>
        <Ticks name="levels" options={LEVELS.map((l) => ({ value: l, label: l }))} checked={member.teaching.levels} columns={7} />
      </Field>
      <Field label={t('Notiz', 'Note')} htmlFor="teach-note">
        <Textarea id="teach-note" name="note" rows={2} maxLength={200} defaultValue={member.teaching.note ?? ''} />
      </Field>
      <Foot>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </Foot>
    </form>
  );
}

export async function AbsenceForm({ staffId }: { staffId: string }) {
  const { t, lang } = await getI18n();
  return (
    <form action={addAbsenceAction} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Von', 'From')} htmlFor="absence-from">
          <DateFormField id="absence-from" name="from" required />
        </Field>
        <Field label={t('Bis', 'Until')} htmlFor="absence-to">
          <DateFormField id="absence-to" name="to" />
        </Field>
      </div>
      <Field label={t('Grund', 'Reason')} htmlFor="absence-reason">
        <Select id="absence-reason" name="reason" defaultValue="Urlaub">
          {ABSENCE_REASONS.map((r) => (
            <option key={r} value={r}>
              {pick(lang, ABSENCE_LABELS[r])}
            </option>
          ))}
        </Select>
      </Field>
      <Foot>
        <Button type="submit">{t('Eintragen', 'Add')}</Button>
      </Foot>
    </form>
  );
}

export async function ContractForm({ staffId, contract }: { staffId: string; contract?: StaffContract }) {
  const { t, lang } = await getI18n();
  return (
    <form action={saveContractAction} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      {contract ? <input type="hidden" name="contractId" value={contract.id} /> : null}
      <Field label={t('Art', 'Kind')} htmlFor="contract-kind">
        <Select id="contract-kind" name="kind" defaultValue={contract?.kind ?? 'employed'}>
          {CONTRACT_KINDS.map((k) => (
            <option key={k} value={k}>
              {pick(lang, CONTRACT_KIND_LABELS[k])}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Beginn', 'Start')} htmlFor="contract-from">
          <DateFormField id="contract-from" name="validFrom" defaultValue={contract?.validFrom ?? null} />
        </Field>
        <Field label={t('Ende', 'End')} htmlFor="contract-to">
          <DateFormField id="contract-to" name="validTo" defaultValue={contract?.validTo ?? null} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Stunden pro Woche', 'Hours a week')} htmlFor="contract-hours">
          <Input id="contract-hours" name="weeklyHours" inputMode="decimal" defaultValue={contract?.weeklyHours ?? ''} />
        </Field>
        <Field label={t('Unterrichtseinheiten pro Woche', 'Lessons a week')} htmlFor="contract-units">
          <Input id="contract-units" name="weeklyUnits" inputMode="decimal" defaultValue={contract?.weeklyUnits ?? ''} />
        </Field>
      </div>
      <Field label={t('Notiz', 'Note')} htmlFor="contract-note">
        <Textarea id="contract-note" name="note" rows={2} maxLength={300} defaultValue={contract?.note ?? ''} />
      </Field>
      <Foot>
        <Button type="submit">{contract ? t('Speichern', 'Save') : t('Vertrag hinzufügen', 'Add contract')}</Button>
      </Foot>
    </form>
  );
}

export async function HrNumbersForm({ staffId, numbers }: { staffId: string; numbers: StaffHrNumbers }) {
  const { t } = await getI18n();
  return (
    <form action={saveHrNumbersAction} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      <Field label={t('Steuer-ID', 'Tax ID')} htmlFor="hr-tax">
        <Input id="hr-tax" name="taxId" maxLength={40} autoComplete="off" className="font-mono" defaultValue={numbers.taxId ?? ''} />
      </Field>
      <Field label={t('Rentenversicherungsnummer', 'Pension insurance number')} htmlFor="hr-pension">
        <Input id="hr-pension" name="pensionNumber" maxLength={40} autoComplete="off" className="font-mono" defaultValue={numbers.pensionNumber ?? ''} />
      </Field>
      <Field label={t('Krankenversichertennummer', 'Health insurance number')} htmlFor="hr-health">
        <Input id="hr-health" name="healthNumber" maxLength={40} autoComplete="off" className="font-mono" defaultValue={numbers.healthNumber ?? ''} />
      </Field>
      <Foot>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </Foot>
    </form>
  );
}

export async function AccountForm({ staffId, current, accounts }: { staffId: string; current: string | null; accounts: { id: string; name: string; email: string }[] }) {
  const { t } = await getI18n();
  return (
    <form action={linkAccountAction} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      <Field label={t('Konto im Arbeitsbereich', 'Workspace account')} htmlFor="account-user">
        <Select id="account-user" name="staffUserId" defaultValue={current ?? ''}>
          <option value="">{t('Kein Konto', 'No account')}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.email}
            </option>
          ))}
        </Select>
      </Field>
      <Foot>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </Foot>
    </form>
  );
}

export async function LicenceForm({ staffId, exams, licence }: { staffId: string; exams: { id: string; name: string }[]; licence?: StaffLicence }) {
  const { t } = await getI18n();
  return (
    <form action={saveLicenceAction} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      {licence ? <input type="hidden" name="licenceId" value={licence.id} /> : null}
      <Field label={t('Prüfung', 'Exam')} htmlFor="licence-exam">
        <Select id="licence-exam" name="examTypeId" defaultValue={licence?.examTypeId ?? exams[0]?.id} required>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('Lizenznummer', 'Licence number')} htmlFor="licence-number">
        <Input id="licence-number" name="number" maxLength={60} autoComplete="off" className="font-mono" defaultValue={licence?.number ?? ''} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Gültig ab', 'Valid from')} htmlFor="licence-from">
          <DateFormField id="licence-from" name="validFrom" defaultValue={licence?.validFrom ?? null} />
        </Field>
        <Field label={t('Gültig bis', 'Valid until')} htmlFor="licence-to">
          <DateFormField id="licence-to" name="validTo" defaultValue={licence?.validTo ?? null} />
        </Field>
      </div>
      <Field label={t('Notiz', 'Note')} htmlFor="licence-note">
        <Textarea id="licence-note" name="note" rows={2} maxLength={300} defaultValue={licence?.note ?? ''} />
      </Field>
      <Foot>
        <Button type="submit">{licence ? t('Speichern', 'Save') : t('Lizenz eintragen', 'Add licence')}</Button>
      </Foot>
    </form>
  );
}
