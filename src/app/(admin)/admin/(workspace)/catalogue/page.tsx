import Link from 'next/link';

import { CohortForm } from './cohort-form';
import { CourseList, viewOf, type CourseView } from './course-list';
import { sentenceCase } from './list-parts';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Tally } from '@/components/admin/inbox';
import { euros, ListBar, ListEmpty } from '@/components/admin/list';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { BOOKED_INTO_OTHER_COURSES, listCourseTypes, type CourseTypeSummary } from '@/lib/admin/catalogue';
import { listCourses } from '@/lib/admin/course-list';
import { query } from '@/lib/admin/db';
import { requireModule } from '@/lib/admin/guard';
import { pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listBookableRooms } from '@/lib/admin/rooms';
import { todayInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

/**
 * Courses (2026-10-17, Rahman: „running first, then coming up, the past on a switch"). One row per
 * course under the start it belongs to, with what SchoolMan's course list is read for — the learners
 * now and week by week against the places, who teaches, who waits, the dates, SchoolMan's number — and
 * „Buchen", which opens the course with its „Wen buchen?" (`course-list.tsx`). The course types stay a
 * view of their own, read-only: `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` is the authority on their
 * prices and hours. The waiting lists are their own item in the rail.
 */

const VIEWS: readonly { key: CourseView | 'types'; label: Bilingual }[] = [
  { key: 'intensive-morning', label: { de: 'Intensiv · Vormittag', en: 'Intensive · morning' } },
  { key: 'intensive-afternoon', label: { de: 'Intensiv · Nachmittag', en: 'Intensive · afternoon' } },
  { key: 'evening', label: { de: 'Abend', en: 'Evening' } },
  { key: 'other', label: { de: 'Weitere', en: 'Other' } },
  { key: 'types', label: { de: 'Kursarten', en: 'Course types' } },
];

const hide = 'hidden md:table-cell';

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; view?: string; time?: string; new?: string }>;
}) {
  const user = await requireModule('catalogue');
  const { t, lang } = await getI18n();
  const plans = canAccess(user, 'rooms', 'edit');
  const canBook = canAccess(user, 'bookings', 'edit') && canAccess(user, 'people');
  const today = todayInputValue();
  const { error, view: rawView, time, new: fresh } = await searchParams;
  const view = VIEWS.find((v) => v.key === rawView)?.key ?? 'intensive-morning';
  const past = time === 'past';
  const [types, rows, rooms, levels] = await Promise.all([
    listCourseTypes(),
    view === 'types' ? Promise.resolve([]) : listCourses(past ? 'past' : 'current', today),
    plans ? listBookableRooms() : Promise.resolve([]),
    plans
      ? query<{ code: string }>(`SELECT code FROM levels ORDER BY sort_order`).then((r) => r.map((x) => x.code))
      : Promise.resolve([]),
  ]);
  const shown = view === 'types' ? [] : rows.filter((r) => viewOf(r) === view);
  const running = rows.filter((r) => r.phase === 'running');
  const learnersNow = running.reduce((sum, r) => sum + r.now, 0);
  const waiting = rows.reduce((sum, r) => sum + r.waiting + r.offered, 0);
  const next = rows.filter((r) => r.phase === 'upcoming').map((r) => r.startDate).sort()[0] ?? null;
  const href = (key: string, at: 'current' | 'past' = past ? 'past' : 'current') => {
    const params = new URLSearchParams({ ...(key !== 'intensive-morning' ? { view: key } : {}), ...(at === 'past' && key !== 'types' ? { time: 'past' } : {}) });
    return `/admin/catalogue${params.size ? `?${params}` : ''}`;
  };

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
              icon={Icon.calendar}
              tint="red"
              defaultOpen={fresh === '1'}
            >
              <CohortForm
                // Every kind with courses of its own, the website's and the workspace's (0042); not Bildungszeit.
                courseTypes={types
                  .filter((type) => !BOOKED_INTO_OTHER_COURSES.includes(type.slug))
                  .map((type) => ({ id: type.id, slug: type.slug, label: lang === 'de' ? type.nameDe : type.name }))}
                rooms={rooms.map((r) => ({ id: r.id, name: r.name, nickname: r.nickname, capacity: r.capacity }))}
                levels={levels}
              />
            </FormDialog>
          ) : null
        }
      />

      {/* What runs now, who sits in it, who waits, and when the next start is. */}
      {!past && view !== 'types' ? (
        <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
          <Tally tone="working" n={running.length} label={running.length === 1 ? t('laufender Kurs', 'course running') : t('laufende Kurse', 'courses running')} lang={lang} />
          <Tally tone="done" n={learnersNow} label={t('Teilnehmende diese Woche', 'learners this week')} lang={lang} />
          {waiting ? <Tally tone="new" n={waiting} label={t('auf Wartelisten', 'waiting')} lang={lang} /> : null}
          {next ? (
            <span>
              {t('Nächster Beginn', 'Next start')}{' '}
              <b className="font-semibold text-[var(--casa-ink)]">
                {new Date(`${next}T12:00:00`).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short' })}
              </b>
            </span>
          ) : null}
        </p>
      ) : (
        <div className="mb-6" />
      )}

      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <Card bleed overflow="hidden">
        <ListBar
          tabs={VIEWS.map((v) => ({
            key: v.key,
            label: pick(lang, v.label),
            href: href(v.key),
            count: v.key === 'types' || past ? undefined : rows.filter((r) => viewOf(r) === v.key).length || undefined,
          }))}
          active={view}
          end={
            view === 'types' ? null : (
              <span className="inline-flex rounded-lg bg-ws-sunk p-0.5 text-[0.78rem] font-semibold" role="group" aria-label={t('Zeitraum', 'Period')}>
                {(['current', 'past'] as const).map((at) => (
                  <Link
                    key={at}
                    href={href(view, at)}
                    aria-current={(at === 'past') === past ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-2.5 py-1 transition-colors',
                      (at === 'past') === past ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                    )}
                  >
                    {at === 'past' ? t('Vergangen', 'Past') : t('Aktuell', 'Current')}
                  </Link>
                ))}
              </span>
            )
          }
        />
        {view === 'types' ? (
          <CourseTypes types={types} t={t} lang={lang} />
        ) : (
          <CourseList rows={shown} view={view} past={past} canBook={canBook} today={today} t={t} lang={lang} />
        )}
      </Card>
    </>
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
              <span className="truncate text-[0.9rem] font-semibold">{lang === 'de' ? type.nameDe : type.name}</span>
              {type.isActive ? null : <Badge tone="quiet">{t('Nicht veröffentlicht', 'Not published')}</Badge>}
            </span>
            {BOOKED_INTO_OTHER_COURSES.includes(type.slug) ? (
              <span className="mt-0.5 block text-[0.8rem] text-[var(--casa-muted)]">{t('Gebucht in die Intensivkurse', 'Booked into the intensive courses')}</span>
            ) : type.upcomingCount > 0 ? (
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
