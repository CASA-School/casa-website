import { Assignee, CardRow, DaySections, Language } from '@/components/admin/inbox';
import { ListBar } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Badge, PageHeader } from '@/components/admin/ui';
import { berlinTime } from '@/lib/admin/days';
import { counted, pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { listPlacementAttempts, placementCounts, type PlacementFilter, type PlacementListItem } from '@/lib/admin/placement';
import { CONFIDENCE_COPY } from '@/lib/admin/placement-copy';
import { RELEASE_MODE } from '@/config/placement/policy';
import { cn } from '@/lib/utils';
import { backgroundItems } from './[id]/background';

/**
 * The placement review queue, in the inboxes' design (2026-10-15): the counts
 * under the title, the views in a bar, the attempts by the day they were sent,
 * each a card row — the recommended level where an inbox shows initials, how
 * sure the test is, how much was answered, and the learner's own account of
 * their German, the start of what a teacher reads before deciding. An attempt
 * carries no name until a teacher attaches a person to the decision.
 *
 * The line under the title is not decoration. Every one of the 163 items in the
 * bank is `PILOT_UNREVIEWED` (CLAUDE.md rule 6) and the engine is in shadow
 * mode, so a teacher reading this screen has to know that a recommendation comes
 * from an unreviewed instrument — not a measurement to rubber-stamp. It is one
 * quiet line, read once.
 */
const FILTERS: readonly { key: PlacementFilter; label: Bilingual }[] = [
  // In the order a test goes: what a teacher must look at, then the ones still being taken, then the done.
  { key: 'needs_review', label: { de: 'Wartet auf Lehrkraft', en: 'Awaiting a teacher' } },
  { key: 'in_progress', label: { de: 'Test läuft noch', en: 'Still testing' } },
  { key: 'confirmed', label: { de: 'Bestätigt', en: 'Confirmed' } },
  { key: 'all', label: { de: 'Alle', en: 'All' } },
];

const STAGE_LABELS: Record<string, Bilingual> = {
  submitted: { de: 'Abgeschickt', en: 'Submitted' },
  abandoned: { de: 'Abgebrochen', en: 'Abandoned' },
};

const CONFIDENCE_TONE: Record<string, 'positive' | 'neutral' | 'warning'> = { high: 'positive', medium: 'neutral', low: 'warning' };

export default async function PlacementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = firstParam(params.filter);
  const filter: PlacementFilter = FILTERS.some((f) => f.key === raw) ? (raw as PlacementFilter) : 'needs_review';
  const page = clampPage(params.page);

  const [{ items, total }, counts, { t, lang }] = await Promise.all([
    listPlacementAttempts({ filter, limit: PAGE_SIZE, offset: offsetFor(page) }),
    placementCounts(),
    getI18n(),
  ]);

  const hrefFor = (key: PlacementFilter) => (key === 'needs_review' ? '/admin/placement' : `/admin/placement?filter=${key}`);
  const rows = items.map((item) => ({ ...item, at: item.submittedAt ?? item.createdAt }));

  return (
    <>
      <PageHeader title={t('Einstufungstests', 'Placement')} />

      <p className="-mt-3 mb-6 flex items-start gap-2.5 text-[0.8rem] leading-relaxed text-[var(--casa-muted)]">
        <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[#d97706]" />
        {lang === 'de' ? (
          <span>
            <span className="font-semibold text-[var(--casa-ink)]">Pilottest im Modus „{RELEASE_MODE}“.</span> Aufgaben ungeprüft, Grenzwerte
            vorläufig. Eine Empfehlung ist ein Hinweis zum Abwägen – nie ein „bestanden“, ein „nicht bestanden“ oder ein Zertifikat.
          </span>
        ) : (
          <span>
            <span className="font-semibold text-[var(--casa-ink)]">Pilot test, {RELEASE_MODE} mode.</span> Items unreviewed, cut scores
            provisional. A recommendation is evidence to weigh — never a pass, a fail or a certificate.
          </span>
        )}
      </p>

      <div className="mb-6 overflow-hidden rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
        <ListBar
          tabs={FILTERS.map((option) => ({ key: option.key, label: pick(lang, option.label), href: hrefFor(option.key), count: counts[option.key] }))}
          active={filter}
        />
      </div>

      <DaySections
        items={rows}
        today={null}
        t={t}
        lang={lang}
        emptyTitle={filter === 'needs_review' ? t('Nichts wartet', 'Nothing waiting') : t('Hier ist nichts', 'Nothing here')}
        summary={(day) => counted(lang, day.length, t('Test', 'test'), t('Tests', 'tests'))}
        row={(item) => <AttemptRow key={item.id} item={item} filter={filter} t={t} lang={lang} />}
      />

      <Pagination basePath="/admin/placement" page={page} total={total} params={params} />
    </>
  );
}

function AttemptRow({ item, filter, t, lang }: { item: PlacementListItem & { at: Date }; filter: PlacementFilter; t: T; lang: WsLang }) {
  const testing = item.recommendedBand === null;
  const partial = item.answeredShare !== null && item.answeredShare < 1;
  const background = backgroundItems(item.intake, lang).slice(0, 3);
  const level = item.confirmedLevel ?? item.recommendedBand;

  return (
    <CardRow href={`/admin/placement/${item.id}`} label={t('Einstufungstest öffnen', 'Open the placement attempt')} quiet={testing}>
      {/* The level where an inbox shows initials: the first thing a teacher reads. */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid h-9 min-w-12 shrink-0 place-items-center rounded-xl px-2 text-[0.82rem] font-extrabold tracking-[-0.01em] ring-1 ring-inset tabular-nums',
          item.confirmedLevel
            ? 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]'
            : testing
              ? 'bg-ws-sunk text-[var(--casa-muted)] ring-ws-line'
              : 'bg-[#e8f1fd] text-[#174a8f] ring-[#b9d0f1]'
        )}
      >
        {level ?? '…'}
      </span>

      <div className="min-w-0 flex-1 basis-[calc(100%-4.25rem)] sm:basis-auto">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('truncate text-[0.92rem] font-bold tracking-[-0.005em]', testing ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]')}>
            {testing
              ? t('Test läuft noch', 'Still testing')
              : item.confirmedLevel
                ? t(`${item.confirmedLevel} bestätigt`, `${item.confirmedLevel} confirmed`)
                : t(`Empfohlen: ${item.recommendedBand}`, `Recommended ${item.recommendedBand}`)}
          </span>
          {item.confidence ? (
            <Badge tone={CONFIDENCE_TONE[item.confidence] ?? 'neutral'}>
              {t('Sicherheit', 'Confidence')}{' '}
              {item.confidence in CONFIDENCE_COPY ? pick(lang, CONFIDENCE_COPY[item.confidence as keyof typeof CONFIDENCE_COPY]).toLowerCase() : item.confidence}
            </Badge>
          ) : null}
          {partial ? (
            <Badge tone="warning">
              {t(`${Math.round((item.answeredShare ?? 0) * 100)} % bearbeitet`, `${Math.round((item.answeredShare ?? 0) * 100)}% answered`)}
            </Badge>
          ) : null}
          {testing && STAGE_LABELS[item.status] ? <Badge tone="quiet">{pick(lang, STAGE_LABELS[item.status])}</Badge> : null}
          {filter === 'all' && item.needsReview ? <Badge tone="accent">{t('Braucht eine Lehrkraft', 'Needs a teacher')}</Badge> : null}
        </div>
        {item.confirmedLevel && item.recommendedBand && item.recommendedBand !== item.confirmedLevel ? (
          <p className="mt-1 text-[0.84rem] font-semibold text-[#2b3546]">{t(`Empfohlen war ${item.recommendedBand}`, `Recommended ${item.recommendedBand}`)}</p>
        ) : null}
        {background.length ? (
          <p className="mt-0.5 line-clamp-2 text-[0.84rem] leading-relaxed text-[var(--casa-muted)]">
            {background.map((entry) => `${entry.label}: ${entry.value}`).join(' · ')}
          </p>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 items-center justify-between gap-2 pl-[4.25rem] sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:pl-2">
        <span className="flex items-center gap-2 text-[0.8rem] text-[var(--casa-muted)] tabular-nums">
          <Language locale={item.locale} t={t} />
          <time dateTime={item.at.toISOString()}>{berlinTime(item.at, lang)}</time>
        </span>
        <Assignee name={item.reviewerName} t={t} />
      </div>
    </CardRow>
  );
}
