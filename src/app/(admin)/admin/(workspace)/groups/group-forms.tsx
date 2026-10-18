import { createGroupAction, updateGroupAction } from './actions';
import { DateFormField } from '@/components/admin/date-picker';
import { DialogFooter } from '@/components/admin/dialogs';
import { OptionalSection } from '@/components/admin/optional-section';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import { GROUP_LEVELS } from '@/lib/admin/group-labels';
import type { GroupDetail, GroupOptions } from '@/lib/admin/groups';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { toDateInputValue } from '@/lib/dates';

/**
 * The groups module's forms, each in a dialog. A new visit needs its name; who comes, how many, when
 * and at what level open once it is in. Changing one shows them all.
 */

const day = (value: Date | null | undefined) => (value ? toDateInputValue(value) : null);

/** Who comes and how many, when, and how they are taught: the same fields when a visit is made and when it is changed. */
async function VisitFields({ group, options, prefix }: { group?: GroupDetail; options: GroupOptions; prefix: string }) {
  const { t, lang } = await getI18n();
  const id = (field: string) => `${prefix}-${field}`;
  const agencies = options.organisations.filter((o) => o.kind === 'agency');
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Schule oder Firma', 'School or company')} htmlFor={id('organisation')}>
          <Select id={id('organisation')} name="organisationId" defaultValue={group?.organisationId ?? ''}>
            <option value="">—</option>
            {options.organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Über die Agentur', 'Through the agency')} htmlFor={id('agency')}>
          <Select id={id('agency')} name="agencyId" defaultValue={group?.agencyId ?? ''}>
            <option value="">—</option>
            {agencies.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
        <Field label={t('Land', 'Country')} htmlFor={id('country')}>
          <Select id={id('country')} name="countryCode" defaultValue={group?.countryCode ?? ''}>
            <option value="">—</option>
            {[...options.countries]
              .sort((a, b) => pick(lang, a.name).localeCompare(pick(lang, b.name), lang))
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {pick(lang, c.name)}
                </option>
              ))}
          </Select>
        </Field>
        <Field label={t('Teilnehmende', 'Students')} htmlFor={id('participants')}>
          <Input id={id('participants')} name="participants" inputMode="numeric" maxLength={3} defaultValue={group?.participants ?? ''} />
        </Field>
        <Field label={t('Begleitung', 'Escorts')} htmlFor={id('escorts')}>
          <Input id={id('escorts')} name="escorts" inputMode="numeric" maxLength={2} defaultValue={group?.escorts ?? ''} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[7rem_7rem_minmax(0,1fr)_7rem]">
        <Field label={t('Alter von', 'Age from')} htmlFor={id('age-from')}>
          <Input id={id('age-from')} name="ageFrom" inputMode="numeric" maxLength={2} defaultValue={group?.ageFrom ?? ''} />
        </Field>
        <Field label={t('bis', 'to')} htmlFor={id('age-to')}>
          <Input id={id('age-to')} name="ageTo" inputMode="numeric" maxLength={2} defaultValue={group?.ageTo ?? ''} />
        </Field>
        <Field label={t('Kursart', 'Course type')} htmlFor={id('type')}>
          <Select id={id('type')} name="courseTypeId" defaultValue={group?.courseTypeId ?? ''}>
            <option value="">—</option>
            {options.courseTypes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Niveau', 'Level')} htmlFor={id('level')}>
          <Select id={id('level')} name="level" defaultValue={group?.level ?? ''}>
            <option value="">—</option>
            {GROUP_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Anreise', 'Arrival')} htmlFor={id('arrival')}>
          <DateFormField id={id('arrival')} name="arrival" defaultValue={day(group?.arrival)} />
        </Field>
        <Field label={t('Abreise', 'Departure')} htmlFor={id('departure')}>
          <DateFormField id={id('departure')} name="departure" defaultValue={day(group?.departure)} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Unterricht ab', 'Lessons from')} htmlFor={id('course-from')}>
          <DateFormField id={id('course-from')} name="courseFrom" defaultValue={day(group?.courseFrom)} />
        </Field>
        <Field label={t('Unterricht bis', 'Lessons until')} htmlFor={id('course-to')}>
          <DateFormField id={id('course-to')} name="courseTo" defaultValue={day(group?.courseTo)} />
        </Field>
      </div>
      <Field label={t('An- und Abreise', 'Travel')} htmlFor={id('travel')}>
        <Textarea id={id('travel')} name="travelNote" rows={2} maxLength={1000} defaultValue={group?.travelNote ?? ''} />
      </Field>
    </div>
  );
}

export async function NewGroupForm({ options }: { options: GroupOptions }) {
  const { t } = await getI18n();
  return (
    <form action={createGroupAction} className="space-y-4">
      <Field label={t('Name', 'Name')} htmlFor="group-name">
        <Input id="group-name" name="name" required maxLength={200} autoFocus />
      </Field>
      <OptionalSection requires={['name']} heading={t('Wer, wann und wie viele', 'Who, when and how many')}>
        <VisitFields options={options} prefix="group-new" />
      </OptionalSection>
      <DialogFooter>
        <Button type="submit">{t('Anlegen', 'Create')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function EditGroupForm({ group, options }: { group: GroupDetail; options: GroupOptions }) {
  const { t } = await getI18n();
  return (
    <form action={updateGroupAction} className="space-y-4">
      <input type="hidden" name="groupId" value={group.id} />
      <Field label={t('Name', 'Name')} htmlFor="group-edit-name">
        <Input id="group-edit-name" name="name" required maxLength={200} defaultValue={group.name} />
      </Field>
      <VisitFields group={group} options={options} prefix="group-edit" />
      <Field label={t('Notiz', 'Note')} htmlFor="group-edit-note">
        <Textarea id="group-edit-note" name="note" rows={3} maxLength={2000} defaultValue={group.note ?? ''} />
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}
