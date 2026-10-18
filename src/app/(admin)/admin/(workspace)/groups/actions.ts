'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { GROUP_LEVELS, GROUP_STATUSES } from '@/lib/admin/group-labels';
import { createGroup, deleteGroup, setGroupStatus, updateGroup } from '@/lib/admin/groups';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * The groups module's writes (2026-10-18). Every one asks `requireModule('groups', …)` first: an action
 * is a public endpoint and never passes through the layout that rendered its form (CLAUDE.md rule 7).
 * Adding, changing, confirming or calling off a visit is `edit`; deleting one is `full`, after the
 * confirmation.
 */

const uuid = z.string().uuid();

/** A free text: trimmed, and nothing when empty. */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'long')
    .transform((v) => v || null);
/** A chosen record: its id, or nothing. */
const choice = z
  .string()
  .trim()
  .refine((v) => !v || uuid.safeParse(v).success, 'choice')
  .transform((v) => v || null);
/** A whole number from `min` to `max`, or nothing. */
const whole = (max: number, code: string) =>
  z
    .string()
    .trim()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) <= max), code)
    .transform((v) => (v ? Number(v) : null));
const day = z
  .string()
  .trim()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'date')
  .transform((v) => v || null);

const GroupSchema = z
  .object({
    name: z.string().trim().min(1, 'name').max(200, 'long'),
    organisationId: choice,
    agencyId: choice,
    courseTypeId: choice,
    level: z
      .string()
      .trim()
      .refine((v) => !v || (GROUP_LEVELS as readonly string[]).includes(v), 'choice')
      .transform((v) => (v || null) as (typeof GROUP_LEVELS)[number] | null),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => !v || /^[A-Z]{2}$/.test(v), 'choice')
      .transform((v) => v || null),
    participants: whole(999, 'people'),
    escorts: whole(99, 'people'),
    ageFrom: whole(99, 'age'),
    ageTo: whole(99, 'age'),
    arrival: day,
    departure: day,
    courseFrom: day,
    courseTo: day,
    travelNote: text(1000),
    note: text(2000),
  })
  .refine((g) => !g.arrival || !g.departure || g.departure >= g.arrival, { message: 'stay', path: ['departure'] })
  .refine((g) => !g.courseFrom || !g.courseTo || g.courseTo >= g.courseFrom, { message: 'lessons', path: ['courseTo'] })
  .refine((g) => g.ageFrom == null || g.ageTo == null || g.ageTo >= g.ageFrom, { message: 'age', path: ['ageTo'] });

const GROUP_FIELDS = [
  'name',
  'organisationId',
  'agencyId',
  'courseTypeId',
  'level',
  'countryCode',
  'participants',
  'escorts',
  'ageFrom',
  'ageTo',
  'arrival',
  'departure',
  'courseFrom',
  'courseTo',
  'travelNote',
  'note',
] as const;

/** The named fields of a form, each as a string (a missing one as empty). */
const fields = (formData: FormData, names: readonly string[]) =>
  Object.fromEntries(names.map((name) => [name, typeof formData.get(name) === 'string' ? String(formData.get(name)) : '']));

/** The first problem of a form, in the colleague's words. */
function problem(error: z.ZodError, t: T): string {
  switch (error.issues[0]?.message) {
    case 'name':
      return t('Ein Name ist nötig.', 'A name is required.');
    case 'people':
      return t('Die Zahl der Personen ist eine ganze Zahl.', 'The number of people is a whole number.');
    case 'age':
      return t('Das Alter ist eine ganze Zahl, „bis" nicht kleiner als „von".', 'The age is a whole number, “to” not below “from”.');
    case 'date':
      return t('Ein Datum sieht nicht richtig aus.', 'A date does not look right.');
    case 'stay':
      return t('Die Abreise liegt vor der Anreise.', 'The departure is before the arrival.');
    case 'lessons':
      return t('Der Unterricht endet vor seinem Beginn.', 'The lessons end before they start.');
    case 'long':
      return t('Ein Eintrag ist zu lang.', 'An entry is too long.');
    default:
      return t('Bitte prüf die Angaben.', 'Please check the details.');
  }
}

const page = (id: string) => `/admin/groups/${id}`;

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

function done(path: string): never {
  revalidatePath('/admin', 'layout');
  redirect(path);
}

function groupId(formData: FormData): string {
  const parsed = uuid.safeParse(formData.get('groupId'));
  if (!parsed.success) redirect('/admin/groups');
  return parsed.data;
}

export async function createGroupAction(formData: FormData): Promise<void> {
  const actor = await requireModule('groups', 'edit');
  const { t } = await getI18n();
  const parsed = GroupSchema.safeParse(fields(formData, GROUP_FIELDS));
  if (!parsed.success) fail('/admin/groups', problem(parsed.error, t));
  const id = await createGroup(parsed.data, actor);
  done(page(id));
}

export async function updateGroupAction(formData: FormData): Promise<void> {
  const actor = await requireModule('groups', 'edit');
  const id = groupId(formData);
  const { t, lang } = await getI18n();
  const parsed = GroupSchema.safeParse(fields(formData, GROUP_FIELDS));
  if (!parsed.success) fail(page(id), problem(parsed.error, t));
  const result = await updateGroup(id, parsed.data, actor);
  if (!result.ok) fail('/admin/groups', pick(lang, result.reason));
  done(page(id));
}

/** Confirmed, called off, or back to asked for, with the confirmation. */
export async function setGroupStatusAction(formData: FormData): Promise<void> {
  const actor = await requireModule('groups', 'edit');
  const id = groupId(formData);
  const status = z.enum(GROUP_STATUSES).safeParse(formData.get('status'));
  if (formData.get('confirmed') !== '1' || !status.success) redirect(page(id));
  const result = await setGroupStatus(id, status.data, actor);
  if (!result.ok) fail('/admin/groups', pick((await getI18n()).lang, result.reason));
  done(page(id));
}

/** Gone, for a visit entered by mistake, with the confirmation. */
export async function deleteGroupAction(formData: FormData): Promise<void> {
  const actor = await requireModule('groups', 'full');
  const id = groupId(formData);
  if (formData.get('confirmed') !== '1') redirect(page(id));
  const result = await deleteGroup(id, actor);
  if (!result.ok) fail(page(id), pick((await getI18n()).lang, result.reason));
  done('/admin/groups');
}
