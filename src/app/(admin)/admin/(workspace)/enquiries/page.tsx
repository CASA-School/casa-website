import Link from 'next/link';

import { updateStatusAction } from '../actions';
import { Icon } from '@/components/admin/icons';
import { Avatar, ListEmpty } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { parseFilter, QueueToolbar, queueEmptyTitle } from '@/components/admin/queue-toolbar';
import { Badge, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { berlinDay, berlinTime, dayHeading, daysSince, groupByDay } from '@/lib/admin/days';
import { listEnquiries, type EnquiryListItem } from '@/lib/admin/enquiries';
import { requireModule } from '@/lib/admin/guard';
import { counted, num, pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts, STATUS_LABELS, type WorkStatus } from '@/lib/admin/queues';
import { cn } from '@/lib/utils';

/**
 * The enquiry queue, by day (Rahman, 2026-10-14: "We need to have that per day
 * format and under each of those points … when things are taking care of we
 * could do completed so it doesn't show in the number of open enquiries").
 *
 * An unanswered enquiry is the costliest record in the building — someone asked
 * CASA a question and is deciding whether to ask a competitor instead. So the
 * list reads like an inbox: one section per day the messages came in (Bremen's
 * calendar), newest first; in each, who wrote, the topic and the start of the
 * message, since the message is what tells a two-line reply from a twenty-minute
 * call. A blue dot marks one nobody has opened a case on yet; a new one older
 * than two days says how long it has waited, in amber. „Erledigt" on the row
 * closes it in one click and takes it out of the open count; the Erledigt view
 * opens it again.
 */
export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [user, { items, total }, counts, { t, lang }] = await Promise.all([
    requireModule('enquiries'),
    listEnquiries({ status: filter, search, limit: PAGE_SIZE, offset: offsetFor(page) }),
    queueStatusCounts('enquiry'),
    getI18n(),
  ]);
  const canClose = canAccess(user, 'enquiries', 'edit');
  const days = groupByDay(items, (item) => item.submittedAt);
  const today = berlinDay(new Date());
  const { new: fresh, in_progress: working, waiting } = counts.byStatus;

  return (
    <>
      <PageHeader title={t('Anfragen', 'Enquiries')} />

      {/* Where the open work stands, at a glance: the same three states the rows carry. */}
      <p className="-mt-3 mb-6 flex flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="new" n={fresh} label={t('neu', 'new')} lang={lang} />
        <Tally tone="working" n={working} label={t('in Bearbeitung', 'in progress')} lang={lang} />
        <Tally tone="waiting" n={waiting} label={t('warten auf Antwort', 'waiting on them')} lang={lang} />
      </p>

      <div className="mb-6 overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <QueueToolbar
          basePath="/admin/enquiries"
          active={filter}
          counts={{ ...counts.byStatus, open: fresh + working + waiting, all: counts.total }}
          search={search}
          searchPlaceholder={t('Name, E-Mail oder Nachricht', 'Name, email or message')}
          lang={lang}
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-ws-line bg-white">
          <ListEmpty title={queueEmptyTitle(lang, filter, search)} />
        </div>
      ) : (
        <div className="space-y-7">
          {days.map(({ day, rows }) => {
            const heading = dayHeading(day, lang, today);
            const open = rows.filter((row) => isOpen(row.status)).length;
            return (
              <section key={day} aria-labelledby={`day-${day}`}>
                <header className="sticky top-0 z-10 -mx-1 mb-2.5 flex items-baseline gap-2.5 bg-ws-canvas/90 px-1 py-1.5 backdrop-blur-sm lg:top-14">
                  <h2 id={`day-${day}`} className="text-[0.95rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">
                    {heading.title}
                  </h2>
                  {heading.aside ? <span className="text-[0.82rem] text-[var(--casa-text-subtle)]">{heading.aside}</span> : null}
                  <span className="ml-auto text-xs font-semibold text-[var(--casa-text-subtle)] tabular-nums">
                    {filter === 'open'
                      ? counted(lang, rows.length, t('Anfrage', 'enquiry'), t('Anfragen', 'enquiries'))
                      : `${counted(lang, rows.length, t('Anfrage', 'enquiry'), t('Anfragen', 'enquiries'))}${open ? ` · ${open} ${t('offen', 'open')}` : ''}`}
                  </span>
                </header>
                <ul className="divide-y divide-ws-line-soft overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  {rows.map((item) => (
                    <EnquiryRow key={item.id} item={item} canClose={canClose} t={t} lang={lang} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Pagination basePath="/admin/enquiries" page={page} total={total} params={params} />
    </>
  );
}

const isOpen = (status: WorkStatus) => status === 'new' || status === 'in_progress' || status === 'waiting';

/** A new enquiry older than this has waited too long, and says so. */
const STALE_AFTER_DAYS = 2;

function EnquiryRow({ item, canClose, t, lang }: { item: EnquiryListItem; canClose: boolean; t: T; lang: WsLang }) {
  const name = [item.firstName, item.lastName].filter(Boolean).join(' ');
  const waited = daysSince(item.submittedAt);
  const stale = item.status === 'new' && waited > STALE_AFTER_DAYS;
  const open = isOpen(item.status);

  return (
    <li className="group relative flex flex-wrap items-start gap-x-3.5 gap-y-2.5 px-4 py-4 transition-colors hover:bg-[var(--ws-row-hover)] sm:flex-nowrap sm:gap-x-4 sm:px-5">
      {/* The whole row opens the enquiry; the button on it sits above the link. */}
      <Link
        href={`/admin/enquiries/${item.id}`}
        className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 focus-visible:ring-inset"
      >
        <span className="sr-only">{t(`Anfrage von ${name} öffnen`, `Open the enquiry from ${name}`)}</span>
      </Link>

      <span className="relative mt-0.5 shrink-0">
        <Avatar name={name} />
        {item.status === 'new' ? (
          <span
            title={pick(lang, STATUS_LABELS.new)}
            className="absolute -top-0.5 -left-0.5 size-3 rounded-full bg-[#2f6fd1] ring-2 ring-white"
          />
        ) : null}
      </span>

      <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-auto">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'truncate text-[0.92rem] tracking-[-0.005em]',
              item.status === 'new' ? 'font-bold' : 'font-semibold',
              open ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]'
            )}
          >
            {name}
          </span>
          {item.kind !== 'general' ? (
            <Badge tone="neutral">{item.kind === 'group' ? t('Gruppe', 'Group') : t('Firma', 'Company')}</Badge>
          ) : null}
          {item.status === 'in_progress' || item.status === 'waiting' ? (
            <Badge tone={item.status === 'waiting' ? 'warning' : 'accent'}>{pick(lang, STATUS_LABELS[item.status])}</Badge>
          ) : null}
          {item.status === 'done' ? <Badge tone="positive">{pick(lang, STATUS_LABELS.done)}</Badge> : null}
          {item.status === 'declined' || item.status === 'spam' ? <Badge tone="quiet">{pick(lang, STATUS_LABELS[item.status])}</Badge> : null}
        </div>
        <p className={cn('mt-1 truncate text-[0.86rem] font-semibold', open ? 'text-[#2b3546]' : 'text-[var(--casa-muted)]')}>{item.topic}</p>
        {item.message ? <p className="mt-0.5 line-clamp-2 text-[0.84rem] leading-relaxed text-[var(--casa-muted)]">{item.message}</p> : null}
      </div>

      {/* On a phone the time and the button take a line of their own under the message. */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2 pl-[3.25rem] sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:pl-2">
        <span className="flex items-center gap-2 text-[0.8rem] text-[var(--casa-muted)] tabular-nums">
          {item.locale !== 'de' ? (
            <span
              title={t('Auf Englisch geschrieben — antworte auf Englisch', 'Written in English — reply in English')}
              className="rounded-md bg-ws-sunk px-1.5 py-px text-[0.66rem] font-bold tracking-[0.04em] text-[var(--casa-muted)] uppercase"
            >
              {item.locale}
            </span>
          ) : null}
          <time
            dateTime={item.submittedAt.toISOString()}
            title={stale ? t(`Wartet seit ${num(lang, waited)} Tagen`, `Waiting for ${num(lang, waited)} days`) : undefined}
            className={cn(stale && 'font-semibold text-[#9a5b00]')}
          >
            {berlinTime(item.submittedAt, lang)}
          </time>
        </span>
        <span className="flex items-center gap-2">
          {item.assigneeName ? (
            <span title={item.assigneeName} className="relative">
              <Avatar name={item.assigneeName} staff size="sm" />
              <span className="sr-only">{t(`Zuständig: ${item.assigneeName}`, `Owner: ${item.assigneeName}`)}</span>
            </span>
          ) : null}
          {canClose ? (
            <form action={updateStatusAction} className="relative z-10">
              <input type="hidden" name="entity" value="enquiry" />
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                name="status"
                value={open ? 'done' : 'in_progress'}
                title={open ? t('Als erledigt markieren', 'Mark as done') : t('Wieder öffnen', 'Reopen')}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.76rem] font-semibold ring-1 ring-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-3.5',
                  open
                    ? 'bg-white text-[var(--casa-muted)] ring-ws-line hover:bg-[#eaf7ef] hover:text-[#17693a] hover:ring-[#bfe3cc]'
                    : 'bg-white text-[var(--casa-muted)] ring-ws-line hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
                )}
              >
                {open ? Icon.check : null}
                {open ? t('Erledigt', 'Done') : t('Wieder öffnen', 'Reopen')}
              </button>
            </form>
          ) : null}
        </span>
      </div>
    </li>
  );
}

/** One state's count with its dot; nothing when there are none. */
function Tally({ tone, n, label, lang }: { tone: 'new' | 'working' | 'waiting'; n: number; label: string; lang: WsLang }) {
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', tone === 'new' ? 'bg-[#2f6fd1]' : tone === 'working' ? 'bg-[var(--fm-navy)]' : 'bg-[#e0a100]')}
      />
      <b className="font-semibold text-[var(--casa-ink)] tabular-nums">{num(lang, n)}</b> {label}
    </span>
  );
}

