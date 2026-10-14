import type { ReactNode } from 'react';

import { addNoteAction, assignAction, updateStatusAction } from '@/app/(admin)/admin/(workspace)/actions';
import { describeActivity, type ActivityEntry } from '@/lib/admin/activity';
import { berlinTime, shortDay } from '@/lib/admin/days';
import { pick, relativeDays } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import type { StaffNote } from '@/lib/admin/notes';
import { STATUS_LABELS, type QueueEntity, type WorkStatus } from '@/lib/admin/queues';
import { cn } from '@/lib/utils';

import { Icon } from './icons';
import { Avatar } from './list';
import { Popover, PopoverChoice } from './popover';
import { Button, Card, Textarea } from './ui';

/**
 * The parts of a queue record's page that do the work on it (2026-10-14, the
 * enquiry page first): where it stands, who has it, and what has been said and
 * done. The record's own fields differ between the queues; these do not.
 */

/** The working states, in the order work moves through them; each its colour when current. */
const STEPS: readonly { status: WorkStatus; on: string; dot: string }[] = [
  { status: 'new', on: 'bg-[#e8f1fd] text-[#1d4e96] ring-[#bcd3f3]', dot: 'bg-[#2f6fd1]' },
  { status: 'in_progress', on: 'bg-[#e9eef7] text-[var(--fm-navy)] ring-[#c4d0e4]', dot: 'bg-[var(--fm-navy)]' },
  { status: 'waiting', on: 'bg-[#fff4dc] text-[#7a4f00] ring-[#efd9a3]', dot: 'bg-[#e0a100]' },
  { status: 'done', on: 'bg-[#e9f7ef] text-[#17693a] ring-[#bfe3cc]', dot: 'bg-[#22a35a]' },
];

/**
 * Where the record stands, as one row of its states: the current one lit, any
 * other one click away. Declined and spam are rare, so they sit behind „Mehr".
 * Read-only for a colleague who may only look.
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
  const closedOther = status === 'declined' || status === 'spam';

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {/* A row of four on a wide screen; two by two on a phone, where a wrapped pill track reads as broken. */}
      <form action={updateStatusAction} className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1 ring-ws-line ring-inset sm:flex sm:w-auto sm:items-center sm:rounded-full">
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={id} />
        {STEPS.map((step) => {
          const current = step.status === status;
          return (
            <button
              key={step.status}
              type="submit"
              name="status"
              value={step.status}
              disabled={!canEdit || current}
              aria-pressed={current}
              className={cn(
                'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2 text-[0.78rem] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 sm:justify-start sm:gap-2 sm:px-3.5 sm:text-[0.8rem]',
                current ? cn('ring-1 ring-inset', step.on) : 'text-[var(--casa-muted)] enabled:hover:bg-ws-sunk enabled:hover:text-[var(--casa-ink)] disabled:cursor-default'
              )}
            >
              <span aria-hidden="true" className={cn('size-2 rounded-full', current ? step.dot : 'bg-ws-line-firm')} />
              {pick(lang, STATUS_LABELS[step.status])}
            </button>
          );
        })}
      </form>
      {closedOther ? (
        <span className="inline-flex h-8 items-center rounded-full bg-ws-sunk px-3.5 text-[0.8rem] font-semibold text-[var(--casa-muted)] ring-1 ring-ws-line ring-inset">
          {pick(lang, STATUS_LABELS[status])}
        </span>
      ) : null}
      {canEdit ? (
        <Popover
          label={t('Weitere Status', 'Other states')}
          width={220}
          trigger={
            <span className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.8rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)]">
              {t('Mehr', 'More')}
              <span aria-hidden="true" className="[&_svg]:size-3">
                {Icon.chevronDown}
              </span>
            </span>
          }
        >
          <form action={updateStatusAction}>
            <input type="hidden" name="entity" value={entity} />
            <input type="hidden" name="id" value={id} />
            {(['declined', 'spam'] as const).map((value) => (
              <PopoverChoice key={value} name="status" value={value} current={value === status}>
                {pick(lang, STATUS_LABELS[value])}
              </PopoverChoice>
            ))}
          </form>
        </Popover>
      ) : null}
    </div>
  );
}

/** Who has the record: their initials and name, changed in a small panel, or taken in one click. */
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
  const nobody = t('Noch niemand', 'Nobody yet');
  const current = (
    <span className="flex items-center gap-2 px-1.5 py-1">
      {owner ? <Avatar name={owner.name} staff size="sm" /> : <span aria-hidden="true" className="size-6 rounded-full border border-dashed border-ws-line-firm" />}
      <span className="text-[0.82rem]">
        <span className="text-[var(--casa-text-subtle)]">{t('Zuständig:', 'Owner:')} </span>
        <span className={cn('font-semibold', owner ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-text-subtle)]')}>
          {owner ? (owner.id === me.id ? t('du', 'you') : owner.name) : t('niemand', 'nobody')}
        </span>
      </span>
    </span>
  );

  if (!canEdit) return current;

  return (
    <div className="flex items-center gap-1.5">
      <Popover label={t('Wer sich darum kümmert', 'Who is dealing with this')} trigger={current} width={260}>
        <form action={assignAction}>
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={id} />
          <PopoverChoice name="staffUserId" value="" current={!assignedTo}>
            {nobody}
          </PopoverChoice>
          {staff.map((member) => (
            <PopoverChoice key={member.id} name="staffUserId" value={member.id} current={member.id === assignedTo}>
              {member.name}
            </PopoverChoice>
          ))}
        </form>
      </Popover>
      {assignedTo !== me.id ? (
        <form action={assignAction}>
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            name="staffUserId"
            value={me.id}
            className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[0.78rem] font-semibold text-[var(--fm-navy)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
          >
            {t('Übernehmen', 'Take it')}
          </button>
        </form>
      ) : null}
    </div>
  );
}

type TimelineItem =
  | { kind: 'note'; at: Date; note: StaffNote }
  | { kind: 'event'; at: Date; entry: ActivityEntry }
  | { kind: 'origin'; at: Date; label: ReactNode };

/**
 * What has been said and done, in one line of time: a note is written at the
 * top and lands there; each change made to the record falls in between, the
 * notes as small cards and the changes as quiet lines; the record's arrival is
 * the last entry.
 */
export async function Timeline({
  entity,
  id,
  notes,
  activity,
  origin,
}: {
  entity: string;
  id: string;
  notes: readonly StaffNote[];
  activity: readonly ActivityEntry[];
  /** The record's arrival, the first thing that happened to it. */
  origin?: { at: Date; label: ReactNode };
}) {
  const { t, lang } = await getI18n();
  const items: TimelineItem[] = [
    ...notes.map((note) => ({ kind: 'note' as const, at: note.createdAt, note })),
    ...activity.filter((entry) => entry.action !== 'note_added').map((entry) => ({ kind: 'event' as const, at: entry.createdAt, entry })),
    ...(origin ? [{ kind: 'origin' as const, at: origin.at, label: origin.label }] : []),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const when = (at: Date) => `${shortDay(at, lang)}, ${berlinTime(at, lang)}`;

  return (
    <Card title={t('Notizen und Verlauf', 'Notes and history')} icon={Icon.note} tint="sun">
      <form action={addNoteAction} className="space-y-2">
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="entityId" value={id} />
        <Textarea
          name="body"
          rows={2}
          required
          placeholder={t('Was habt ihr vereinbart, und wie geht es weiter?', 'What did you agree, and what happens next?')}
          aria-label={t('Neue Notiz', 'New note')}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" size="sm">
            {t('Notiz hinzufügen', 'Add note')}
          </Button>
        </div>
      </form>

      {items.length ? (
        <ol className="relative mt-4 space-y-3.5 border-t border-ws-line-soft pt-4 before:absolute before:top-5 before:bottom-1 before:left-[11px] before:w-px before:bg-ws-line">
          {items.map((item, index) => (
            <li key={item.kind === 'note' ? `n-${item.note.id}` : item.kind === 'event' ? `e-${item.entry.id}` : `o-${index}`} className="relative flex gap-3">
              {item.kind === 'note' ? (
                <>
                  <span className="relative z-[1] mt-0.5">
                    <Avatar name={item.note.authorName ?? '?'} staff size="sm" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl bg-[#fffbea] px-3 py-2.5 ring-1 ring-[#f3e7b5] ring-inset">
                    <p className="text-[0.84rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{item.note.body}</p>
                    <p className="mt-1 text-[0.72rem] text-[var(--casa-text-subtle)]" title={when(item.at)}>
                      {item.note.authorName ?? t('Ehemaliges Teammitglied', 'A former colleague')} · {relativeDays(item.at, lang)}
                    </p>
                  </div>
                </>
              ) : item.kind === 'event' ? (
                <>
                  <span aria-hidden="true" className="relative z-[1] mt-1.5 ml-[7px] size-[9px] shrink-0 rounded-full border-2 border-white bg-ws-line-firm" />
                  <p className="min-w-0 pl-[3px] text-[0.76rem] leading-relaxed text-[var(--casa-text-subtle)]" title={when(item.at)}>
                    <span className="font-semibold text-[var(--casa-ink)]">{item.entry.staffName ?? t('Jemand', 'Someone')}</span>{' '}
                    {describeActivity(item.entry, lang)} · {relativeDays(item.at, lang)}
                  </p>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="relative z-[1] mt-1 ml-[5px] size-[13px] shrink-0 rounded-full border-2 border-white bg-[#2f6fd1]" />
                  <p className="min-w-0 pl-px text-[0.76rem] leading-relaxed text-[var(--casa-text-subtle)]">
                    <span className="font-semibold text-[var(--casa-ink)]">{item.label}</span> · {when(item.at)}
                  </p>
                </>
              )}
            </li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}
