import type { ReactNode } from 'react';

import { copyDutiesAction, deleteDutyAction, moveDutyAction, restartCleaningAction, saveDutyAction } from '../actions';
import { ConfirmSubmit, DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Button, ButtonLink, Card, Field, Input, Select, Textarea } from '@/components/admin/ui';
import type { CleaningDuty, FlatCleaning } from '@/lib/admin/cleaning';
import { mondayOf, weekPlan } from '@/lib/admin/cleaning-plan';
import { pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/** Each duty keeps its colour in the plan and on its card. */
export const DUTY_TONES = [
  'bg-[#e1f4f0] text-[#0b4a41] ring-[#a8ddd3]',
  'bg-[#e4eefc] text-[#12305f] ring-[#bcd3f5]',
  'bg-[#ece7fb] text-[#2e1f63] ring-[#d2c7f4]',
  'bg-[#fff1d6] text-[#5c4300] ring-[#f0d9a3]',
  'bg-[#fde8ec] text-[#7d1d33] ring-[#f5c2cd]',
  'bg-[#eef1f5] text-[#2b3546] ring-[#d5dbe4]',
] as const;

const plus = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const fmt = (iso: string, lang: WsLang, options: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(wsLocale(lang), { ...options, timeZone: 'UTC' });

/**
 * A CASA flat's Putzplan (2026-10-19, migration 0072): four weeks of it — each room, who lives there that
 * week, and their duty in its colour — then the duties with their tasks, to change, reorder or remove.
 * A flat without one starts with a duty, or takes over another flat's plan. Printed for the flat's
 * notice board on its own page.
 */
export function CleaningTab({
  placeId,
  plan,
  templates,
  today,
  canEdit,
  canDelete,
  t,
  lang,
}: {
  placeId: string;
  plan: FlatCleaning;
  templates: { id: string; name: string; duties: number }[];
  today: string;
  canEdit: boolean;
  canDelete: boolean;
  t: T;
  lang: WsLang;
}) {
  const monday = mondayOf(today);
  const weeks = [0, 1, 2, 3].map((w) => plus(monday, w * 7));
  const tone = (duty: CleaningDuty) => DUTY_TONES[plan.duties.indexOf(duty) % DUTY_TONES.length];
  // Who lives in a room that week: whoever is there on its Wednesday, else the first to be there at all.
  const tenant = (roomId: string, week: string) => {
    const mid = plus(week, 2);
    const own = plan.tenants.filter((s) => s.roomId === roomId && s.from <= plus(week, 6) && s.to > week);
    return (own.find((s) => s.from <= mid && s.to > mid) ?? own[0])?.name ?? null;
  };

  if (!plan.duties.length) {
    return (
      <Card title={t('Putzplan', 'Cleaning plan')} icon={Icon.calendar} tint="blue">
        <p className="text-[0.9rem] text-[var(--casa-muted)]">{t('Diese WG hat noch keinen Putzplan.', 'This flat has no cleaning plan yet.')}</p>
        {canEdit ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <FormDialog icon={Icon.calendar} tint="blue" trigger={t('Dienst hinzufügen', 'Add a duty')} title={t('Neuer Dienst', 'New duty')} triggerVariant="primary">
              <DutyForm placeId={placeId} t={t} />
            </FormDialog>
            {templates.length ? (
              <form action={copyDutiesAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="placeId" value={placeId} />
                <label className="w-56">
                  <span className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Oder übernehmen von', 'Or take over from')}</span>
                  <Select name="fromPlaceId" defaultValue={templates[0].id}>
                    {templates.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.duties === 1 ? t('1 Dienst', '1 duty') : t(`${p.duties} Dienste`, `${p.duties} duties`)}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button type="submit" variant="secondary">
                  {t('Übernehmen', 'Take over')}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title={t('Die nächsten vier Wochen', 'The next four weeks')}
        icon={Icon.calendar}
        tint="blue"
        bleed
        actions={
          <span className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <form action={restartCleaningAction}>
                <input type="hidden" name="placeId" value={placeId} />
                <Button type="submit" variant="ghost" size="sm">
                  {t('Ab dieser Woche neu beginnen', 'Start again this week')}
                </Button>
              </form>
            ) : null}
            <ButtonLink href={`/admin/accommodation/${placeId}/cleaning`} variant="secondary" size="sm">
              {t('Drucken', 'Print')}
            </ButtonLink>
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ws-line bg-[var(--ws-head)] text-[0.75rem] font-semibold text-[var(--casa-muted)]">
                <th scope="col" className="w-[10rem] py-2.5 pr-3 pl-5 font-semibold">{t('Zimmer', 'Room')}</th>
                {weeks.map((w, i) => (
                  <th key={w} scope="col" className="py-2.5 pr-3 font-semibold">
                    <span className={cn(i === 0 && 'text-[var(--casa-ink)]')}>{i === 0 ? t('Diese Woche', 'This week') : fmt(w, lang, { day: 'numeric', month: 'short' })}</span>
                    <span className="ml-1.5 font-medium tabular-nums">
                      {fmt(w, lang, { day: 'numeric', month: 'numeric' })}–{fmt(plus(w, 6), lang, { day: 'numeric', month: 'numeric' })}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.rooms.map((room, r) => (
                <tr key={room.id} className="border-b border-ws-line-soft last:border-b-0">
                  <th scope="row" className="py-3 pr-3 pl-5 text-left text-[0.88rem] font-bold text-[var(--casa-ink)]">{room.name}</th>
                  {weeks.map((w) => {
                    const duty = plan.from ? weekPlan(plan.rooms, plan.duties, plan.from, w)[r] : null;
                    const who = tenant(room.id, w);
                    return (
                      <td key={w} className="py-2.5 pr-3 align-top">
                        {duty ? (
                          <span className={cn('inline-flex h-7 items-center rounded-full px-2.5 text-[0.8rem] font-bold ring-1 ring-inset', tone(duty))}>{pick(lang, duty.name)}</span>
                        ) : (
                          <span className="inline-flex h-7 items-center text-[0.8rem] font-semibold text-[var(--casa-text-subtle)]">{t('frei', 'free')}</span>
                        )}
                        <span className={cn('mt-1 block truncate text-[0.76rem]', who ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-text-subtle)] italic')}>{who ?? t('leer', 'empty')}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.95rem] font-extrabold text-[var(--casa-ink)]">{t('Dienste', 'Duties')}</h2>
        {canEdit ? (
          <FormDialog icon={Icon.calendar} tint="blue" trigger={t('Dienst hinzufügen', 'Add a duty')} title={t('Neuer Dienst', 'New duty')} size="sm">
            <DutyForm placeId={placeId} t={t} />
          </FormDialog>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plan.duties.map((duty, i) => (
          <section key={duty.id} className="flex flex-col rounded-2xl border border-ws-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <header className="flex items-center gap-2">
              <span className={cn('inline-flex h-7 items-center rounded-full px-2.5 text-[0.82rem] font-extrabold ring-1 ring-inset', tone(duty))}>{pick(lang, duty.name)}</span>
              <span className="text-[0.74rem] font-semibold text-[var(--casa-text-subtle)] tabular-nums">{i + 1}</span>
              {canEdit ? (
                <span className="ml-auto flex items-center gap-0.5">
                  <Move placeId={placeId} dutyId={duty.id} direction="up" disabled={i === 0} label={t('Nach vorn', 'Earlier')} />
                  <Move placeId={placeId} dutyId={duty.id} direction="down" disabled={i === plan.duties.length - 1} label={t('Nach hinten', 'Later')} />
                </span>
              ) : null}
            </header>
            <ul className="mt-3 flex-1 space-y-1.5">
              {duty.tasks.length ? (
                duty.tasks.map((task, k) => (
                  <li key={k} className="flex gap-2 text-[0.84rem] leading-snug text-[var(--casa-ink)]">
                    <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[var(--casa-text-subtle)]" />
                    {task}
                  </li>
                ))
              ) : (
                <li className="text-[0.84rem] text-[var(--casa-muted)]">{t('Noch keine Aufgaben.', 'No tasks yet.')}</li>
              )}
            </ul>
            {canEdit ? (
              <footer className="mt-3 flex items-center gap-2 border-t border-ws-line-soft pt-3">
                <FormDialog trigger={t('Ändern', 'Edit')} triggerVariant="ghost" size="sm" icon={Icon.calendar} tint="blue" title={pick(lang, duty.name)}>
                  <DutyForm placeId={placeId} duty={duty} t={t} />
                </FormDialog>
                {canDelete ? (
                  <form action={deleteDutyAction} className="ml-auto">
                    <input type="hidden" name="placeId" value={placeId} />
                    <input type="hidden" name="dutyId" value={duty.id} />
                    <ConfirmSubmit
                      variant="ghost"
                      title={t(`„${duty.nameDe}" löschen?`, `Delete “${duty.nameEn ?? duty.nameDe}”?`)}
                      description={t('Der Dienst und seine Aufgaben verschwinden aus dem Putzplan; die anderen rücken nach.', 'The duty and its tasks leave the plan; the others move up.')}
                      confirmLabel={t('Löschen', 'Delete')}
                    >
                      {t('Löschen', 'Delete')}
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </footer>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function Move({ placeId, dutyId, direction, disabled, label }: { placeId: string; dutyId: string; direction: 'up' | 'down'; disabled: boolean; label: string }) {
  return (
    <form action={moveDutyAction}>
      <input type="hidden" name="placeId" value={placeId} />
      <input type="hidden" name="dutyId" value={dutyId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        title={label}
        className="inline-flex size-7 items-center justify-center rounded-full text-[var(--casa-muted)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30 disabled:opacity-30 [&_svg]:size-3.5"
      >
        <span className={direction === 'up' ? '-rotate-90' : 'rotate-90'}>{Icon.chevronRight}</span>
      </button>
    </form>
  );
}

/** A duty's name in both languages and its tasks, one a line. */
function DutyForm({ placeId, duty, t }: { placeId: string; duty?: CleaningDuty; t: T }): ReactNode {
  const id = duty?.id ?? 'new';
  return (
    <form action={saveDutyAction} className="space-y-4">
      <input type="hidden" name="placeId" value={placeId} />
      {duty ? <input type="hidden" name="dutyId" value={duty.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Name', 'Name')} htmlFor={`duty-de-${id}`}>
          <Input id={`duty-de-${id}`} name="nameDe" required maxLength={80} defaultValue={duty?.nameDe ?? ''} placeholder={t('z. B. Küche', 'e.g. Küche')} />
        </Field>
        <Field label={t('Name auf Englisch', 'Name in English')} htmlFor={`duty-en-${id}`}>
          <Input id={`duty-en-${id}`} name="nameEn" maxLength={80} defaultValue={duty?.nameEn ?? ''} placeholder={t('z. B. Kitchen', 'e.g. Kitchen')} />
        </Field>
      </div>
      <Field label={t('Aufgaben, eine je Zeile', 'Tasks, one a line')} htmlFor={`duty-tasks-${id}`}>
        <Textarea id={`duty-tasks-${id}`} name="tasks" rows={6} defaultValue={duty?.tasks.join('\n') ?? ''} />
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}
