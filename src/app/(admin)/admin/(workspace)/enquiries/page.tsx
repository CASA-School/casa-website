import Link from 'next/link';

import { updateStatusAction } from '../actions';
import { Icon } from '@/components/admin/icons';
import { Avatar, ListBar, ListEmpty } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Badge, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { berlinDay, berlinTime, dayHeading, daysSince, groupByDay, groupByMonth, monthHeading, shortDay } from '@/lib/admin/days';
import { enquiryCounts, listEnquiries, type EnquiryListItem, type EnquiryState } from '@/lib/admin/enquiries';
import { requireModule } from '@/lib/admin/guard';
import { counted, num, pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { STATUS_LABELS, type WorkStatus } from '@/lib/admin/queues';
import { cn } from '@/lib/utils';

/**
 * The enquiry queue: this week by day, the rest as a history (Rahman,
 * 2026-10-14: "per day format … when things are taking care of we could do
 * completed so it doesn't show in the number of open enquiries", then "display
 * only one week history and the rest should be more like a history that is
 * hidden from interface but if the team wants to go back it should be possible").
 *
 * „Letzte 7 Tage" is today and the six days before, one section per day on
 * Bremen's calendar, newest first, every enquiry of the day in it: who wrote,
 * the topic and the start of the message (it tells a two-line reply from a
 * twenty-minute call). „Erledigt" on a row closes it in one click; it stays under
 * its day, quieter, and leaves every open count — the day reads as what came in
 * and what was dealt with. „Verlauf" is everything before, by month, one line
 * each. An enquiry from before the week that is still open is unfinished work,
 * not history, so the week says how many there are and links to them. A search
 * looks through everything.
 */
export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const view = firstParam(params.view) === 'history' ? 'history' : 'week';
  const rawState = firstParam(params.status);
  const state: EnquiryState = view === 'history' && (rawState === 'open' || rawState === 'closed') ? rawState : 'any';
  const page = clampPage(params.page);
  const period = search ? 'all' : view;
  // A week is read whole; a history and a search in pages.
  const limit = period === 'week' ? 250 : PAGE_SIZE;

  const [user, { items, total }, counts, { t, lang }] = await Promise.all([
    requireModule('enquiries'),
    listEnquiries({ period, state, search, limit, offset: period === 'week' ? 0 : offsetFor(page) }),
    enquiryCounts(),
    getI18n(),
  ]);
  const canClose = canAccess(user, 'enquiries', 'edit');
  const today = berlinDay(new Date());

  return (
    <>
      <PageHeader title={t('Anfragen', 'Enquiries')} />

      {/* Where the open work stands, of any age: the same three states the rows carry. */}
      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="new" n={counts.new} label={t('neu', 'new')} lang={lang} />
        <Tally tone="working" n={counts.inProgress} label={t('in Bearbeitung', 'in progress')} lang={lang} />
        <Tally tone="waiting" n={counts.waiting} label={t('warten auf Antwort', 'waiting on them')} lang={lang} />
        {counts.new + counts.inProgress + counts.waiting === 0 ? <span>{t('Alles erledigt', 'All done')}</span> : null}
      </p>

      <div className="mb-6 overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <ListBar
          tabs={[
            { key: 'week', label: t('Letzte 7 Tage', 'Last 7 days'), href: '/admin/enquiries', count: counts.week },
            { key: 'history', label: t('Verlauf', 'History'), href: '/admin/enquiries?view=history', count: counts.history },
          ]}
          active={search ? '' : view}
          search={{
            action: '/admin/enquiries',
            value: search,
            placeholder: t('Name, E-Mail oder Nachricht', 'Name, email or message'),
            keep: { view: view === 'history' ? 'history' : undefined },
          }}
        />
      </div>

      {search ? (
        <p className="mb-4 text-[0.84rem] text-[var(--casa-muted)]">
          {t(`${num(lang, total)} Treffer für „${search}“, aus allen Wochen`, `${num(lang, total)} found for “${search}”, from every week`)}
        </p>
      ) : null}

      {view === 'week' && !search && counts.openOlder > 0 ? (
        <Link
          href="/admin/enquiries?view=history&status=open"
          className="mb-6 flex items-center gap-3 rounded-2xl bg-[#fff6e0] px-4 py-3 text-[0.86rem] text-[#6b4a00] ring-1 ring-[#f3e2b3] ring-inset transition-colors outline-none hover:bg-[#fff1cf] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#e0a100]" />
          <span className="flex-1">
            {counts.openOlder === 1
              ? t('Eine ältere Anfrage ist noch offen.', 'One older enquiry is still open.')
              : t(`${num(lang, counts.openOlder)} ältere Anfragen sind noch offen.`, `${num(lang, counts.openOlder)} older enquiries are still open.`)}
          </span>
          <span className="font-semibold">{t('Ansehen', 'View')}</span>
          <span aria-hidden="true" className="[&_svg]:size-3.5">
            {Icon.chevronRight}
          </span>
        </Link>
      ) : null}

      {view === 'history' && !search ? <StateFilter state={state} t={t} /> : null}

      {view === 'history' && !search ? (
        <History items={items} canClose={canClose} t={t} lang={lang} />
      ) : (
        <Week
          items={items}
          today={search ? null : today}
          canClose={canClose}
          t={t}
          lang={lang}
          emptyTitle={search ? t(`Nichts passt zu „${search}“`, `Nothing matches “${search}”`) : null}
        />
      )}

      {period === 'week' ? null : <Pagination basePath="/admin/enquiries" page={page} total={total} params={params} />}
    </>
  );
}

const isOpen = (status: WorkStatus) => status === 'new' || status === 'in_progress' || status === 'waiting';

/** The week (or a search): one section per day. Today always has its section, so a quiet morning says so. */
function Week({
  items,
  today,
  canClose,
  t,
  lang,
  emptyTitle,
}: {
  items: readonly EnquiryListItem[];
  /** Set for the week; a search has no "today" to hold. */
  today: string | null;
  canClose: boolean;
  t: T;
  lang: WsLang;
  emptyTitle: string | null;
}) {
  const days = groupByDay(items, (item) => item.submittedAt);
  if (today && days[0]?.day !== today) days.unshift({ day: today, rows: [] });
  if (!days.length) {
    return (
      <div className="rounded-3xl border border-ws-line bg-white">
        <ListEmpty title={emptyTitle ?? t('Nichts hier', 'Nothing here')} />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {days.map(({ day, rows }) => {
        const heading = dayHeading(day, lang, today ?? berlinDay(new Date()));
        const open = rows.filter((row) => isOpen(row.status)).length;
        return (
          <section key={day} aria-labelledby={`day-${day}`}>
            <header className="sticky top-0 z-10 -mx-1 mb-2.5 flex items-baseline gap-2.5 bg-ws-canvas/90 px-1 py-1.5 backdrop-blur-sm lg:top-14">
              <h2 id={`day-${day}`} className="text-[0.95rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">
                {heading.title}
              </h2>
              {heading.aside ? <span className="text-[0.82rem] text-[var(--casa-text-subtle)]">{heading.aside}</span> : null}
              {rows.length ? (
                <span className="ml-auto text-xs font-semibold text-[var(--casa-text-subtle)] tabular-nums">
                  {counted(lang, rows.length, t('Anfrage', 'enquiry'), t('Anfragen', 'enquiries'))}
                  {' · '}
                  {open ? (
                    <span className="text-[var(--casa-ink)]">
                      {num(lang, open)} {t('offen', 'open')}
                    </span>
                  ) : (
                    <span className="text-[#17693a]">{rows.length === 1 ? t('erledigt', 'done') : t('alle erledigt', 'all done')}</span>
                  )}
                </span>
              ) : null}
            </header>
            {rows.length ? (
              <ul className="divide-y divide-ws-line-soft overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                {rows.map((item) => (
                  <EnquiryRow key={item.id} item={item} canClose={canClose} t={t} lang={lang} />
                ))}
              </ul>
            ) : (
              <p className="rounded-3xl border border-dashed border-ws-line px-5 py-4 text-[0.86rem] text-[var(--casa-text-subtle)]">
                {t('Heute ist noch nichts eingegangen.', 'Nothing has come in today yet.')}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** A new enquiry older than this has waited too long, and says so. */
const STALE_AFTER_DAYS = 2;

function EnquiryRow({ item, canClose, t, lang }: { item: EnquiryListItem; canClose: boolean; t: T; lang: WsLang }) {
  const name = [item.firstName, item.lastName].filter(Boolean).join(' ');
  const waited = daysSince(item.submittedAt);
  const stale = item.status === 'new' && waited > STALE_AFTER_DAYS;
  const open = isOpen(item.status);

  return (
    <li
      className={cn(
        'group relative flex flex-wrap items-start gap-x-3.5 gap-y-2.5 px-4 py-4 transition-colors hover:bg-[var(--ws-row-hover)] sm:flex-nowrap sm:gap-x-4 sm:px-5',
        !open && 'bg-[#fbfbfc]'
      )}
    >
      <RowLink id={item.id} name={name} t={t} />

      <span className={cn('relative mt-0.5 shrink-0', !open && 'opacity-60')}>
        <Avatar name={name} />
        {item.status === 'new' ? (
          <span title={pick(lang, STATUS_LABELS.new)} className="absolute -top-0.5 -left-0.5 size-3 rounded-full bg-[#2f6fd1] ring-2 ring-white" />
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
          {item.kind !== 'general' ? <Badge tone="neutral">{item.kind === 'group' ? t('Gruppe', 'Group') : t('Firma', 'Company')}</Badge> : null}
          <StateBadge status={item.status} lang={lang} />
        </div>
        <p className={cn('mt-1 truncate text-[0.86rem] font-semibold', open ? 'text-[#2b3546]' : 'text-[var(--casa-muted)]')}>{item.topic}</p>
        {item.message ? (
          <p className={cn('mt-0.5 line-clamp-2 text-[0.84rem] leading-relaxed', open ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-text-subtle)]')}>
            {item.message}
          </p>
        ) : null}
      </div>

      {/* On a phone the time and the button take a line of their own under the message. */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2 pl-[3.25rem] sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:pl-2">
        <span className="flex items-center gap-2 text-[0.8rem] text-[var(--casa-muted)] tabular-nums">
          <Language locale={item.locale} t={t} />
          <time
            dateTime={item.submittedAt.toISOString()}
            title={stale ? t(`Wartet seit ${num(lang, waited)} Tagen`, `Waiting for ${num(lang, waited)} days`) : undefined}
            className={cn(stale && 'font-semibold text-[#9a5b00]')}
          >
            {berlinTime(item.submittedAt, lang)}
          </time>
        </span>
        <span className="flex items-center gap-2">
          <Assignee name={item.assigneeName} t={t} />
          {canClose ? <CloseButton id={item.id} open={open} t={t} /> : null}
        </span>
      </div>
    </li>
  );
}

/** The history: by month, one line per enquiry. */
function History({ items, canClose, t, lang }: { items: readonly EnquiryListItem[]; canClose: boolean; t: T; lang: WsLang }) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-ws-line bg-white">
        <ListEmpty title={t('Hier ist nichts', 'Nothing here')} />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {groupByMonth(items, (item) => item.submittedAt).map(({ month, rows }) => (
        <section key={month} aria-labelledby={`month-${month}`}>
          <header className="mb-2 flex items-baseline gap-2.5 px-1">
            <h2 id={`month-${month}`} className="text-[0.92rem] font-bold text-[var(--casa-ink)]">
              {monthHeading(month, lang)}
            </h2>
            <span className="text-xs font-semibold text-[var(--casa-text-subtle)] tabular-nums">
              {counted(lang, rows.length, t('Anfrage', 'enquiry'), t('Anfragen', 'enquiries'))}
            </span>
          </header>
          <ul className="divide-y divide-ws-line-soft overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {rows.map((item) => {
              const name = [item.firstName, item.lastName].filter(Boolean).join(' ');
              const open = isOpen(item.status);
              return (
                <li key={item.id} className="group relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)] sm:px-5">
                  <RowLink id={item.id} name={name} t={t} />
                  <time
                    dateTime={item.submittedAt.toISOString()}
                    className="hidden w-[6.5rem] shrink-0 text-[0.8rem] text-[var(--casa-muted)] tabular-nums sm:block"
                  >
                    {shortDay(item.submittedAt, lang)}
                  </time>
                  <Avatar name={name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[0.86rem]">
                    <span className={cn('font-semibold', open ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>{name}</span>
                    <span className="text-[var(--casa-text-subtle)]"> · {item.topic}</span>
                  </span>
                  <StateBadge status={item.status} lang={lang} showNew />
                  <span className="hidden sm:inline-flex">
                    <Assignee name={item.assigneeName} t={t} />
                  </span>
                  {canClose ? open ? <CloseButton id={item.id} open t={t} compact /> : <span aria-hidden="true" className="w-7 shrink-0" /> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The history's own filter: all of it, what is still open, what was closed. */
function StateFilter({ state, t }: { state: EnquiryState; t: T }) {
  const options: { key: EnquiryState; label: string; href: string }[] = [
    { key: 'any', label: t('Alle', 'All'), href: '/admin/enquiries?view=history' },
    { key: 'open', label: t('Offen', 'Open'), href: '/admin/enquiries?view=history&status=open' },
    { key: 'closed', label: t('Erledigt', 'Done'), href: '/admin/enquiries?view=history&status=closed' },
  ];
  return (
    <nav aria-label={t('Verlauf filtern', 'Filter the history')} className="mb-5 inline-flex rounded-full bg-white/70 p-1 ring-1 ring-ws-line ring-inset">
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={option.key === state ? 'page' : undefined}
          className={cn(
            'rounded-full px-3.5 py-1 text-[0.8rem] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
            option.key === state ? 'bg-[var(--fm-navy)] text-white' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

/** The whole row opens the enquiry; buttons on it sit above the link. */
function RowLink({ id, name, t }: { id: string; name: string; t: T }) {
  return (
    <Link
      href={`/admin/enquiries/${id}`}
      className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 focus-visible:ring-inset"
    >
      <span className="sr-only">{t(`Anfrage von ${name} öffnen`, `Open the enquiry from ${name}`)}</span>
    </Link>
  );
}

/** A row's state: in progress, waiting, done, declined; „Neu" only where no blue dot says it. */
function StateBadge({ status, lang, showNew = false }: { status: WorkStatus; lang: WsLang; showNew?: boolean }) {
  const label = pick(lang, STATUS_LABELS[status]);
  if (status === 'in_progress') return <Badge tone="accent">{label}</Badge>;
  if (status === 'waiting') return <Badge tone="warning">{label}</Badge>;
  if (status === 'done') return <Badge tone="positive">{label}</Badge>;
  if (status === 'declined' || status === 'spam') return <Badge tone="quiet">{label}</Badge>;
  return showNew ? <Badge tone="accent">{label}</Badge> : null;
}

/** The language the form was sent in, when it is not German: the one to reply in. */
function Language({ locale, t }: { locale: string; t: T }) {
  if (locale === 'de') return null;
  return (
    <span
      title={t('Nicht auf Deutsch geschrieben — antworte in dieser Sprache', 'Not written in German — reply in this language')}
      className="rounded-md bg-ws-sunk px-1.5 py-px text-[0.66rem] font-bold tracking-[0.04em] text-[var(--casa-muted)] uppercase"
    >
      {locale}
    </span>
  );
}

function Assignee({ name, t }: { name: string | null; t: T }) {
  if (!name) return null;
  return (
    <span title={name} className="relative inline-flex">
      <Avatar name={name} staff size="sm" />
      <span className="sr-only">{t(`Zuständig: ${name}`, `Owner: ${name}`)}</span>
    </span>
  );
}

/** „Erledigt" in one click, or „Wieder öffnen" on a closed one; no confirmation, since either undoes the other. */
function CloseButton({ id, open, t, compact = false }: { id: string; open: boolean; t: T; compact?: boolean }) {
  return (
    <form action={updateStatusAction} className="relative z-10">
      <input type="hidden" name="entity" value="enquiry" />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="status"
        value={open ? 'done' : 'in_progress'}
        title={open ? t('Als erledigt markieren', 'Mark as done') : t('Wieder öffnen', 'Reopen')}
        aria-label={compact ? t('Erledigt', 'Done') : undefined}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full bg-white text-[0.76rem] font-semibold text-[var(--casa-muted)] ring-1 ring-ws-line ring-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-3.5',
          compact ? 'w-7 justify-center' : 'px-2.5',
          open ? 'hover:bg-[#eaf7ef] hover:text-[#17693a] hover:ring-[#bfe3cc]' : 'hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
        )}
      >
        {open ? Icon.check : null}
        {compact ? null : open ? t('Erledigt', 'Done') : t('Wieder öffnen', 'Reopen')}
      </button>
    </form>
  );
}

/** One state's count with its dot; nothing when there are none. */
function Tally({ tone, n, label, lang }: { tone: 'new' | 'working' | 'waiting'; n: number; label: string; lang: WsLang }) {
  if (!n) return null;
  return (
    <span data-tally={tone} className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', tone === 'new' ? 'bg-[#2f6fd1]' : tone === 'working' ? 'bg-[var(--fm-navy)]' : 'bg-[#e0a100]')}
      />
      <b className="font-semibold text-[var(--casa-ink)] tabular-nums">{num(lang, n)}</b> {label}
    </span>
  );
}
