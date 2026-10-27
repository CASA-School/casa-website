import Link from 'next/link';
import type { ReactNode } from 'react';

import { updateStatusAction } from '@/app/(admin)/admin/(workspace)/actions';
import { berlinDay, berlinTime, dayHeading, daysSince, groupByDay, groupByMonth, monthHeading, shortDay } from '@/lib/admin/days';
import { counted, num, pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import type { InboxCounts, InboxPeriod, InboxState } from '@/lib/admin/inbox';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { STATUS_LABELS, type QueueEntity, type WorkStatus } from '@/lib/admin/queues';
import { cn } from '@/lib/utils';

import { Icon } from './icons';
import { Avatar, ListBar, ListEmpty } from './list';
import { Pagination } from './pagination';
import { Badge, PageHeader } from './ui';

/**
 * The three inboxes — enquiries, registrations, applications — in one design
 * (Rahman, 2026-10-14/15: the enquiry queue first, then "make them look more
 * like enquiries and share same design pattern … if we change something it gets
 * reflected all over these three similar interfaces too"). A page reads its
 * records, maps each to an `InboxItem`, and hands them to `InboxScreen`; how
 * the inbox looks and behaves lives only here (docs/ADMIN_WORKSPACE.md §Lists,
 * rule 16).
 *
 * „Letzte 7 Tage" is today and the six days before, one section per day on
 * Bremen's calendar, newest first, every record of the day in it: who, what
 * about, the start of what they wrote. „Erledigt" on a row closes it in one
 * click; it stays under its day, quieter, and leaves every open count, so a day
 * reads as what came in and what was dealt with. „Verlauf" is everything before,
 * by month, one line each. A record from before the week that is still open is
 * unfinished work, not history: the week says how many and links to them. A
 * search looks through everything.
 */

/** One record as an inbox row shows it. */
export type InboxItem = {
  id: string;
  href: string;
  name: string;
  status: WorkStatus;
  /** When it came in. */
  at: Date;
  /** What it is about: the topic, the course, the position. */
  title: string;
  /** The start of what they wrote, or the details that decide the next step; two lines at most. */
  preview?: string | null;
  /** What else marks it: a group, a room needed, one part of an exam. */
  badges?: ReactNode;
  /** The language it was sent in; shown when it is not German. */
  locale?: string | null;
  assigneeName: string | null;
};

/** What the inbox holds, in both languages, German feminine (Anfrage, Anmeldung, Bewerbung); English lower case. */
export type InboxNouns = { one: Bilingual; many: Bilingual };

/** A page's view, read from its URL the same way on every inbox. */
export function inboxParams(params: Record<string, string | string[] | undefined>) {
  const search = firstParam(params.q);
  const view: 'week' | 'history' = firstParam(params.view) === 'history' ? 'history' : 'week';
  const rawState = firstParam(params.status);
  const state: InboxState = view === 'history' && (rawState === 'open' || rawState === 'closed') ? rawState : 'any';
  const page = clampPage(params.page);
  const period: InboxPeriod = search ? 'all' : view;
  // A week is read whole; a history and a search in pages.
  const limit = period === 'week' ? 250 : PAGE_SIZE;
  const offset = period === 'week' ? 0 : offsetFor(page);
  return { search, view, state, page, period, limit, offset };
}

export async function InboxScreen({
  entity,
  basePath,
  title,
  actions,
  nouns,
  searchPlaceholder,
  view,
  state,
  search,
  page,
  params,
  counts,
  items,
  total,
  canClose,
}: {
  entity: QueueEntity;
  basePath: string;
  title: string;
  /** Beside the title: the registrations' Kurs | Prüfung switch. */
  actions?: ReactNode;
  nouns: InboxNouns;
  searchPlaceholder: string;
  view: 'week' | 'history';
  state: InboxState;
  search?: string;
  page: number;
  params: Record<string, string | string[] | undefined>;
  counts: InboxCounts;
  items: readonly InboxItem[];
  total: number;
  canClose: boolean;
}) {
  const { t, lang } = await getI18n();
  const today = berlinDay(new Date());
  const history = view === 'history' && !search;
  const one = pick(lang, nouns.one);
  const many = pick(lang, nouns.many);

  return (
    <>
      <PageHeader title={title} actions={actions} />

      {/* Where the open work stands, of any age: the same three states the rows carry. */}
      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="new" n={counts.new} label={t('offen', 'open')} lang={lang} />
        {/* Three states (2026-10-21): what waits on an answer is in progress. */}
        <Tally tone="working" n={counts.inProgress + counts.waiting} label={t('in Arbeit', 'in progress')} lang={lang} />
        {counts.new + counts.inProgress + counts.waiting === 0 ? <span>{t('Alles erledigt', 'All done')}</span> : null}
      </p>

      <div className="mb-6 overflow-hidden rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
        <ListBar
          tabs={[
            { key: 'week', label: t('Letzte 7 Tage', 'Last 7 days'), href: basePath, count: counts.week },
            { key: 'history', label: t('Verlauf', 'History'), href: `${basePath}?view=history`, count: counts.history },
          ]}
          active={search ? '' : view}
          search={{ action: basePath, value: search, placeholder: searchPlaceholder, keep: { view: view === 'history' ? 'history' : undefined } }}
        />
      </div>

      {search ? (
        <p className="mb-4 text-[0.84rem] text-[var(--casa-muted)]">
          {t(`${num(lang, total)} Treffer für „${search}“, aus allen Wochen`, `${num(lang, total)} found for “${search}”, from every week`)}
        </p>
      ) : null}

      {view === 'week' && !search && counts.openOlder > 0 ? (
        <Link
          href={`${basePath}?view=history&status=open`}
          className="mb-6 flex items-center gap-3 rounded-2xl bg-[#fff6e0] px-4 py-3 text-[0.86rem] text-[#6b4a00] ring-1 ring-[#f3e2b3] ring-inset transition-colors outline-none hover:bg-[#fff1cf] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#e0a100]" />
          <span className="flex-1">
            {counts.openOlder === 1
              ? t(`Eine ältere ${nouns.one.de} ist noch offen.`, `One older ${nouns.one.en} is still open.`)
              : t(`${num(lang, counts.openOlder)} ältere ${nouns.many.de} sind noch offen.`, `${num(lang, counts.openOlder)} older ${nouns.many.en} are still open.`)}
          </span>
          <span className="font-semibold">{t('Ansehen', 'View')}</span>
          <span aria-hidden="true" className="[&_svg]:size-3.5">
            {Icon.chevronRight}
          </span>
        </Link>
      ) : null}

      {history ? <StateFilter basePath={basePath} state={state} t={t} /> : null}

      {history ? (
        <History items={items} entity={entity} canClose={canClose} one={one} many={many} t={t} lang={lang} />
      ) : (
        <Week
          items={items}
          entity={entity}
          today={search ? null : today}
          canClose={canClose}
          one={one}
          many={many}
          t={t}
          lang={lang}
          emptyTitle={search ? t(`Nichts passt zu „${search}“`, `Nothing matches “${search}”`) : null}
        />
      )}

      {view === 'week' && !search ? null : <Pagination basePath={basePath} page={page} total={total} params={params} />}
    </>
  );
}

const isOpen = (status: WorkStatus) => status === 'new' || status === 'in_progress' || status === 'waiting';

/** The week (or a search): one section per day. Today always has its section, so a quiet morning says so. */
function Week({
  items,
  entity,
  today,
  canClose,
  one,
  many,
  t,
  lang,
  emptyTitle,
}: {
  items: readonly InboxItem[];
  entity: QueueEntity;
  /** Set for the week; a search has no "today" to hold. */
  today: string | null;
  canClose: boolean;
  one: string;
  many: string;
  t: T;
  lang: WsLang;
  emptyTitle: string | null;
}) {
  return (
    <DaySections
      items={items}
      today={today}
      t={t}
      lang={lang}
      emptyTitle={emptyTitle}
      summary={(rows) => {
        const open = rows.filter((row) => isOpen(row.status)).length;
        return (
          <>
            {counted(lang, rows.length, one, many)}
            {' · '}
            {open ? (
              <span className="text-[var(--casa-ink)]">
                {num(lang, open)} {t('offen', 'open')}
              </span>
            ) : (
              <span className="text-[#17693a]">{rows.length === 1 ? t('erledigt', 'done') : t('alle erledigt', 'all done')}</span>
            )}
          </>
        );
      }}
      row={(item) => <InboxRow key={item.id} item={item} entity={entity} canClose={canClose} one={one} t={t} lang={lang} />}
    />
  );
}

/**
 * Records by day, the inboxes' and the placement queue's one way of showing
 * time: a sticky heading per day — „Heute", „Gestern", the date with how long
 * ago — with a summary on the right, the day's rows in one card. With `today`
 * set, today always has its section, so a quiet morning says so.
 */
export function DaySections<I extends { id: string; at: Date }>({
  items,
  today,
  t,
  lang,
  emptyTitle,
  summary,
  row,
}: {
  items: readonly I[];
  today: string | null;
  t: T;
  lang: WsLang;
  emptyTitle: string | null;
  summary: (rows: readonly I[]) => ReactNode;
  row: (item: I) => ReactNode;
}) {
  const days = groupByDay(items, (item) => item.at);
  if (today && days[0]?.day !== today) days.unshift({ day: today, rows: [] });
  if (!days.length) {
    return (
      <div className="rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
        <ListEmpty title={emptyTitle ?? t('Nichts hier', 'Nothing here')} />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {days.map(({ day, rows }, index) => {
        const heading = dayHeading(day, lang, today ?? berlinDay(new Date()));
        return (
          <section key={`${day}-${index}`} aria-labelledby={`day-${day}-${index}`}>
            <header className="sticky top-0 z-10 -mx-1 mb-2.5 flex items-baseline gap-2.5 bg-ws-canvas/90 px-1 py-1.5 backdrop-blur-sm lg:top-14">
              <h2 id={`day-${day}-${index}`} className="text-[0.95rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">
                {heading.title}
              </h2>
              {heading.aside ? <span className="text-[0.82rem] text-[var(--casa-muted)]">{heading.aside}</span> : null}
              {rows.length ? <span className="ml-auto text-xs font-semibold text-[var(--casa-muted)] tabular-nums">{summary(rows)}</span> : null}
            </header>
            {rows.length ? (
              <ul className="divide-y divide-ws-line-soft overflow-hidden rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
                {rows.map((item) => row(item))}
              </ul>
            ) : (
              <p className="rounded-3xl border border-dashed border-ws-line px-5 py-4 text-[0.86rem] text-[var(--casa-muted)]">
                {t('Heute ist noch nichts eingegangen.', 'Nothing has come in today yet.')}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** One row of a day's card: the whole row opens its record, a button on it sits above the link; a closed one is quieter. */
export function CardRow({ href, label, quiet = false, children }: { href: string; label: string; quiet?: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        'group relative flex flex-wrap items-start gap-x-3.5 gap-y-2.5 px-4 py-4 transition-colors hover:bg-[var(--ws-row-hover)] sm:flex-nowrap sm:gap-x-4 sm:px-5',
        quiet && 'bg-[#fbfbfc]'
      )}
    >
      <RowLink href={href} label={label} />
      {children}
    </li>
  );
}

/** A new record older than this has waited too long, and says so. */
const STALE_AFTER_DAYS = 2;

function InboxRow({ item, entity, canClose, one, t, lang }: { item: InboxItem; entity: QueueEntity; canClose: boolean; one: string; t: T; lang: WsLang }) {
  const waited = daysSince(item.at);
  const stale = item.status === 'new' && waited > STALE_AFTER_DAYS;
  const open = isOpen(item.status);

  return (
    <CardRow href={item.href} label={t(`${one} von ${item.name} öffnen`, `Open the ${one} from ${item.name}`)} quiet={!open}>

      <span className={cn('relative mt-0.5 shrink-0', !open && 'opacity-60')}>
        <Avatar name={item.name} />
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
            {item.name}
          </span>
          {item.badges}
          <StateBadge status={item.status} lang={lang} />
        </div>
        <p className={cn('mt-1 truncate text-[0.86rem] font-semibold', open ? 'text-[#2b3546]' : 'text-[var(--casa-muted)]')}>{item.title}</p>
        {item.preview ? (
          <p className={cn('mt-0.5 line-clamp-2 text-[0.84rem] leading-relaxed', open ? 'text-[var(--casa-muted)]' : 'text-[#6b7a90]')}>{item.preview}</p>
        ) : null}
      </div>

      {/* On a phone the time and the button take a line of their own under the text. */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2 pl-[3.25rem] sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:pl-2">
        <span className="flex items-center gap-2 text-[0.8rem] text-[var(--casa-muted)] tabular-nums">
          <Language locale={item.locale} t={t} />
          <time
            dateTime={item.at.toISOString()}
            title={stale ? t(`Wartet seit ${num(lang, waited)} Tagen`, `Waiting for ${num(lang, waited)} days`) : undefined}
            className={cn(stale && 'font-semibold text-[#9a5b00]')}
          >
            {berlinTime(item.at, lang)}
          </time>
        </span>
        <span className="flex items-center gap-2">
          <Assignee name={item.assigneeName} t={t} />
          {canClose ? <CloseButton entity={entity} id={item.id} open={open} t={t} /> : null}
        </span>
      </div>
    </CardRow>
  );
}

/** The history: by month, one line per record. */
function History({
  items,
  entity,
  canClose,
  one,
  many,
  t,
  lang,
}: {
  items: readonly InboxItem[];
  entity: QueueEntity;
  canClose: boolean;
  one: string;
  many: string;
  t: T;
  lang: WsLang;
}) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
        <ListEmpty title={t('Hier ist nichts', 'Nothing here')} />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {groupByMonth(items, (item) => item.at).map(({ month, rows }) => (
        <section key={month} aria-labelledby={`month-${month}`}>
          <header className="mb-2 flex items-baseline gap-2.5 px-1">
            <h2 id={`month-${month}`} className="text-[0.92rem] font-bold text-[var(--casa-ink)]">
              {monthHeading(month, lang)}
            </h2>
            <span className="text-xs font-semibold text-[var(--casa-muted)] tabular-nums">{counted(lang, rows.length, one, many)}</span>
          </header>
          <ul className="divide-y divide-ws-line-soft overflow-hidden rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
            {rows.map((item) => {
              const open = isOpen(item.status);
              return (
                <li key={item.id} className="group relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)] sm:px-5">
                  <RowLink href={item.href} label={t(`${one} von ${item.name} öffnen`, `Open the ${one} from ${item.name}`)} />
                  <time dateTime={item.at.toISOString()} className="hidden w-[6.5rem] shrink-0 text-[0.8rem] text-[var(--casa-muted)] tabular-nums sm:block">
                    {shortDay(item.at, lang)}
                  </time>
                  <Avatar name={item.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[0.86rem]">
                    <span className={cn('font-semibold', open ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>{item.name}</span>
                    <span className="text-[var(--casa-muted)]"> · {item.title}</span>
                  </span>
                  <StateBadge status={item.status} lang={lang} showNew />
                  <span className="hidden sm:inline-flex">
                    <Assignee name={item.assigneeName} t={t} />
                  </span>
                  {canClose ? open ? <CloseButton entity={entity} id={item.id} open t={t} compact /> : <span aria-hidden="true" className="w-7 shrink-0" /> : null}
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
function StateFilter({ basePath, state, t }: { basePath: string; state: InboxState; t: T }) {
  const options: { key: InboxState; label: string; href: string }[] = [
    { key: 'any', label: t('Alle', 'All'), href: `${basePath}?view=history` },
    { key: 'open', label: t('Offen', 'Open'), href: `${basePath}?view=history&status=open` },
    { key: 'closed', label: t('Erledigt', 'Done'), href: `${basePath}?view=history&status=closed` },
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

/** The whole row opens the record; buttons on it sit above the link. */
function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 focus-visible:ring-inset">
      <span className="sr-only">{label}</span>
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

/** The language it was sent in, when it is not German: the one to reply in. */
export function Language({ locale, t }: { locale?: string | null; t: T }) {
  if (!locale || locale === 'de') return null;
  return (
    <span
      title={t('Nicht auf Deutsch geschrieben — antworte in dieser Sprache', 'Not written in German — reply in this language')}
      className="rounded-md bg-ws-sunk px-1.5 py-px text-[0.66rem] font-bold tracking-[0.04em] text-[var(--casa-muted)] uppercase"
    >
      {locale}
    </span>
  );
}

export function Assignee({ name, t }: { name: string | null; t: T }) {
  if (!name) return null;
  return (
    <span title={name} className="relative inline-flex">
      <Avatar name={name} staff size="sm" />
      <span className="sr-only">{t(`Zuständig: ${name}`, `Owner: ${name}`)}</span>
    </span>
  );
}

/** „Erledigt" in one click, or „Wieder öffnen" on a closed one; no confirmation, since either undoes the other. */
function CloseButton({ entity, id, open, t, compact = false }: { entity: QueueEntity; id: string; open: boolean; t: T; compact?: boolean }) {
  return (
    <form action={updateStatusAction} className="relative z-10">
      <input type="hidden" name="entity" value={entity} />
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
export function Tally({ tone, n, label, lang }: { tone: 'new' | 'working' | 'waiting' | 'done'; n: number; label: string; lang: WsLang }) {
  if (!n) return null;
  return (
    <span data-tally={tone} className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'size-2 rounded-full',
          tone === 'new' ? 'bg-[#2f6fd1]' : tone === 'working' ? 'bg-[var(--fm-navy)]' : tone === 'done' ? 'bg-[#1f9d55]' : 'bg-[#e0a100]'
        )}
      />
      <b className="font-semibold text-[var(--casa-ink)] tabular-nums">{num(lang, n)}</b> {label}
    </span>
  );
}
