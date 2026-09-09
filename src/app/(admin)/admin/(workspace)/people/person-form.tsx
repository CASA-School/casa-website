import { Button, Field, Input, Select } from '@/components/admin/ui';
import type { Country, PersonDetail } from '@/lib/admin/people';
import { createPersonAction, updatePersonAction } from './actions';

const SALUTATIONS = [
  ['', '—'],
  ['ms', 'Ms'],
  ['mr', 'Mr'],
  ['mx', 'Mx'],
  ['neutral', 'No salutation'],
] as const;

/**
 * One form for creating and editing a person, rendered inside a dialog.
 *
 * Progressive disclosure: a new person needs a name and a way to reach them;
 * salutation, date of birth, nationality and phone sit under "More". When
 * editing, everything is shown — the person opened Edit to go deeper.
 */
export function PersonForm({ person, countries }: { person?: PersonDetail; countries: Country[] }) {
  const editing = Boolean(person);
  const primaryEmail =
    person?.emails.find((e) => e.isPrimary)?.address ?? person?.emails[0]?.address ?? '';
  const primaryPhone =
    person?.phones.find((p) => p.isPrimary)?.number ?? person?.phones[0]?.number ?? '';
  const nationality = person?.nationalityName ?? person?.nationalityRaw ?? '';

  const more = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Salutation" htmlFor="person-salutation">
        <Select id="person-salutation" name="salutation" defaultValue={person?.salutation ?? ''}>
          {SALUTATIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date of birth" htmlFor="person-birth">
        <Input
          id="person-birth"
          name="birthDate"
          type="date"
          defaultValue={person?.birthDate ? person.birthDate.toISOString().slice(0, 10) : ''}
        />
      </Field>
      <Field label="Nationality" htmlFor="person-nationality">
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
      <Field label="Phone" htmlFor="person-phone">
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
        <Field label="First name" htmlFor="person-first">
          <Input
            id="person-first"
            name="firstName"
            required
            maxLength={80}
            defaultValue={person?.firstName ?? ''}
            autoFocus={!editing}
          />
        </Field>
        <Field label="Last name" htmlFor="person-last">
          <Input
            id="person-last"
            name="lastName"
            maxLength={80}
            defaultValue={person?.lastName ?? ''}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="person-email">
        <Input
          id="person-email"
          name="email"
          type="email"
          maxLength={200}
          defaultValue={primaryEmail}
        />
      </Field>

      {editing ? (
        more
      ) : (
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]">
            <span className="group-open:hidden">More</span>
            <span className="hidden group-open:inline">Less</span>
          </summary>
          <div className="mt-3">{more}</div>
        </details>
      )}

      <div className="flex justify-end pt-1">
        <Button type="submit">{editing ? 'Save' : 'Add person'}</Button>
      </div>
    </form>
  );
}
