'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useTransition, type FormEvent, type ReactNode } from 'react';

import { saveCourseAction, setCourseBookableAction } from './actions';
import { menuItem, menuPanel } from '@/components/admin/choice-menu';
import { DIALOG_OVERLAY, DialogHead, dialogPanel } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * A course's actions in the course list (2026-10-17, Rahman): one „Aktionen" menu at the end of a
 * course's row instead of a single „Buchen" — book a learner, edit the course, its lesson days and
 * teachers, its waiting list, and open or close it for booking (SchoolMan's „Buchbar"; it was a badge).
 * „Kurs bearbeiten" opens one editor for the whole list, with the previous and the next course a click
 * away: moving on saves what was changed, as SchoolMan commits a record when you leave it.
 */

export type EditableCourse = {
  id: string;
  startId: string;
  /** The level, or the course's own name. */
  label: string;
  /** Its kind, shift, dates and numbers, for the editor's head. */
  context: string;
  waitingHref: string;
  waiting: number;
  named: boolean;
  title: string | null;
  roomId: string | null;
  groups: number;
  placesPerGroup: number;
  bookable: boolean;
  price: number | null;
  lessons: number | null;
  note: string | null;
};

type Ctx = {
  courses: EditableCourse[];
  rooms: { id: string; name: string }[];
  canPlan: boolean;
  canBook: boolean;
  edit: (id: string) => void;
};

const CourseActionsContext = createContext<Ctx | null>(null);

export function CourseActionsProvider({
  courses,
  rooms,
  canPlan,
  canBook,
  children,
}: {
  courses: EditableCourse[];
  rooms: { id: string; name: string }[];
  canPlan: boolean;
  canBook: boolean;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const edit = (id: string) => {
    const at = courses.findIndex((c) => c.id === id);
    // After the menu has closed, so the editor takes the focus.
    if (at >= 0) window.setTimeout(() => setEditing(at), 0);
  };
  return (
    <CourseActionsContext.Provider value={{ courses, rooms, canPlan, canBook, edit }}>
      {children}
      {canPlan ? <CourseEditor courses={courses} rooms={rooms} index={editing} onIndex={setEditing} /> : null}
    </CourseActionsContext.Provider>
  );
}

/** „Aktionen ▾" on a course's row. */
export function CourseActions({ courseId }: { courseId: string }) {
  const ctx = useContext(CourseActionsContext);
  const { t } = useWsLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const course = ctx?.courses.find((c) => c.id === courseId);
  const [open, setOpen] = useState<boolean | null>(null);
  if (!ctx || !course) return null;
  const bookable = open ?? course.bookable;

  const toggle = () => {
    const next = !bookable;
    setOpen(next);
    start(async () => {
      const result = await setCourseBookableAction(courseId, next);
      if (!result.ok) setOpen(!next);
      router.refresh();
    });
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] font-semibold text-[var(--casa-muted)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 data-[state=open]:bg-ws-sunk data-[state=open]:text-[var(--casa-ink)] [&_svg]:size-3.5"
        aria-label={t(`Aktionen für ${course.label}`, `Actions for ${course.label}`)}
      >
        {t('Aktionen', 'Actions')}
        {Icon.chevronDown}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className={cn(menuPanel, 'min-w-[15rem]')}>
        {ctx.canBook ? (
          <DropdownMenuItem asChild className={menuItem}>
            <Link href={`/admin/catalogue/courses/${courseId}?book=1`}>
              {Icon.bookings}
              {t('Teilnehmende buchen', 'Book a learner')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {ctx.canPlan ? (
          <DropdownMenuItem className={menuItem} onSelect={() => ctx.edit(courseId)}>
            {Icon.settings}
            {t('Kurs bearbeiten …', 'Edit the course …')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild className={menuItem}>
          <Link href={`/admin/catalogue/courses/${courseId}`}>
            {Icon.calendar}
            {t('Kurstage & Lehrkräfte', 'Lesson days & teachers')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItem}>
          <Link href={course.waitingHref}>
            {Icon.clock}
            {t('Warteliste', 'Waiting list')}
            {course.waiting ? <span className="ml-auto text-xs font-semibold text-[var(--casa-muted)] tabular-nums">{course.waiting}</span> : null}
          </Link>
        </DropdownMenuItem>
        {ctx.canPlan ? (
          <>
            <DropdownMenuSeparator />
            {/* Stays open: the switch shows what it did. */}
            <DropdownMenuItem
              className={menuItem}
              disabled={pending}
              onSelect={(event) => {
                event.preventDefault();
                toggle();
              }}
            >
              <Switch on={bookable} />
              {t('Für Buchungen offen', 'Open for booking')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex h-[18px] w-8 shrink-0 rounded-full transition-colors', on ? 'bg-[#17693a]' : 'bg-[#cfd7e2]')}
    >
      <span className={cn('absolute top-[2px] size-[14px] rounded-full bg-white shadow-sm transition-transform', on ? 'translate-x-[16px]' : 'translate-x-[2px]')} />
    </span>
  );
}

type Draft = { title: string; roomId: string; groups: string; placesPerGroup: string; bookable: boolean; price: string; lessons: string; note: string };
const draftOf = (c: EditableCourse): Draft => ({
  title: c.title ?? '',
  roomId: c.roomId ?? '',
  groups: String(c.groups),
  placesPerGroup: String(c.placesPerGroup),
  bookable: c.bookable,
  price: c.price === null ? '' : String(c.price).replace('.', ','),
  lessons: c.lessons === null ? '' : String(c.lessons),
  note: c.note ?? '',
});

/** One editor for the list's courses, the previous and the next a click away. */
function CourseEditor({
  courses,
  rooms,
  index,
  onIndex,
}: {
  courses: EditableCourse[];
  rooms: { id: string; name: string }[];
  index: number | null;
  onIndex: (i: number | null) => void;
}) {
  const { t } = useWsLang();
  const router = useRouter();
  const course = index === null ? null : courses[index];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // A course newly shown starts from what it holds.
  if (course && shownFor !== course.id) {
    setShownFor(course.id);
    setDraft(draftOf(course));
    setError(null);
    setSaved(false);
  }
  const dirty = Boolean(course && draft && JSON.stringify(draft) !== JSON.stringify(draftOf(course)));

  const save = async (): Promise<boolean> => {
    if (!course || !draft) return false;
    if (!dirty) return true;
    setSaving(true);
    setError(null);
    const form = new FormData();
    form.set('groups', draft.groups);
    form.set('placesPerGroup', draft.placesPerGroup);
    form.set('roomId', draft.roomId);
    if (draft.bookable) form.set('bookable', 'on');
    form.set('note', draft.note);
    if (course.named) {
      form.set('title', draft.title);
      form.set('price', draft.price);
      form.set('lessons', draft.lessons);
    }
    const result = await saveCourseAction(course.id, form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSaved(true);
    router.refresh();
    return true;
  };

  const go = async (to: number) => {
    if (to < 0 || to >= courses.length) return;
    if (await save()) onIndex(to);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save();
  };

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setSaved(false);
  };

  return (
    <Dialog open={course !== null} onOpenChange={(open) => (open ? null : onIndex(null))}>
      {course && draft ? (
        <DialogContent className={dialogPanel('md')} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
          <DialogHead title={course.label} description={course.context} icon={Icon.catalogue} tint="red" />
          <form onSubmit={submit} className="space-y-3 px-6 pt-5">
            {course.named ? (
              <Field label={t('Name', 'Name')} htmlFor="edit-course-title">
                <Input id="edit-course-title" value={draft.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} />
              </Field>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Gruppen', 'Groups')} htmlFor="edit-course-groups">
                <Input id="edit-course-groups" type="number" min={0} max={9} required value={draft.groups} onChange={(e) => set({ groups: e.target.value })} />
              </Field>
              <Field label={t('Plätze pro Gruppe', 'Places per group')} htmlFor="edit-course-places">
                <Input id="edit-course-places" type="number" min={1} max={40} required value={draft.placesPerGroup} onChange={(e) => set({ placesPerGroup: e.target.value })} />
              </Field>
            </div>
            <Field label={t('Raum', 'Room')} htmlFor="edit-course-room">
              <Select id="edit-course-room" value={draft.roomId} onChange={(e) => set({ roomId: e.target.value })}>
                <option value="">{t('Noch offen', 'Not yet')}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            {course.named ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('Preis', 'Price')} htmlFor="edit-course-price">
                  <Input id="edit-course-price" inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} />
                </Field>
                <Field label={t('Unterrichtseinheiten', 'Lessons')} htmlFor="edit-course-lessons">
                  <Input id="edit-course-lessons" inputMode="numeric" value={draft.lessons} onChange={(e) => set({ lessons: e.target.value })} />
                </Field>
              </div>
            ) : null}
            <button
              type="button"
              role="switch"
              aria-checked={draft.bookable}
              onClick={() => set({ bookable: !draft.bookable })}
              className="flex w-full items-center gap-2.5 rounded-lg py-1 text-left text-sm font-medium text-[var(--casa-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
            >
              <Switch on={draft.bookable} />
              {t('Für Buchungen offen', 'Open for booking')}
            </button>
            <Field label={t('Notiz', 'Note')} htmlFor="edit-course-note">
              <Textarea id="edit-course-note" rows={2} maxLength={500} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
            </Field>
            {error ? (
              <p role="alert" className="text-sm font-semibold text-[var(--casa-danger-text)]">
                {error}
              </p>
            ) : null}
            <div className="sticky bottom-0 z-10 -mx-6 mt-6 flex flex-wrap items-center gap-2 rounded-b-3xl border-t border-ws-line bg-white/95 px-6 py-3.5 backdrop-blur-sm">
              <span className="mr-auto flex items-center gap-1">
                <Button type="button" variant="secondary" size="md" onClick={() => go(index! - 1)} disabled={index === 0 || saving} aria-label={t('Vorheriger Kurs', 'Previous course')}>
                  <span aria-hidden="true">‹</span>
                  <span className="hidden sm:inline">{t('Vorheriger', 'Previous')}</span>
                </Button>
                <span className="min-w-[3.75rem] text-center text-xs font-semibold text-[var(--casa-muted)] tabular-nums">
                  {index! + 1} / {courses.length}
                </span>
                <Button type="button" variant="secondary" size="md" onClick={() => go(index! + 1)} disabled={index === courses.length - 1 || saving} aria-label={t('Nächster Kurs', 'Next course')}>
                  <span className="hidden sm:inline">{t('Nächster', 'Next')}</span>
                  <span aria-hidden="true">›</span>
                </Button>
              </span>
              {saved && !dirty ? <span className="text-xs font-semibold text-[#17693a]">{t('Gespeichert', 'Saved')}</span> : null}
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="md">
                  {t('Schließen', 'Close')}
                </Button>
              </DialogClose>
              <Button type="submit" size="md" disabled={!dirty || saving}>
                {saving ? t('Speichert …', 'Saving …') : t('Speichern', 'Save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
