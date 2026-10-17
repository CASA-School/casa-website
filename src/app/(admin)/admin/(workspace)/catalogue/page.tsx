import Link from 'next/link';

import { FormDialog } from '@/components/admin/dialogs';
import { dayRange, euros, ListBar, ListEmpty, ListGroup } from '@/components/admin/list';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  listCourseTypes,
  listUpcomingCourseInstances,
  SESSION_LABELS,
  type CourseInstanceSummary,
  type CourseTypeSummary,
} from '@/lib/admin/catalogue';
import { query } from '@/lib/admin/db';
import { requireModule } from '@/lib/admin/guard';
import { pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { Tally } from '@/components/admin/inbox';
import { getI18n } from '@/lib/admin/i18n.server';
import { listBookableRooms, type Room } from '@/lib/admin/rooms';
import { freePlaces, levelGroups, placeForNext, type LevelGroup } from '@/lib/admin/waitlist';
import { toDateInputValue } from '@/lib/dates';
import { CohortForm } from './cohort-form';
import { groupRuns, monthKey, monthLabel, openCell, OpenTable, sentenceCase } from './list-parts';
import { RoomPicker } from './room-picker';

/**
 * Courses, with live demand against them.
 *
 * READ-ONLY, DELIBERATELY, for the course types. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md`
 * is the current authority on every price and hour count on this screen,
 * verified against casa-bremen.de and carrying an explicit list of what is
 * still unverified. An edit form here before that reconciliation would let the
 * workspace quietly contradict the published facts, and the contradiction
 * would surface as a wrong price on a course page.
 *
 * What the workspace adds is the one thing the source of truth cannot hold:
 * how many people have actually registered for the cohort starting in ten days.
 *
 * One list card with two views (docs/ADMIN_WORKSPACE.md §Lists): the upcoming
 * cohorts, grouped by the month they start in, and the course types. Only
 * what differs from the normal case is marked — a cohort that is full or
 * nearly full, a status other than scheduled, a room too small. A cohort's
 * room is a value that opens the rooms as choices; an unset room is an empty
 * cell whose "Set room" appears on hover.
 */

const VIEWS: readonly { key: 'cohorts' | 'types'; label: Bilingual }[] = [
  { key: 'cohorts', label: { de: 'Kommende Termine', en: 'Upcoming cohorts' } },
  { key: 'types', label: { de: 'Kursarten', en: 'Course types' } },
];

const hide = 'hidden md:table-cell';

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; view?: string; new?: string }>;
}) {
  const user = await requireModule('catalogue');
  const { t, lang } = await getI18n();
  const plans = canAccess(user, 'rooms', 'edit');
  const [{ error, view: rawView, new: fresh }, types, instances, rooms, levels] = await Promise.all([
    searchParams,
    listCourseTypes(),
    listUpcomingCourseInstances(20),
    plans ? listBookableRooms() : Promise.resolve([]),
    plans
      ? query<{ code: string }>(`SELECT code FROM levels ORDER BY sort_order`).then((r) => r.map((x) => x.code))
      : Promise.resolve([]),
  ]);
  const view = rawView === 'types' ? 'types' : 'cohorts';
  const taken = instances.reduce((sum, i) => sum + i.bookingCount, 0);
  // Places are per level (the waiting list, 0031): each start's levels, for what is waiting and free.
  const groups = await levelGroups(instances.map((i) => i.id));

  return (
    <>
      <PageHeader
        title={t('Kurse', 'Courses')}
        actions={
          plans ? (
            <FormDialog
              trigger={t('Termin planen', 'Schedule cohort')}
              title={t('Termin planen', 'Schedule a cohort')}
              triggerVariant="primary"
              defaultOpen={fresh === '1'}
            >
              <CohortForm courseTypes={types} rooms={rooms} levels={levels} />
            </FormDialog>
          ) : null
        }
      />

      {/* What is coming, how full it is, and when the next one starts. */}
      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="working" n={instances.length} label={instances.length === 1 ? t('kommender Termin', 'date ahead') : t('kommende Termine', 'dates ahead')} lang={lang} />
        <Tally tone="done" n={taken} label={t('gebucht', 'booked')} lang={lang} />
        {instances[0] ? (
          <span>
            {t('Nächster Beginn', 'Next start')}{' '}
            <b className="font-semibold text-[var(--casa-ink)]">
              {new Date(instances[0].startDate).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short' })}
            </b>
          </span>
        ) : null}
      </p>

      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <Card bleed overflow={view === 'cohorts' ? 'visible' : 'hidden'}>
        <ListBar
          tabs={VIEWS.map((v) => ({
            key: v.key,
            label: pick(lang, v.label),
            href: `/admin/catalogue${v.key === 'cohorts' ? '' : `?view=${v.key}`}`,
          }))}
          active={view}
        />
        {view === 'cohorts' ? (
          <Cohorts instances={instances} groups={groups} rooms={rooms} plans={plans} t={t} lang={lang} />
        ) : (
          <CourseTypes types={types} t={t} lang={lang} />
        )}
      </Card>
    </>
  );
}

function Cohorts({
  instances,
  groups,
  rooms,
  plans,
  t,
  lang,
}: {
  instances: CourseInstanceSummary[];
  groups: LevelGroup[];
  rooms: Room[];
  plans: boolean;
  t: T;
  lang: WsLang;
}) {
  if (instances.length === 0) return <ListEmpty title={t('Keine Termine geplant', 'No cohorts scheduled')} />;

  // Same-day cohorts in a fixed order, so a row does not swap places after its room changes.
  const ordered = [...instances].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime() ||
      a.courseTypeName.localeCompare(b.courseTypeName) ||
      a.id.localeCompare(b.id)
  );
  const months = groupRuns(ordered, (instance) => monthKey(instance.startDate));

  return (
    <OpenTable
      head={[
        { label: t('Kurs', 'Course') },
        { label: t('Zeitraum', 'Runs'), className: 'w-px md:w-[13.5rem]' },
        { label: t('Raum', 'Room'), className: `w-[15rem] ${hide}` },
        { label: t('Belegung', 'Taken'), className: `w-[15rem] ${hide}` },
      ]}
    >
      {months.flatMap((month) => [
        <ListGroup key={month.key} label={monthLabel(month.key, lang)} count={month.items.length} span={4} />,
        ...month.items.map((instance) => (
          <CohortRow key={instance.id} instance={instance} groups={groups.filter((g) => g.courseInstanceId === instance.id)} rooms={rooms} plans={plans} t={t} lang={lang} />
        )),
      ])}
    </OpenTable>
  );
}

const STATUS_LABELS: Record<string, { label: Bilingual; tone: 'quiet' | 'neutral' | 'danger' }> = {
  cancelled: { label: { de: 'Abgesagt', en: 'Cancelled' }, tone: 'danger' },
  draft: { label: { de: 'Entwurf', en: 'Draft' }, tone: 'quiet' },
};

/** One cohort: what it is, when, where, how many are booked, who waits and whether a place is free for them. */
function CohortRow({
  instance,
  groups,
  rooms,
  plans,
  t,
  lang,
}: {
  instance: CourseInstanceSummary;
  groups: LevelGroup[];
  rooms: Room[];
  plans: boolean;
  t: T;
  lang: WsLang;
}) {
  const waiting = groups.reduce((sum, g) => sum + g.waiting + g.offered, 0);
  const freeForNext = groups.some(placeForNext);
  const fullLevels = groups.filter((g) => !g.cancelled && g.places > 0 && freePlaces(g) === 0).map((g) => g.label);
  const overRoom =
    instance.room?.capacity !== null &&
    instance.room?.capacity !== undefined &&
    instance.capacity > instance.room.capacity;

  // The line under the name carries only what the course name does not already say.
  const sub = [
    instance.title && instance.title !== instance.courseTypeName ? instance.title : null,
    instance.levelCode,
    instance.session ? pick(lang, SESSION_LABELS[instance.session]) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const known = STATUS_LABELS[instance.status];
  const status =
    instance.status === 'scheduled'
      ? null
      : known
        ? { label: pick(lang, known.label), tone: known.tone }
        : { label: sentenceCase(instance.status), tone: 'neutral' as const };

  return (
    <tr className="group" data-cohort={instance.id}>
      <td className={`${openCell} py-3 md:max-w-0`}>
        <span className="flex min-w-0 items-center gap-2">
          <Link href={`/admin/catalogue/${instance.id}`} className="text-[0.9rem] font-semibold text-[var(--casa-ink)] hover:underline md:truncate">
            {instance.courseTypeName}
          </Link>
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </span>
        {sub ? <span className="mt-0.5 block truncate text-[0.8rem] text-[var(--casa-muted)]">{sub}</span> : null}
      </td>
      <td className={`${openCell} py-3 text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums`}>
        {/* The month group above says the year; the range names one only when it crosses into another. */}
        {dayRange(
          toDateInputValue(instance.startDate),
          toDateInputValue(instance.endDate),
          lang,
          new Date(instance.startDate).getFullYear()
        )}
      </td>
      <td className={`${openCell} py-1.5 ${hide}`}>
        {plans ? (
          <RoomPicker instance={instance} rooms={rooms} />
        ) : instance.room ? (
          <Link
            href={`/admin/settings/rooms/${instance.room.id}`}
            className="text-[0.84rem] font-medium text-[var(--casa-ink)] hover:underline"
          >
            {instance.room.nickname ?? instance.room.name}
          </Link>
        ) : instance.location ? (
          <span className="text-[0.84rem] text-[var(--casa-muted)]">{instance.location}</span>
        ) : null}
        {overRoom ? (
          <span className="mt-0.5 block text-xs font-semibold text-[#9a5b00]">{t('Raum zu klein', 'Room too small')}</span>
        ) : null}
      </td>
      <td className={`${openCell} py-3 ${hide}`}>
        <span className="flex flex-wrap items-center gap-1.5 text-[0.84rem]">
          <span className={instance.bookingCount ? 'font-semibold text-[var(--casa-ink)] tabular-nums' : 'text-[var(--casa-text-subtle)] tabular-nums'}>
            {t(`${instance.bookingCount} gebucht`, `${instance.bookingCount} booked`)}
          </span>
          {freeForNext ? <Badge tone="positive">{t('Platz frei', 'Place free')}</Badge> : null}
          {waiting ? <Badge tone="accent">{t(`${waiting} Warteliste`, `${waiting} waiting`)}</Badge> : null}
        </span>
        {fullLevels.length ? (
          <span className="mt-0.5 block text-xs font-semibold text-[#9a5b00]">{t(`Voll: ${fullLevels.join(', ')}`, `Full: ${fullLevels.join(', ')}`)}</span>
        ) : null}
      </td>
    </tr>
  );
}

/** A course type's format, as stored (free words in FileMaker's style), in the workspace's language. */
const FORMAT_LABELS: Record<string, Bilingual> = {
  intensive: { de: 'Intensivkurs', en: 'Intensive' },
  'intensive block': { de: 'Intensivblock', en: 'Intensive block' },
  evening: { de: 'Abendkurs', en: 'Evening' },
  'group package': { de: 'Gruppenpaket', en: 'Group package' },
  'custom corporate': { de: 'Firmenkurs nach Maß', en: 'Custom corporate' },
  modular: { de: 'In Modulen', en: 'Modular' },
  professional: { de: 'Berufsbezogen', en: 'Professional' },
};

const formatLabel = (format: string, lang: WsLang) => {
  const label = FORMAT_LABELS[format.trim().toLowerCase()];
  return label ? pick(lang, label) : sentenceCase(format);
};

function CourseTypes({ types, t, lang }: { types: CourseTypeSummary[]; t: T; lang: WsLang }) {
  if (types.length === 0) return <ListEmpty title={t('Keine Kursarten', 'No course types')} />;
  return (
    <Table
      head={[
        t('Kurs', 'Course'),
        { label: t('Niveaus', 'Levels'), className: `w-[8rem] ${hide}` },
        { label: t('Format', 'Format'), className: `w-[11rem] ${hide}` },
        { label: t('UE / Woche', 'UE / week'), align: 'right', className: `w-[7rem] ${hide}` },
        { label: t('Preis', 'Price'), align: 'right', className: 'w-[7rem]' },
        { label: t('Anmeldungen', 'Registrations'), align: 'right', className: `w-[8rem] ${hide}` },
      ]}
    >
      {types.map((type) => (
        <TableRow key={type.id}>
          <Cell className="max-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[0.9rem] font-semibold">{type.name}</span>
              {type.isActive ? null : <Badge tone="quiet">{t('Nicht veröffentlicht', 'Not published')}</Badge>}
            </span>
            {type.upcomingCount > 0 ? (
              <span className="mt-0.5 block text-[0.8rem] text-[var(--casa-muted)]">
                {type.upcomingCount === 1
                  ? t('1 kommender Termin', '1 upcoming cohort')
                  : t(`${type.upcomingCount} kommende Termine`, `${type.upcomingCount} upcoming cohorts`)}
              </span>
            ) : null}
          </Cell>
          <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] ${hide}`}>{type.levelRange}</Cell>
          <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>{type.format ? formatLabel(type.format, lang) : null}</Cell>
          <Cell align="right" className={`text-[0.84rem] text-[#2b3546] tabular-nums ${hide}`}>
            {type.lessonsPerWeek || null}
          </Cell>
          <Cell align="right" className="font-semibold whitespace-nowrap tabular-nums">
            {type.defaultPrice > 0
              ? type.currency === 'EUR'
                ? euros(type.defaultPrice)
                : new Intl.NumberFormat('de-DE', { style: 'currency', currency: type.currency }).format(type.defaultPrice)
              : null}
          </Cell>
          <Cell align="right" className={`font-semibold tabular-nums ${hide}`}>
            {type.registrationCount > 0 ? type.registrationCount : null}
          </Cell>
        </TableRow>
      ))}
    </Table>
  );
}
