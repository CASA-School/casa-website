import type { ReactNode } from 'react';

import { addNoteAction, assignAction, updateStatusAction } from '@/app/(admin)/admin/(workspace)/actions';
import { describeActivity, type ActivityEntry } from '@/lib/admin/activity';
import { berlinDay, berlinTime, shortDay } from '@/lib/admin/days';
import { pick, relativeDays, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import type { StaffNote } from '@/lib/admin/notes';
import { normaliseStatus, STATUS_LABELS, type QueueEntity, type WorkStatus } from '@/lib/admin/queues';
import { cn } from '@/lib/utils';

import { ChoiceMenu } from './choice-menu';
import { Icon } from './icons';
import { Avatar } from './list';
import { ButtonLink, Card } from './ui';

/**
 * The parts of a queue record's page that do the work on it (2026-10-14, the
 * enquiry page first): where it stands, who has it, and what has been said and
 * done. The record's own fields differ between the queues; these do not.
 */

/** Each state's colours: its dot, and its pill when it is the current one or named in the history. */
const TONE: Record<WorkStatus, { pill: string; dot: string }> = {
  new: { pill: 'bg-[#e8f1fd] text-[#174a8f] ring-[#b9d0f1]', dot: 'bg-[#2f6fd1]' },
  in_progress: { pill: 'bg-[#e6ecf6] text-[var(--fm-navy)] ring-[#bccae0]', dot: 'bg-[var(--fm-navy)]' },
  waiting: { pill: 'bg-[#fff2d6] text-[#6e4700] ring-[#ebd298]', dot: 'bg-[#d99a00]' },
  done: { pill: 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]', dot: 'bg-[#1f9d55]' },
  declined: { pill: 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]', dot: 'bg-[#8792a3]' },
  spam: { pill: 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]', dot: 'bg-[#8792a3]' },
};

/** The working states, in the order work moves through them. */
const STEPS: readonly WorkStatus[] = ['new', 'in_progress', 'waiting', 'done'];

/** A state as a small pill with its dot. */
export function StatePill({ status, lang }: { status: WorkStatus; lang: WsLang }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold whitespace-nowrap ring-1 ring-inset', TONE[status].pill)}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE[status].dot)} />
      {pick(lang, STATUS_LABELS[status])}
    </span>
  );
}

/**
 * Where the record stands, as one row of its states: the current one lit, any
 * other one click away. Declined and spam are rare, so they sit in a menu
 * („Mehr"). Read-only for a colleague who may only look.
 */
export async function StatusBar({
  entity,
  id,
  status,
  canEdit,
}: {
  entity: QueueEntity;
  id: string;
  status: WorkStatus;
  canEdit: boolean;
}) {
  const { t, lang } = await getI18n();
  const rare = status === 'declined' || status === 'spam';

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {/* A row of four on a wide screen; two by two on a phone, where a wrapped pill track reads as broken. */}
      <form
        action={updateStatusAction}
        className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-[#d3dbe6] ring-inset sm:flex sm:w-auto sm:items-center sm:rounded-full"
      >
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={id} />
        {STEPS.map((step) => {
          const current = step === status;
          return (
            <button
              key={step}
              type="submit"
              name="status"
              value={step}
              disabled={!canEdit || current}
              aria-pressed={current}
              className={cn(
                'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2 text-[0.78rem] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 sm:justify-start sm:gap-2 sm:px-3.5 sm:text-[0.8rem]',
                current
                  ? cn('shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-inset', TONE[step].pill)
                  : 'text-[#334155] enabled:hover:bg-[#eef2f7] enabled:hover:text-[var(--casa-ink)] disabled:cursor-default'
              )}
            >
              <span aria-hidden="true" className={cn('size-2 rounded-full', current ? TONE[step].dot : 'bg-[#a9b4c4]')} />
              {pick(lang, STATUS_LABELS[step])}
            </button>
          );
        })}
      </form>
      {rare ? <StatePill status={status} lang={lang} /> : null}
      {canEdit ? (
        <ChoiceMenu
          action={updateStatusAction}
          fields={{ entity, id }}
          name="status"
          label={t('Weitere Status', 'Other states')}
          choices={(['declined', 'spam'] as const).map((value) => ({
            value,
            label: pick(lang, STATUS_LABELS[value]),
            current: value === status,
            icon: <span aria-hidden="true" className={cn('ml-1 size-2 rounded-full', TONE[value].dot)} />,
          }))}
          triggerClassName="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.8rem] font-semibold text-[#334155] transition-colors outline-none hover:bg-white hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 data-[state=open]:bg-white data-[state=open]:ring-1 data-[state=open]:ring-[#d3dbe6] data-[state=open]:ring-inset"
          trigger={
            <>
              {t('Mehr', 'More')}
              <span aria-hidden="true" className="[&_svg]:size-3.5">
                {Icon.chevronDown}
              </span>
            </>
          }
        />
      ) : null}
    </div>
  );
}

/** Who has the record: their initials and name, changed from a menu, or taken in one click. */
export async function OwnerControl({
  entity,
  id,
  assignedTo,
  staff,
  me,
  canEdit,
}: {
  entity: QueueEntity;
  id: string;
  assignedTo: string | null;
  staff: readonly { id: string; name: string }[];
  me: { id: string; name: string };
  canEdit: boolean;
}) {
  const { t } = await getI18n();
  const owner = staff.find((member) => member.id === assignedTo);
  const current = (
    <>
      {owner ? (
        <Avatar name={owner.name} staff size="sm" />
      ) : (
        <span aria-hidden="true" className="size-6 shrink-0 rounded-full border border-dashed border-[#a9b4c4]" />
      )}
      <span className="text-[0.82rem]">
        <span className="text-[var(--casa-muted)]">{t('Zuständig:', 'Owner:')} </span>
        <span className={cn('font-semibold', owner ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>
          {owner ? (owner.id === me.id ? t('du', 'you') : owner.name) : t('niemand', 'nobody')}
        </span>
      </span>
    </>
  );

  if (!canEdit) return <span className="flex items-center gap-2 px-1.5">{current}</span>;

  return (
    <div className="flex items-center gap-1.5">
      <ChoiceMenu
        action={assignAction}
        fields={{ entity, id }}
        name="staffUserId"
        label={t('Wer sich darum kümmert', 'Who is dealing with this')}
        align="end"
        choices={[
          {
            value: '',
            label: t('Niemand', 'Nobody'),
            current: !assignedTo,
            icon: <span aria-hidden="true" className="size-6 shrink-0 rounded-full border border-dashed border-[#a9b4c4]" />,
          },
          ...staff.map((member) => ({
            value: member.id,
            label: member.id === me.id ? t(`${member.name} (du)`, `${member.name} (you)`) : member.name,
            current: member.id === assignedTo,
            icon: <Avatar name={member.name} staff size="sm" />,
          })),
        ]}
        triggerClassName="flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 data-[state=open]:bg-white data-[state=open]:ring-1 data-[state=open]:ring-[#d3dbe6] data-[state=open]:ring-inset"
        trigger={
          <>
            {current}
            <span aria-hidden="true" className="text-[var(--casa-muted)] [&_svg]:size-3.5">
              {Icon.chevronDown}
            </span>
          </>
        }
      />
      {assignedTo !== me.id ? (
        <form action={assignAction}>
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            name="staffUserId"
            value={me.id}
            className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[0.78rem] font-semibold text-[var(--fm-navy)] shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-[#d3dbe6] ring-inset transition-colors outline-none hover:bg-[#eef2f7] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
          >
            {t('Übernehmen', 'Take it')}
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** A change's mark on the line of time, by what it did. */
const ACTION_ICON: Record<string, ReactNode> = {
  payment_recorded: Icon.money,
  payment_voided: Icon.money,
  credit_carried_over: Icon.money,
  credit_received: Icon.money,
  charge_added: Icon.money,
  charge_removed: Icon.money,
  booking_created: Icon.bookings,
  booking_updated: Icon.bookings,
  booking_extended: Icon.calendar,
  booking_period_removed: Icon.calendar,
  booking_cancelled: Icon.bookings,
  booking_observed: Icon.attention,
  booking_observation_ended: Icon.check,
  person_updated: Icon.person,
  person_restored: Icon.person,
  person_address_updated: Icon.person,
  person_private_updated: Icon.person,
  bank_account_added: Icon.money,
  bank_account_updated: Icon.money,
  waitlist_joined: Icon.clock,
  waitlist_offered: Icon.clock,
  waitlist_offer_taken_back: Icon.clock,
  waitlist_declined: Icon.clock,
  waitlist_withdrawn: Icon.clock,
  waitlist_moved: Icon.clock,
  waitlist_moved_course: Icon.clock,
  waitlist_booked: Icon.bookings,
  letter_sent: Icon.mail,
  booking_level_set: Icon.bookings,
  exam_filed: Icon.check,
  exam_unfiled: Icon.check,
  exam_changed: Icon.calendar,
  bank_account_removed: Icon.money,
  person_linked: Icon.people,
  person_unlinked: Icon.people,
  placement_confirmed: Icon.placement,
  review_attached_to_person: Icon.person,
  review_detached_from_person: Icon.person,
  room_assigned: Icon.rooms,
  room_unassigned: Icon.rooms,
  status_changed: Icon.check,
  assigned: Icon.person,
  unassigned: Icon.person,
  note_added: Icon.note,
};

/** Failing a mark for what it did, the mark of what it was done to. */
const ENTITY_ICON: Record<string, ReactNode> = {
  enquiry: Icon.enquiries,
  course_registration: Icon.registrations,
  exam_registration: Icon.registrations,
  career_application: Icon.applications,
  placement_attempt: Icon.placement,
  person: Icon.person,
  booking: Icon.bookings,
  offer: Icon.offers,
  letter_text: Icon.offers,
  kursplanung: Icon.kursplanung,
  course_instance: Icon.catalogue,
  exam_session: Icon.placement,
  room: Icon.rooms,
  price_list: Icon.money,
  website_release: Icon.website,
  staff_user: Icon.team,
};

/** A change's mark: by what it did, else by what it was done to, else the clock. */
export const activityIcon = (entry: { action: string; entity: string }): ReactNode =>
  ACTION_ICON[entry.action] ?? ENTITY_ICON[entry.entity] ?? Icon.clock;

/** A record's own entry on the line of time, said in its own words: an offer's letter sent, its answer. */
export type TimelineEvent = {
  id: string;
  at: Date;
  icon: ReactNode;
  who: ReactNode;
  what: ReactNode;
  /** A line under it: the words that came with it, or where it leads. */
  body?: ReactNode;
  tone?: 'good' | 'watch';
};

type TimelineOrigin = { at: Date; label: ReactNode; what?: ReactNode; body?: ReactNode; icon?: ReactNode };

type TimelineItem =
  | { kind: 'note'; at: Date; note: StaffNote }
  | { kind: 'event'; at: Date; entry: ActivityEntry }
  | { kind: 'own'; at: Date; event: TimelineEvent }
  | ({ kind: 'origin' } & TimelineOrigin);

/**
 * What has been said and done, in one line of time, newest first. A note is
 * written at the top; notes read as the colleague's words in a soft card, and
 * each change made to the record is one short line with its own mark — a
 * change of state shows the two states, a change of owner the person. The
 * record's arrival closes the line.
 */
export async function Timeline({
  entity,
  id,
  notes,
  activity,
  events = [],
  origin,
  canWrite = true,
}: {
  entity: string;
  id: string;
  notes: readonly StaffNote[];
  activity: readonly ActivityEntry[];
  /** Entries the record words itself, beside the general changes. */
  events?: readonly TimelineEvent[];
  /** The record's arrival, the first thing that happened to it; an inbox record's mark is the envelope. */
  origin?: TimelineOrigin;
  /** A colleague who may only look reads the line of time without the note box. */
  canWrite?: boolean;
}) {
  const { t, lang } = await getI18n();
  const items: TimelineItem[] = [
    ...notes.map((note) => ({ kind: 'note' as const, at: note.createdAt, note })),
    ...activity.filter((entry) => entry.action !== 'note_added').map((entry) => ({ kind: 'event' as const, at: entry.createdAt, entry })),
    ...events.map((event) => ({ kind: 'own' as const, at: event.at, event })),
    ...(origin ? [{ kind: 'origin' as const, ...origin }] : []),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const today = berlinDay(new Date());
  const full = (at: Date) => `${shortDay(at, lang)}, ${berlinTime(at, lang)}`;
  // Today's entries by the clock, older ones by the day.
  const when = (at: Date) => (berlinDay(at) === today ? berlinTime(at, lang) : shortDay(at, lang));
  const someone = t('Jemand', 'Someone');

  return (
    <Card title={t('Notizen und Verlauf', 'Notes and history')} icon={Icon.note} tint="sun">
      {canWrite ? (
      <form
        action={addNoteAction}
        className="rounded-2xl bg-white ring-1 ring-[#d3dbe6] ring-inset transition-shadow focus-within:ring-2 focus-within:ring-[var(--casa-blue)]/35"
      >
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="entityId" value={id} />
        <textarea
          name="body"
          rows={2}
          required
          placeholder={t('Was habt ihr vereinbart, und wie geht es weiter?', 'What did you agree, and what happens next?')}
          aria-label={t('Neue Notiz', 'New note')}
          className="block min-h-[4.25rem] w-full resize-y rounded-2xl border-0 bg-transparent px-3.5 pt-3 pb-1 text-[0.86rem] leading-relaxed text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-muted)]"
        />
        <div className="flex justify-end px-2 pb-2">
          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[0.78rem] font-semibold text-[var(--fm-navy)] ring-1 ring-[#bccae0] ring-inset transition-colors outline-none hover:bg-[#eef2f7] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
          >
            {t('Notiz hinzufügen', 'Add note')}
          </button>
        </div>
      </form>
      ) : null}

      {items.length ? (
        <ol className="relative mt-5 space-y-4 before:absolute before:top-3 before:bottom-3 before:left-[13px] before:w-px before:bg-[#d3dbe6]">
          {items.map((item, index) => {
            const key =
              item.kind === 'note' ? `n-${item.note.id}` : item.kind === 'event' ? `e-${item.entry.id}` : item.kind === 'own' ? `r-${item.event.id}` : `o-${index}`;
            if (item.kind === 'note') {
              const author = item.note.authorName ?? t('Ehemaliges Teammitglied', 'A former colleague');
              return (
                <li key={key} className="relative flex gap-3">
                  <span className="relative z-[1] mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white">
                    <Avatar name={author} staff size="sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Meta who={author} what={t('hat notiert', 'wrote')} at={when(item.at)} title={full(item.at)} />
                    <p className="mt-1.5 rounded-xl rounded-tl-sm bg-[#fff8e1] px-3 py-2.5 text-[0.86rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)] ring-1 ring-[#eedfa6] ring-inset">
                      {item.note.body}
                    </p>
                  </div>
                </li>
              );
            }
            if (item.kind === 'origin') {
              return (
                <li key={key} className="relative flex gap-3">
                  <Mark className="bg-[#e8f1fd] text-[#174a8f] ring-[#b9d0f1]">{item.icon ?? Icon.enquiries}</Mark>
                  <div className="min-w-0 flex-1 pt-1">
                    <Meta who={item.label} what={item.what} at={full(item.at)} />
                    {item.body ? <div className="mt-1 text-[0.8rem] leading-relaxed text-[var(--casa-muted)]">{item.body}</div> : null}
                  </div>
                </li>
              );
            }
            if (item.kind === 'own') {
              const { event } = item;
              return (
                <li key={key} className="relative flex gap-3">
                  <Mark
                    className={
                      event.tone === 'good'
                        ? 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]'
                        : event.tone === 'watch'
                          ? 'bg-[#fff2d6] text-[#6e4700] ring-[#ebd298]'
                          : 'bg-white text-[var(--casa-muted)] ring-[#d3dbe6]'
                    }
                  >
                    {event.icon}
                  </Mark>
                  <div className="min-w-0 flex-1 pt-1">
                    <Meta who={event.who} what={event.what} at={when(item.at)} title={full(item.at)} />
                    {event.body ? <div className="mt-1 text-[0.8rem] leading-relaxed text-[var(--casa-muted)]">{event.body}</div> : null}
                  </div>
                </li>
              );
            }
            const { entry } = item;
            const who = entry.staffName ?? someone;
            const detail = entry.detail ?? {};
            if (entry.action === 'status_changed' && typeof detail.to === 'string') {
              return (
                <li key={key} className="relative flex gap-3">
                  <Mark className="bg-white text-[var(--casa-muted)] ring-[#d3dbe6]">{Icon.check}</Mark>
                  <div className="min-w-0 flex-1 pt-1">
                    <Meta who={who} what={t('hat den Status geändert', 'changed the status')} at={when(item.at)} title={full(item.at)} />
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {typeof detail.from === 'string' ? (
                        <>
                          <StatePill status={normaliseStatus(detail.from)} lang={lang} />
                          <span aria-hidden="true" className="text-[var(--casa-muted)] [&_svg]:size-3">
                            {Icon.chevronRight}
                          </span>
                        </>
                      ) : null}
                      <StatePill status={normaliseStatus(detail.to)} lang={lang} />
                    </p>
                  </div>
                </li>
              );
            }
            if (entry.action === 'assigned' || entry.action === 'unassigned') {
              const to = typeof detail.to === 'string' ? detail.to : null;
              const what =
                entry.action === 'unassigned'
                  ? t('hat die Zuständigkeit entfernt', 'removed the owner')
                  : to === who
                    ? t('hat übernommen', 'took it')
                    : t(`hat ${to ?? someone} eingetragen`, `assigned ${to ?? someone}`);
              return (
                <li key={key} className="relative flex gap-3">
                  <Mark className="bg-white text-[var(--casa-muted)] ring-[#d3dbe6]">{Icon.person}</Mark>
                  <div className="min-w-0 flex-1 pt-1">
                    <Meta who={who} what={what} at={when(item.at)} title={full(item.at)} />
                  </div>
                </li>
              );
            }
            return (
              <li key={key} className="relative flex gap-3">
                <Mark className="bg-white text-[var(--casa-muted)] ring-[#d3dbe6]">{activityIcon(entry)}</Mark>
                <div className="min-w-0 flex-1 pt-1">
                  <Meta who={who} what={describeActivity(entry, lang)} at={when(item.at)} title={full(item.at)} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </Card>
  );
}

/** An entry's round mark on the line of time. */
export function Mark({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn('relative z-[1] grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-inset [&_svg]:size-3.5', className)}>
      {children}
    </span>
  );
}

/** Who did what, and when, on one line; the time on the right. */
function Meta({ who, what, at, title }: { who: ReactNode; what?: ReactNode; at: string; title?: string }) {
  return (
    <p className="flex items-baseline gap-2 text-[0.8rem] leading-snug">
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-[var(--casa-ink)]">{who}</span>
        {what ? <span className="text-[var(--casa-muted)]"> {what}</span> : null}
      </span>
      <time title={title} className="shrink-0 text-[0.74rem] text-[var(--casa-muted)] tabular-nums">
        {at}
      </time>
    </p>
  );
}

/** One fact under a record's name, with its small icon: an address, a phone, the language. */
export function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden="true" className="shrink-0 text-[#6b7a90] [&_svg]:size-3.5">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/** The line of facts under a record's name. */
export function MetaLine({ children }: { children: ReactNode }) {
  return <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.84rem] text-[var(--casa-muted)]">{children}</span>;
}

/** The facts that decide the next step, in a grid of small framed cells: the dates, the level, a room. */
export function FactGrid({
  facts,
}: {
  facts: readonly { label: string; value: ReactNode; sub?: ReactNode; tone?: 'plain' | 'attention' | 'good' }[];
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className={cn(
            'rounded-xl px-3.5 py-2.5 ring-1 ring-inset',
            fact.tone === 'attention' ? 'bg-[#fff8e6] ring-[#efdca4]' : fact.tone === 'good' ? 'bg-[#f0f9f3] ring-[#c8e6d3]' : 'bg-[#f7f9fc] ring-ws-line'
          )}
        >
          <dt className="text-[0.74rem] font-semibold text-[var(--casa-muted)]">{fact.label}</dt>
          <dd className="mt-0.5 text-[0.92rem] font-bold text-[var(--casa-ink)]">{fact.value ?? '—'}</dd>
          {fact.sub ? <dd className="mt-0.5 text-[0.76rem] text-[var(--casa-muted)]">{fact.sub}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * What the person sent, as an email reads (2026-10-14, the enquiry first; then
 * registrations and applications): who, their address, how it came, when, the
 * subject, then what they wrote or chose. Under it „Antworten" — the page's main
 * action, or beside a booking, a quiet one — with the language the greeting
 * will be in, and anything else that belongs to the submission (a CV).
 */
export async function SubmissionCard({
  name,
  email,
  at,
  via,
  title,
  children,
  reply,
  extra,
}: {
  name: string;
  email: string;
  at: Date;
  /** How it came, when that says something: „über das Anmeldeformular". */
  via?: string | null;
  title: string;
  children: ReactNode;
  reply: { href: string; locale: string; primary?: boolean };
  /** Beside „Antworten": the CV, say. */
  extra?: ReactNode;
}) {
  const { t, lang } = await getI18n();
  const german = reply.locale === 'de';
  return (
    <article className="overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ws-line px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name || email} />
          <div className="min-w-0 text-[0.84rem]">
            <p className="truncate">
              <span className="font-semibold text-[var(--casa-ink)]">{name}</span> <span className="text-[var(--casa-muted)]">&lt;{email}&gt;</span>
            </p>
            <p className="mt-0.5 text-[0.78rem] text-[var(--casa-muted)]">
              {t('an CASA Bremen', 'to CASA Bremen')}
              {via ? ` · ${via}` : ''}
            </p>
          </div>
        </div>
        <time dateTime={at.toISOString()} className="text-[0.78rem] text-[var(--casa-muted)] tabular-nums">
          <span className="font-semibold text-[var(--casa-ink)]">
            {shortDay(at, lang)}, {berlinTime(at, lang)}
          </span>{' '}
          · {relativeDays(at, lang)}
        </time>
      </header>
      <div className="px-6 pt-5 pb-6">
        <h2 className="text-[1.05rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
      <footer className="flex flex-wrap items-center gap-3 border-t border-ws-line bg-[#f4f6f9] px-6 py-3.5">
        <ButtonLink href={reply.href} variant={reply.primary === false ? 'secondary' : 'primary'}>
          <span aria-hidden="true" className="[&_svg]:size-4">
            {Icon.mail}
          </span>
          {t('Antworten', 'Reply')}
        </ButtonLink>
        {extra}
        <span className="text-[0.78rem] text-[var(--casa-muted)]">{german ? t('Anrede auf Deutsch', 'Greeting in German') : t('Anrede auf Englisch', 'Greeting in English')}</span>
      </footer>
    </article>
  );
}

/** A record's figures in its header's bar: the person's level and bookings, a test's confidence. */
export function StatBar({ children }: { children: ReactNode }) {
  return <dl className="flex w-full flex-wrap items-center gap-x-7 gap-y-2">{children}</dl>;
}

/** One figure: its label above, the value under it, a quiet word after the value when it needs one. */
export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.72rem] font-semibold text-[var(--casa-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[0.95rem] font-bold text-[var(--casa-ink)] tabular-nums">{children}</dd>
    </div>
  );
}
