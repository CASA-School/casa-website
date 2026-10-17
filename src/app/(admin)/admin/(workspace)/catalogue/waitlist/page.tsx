import { Tally } from '@/components/admin/inbox';
import { ListBar, ListEmpty, ListGroup, RecordName } from '@/components/admin/list';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
import { capitalise, pick, relativeDays, wsLocale, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { firstParam } from '@/lib/admin/paging';
import {
  CLOSE_REASON_LABELS,
  freePlaces,
  courseGroups,
  listEntries,
  waitlistCounts,
  WAITLIST_SOURCE_LABELS,
  WAITLIST_STATUS_LABELS,
  type CloseReason,
  type WaitlistEntry,
  type WaitlistView,
} from '@/lib/admin/waitlist';

/**
 * The waiting lists, all courses in one place (2026-10-16; docs/ADMIN_WORKSPACE.md §Waiting list).
 *
 * The first view is the one that needs someone: queues where a place is free and a learner waits.
 * Then everyone waiting, the places offered and not yet answered, and the learners whose course has
 * begun while they waited — to move to a later start or take off — and the history. Each queue is a
 * group under its course, start and level, its learners in order; a row opens the course start's
 * page, where the place is offered, booked or the learner moved.
 */

const VIEWS: readonly { key: WaitlistView; label: Bilingual }[] = [
  { key: 'free', label: { de: 'Platz frei', en: 'Place free' } },
  { key: 'waiting', label: { de: 'Wartend', en: 'Waiting' } },
  { key: 'offered', label: { de: 'Angeboten', en: 'Offered' } },
  { key: 'started', label: { de: 'Kurs begonnen', en: 'Course begun' } },
  { key: 'closed', label: { de: 'Abgeschlossen', en: 'Closed' } },
];

const hide = 'hidden md:table-cell';

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireModule('catalogue');
  const params = await searchParams;
  const { t, lang } = await getI18n();
  const counts = await waitlistCounts();
  const raw = firstParam(params.view);
  // Opens on free places when there are any, else on everyone waiting.
  const view: WaitlistView = VIEWS.some((v) => v.key === raw) ? (raw as WaitlistView) : counts.free > 0 ? 'free' : 'waiting';
  const search = firstParam(params.q);
  const entries = await listEntries(view, search);
  const groups = await courseGroups([...new Set(entries.map((e) => e.courseId).filter((v): v is string => Boolean(v)))]);
  const queues = groupRuns(entries);

  return (
    <>
      <PageHeader title={t('Wartelisten', 'Waiting lists')} />

      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="working" n={counts.waiting} label={counts.waiting === 1 ? t('wartet', 'waiting') : t('warten', 'waiting')} lang={lang} />
        <Tally tone="done" n={counts.free} label={counts.free === 1 ? t('Liste mit freiem Platz', 'list with a free place') : t('Listen mit freiem Platz', 'lists with a free place')} lang={lang} />
        <Tally tone="new" n={counts.offered} label={counts.offered === 1 ? t('Platz angeboten', 'place offered') : t('Plätze angeboten', 'places offered')} lang={lang} />
        {counts.started ? <Tally tone="waiting" n={counts.started} label={t('Kurs hat begonnen', 'course has begun')} lang={lang} /> : null}
      </p>

      <Card bleed>
        <ListBar
          tabs={VIEWS.map((v) => ({
            key: v.key,
            label: pick(lang, v.label),
            href: `/admin/catalogue/waitlist?view=${v.key}`,
            count: v.key === 'closed' ? undefined : counts[v.key],
          }))}
          active={view}
          search={{ action: '/admin/catalogue/waitlist', value: search, placeholder: t('Name, Kurs oder Niveau', 'Name, course or level'), keep: { view } }}
        />
        {entries.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : EMPTY[view] ? pick(lang, EMPTY[view]) : t('Niemand hier', 'Nobody here')} />
        ) : view === 'closed' ? (
          <Table
            head={[
              t('Teilnehmende', 'Student'),
              { label: t('Kurs', 'Course'), className: hide },
              { label: t('Ergebnis', 'Outcome'), className: 'w-[14rem]' },
              { label: t('Wann', 'When'), className: `w-[8rem] ${hide}` },
            ]}
          >
            {entries.map((entry) => (
              <TableRow key={entry.id} interactive>
                <Cell href={`/admin/people/${entry.personId}`} className="max-w-0">
                  <RecordName name={entry.personName} about={entry.note ?? undefined} />
                </Cell>
                <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>{queueLabel(entry, lang)}</Cell>
                <Cell className="text-[0.84rem]">
                  <span className={entry.status === 'booked' ? 'font-semibold text-[#17693a]' : 'text-[var(--casa-ink)]'}>{pick(lang, WAITLIST_STATUS_LABELS[entry.status])}</span>
                  {entry.closeReason && entry.closeReason in CLOSE_REASON_LABELS ? (
                    <span className="block text-xs text-[var(--casa-muted)]">{pick(lang, CLOSE_REASON_LABELS[entry.closeReason as CloseReason])}</span>
                  ) : null}
                </Cell>
                <Cell className={`text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)] ${hide}`}>{entry.closedAt ? capitalise(relativeDays(entry.closedAt, lang)) : null}</Cell>
              </TableRow>
            ))}
          </Table>
        ) : (
          <Table
            head={[
              { label: t('Platz', 'Place'), className: 'w-[4.5rem]' },
              t('Teilnehmende', 'Student'),
              { label: t('Stand', 'Status'), className: `w-[13rem] ${hide}` },
              { label: t('Auf der Liste seit', 'On the list since'), className: `w-[10rem] ${hide}` },
            ]}
          >
            {queues.flatMap((queue) => {
              // The course whose queue it is: a joiner waits on the running course of the start before.
              const group = groups.find((g) => g.courseId === queue.key);
              const free = group ? freePlaces(group) : 0;
              const href = group
                ? `/admin/catalogue/${group.courseInstanceId}?level=${encodeURIComponent(group.levelCode ?? group.courseId)}`
                : `/admin/catalogue/${queue.items[0].courseInstanceId}`;
              return [
                <ListGroup
                  key={queue.key}
                  label={`${queueLabel(queue.items[0], lang)} · ${free > 0 ? (free === 1 ? t('1 Platz frei', '1 place free') : t(`${free} Plätze frei`, `${free} places free`)) : t('voll', 'full')}`}
                  count={queue.items.length}
                  span={4}
                />,
                ...queue.items.map((entry) => (
                  <TableRow key={entry.id} interactive>
                    <Cell href={href} className="text-[0.95rem] font-extrabold text-[var(--casa-ink)] tabular-nums">
                      {entry.position}
                    </Cell>
                    <Cell href={href} className="max-w-0">
                      <RecordName name={entry.personName} about={[pick(lang, WAITLIST_SOURCE_LABELS[entry.source]), entry.note].filter(Boolean).join(' · ')} />
                    </Cell>
                    <Cell href={href} className={hide}>
                      {entry.status === 'offered' ? (
                        <Badge tone="accent">{pick(lang, WAITLIST_STATUS_LABELS.offered)}</Badge>
                      ) : view === 'started' ? (
                        <Badge tone="warning">{t('Kurs hat begonnen', 'Course has begun')}</Badge>
                      ) : (
                        <span className="text-[0.84rem] text-[var(--casa-muted)]">{pick(lang, WAITLIST_STATUS_LABELS.waiting)}</span>
                      )}
                    </Cell>
                    <Cell href={href} className={`text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)] ${hide}`}>
                      {new Date(entry.joinedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}
                    </Cell>
                  </TableRow>
                )),
              ];
            })}
          </Table>
        )}
      </Card>
    </>
  );
}

const EMPTY: Partial<Record<WaitlistView, Bilingual>> = {
  free: { de: 'Kein freier Platz für Wartende', en: 'No free place for anyone waiting' },
  waiting: { de: 'Niemand wartet', en: 'Nobody is waiting' },
  offered: { de: 'Kein Platz angeboten', en: 'No place offered' },
  started: { de: 'Niemand wartet auf einen begonnenen Kurs', en: 'Nobody waits for a course that has begun' },
  closed: { de: 'Noch niemand von einer Warteliste', en: 'Nobody has left a waiting list yet' },
};

/** "Intensive German · Vormittag · 26. Okt. 2026 · B1.1" */
function queueLabel(entry: WaitlistEntry, lang: WsLang): string {
  return [
    entry.courseTypeName,
    entry.session ? pick(lang, SESSION_LABELS[entry.session]) : null,
    new Date(entry.startDate).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' }),
    entry.levelCode,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The entries of one course as one queue, in the order the first of each came. */
function groupRuns(entries: WaitlistEntry[]) {
  const out = new Map<string, { key: string; items: WaitlistEntry[] }>();
  for (const entry of entries) {
    const key = entry.courseId ?? `${entry.courseInstanceId}:${entry.levelCode}`;
    const queue = out.get(key) ?? { key, items: [] };
    queue.items.push(entry);
    out.set(key, queue);
  }
  return [...out.values()];
}
