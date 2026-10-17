import { createCourseAction, updateCourseAction } from './actions';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import type { CourseForEdit } from '@/lib/admin/courses';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * A course of a start (0041), in a dialog: its places, its room and whether it is offered; a module, an
 * exam preparation, a group's or a company's course also its own name, price and lessons.
 */

type Room = { id: string; name: string };

async function CourseFields({ course, rooms, named }: { course?: CourseForEdit; rooms: Room[]; named: boolean }) {
  const { t } = await getI18n();
  const key = course?.id ?? 'new';
  return (
    <>
      {named ? (
        <Field label={t('Name', 'Name')} htmlFor={`course-title-${key}`}>
          <Input id={`course-title-${key}`} name="title" maxLength={120} defaultValue={course?.title ?? ''} placeholder={t('z. B. Grammatik B2', 'e.g. Grammar B2')} />
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Gruppen', 'Groups')} htmlFor={`course-groups-${key}`}>
          <Input id={`course-groups-${key}`} name="groups" type="number" min={0} max={9} required defaultValue={course?.groups ?? 1} />
        </Field>
        <Field label={t('Plätze pro Gruppe', 'Places per group')} htmlFor={`course-places-${key}`}>
          <Input id={`course-places-${key}`} name="placesPerGroup" type="number" min={1} max={40} required defaultValue={course?.placesPerGroup ?? 14} />
        </Field>
      </div>
      <Field label={t('Raum', 'Room')} htmlFor={`course-room-${key}`}>
        <Select id={`course-room-${key}`} name="roomId" defaultValue={course?.roomId ?? ''}>
          <option value="">{t('Noch offen', 'Not yet')}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      {named ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Preis', 'Price')} htmlFor={`course-price-${key}`}>
            <Input id={`course-price-${key}`} name="price" inputMode="decimal" defaultValue={course?.price ?? ''} />
          </Field>
          <Field label={t('Unterrichtseinheiten', 'Lessons')} htmlFor={`course-lessons-${key}`}>
            <Input id={`course-lessons-${key}`} name="lessons" inputMode="numeric" defaultValue={course?.lessons ?? ''} />
          </Field>
        </div>
      ) : null}
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="bookable" defaultChecked={course?.bookable ?? true} className="size-4 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]" />
        {t('Buchbar', 'Open for booking')}
      </label>
      <Field label={t('Notiz', 'Note')} htmlFor={`course-note-${key}`}>
        <Textarea id={`course-note-${key}`} name="note" rows={2} maxLength={500} defaultValue={course?.note ?? ''} />
      </Field>
    </>
  );
}

export async function CourseForm({ course, rooms, returnTo }: { course: CourseForEdit; rooms: Room[]; returnTo: string }) {
  const { t } = await getI18n();
  return (
    <form action={updateCourseAction} className="space-y-3">
      <input type="hidden" name="courseId" value={course.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <CourseFields course={course} rooms={rooms} named={!course.levelCode} />
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </div>
    </form>
  );
}

/** A course the start does not have yet: a level, or — for a start of modules — a named course. */
export async function NewCourseForm({
  courseInstanceId,
  levels,
  rooms,
  named,
  returnTo,
}: {
  courseInstanceId: string;
  levels: readonly string[];
  rooms: Room[];
  named: boolean;
  returnTo: string;
}) {
  const { t } = await getI18n();
  return (
    <form action={createCourseAction} className="space-y-3">
      <input type="hidden" name="courseInstanceId" value={courseInstanceId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Field label={t('Niveau', 'Level')} htmlFor="new-course-level">
        <Select id="new-course-level" name="levelCode" required={!named} defaultValue="">
          <option value="" disabled={!named}>
            {named ? t('Ohne Niveau', 'No level') : t('Bitte wählen', 'Choose')}
          </option>
          {levels.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </Field>
      <CourseFields rooms={rooms} named={named} />
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Kurs anlegen', 'Add course')}</Button>
      </div>
    </form>
  );
}
