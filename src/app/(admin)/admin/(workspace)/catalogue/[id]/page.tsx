import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createBookingFromWizardAction } from '../../bookings/actions';
import { BookingWizard } from '../../bookings/booking-wizard';
import { cancelCourseAction, cancelStartAction, deleteCourseAction, deleteStartAction, offerPlaceAction, openGroupAction, takeBackOfferAction } from '../actions';
import { StartEditForm } from '../cohort-form';
import { RecordFoot } from '../../bookings/record-foot';
import { CourseForm, NewCourseForm } from '../course-forms';
import { CloseForm, MoveForm } from '../waitlist-forms';
import { BookingLightDot } from '@/components/admin/booking-light';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { Badge, Button, Card, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { bookingOffer } from '@/lib/admin/booking-offer';
import type { BookingOffer } from '@/lib/admin/booking-offer-types';
import { bookingLight, bookingLightLabel, type ObservationReason } from '@/lib/admin/bookings';
import { PER_LEVEL_TYPES, SESSION_LABELS, startForEdit } from '@/lib/admin/catalogue';
import { roomChoice } from '@/lib/admin/course-starts';
import { coursesForEdit, type CourseForEdit } from '@/lib/admin/courses';
import { requireModule } from '@/lib/admin/guard';
import { capitalise, num, pick, relativeDays, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { startClasses, type PlanClass, type StartClass } from '@/lib/admin/kursplanung/link';
import { SHIFT_INFO } from '@/lib/admin/kursplanung/types';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';
import {
  courseGroups,
  freePlaces,
  getCourseStart,
  levelCodes,
  levelGroups,
  placeForNext,
  startBookings,
  startEntries,
  upcomingStarts,
  WAITLIST_SOURCE_LABELS,
  WAITLIST_STATUS_LABELS,
  type LevelGroup,
  type StartBooking,
  type WaitlistEntry,
} from '@/lib/admin/waitlist';
import { toDateInputValue } from '@/lib/dates';
import { teachingWeeks } from '@/lib/admin/offers/course';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForEntries, type SentLetter } from '@/lib/admin/letters/repo';
import { listBookableRooms, type Room } from '@/lib/admin/rooms';
import { cn } from '@/lib/utils';
import { mailHref } from '@/lib/admin/mail/href';

/**
 * One course start (2026-10-16): its levels, their places and their waiting lists
 * (docs/ADMIN_WORKSPACE.md §Waiting list).
 *
 * The head says what the start is and, in its bar, how it stands in all: booked, waiting, free.
 * Then one card per level — the places as a line that fills, the queue in order with each learner's
 * place, and the booked learners under it. When a place is free and someone waits, the card says
 * so first and names who is next. Offering the place, booking it, moving someone and taking them
 * off are done on the row; how many places a level has, and a second group, are the course
 * planners' (`rooms` at `edit`).
 */
export default async function CourseStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; level?: string }>;
}) {
  const [{ id }, { error, level: focusLevel }, user] = await Promise.all([params, searchParams, requireModule('catalogue')]);
  const start = await getCourseStart(id);
  if (!start) notFound();
  const { t, lang } = await getI18n();

  const plans = canAccess(user, 'rooms', 'edit');
  const ends = canAccess(user, 'rooms', 'full');
  const handles = canAccess(user, 'bookings', 'edit');
  const [groups, entries, bookings, levels, starts, teaching, forms, bookableRooms, editing] = await Promise.all([
    levelGroups([id]),
    startEntries(id),
    canAccess(user, 'bookings') ? startBookings(id) : Promise.resolve([]),
    levelCodes(),
    handles ? upcomingStarts() : Promise.resolve([]),
    startClasses(id),
    plans ? coursesForEdit(id) : Promise.resolve([]),
    plans ? listBookableRooms() : Promise.resolve([] as Room[]),
    plans || ends ? startForEdit(id) : Promise.resolve(null),
  ]);
  // The rooms as the team calls them, their city first.
  const rooms = bookableRooms.map((room) => ({ id: room.id, name: roomChoice(room) }));
  // A start of intensive or evening courses has a course per level; any other a named course each.
  const named = !PER_LEVEL_TYPES.includes(start.courseTypeSlug);
  // Courses of another start this one's learners wait on or are booked into: a `.2` joiner sits in the
  // running course of the start before (`resolveCourse`). Each gets its card here, under the level asked for.
  const joinerIds = [...new Set([...entries.map((e) => e.courseId), ...bookings.map((b) => b.courseId)].filter((c): c is string => Boolean(c) && !groups.some((g) => g.courseId === c)))];
  const joiners = await courseGroups(joinerIds);
  const joinerLevel = (courseId: string) =>
    entries.find((e) => e.courseId === courseId && e.courseInstanceId === id)?.levelCode ?? bookings.find((b) => b.courseId === courseId)?.levelCode ?? null;
  const joinerStarts = new Map(
    (await Promise.all([...new Set(joiners.map((g) => g.courseInstanceId))].map((sid) => getCourseStart(sid)))).filter((s): s is NonNullable<typeof s> => Boolean(s)).map((s) => [s.id, s])
  );
  // The last letter to each learner in a queue, to say on their row what they have been told.
  const letters = await lettersForEntries(entries.map((e) => e.id));
  // The wizard only where a row can be booked: an offered place, or a waiting learner with a free place.
  const bookable = handles && entries.some((e) => e.status === 'offered' || e.status === 'waiting');
  const offer = bookable ? await bookingOffer() : null;

  const booked = groups.reduce((sum, g) => sum + g.booked, 0);
  // Everyone waiting for this start, a joiner on the course before included.
  const waiting = entries.filter((e) => e.status === 'waiting' || e.status === 'offered').length;
  const free = groups.reduce((sum, g) => sum + freePlaces(g), 0);
  const back = `/admin/catalogue/${id}`;
  const typeName = (s: { courseTypeName: string; courseTypeNameDe: string }) => (lang === 'de' ? s.courseTypeNameDe : s.courseTypeName);
  const startLabel = (s: { courseTypeName: string; courseTypeNameDe: string; title: string | null; startDate: Date; session: keyof typeof SESSION_LABELS | null }) =>
    [s.title ?? typeName(s), s.session ? pick(lang, SESSION_LABELS[s.session]) : null, new Date(s.startDate).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })]
      .filter(Boolean)
      .join(' · ');
  const startOptions = starts.map((s) => ({ id: s.id, label: startLabel(s) }));
  // Teaching weeks: the school's closures (the Christmas break) are not weeks of the course.
  const weeks = teachingWeeks(toDateInputValue(start.startDate), toDateInputValue(start.endDate));
  const begun = new Date(start.startDate) <= new Date();

  return (
    <>
      <RecordHeader
        backHref="/admin/catalogue"
        backLabel={t('Kurse', 'Courses')}
        // The start's own title when it has one („Basisgrammatik"), the kind beside it; else the kind.
        title={start.title ?? typeName(start)}
        status={
          <>
            {start.status === 'cancelled' ? <Badge tone="danger">{t('Abgesagt', 'Cancelled')}</Badge> : null}
            {begun ? <Badge tone="quiet">{t('Hat begonnen', 'Under way')}</Badge> : null}
            {!start.onWebsite && start.status !== 'cancelled' ? <Badge tone="quiet">{t('Nicht auf der Website', 'Not on the website')}</Badge> : null}
          </>
        }
        subtitle={
          <MetaLine>
            {start.title ? <MetaItem icon={Icon.catalogue}>{typeName(start)}</MetaItem> : null}
            <MetaItem icon={Icon.calendar}>
              {dayRange(toDateInputValue(start.startDate), toDateInputValue(start.endDate), lang)} · {weeks === 1 ? t('1 Woche', '1 week') : t(`${weeks} Wochen`, `${weeks} weeks`)}
            </MetaItem>
            {start.session || start.time ? (
              <MetaItem icon={Icon.clock}>
                {[start.session ? pick(lang, SESSION_LABELS[start.session]) : null, dayList(start.days, lang), start.time].filter(Boolean).join(' · ')}
              </MetaItem>
            ) : null}
            {start.roomName ? <MetaItem icon={Icon.rooms}>{start.roomName}</MetaItem> : null}
          </MetaLine>
        }
        actions={
          plans && start.status !== 'cancelled' ? (
            <>
              {editing ? (
                <FormDialog trigger={t('Bearbeiten', 'Edit')} title={t('Termin bearbeiten', 'Edit the start')} size="sm">
                  <StartEditForm
                    start={{
                      id,
                      startDate: editing.startDate,
                      endDate: editing.endDate,
                      session: editing.session,
                      days: editing.days,
                      time: editing.time,
                      title: editing.title,
                      roomId: editing.roomId,
                      onWebsite: editing.onWebsite,
                      datesFixed: editing.datesFixed,
                      scheduleFixed: editing.scheduleFixed,
                    }}
                    rooms={bookableRooms.map((r) => ({ id: r.id, name: r.name, nickname: r.nickname, capacity: r.capacity }))}
                  />
                </FormDialog>
              ) : null}
              <FormDialog trigger={t('Kurs hinzufügen', 'Add a course')} title={t('Neuer Kurs in diesem Termin', 'A new course in this start')} size="sm">
                <NewCourseForm courseInstanceId={id} levels={levels.filter((code) => !groups.some((g) => g.levelCode === code))} rooms={rooms} named={named} returnTo={back} />
              </FormDialog>
            </>
          ) : null
        }
        bar={
          <StatBar>
            <Stat label={t('Gebucht', 'Booked')}>{num(lang, booked)}</Stat>
            <Stat label={t('Warteliste', 'Waiting list')}>{waiting ? num(lang, waiting) : <span className="font-semibold text-[var(--casa-muted)]">{t('niemand', 'nobody')}</span>}</Stat>
            <Stat label={t('Plätze frei', 'Free places')}>
              <span className={free ? 'text-[#17693a]' : 'text-[var(--casa-muted)]'}>{num(lang, free)}</span>
            </Stat>
            {start.withoutLevel ? (
              <Stat label={t('Ohne Kurs', 'Without a course')}>
                <span className="text-[#9a5b00]">{num(lang, start.withoutLevel)}</span>
              </Stat>
            ) : null}
          </StatBar>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {teaching ? <TeachingCard teaching={teaching} board={canAccess(user, 'kursplanung')} staff={canAccess(user, 'staff')} t={t} lang={lang} /> : null}

        {groups.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--casa-muted)]">{t('Dieser Termin hat noch keine Kurse.', 'This start has no courses yet.')}</p>
          </Card>
        ) : null}

        {groups.map((group) => (
          <LevelCard
            key={group.courseId}
            group={group}
            form={forms.find((f) => f.id === group.courseId) ?? null}
            rooms={rooms}
            entries={entries.filter((e) => e.courseId === group.courseId)}
            letters={letters}
            bookings={bookings.filter((b) => b.courseId === group.courseId)}
            focused={focusLevel === group.levelCode || focusLevel === group.courseId}
            plans={plans}
            ends={ends}
            handles={handles}
            offer={offer}
            startOptions={startOptions}
            levels={levels}
            back={back}
            t={t}
            lang={lang}
          />
        ))}

        {joiners.map((group) => {
          const level = joinerLevel(group.courseId);
          const from = joinerStarts.get(group.courseInstanceId);
          return (
            <LevelCard
              key={group.courseId}
              group={group}
              joiner={{
                levelCode: level,
                startHref: `/admin/catalogue/${group.courseInstanceId}?level=${encodeURIComponent(group.levelCode ?? group.courseId)}`,
                startDate: from?.startDate ?? null,
                endDate: from?.endDate ?? null,
              }}
              form={null}
              rooms={rooms}
              entries={entries.filter((e) => e.courseId === group.courseId && e.courseInstanceId === id)}
              letters={letters}
              bookings={bookings.filter((b) => b.courseId === group.courseId)}
              focused={focusLevel === level || focusLevel === group.courseId}
              plans={false}
              ends={false}
              handles={handles}
              offer={offer}
              startOptions={startOptions}
              levels={levels}
              back={back}
              t={t}
              lang={lang}
            />
          );
        })}

        {/* Booked here without a course: they hold a place no course counts until a level is set on the booking. */}
        {bookings.some((b) => !b.courseId) ? (
          <Card title={t('Ohne Kurs', 'Without a course')} icon={Icon.attention} tint="sun" bleed>
            <BookedRows bookings={bookings.filter((b) => !b.courseId)} lang={lang} />
          </Card>
        ) : null}
      </div>

      {/* Called off while nobody is booked or waits; deleted only when planned here and never used. */}
      {ends && editing && start.status !== 'cancelled' && editing.booked === 0 && editing.waiting === 0 ? (
        <RecordFoot>
          {editing.createdHere && !editing.used ? (
            <form action={deleteStartAction}>
              <input type="hidden" name="startId" value={id} />
              <ConfirmSubmit title={t('Diesen Termin löschen?', 'Delete this start?')} description={t('Er verschwindet mit seinen Kursen und Kurstagen ganz.', 'It is gone for good, with its courses and lesson days.')}>
                {t('Termin löschen', 'Delete start')}
              </ConfirmSubmit>
            </form>
          ) : (
            <form action={cancelStartAction}>
              <input type="hidden" name="startId" value={id} />
              <ConfirmSubmit
                title={t('Diesen Termin absagen?', 'Cancel this start?')}
                description={t('Er verschwindet von der Website und bleibt hier mit seinen Kursen als abgesagt stehen.', 'It leaves the website and stays here, with its courses, as cancelled.')}
                confirmLabel={t('Termin absagen', 'Cancel start')}
              >
                {t('Termin absagen', 'Cancel start')}
              </ConfirmSubmit>
            </form>
          )}
        </RecordFoot>
      ) : null}
    </>
  );
}

/**
 * The start's classes on the Kursplanung board (docs/KURSPLANUNG.md §Course starts): per level and
 * group, who teaches it in its first month (`.1`) and in the next (`.2`). Who teaches is changed on
 * the board; this reads it.
 */
function TeachingCard({
  teaching,
  board,
  staff,
  t,
  lang,
}: {
  teaching: { first: string; second: string; classes: StartClass[] };
  board: boolean;
  staff: boolean;
  t: T;
  lang: WsLang;
}) {
  // The start's shift is in its head; a row names it only when the classes run in both.
  const mixed = new Set(teaching.classes.map((c) => c.shift)).size > 1;
  const who = (c: PlanClass | null) => {
    if (!c) return <span className="text-[var(--casa-text-subtle)]">—</span>;
    const people = c.teachers.length ? c.teachers : c.pair.map((p) => ({ ...p, days: 0, substitute: false }));
    if (!people.length) return <span className="text-[var(--casa-text-subtle)]">{t('offen', 'open')}</span>;
    return (
      <span className={cn('flex flex-wrap gap-x-2 gap-y-0.5', !c.teachers.length && 'text-[var(--casa-muted)]')}>
        {people.map((p, i) => (
          <span key={p.id} className="inline-flex items-center gap-1">
            <span>
              {staff ? (
                <Link href={`/admin/staff/${p.id}?tab=teaching`} className="hover:underline">
                  {p.name}
                </Link>
              ) : (
                p.name
              )}
              {i < people.length - 1 && !p.substitute ? ',' : ''}
            </span>
            {p.substitute ? <Badge tone="warning">{t('Vertretung', 'Cover')}</Badge> : null}
          </span>
        ))}
      </span>
    );
  };
  return (
    <Card
      title={t('Unterricht', 'Teaching')}
      icon={Icon.kursplanung}
      tint="sun"
      bleed
      actions={
        board ? (
          <Link href={`/admin/kursplanung?month=${teaching.first}`} className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
            {t('Zur Kursplanung', 'Open Kursplanung')}
          </Link>
        ) : undefined
      }
    >
      {teaching.classes.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-[0.86rem]">
            <thead>
              <tr className="border-b border-ws-line text-xs text-[var(--casa-muted)]">
                <th className="px-5 py-2 font-semibold">{t('Gruppe', 'Group')}</th>
                <th className="px-3 py-2 font-semibold">{monthLabel(teaching.first, lang)}</th>
                <th className="px-5 py-2 font-semibold">{monthLabel(teaching.second, lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ws-line-soft">
              {teaching.classes.map((c) => (
                <tr key={`${c.shift}${c.level}${c.groupIndex}`} className="align-top">
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-6 min-w-10 items-center justify-center rounded-lg bg-[var(--fm-navy)] px-1.5 text-[0.78rem] font-extrabold text-white tabular-nums">{c.level}</span>
                      <span className="text-[var(--casa-muted)]">
                        {[mixed ? pick(lang, SHIFT_INFO[c.shift].label) : null, c.of > 1 ? t(`Gruppe ${c.groupIndex}`, `Group ${c.groupIndex}`) : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{who(c.first)}</td>
                  <td className="px-5 py-2.5">{who(c.second)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('In der Kursplanung gibt es für diesen Start noch keine Gruppen.', 'Kursplanung has no groups for this start yet.')}</p>
      )}
    </Card>
  );
}

/**
 * One course of the start: its places and room, who is next for a free one, the queue, the booked
 * learners. A joiner's card (`joiner`) is the running course of another start, under the level asked
 * for here: its queue and learners for this start, its places as that course has them; it is planned
 * on its own start's page.
 */
function LevelCard({
  group,
  joiner,
  form,
  rooms,
  entries,
  letters,
  bookings,
  focused,
  plans,
  ends,
  handles,
  offer,
  startOptions,
  levels,
  back,
  t,
  lang,
}: {
  group: LevelGroup;
  joiner?: { levelCode: string | null; startHref: string; startDate: Date | null; endDate: Date | null };
  form: CourseForEdit | null;
  rooms: { id: string; name: string }[];
  entries: WaitlistEntry[];
  letters: SentLetter[];
  bookings: StartBooking[];
  focused: boolean;
  plans: boolean;
  ends: boolean;
  handles: boolean;
  offer: BookingOffer | null;
  startOptions: { id: string; label: string }[];
  levels: string[];
  back: string;
  t: T;
  lang: WsLang;
}) {
  const open = entries.filter((e) => e.status === 'waiting' || e.status === 'offered');
  const closed = entries.filter((e) => e.status !== 'waiting' && e.status !== 'offered');
  const free = freePlaces(group);
  const full = free === 0;
  const next = placeForNext(group) ? open.find((e) => e.status === 'waiting') : undefined;
  // Waiting learners a free place is there for: the first `free` of those still waiting.
  const withPlace = new Set(open.filter((e) => e.status === 'waiting').slice(0, free).map((e) => e.id));
  const key = joiner?.levelCode ?? group.levelCode ?? group.courseId;
  const levelBack = `${back}?level=${encodeURIComponent(key)}`;
  const day = (d: Date) => new Date(d).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' });
  const openGroup = (prominent: boolean) => (
    <form action={openGroupAction}>
      <input type="hidden" name="courseId" value={group.courseId} />
      <input type="hidden" name="returnTo" value={levelBack} />
      <ConfirmSubmit
        title={t(`Eine ${group.groups === 1 ? 'zweite' : 'weitere'} Gruppe ${group.label} eröffnen?`, `Open ${group.groups === 1 ? 'a second' : 'another'} ${group.label} group?`)}
        description={t(
          open.length
            ? `${group.placesPerGroup} Plätze mehr. Die Warteliste rückt nach: wer vorne steht, kann dann gebucht werden.`
            : `${group.placesPerGroup} Plätze mehr, und die Gruppe in der Kursplanung.`,
          open.length
            ? `${group.placesPerGroup} more places. The waiting list moves up: the first in line can then be booked.`
            : `${group.placesPerGroup} more places, and the group in Kursplanung.`
        )}
        confirmLabel={t('Gruppe eröffnen', 'Open group')}
        variant={prominent ? 'secondary' : 'ghost'}
      >
        {group.groups === 1 ? t('Zweite Gruppe eröffnen', 'Open a second group') : t('Weitere Gruppe eröffnen', 'Open another group')}
      </ConfirmSubmit>
    </form>
  );

  return (
    <section
      id={`level-${key}`}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-3xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        focused ? 'border-[var(--fm-navy)]/40 ring-2 ring-[var(--fm-navy)]/10' : 'border-ws-line'
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'inline-flex h-9 min-w-12 items-center justify-center rounded-xl px-2.5 text-[0.95rem] font-extrabold tracking-[-0.01em] tabular-nums',
              group.cancelled ? 'bg-ws-sunk text-[var(--casa-muted)] line-through' : 'bg-[var(--fm-navy)] text-white'
            )}
          >
            {joiner?.levelCode ?? group.levelCode ?? (group.title ? group.title.slice(0, 2).toUpperCase() : '—')}
          </span>
          <div className="min-w-0">
            <h2 className="text-[0.95rem] leading-tight font-extrabold text-[var(--casa-ink)]">
              {group.title && group.levelCode ? <span className="mr-1.5">{group.title} ·</span> : group.title ? <span className="mr-1.5">{group.title} ·</span> : null}
              {group.cancelled
                ? t('Abgesagt', 'Cancelled')
                : full
                  ? t('Voll', 'Full')
                  : t(`${num(lang, free)} ${free === 1 ? 'Platz' : 'Plätze'} frei`, `${num(lang, free)} ${free === 1 ? 'place' : 'places'} free`)}
              {open.length ? <span className="font-semibold text-[var(--casa-muted)]"> · {t(`${num(lang, open.length)} auf der Warteliste`, `${num(lang, open.length)} on the waiting list`)}</span> : null}
              {!group.bookable && !group.cancelled ? <Badge tone="quiet" className="ml-2 align-middle">{t('Nicht buchbar', 'Not bookable')}</Badge> : null}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--casa-muted)]">
              {[
                // A joiner sits in the running course of the start before, to its end.
                joiner
                  ? joiner.startDate && joiner.endDate
                    ? t(`im laufenden Kurs ${group.label} · ${day(joiner.startDate)} bis ${day(joiner.endDate)}`, `in the running ${group.label} course · ${day(joiner.startDate)} to ${day(joiner.endDate)}`)
                    : t(`im laufenden Kurs ${group.label}`, `in the running ${group.label} course`)
                  : null,
                group.groups === 1
                  ? t(`1 Gruppe · ${group.placesPerGroup} Plätze`, `1 group · ${group.placesPerGroup} places`)
                  : t(`${group.groups} Gruppen à ${group.placesPerGroup} · ${group.places} Plätze`, `${group.groups} groups of ${group.placesPerGroup} · ${group.places} places`),
                group.roomName,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {joiner ? (
            <Link
              href={joiner.startHref}
              className="inline-flex h-8 items-center rounded-lg border border-ws-line bg-white px-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] hover:border-ws-line-firm"
            >
              {t(`Kurs ${group.label}`, `Course ${group.label}`)}
            </Link>
          ) : (
            <Link
              href={`/admin/catalogue/courses/${group.courseId}`}
              className="inline-flex h-8 items-center rounded-lg border border-ws-line bg-white px-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] hover:border-ws-line-firm"
            >
              {t('Kurstage', 'Lesson days')}
            </Link>
          )}
          {plans ? (
            <>
            {form ? (
              <FormDialog trigger={t('Bearbeiten', 'Edit')} title={t(`Kurs ${group.label}`, `Course ${group.label}`)} size="sm" triggerVariant="ghost">
                <CourseForm course={form} rooms={rooms} returnTo={levelBack} />
              </FormDialog>
            ) : null}
            {ends && !group.cancelled && !bookings.length && !open.length ? (
              <form action={group.booked || closed.length ? cancelCourseAction : deleteCourseAction}>
                <input type="hidden" name="courseId" value={group.courseId} />
                <input type="hidden" name="returnTo" value={back} />
                <ConfirmSubmit
                  title={group.booked || closed.length ? t(`Kurs ${group.label} absagen?`, `Cancel course ${group.label}?`) : t(`Kurs ${group.label} löschen?`, `Delete course ${group.label}?`)}
                  description={
                    group.booked || closed.length
                      ? t('Der Kurs bleibt mit seinem Verlauf und wird nicht mehr angeboten.', 'The course stays with its history and is no longer offered.')
                      : t('Niemand war in diesem Kurs gebucht oder auf der Warteliste.', 'Nobody was booked into or waited for this course.')
                  }
                  confirmLabel={group.booked || closed.length ? t('Absagen', 'Cancel course') : t('Löschen', 'Delete')}
                  variant="ghost"
                >
                  {group.booked || closed.length ? t('Absagen', 'Cancel') : t('Löschen', 'Delete')}
                </ConfirmSubmit>
              </form>
            ) : null}
            {/* Another group: prominent when the course is full and someone waits, quiet otherwise. */}
            {!group.cancelled && group.groups < 9 ? openGroup(open.length > 0 && full && group.bookable) : null}
            </>
          ) : null}
        </div>
      </header>

      <div className="px-5 py-4">
        {/* The places as a line that fills: booked, then held for an offer. */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7ecf3]" aria-hidden="true">
            <div className="flex h-full">
              <div className={cn('h-full', full ? 'bg-[#d9a033]' : 'bg-[var(--fm-navy)]')} style={{ width: `${Math.min(100, (group.booked / Math.max(1, group.places)) * 100)}%` }} />
              <div className="h-full bg-[#8fb4e6]" style={{ width: `${Math.min(100, (group.offered / Math.max(1, group.places)) * 100)}%` }} />
            </div>
          </div>
          <span className="shrink-0 text-[0.82rem] text-[var(--casa-muted)] tabular-nums">
            {t(`${group.booked} von ${group.places} gebucht`, `${group.booked} of ${group.places} booked`)}
            {group.offered ? t(` · ${group.offered} angeboten`, ` · ${group.offered} offered`) : ''}
          </span>
        </div>

        {next ? (
          <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e9f6ee] px-4 py-3 ring-1 ring-[#b7dfc6] ring-inset">
            <p className="text-[0.88rem] text-[#14532d]">
              <span className="font-extrabold">{free === 1 ? t('1 Platz frei', '1 place free') : t(`${free} Plätze frei`, `${free} places free`)}</span>
              {' · '}
              {t('als Nächste dran:', 'next in line:')}{' '}
              <Link href={`/admin/people/${next.personId}`} className="font-bold underline-offset-2 hover:underline">
                {next.personName}
              </Link>
            </p>
            {handles ? (
              <form action={offerPlaceAction}>
                <input type="hidden" name="entryId" value={next.id} />
                <input type="hidden" name="returnTo" value={levelBack} />
                <Button type="submit" size="sm">
                  {t('Platz anbieten', 'Offer the place')}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      {open.length ? (
        <ol className="border-t border-ws-line-soft">
          {open.map((entry) => (
            <QueueRow
              key={entry.id}
              entry={entry}
              queueLength={open.length}
              hasPlace={withPlace.has(entry.id)}
              lastLetter={letters.find((l) => l.waitlistEntryId === entry.id) ?? null}
              handles={handles}
              offer={offer}
              startOptions={startOptions}
              levels={levels}
              back={levelBack}
              t={t}
              lang={lang}
            />
          ))}
        </ol>
      ) : null}

      {bookings.length ? (
        <details className="group/booked border-t border-ws-line-soft">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[0.82rem] font-bold text-[var(--casa-ink)] select-none hover:bg-[var(--ws-row-hover)] [&::-webkit-details-marker]:hidden">
            <span className="text-[var(--casa-muted)] transition-transform group-open/booked:rotate-90">{Icon.chevronRight}</span>
            {t(`Gebucht (${bookings.length})`, `Booked (${bookings.length})`)}
          </summary>
          <BookedRows bookings={bookings} lang={lang} />
        </details>
      ) : null}

      {closed.length ? (
        <details className="group/closed border-t border-ws-line-soft">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[0.82rem] font-bold text-[var(--casa-muted)] select-none hover:bg-[var(--ws-row-hover)] [&::-webkit-details-marker]:hidden">
            <span className="transition-transform group-open/closed:rotate-90">{Icon.chevronRight}</span>
            {t(`Von der Warteliste (${closed.length})`, `Off the waiting list (${closed.length})`)}
          </summary>
          <ul className="pb-2">
            {closed.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 text-[0.84rem]">
                <Link href={`/admin/people/${entry.personId}`} className="font-semibold text-[var(--casa-ink)] hover:underline">
                  {entry.personName}
                </Link>
                <span className="text-[0.78rem] text-[var(--casa-muted)]">
                  {pick(lang, WAITLIST_STATUS_LABELS[entry.status])}
                  {entry.closedAt ? ` · ${capitalise(relativeDays(entry.closedAt, lang))}` : ''}
                  {entry.bookingId ? (
                    <>
                      {' · '}
                      <Link href={`/admin/bookings/${entry.bookingId}`} className="font-medium text-[var(--casa-accent-text)] hover:underline">
                        {t('Buchung', 'Booking')}
                      </Link>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/** One learner in the queue: their place, since when, how they came, and what can be done. */
function QueueRow({
  entry,
  queueLength,
  hasPlace,
  lastLetter,
  handles,
  offer,
  startOptions,
  levels,
  back,
  t,
  lang,
}: {
  entry: WaitlistEntry;
  queueLength: number;
  hasPlace: boolean;
  lastLetter: SentLetter | null;
  handles: boolean;
  offer: BookingOffer | null;
  startOptions: { id: string; label: string }[];
  levels: string[];
  back: string;
  t: T;
  lang: WsLang;
}) {
  const offered = entry.status === 'offered';
  const subject = offered
    ? t(`Ein Platz ist frei: ${entry.courseTypeName} ${entry.levelCode}`, `A place is free: ${entry.courseTypeName} ${entry.levelCode}`)
    : t(`Warteliste: ${entry.courseTypeName} ${entry.levelCode}`, `Waiting list: ${entry.courseTypeName} ${entry.levelCode}`);
  return (
    <li className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ws-line-soft px-5 py-3 last:border-b-0', offered && 'bg-[#f3f8ff]')}>
      <span
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.86rem] font-extrabold tabular-nums',
          offered ? 'bg-[var(--fm-navy)] text-white' : 'bg-ws-sunk text-[var(--casa-ink)]'
        )}
        aria-label={t(`Platz ${entry.position}`, `Place ${entry.position}`)}
      >
        {entry.position}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/people/${entry.personId}`} className="truncate text-[0.9rem] font-semibold text-[var(--casa-ink)] hover:underline">
            {entry.personName}
          </Link>
          {offered ? <Badge tone="accent">{pick(lang, WAITLIST_STATUS_LABELS.offered)}</Badge> : null}
          {entry.email ? (
            <Link
              href={mailHref('person', entry.personId, { subject, address: entry.email, back })}
              className="text-[var(--casa-muted)] hover:text-[var(--casa-ink)] [&_svg]:size-3.5"
              title={entry.email}
              aria-label={t(`E-Mail an ${entry.personName}`, `Email ${entry.personName}`)}
            >
              {Icon.mail}
            </Link>
          ) : null}
        </div>
        <p className="mt-0.5 text-[0.78rem] text-[var(--casa-muted)]">
          {[
            offered && entry.offeredAt
              ? t(`angeboten ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` von ${entry.offeredByName}` : ''}`, `offered ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` by ${entry.offeredByName}` : ''}`)
              : t(`wartet seit ${new Date(entry.joinedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`, `waiting since ${new Date(entry.joinedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`),
            pick(lang, WAITLIST_SOURCE_LABELS[entry.source]),
            // What they were told last, and when.
            lastLetter
              ? t(
                  `${pick(lang, LETTER_KIND_LABELS[lastLetter.kind])} gesendet ${new Date(lastLetter.sentAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`,
                  `${pick(lang, LETTER_KIND_LABELS[lastLetter.kind])} sent ${new Date(lastLetter.sentAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`
                )
              : null,
            entry.note,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {handles ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {hasPlace && !offered ? (
            <form action={offerPlaceAction}>
              <input type="hidden" name="entryId" value={entry.id} />
              <input type="hidden" name="returnTo" value={back} />
              <Button type="submit" size="sm" variant="secondary">
                {t('Platz anbieten', 'Offer the place')}
              </Button>
            </form>
          ) : null}
          {(offered || hasPlace) && offer ? (
            <FormDialog trigger={t('Buchen', 'Book')} title={t(`${entry.personName} buchen`, `Book ${entry.personName}`)} width="lg" size="sm" triggerVariant={offered ? 'secondary' : 'ghost'}>
              <BookingWizard
                personId={entry.personId}
                personName={entry.personName}
                offer={offer}
                preselectedCohortId={entry.courseInstanceId}
                preselectedLevelCode={entry.levelCode}
                sourceRegistrationId={entry.registrationId}
                returnTo={back.split('?')[0]}
                action={createBookingFromWizardAction}
              />
            </FormDialog>
          ) : null}
          {offered ? (
            <form action={takeBackOfferAction}>
              <input type="hidden" name="entryId" value={entry.id} />
              <input type="hidden" name="returnTo" value={back} />
              <Button type="submit" size="sm" variant="ghost">
                {t('Angebot zurücknehmen', 'Take back the offer')}
              </Button>
            </form>
          ) : null}
          <Link
            href={`/admin/catalogue/waitlist/${entry.id}/letter${offered ? '?kind=place_free' : ''}`}
            className="inline-flex h-8 items-center rounded-lg px-2.5 text-[0.8rem] font-semibold text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]"
          >
            {t('Brief', 'Letter')}
          </Link>
          <FormDialog trigger={t('Verschieben', 'Move')} title={t(`${entry.personName} verschieben`, `Move ${entry.personName}`)} size="sm" triggerVariant="ghost">
            <MoveForm entry={entry} queueLength={queueLength} starts={startOptions} levels={levels} returnTo={back} />
          </FormDialog>
          <FormDialog
            trigger={offered ? t('Abgesagt', 'Declined') : t('Von der Liste', 'Off the list')}
            title={offered ? t(`${entry.personName} hat abgesagt`, `${entry.personName} declined`) : t(`${entry.personName} von der Warteliste nehmen`, `Take ${entry.personName} off the list`)}
            size="sm"
            triggerVariant="ghost"
          >
            <CloseForm entry={entry} returnTo={back} />
          </FormDialog>
        </div>
      ) : null}
    </li>
  );
}

/** Booked learners: the name to their booking, the booking's colour. */
function BookedRows({ bookings, lang }: { bookings: StartBooking[]; lang: WsLang }) {
  return (
    <ul className="pb-2">
      {bookings.map((b) => {
        const money = { status: b.status, observationReason: b.observationReason as ObservationReason | null, charged: b.charged, paid: b.paid };
        const light = bookingLight(money);
        return (
          <li key={b.id}>
            <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-2 text-[0.86rem] transition-colors hover:bg-[var(--ws-row-hover)]">
              <span className="truncate font-medium text-[var(--casa-ink)]">{b.personName}</span>
              <BookingLightDot light={light} label={pick(lang, bookingLightLabel(money))} size="md" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_SHORT: Record<WsLang, Record<string, string>> = {
  de: { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' },
  en: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
};

/** "Mo–Fr" for a run of days, "Mo, Mi" otherwise. */
function dayList(days: string[], lang: WsLang): string | null {
  const sorted = days.filter((d) => DAY_ORDER.includes(d)).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (sorted.length === 0) return null;
  const run = sorted.every((d, i) => i === 0 || DAY_ORDER.indexOf(d) === DAY_ORDER.indexOf(sorted[i - 1]) + 1);
  const short = sorted.map((d) => DAY_SHORT[lang][d]);
  return run && short.length > 2 ? `${short[0]}–${short[short.length - 1]}` : short.join(', ');
}
