'use client';

import { useEffect, useRef, useState } from 'react';

import { openEntryTestsAction } from './actions';
import { DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Button } from '@/components/admin/ui';
import type { DayEntryTest } from '@/lib/admin/entry-tests';
import { SESSION_LABELS } from '@/lib/admin/day-plan-labels';
import { pick } from '@/lib/admin/i18n';
import { ENTRY_TESTS } from '@/lib/entry-test/tests';

/**
 * „Tests öffnen" (Rahman, 2026-10-22): an intensive start's A2, B1 and B1+ courses whose test is not open
 * yet — all of them at once, or the ones ticked — on the day or ahead of it (`when` names the day then). A
 * course's test is its session's sitting, so ticking one course opens it for the other courses of that test.
 */
export function OpenTestsDialog({ tests, day, when, from }: { tests: DayEntryTest[]; day: string; when?: string; from: 'day' | 'tests' }) {
  const { t, lang } = useWsLang();
  const waiting = tests.filter((x) => (!x.sitting || x.sitting.state === 'closed') && x.classes.length);
  const ids = waiting.flatMap((x) => x.classes.map((c) => c.dayId));
  const [scope, setScope] = useState<'all' | 'chosen'>('all');
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const allBox = useRef<HTMLInputElement>(null);

  const ticked = (id: string) => scope === 'all' || chosen.has(id);
  const count = scope === 'all' ? ids.length : ids.filter((id) => chosen.has(id)).length;
  const opening = waiting.filter((x) => x.classes.some((c) => ticked(c.dayId))).length;
  const some = count > 0 && count < ids.length;

  useEffect(() => {
    if (allBox.current) allBox.current.indeterminate = some;
  }, [some]);

  if (!ids.length) return null;

  const toggle = (id: string) => {
    const next = new Set(scope === 'all' ? ids : chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setScope('chosen');
    setChosen(next);
  };
  const toggleAll = () => {
    setScope('chosen');
    setChosen(count === ids.length ? new Set() : new Set(ids));
  };

  const option = 'flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-[0.82rem] font-semibold whitespace-nowrap text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)] has-[:checked]:bg-white has-[:checked]:text-[var(--casa-ink)] has-[:checked]:shadow-[0_1px_2px_rgba(16,24,40,0.08)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--casa-blue)]/30';
  const box = 'size-4 shrink-0 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]';

  return (
    <FormDialog
      trigger={when ? t(`Tests öffnen · ${when}`, `Open tests · ${when}`) : t('Tests öffnen', 'Open tests')}
      triggerVariant="primary"
      title={when ? t(`Tests öffnen · ${when}`, `Open tests · ${when}`) : t('Tests öffnen', 'Open tests')}
      icon={Icon.placement}
      tint="blue"
      width="md"
    >
      <form action={openEntryTestsAction} className="grid gap-4">
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="day" value={day} />
        <div role="radiogroup" aria-label={t('Kurse', 'Courses')} className="grid grid-cols-2 gap-0.5 rounded-xl bg-ws-sunk p-0.5">
          <label className={option}>
            <input type="radio" name="scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} className="sr-only" />
            {t('Alle Kurse', 'All courses')}
            <span className="tabular-nums opacity-60">{ids.length}</span>
          </label>
          <label className={option}>
            <input type="radio" name="scope" value="chosen" checked={scope === 'chosen'} onChange={() => setScope('chosen')} className="sr-only" />
            {t('Ausgewählte Kurse', 'Chosen courses')}
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-ws-line">
          <label className="flex cursor-pointer items-center gap-3 border-b border-ws-line-soft bg-ws-sunk/60 px-4 py-2.5 text-[0.84rem] font-semibold text-[var(--casa-ink)]">
            <input ref={allBox} type="checkbox" checked={count === ids.length} onChange={toggleAll} className={box} />
            {t('Alle auswählen', 'Select all')}
            <span className="ml-auto text-[0.78rem] font-medium text-[var(--casa-muted)] tabular-nums">{t(`${count} von ${ids.length}`, `${count} of ${ids.length}`)}</span>
          </label>
          <ul className="max-h-[22rem] divide-y divide-ws-line-soft overflow-y-auto">
            {waiting.map((x) => (
              <li key={`${x.session}-${x.test}`}>
                <p className="px-4 pt-2.5 pb-1 text-[0.74rem] font-semibold text-[var(--casa-muted)]">
                  {pick(lang, SESSION_LABELS[x.session])} · {x.title} · {t(`${ENTRY_TESTS[x.test].minutes} Min.`, `${ENTRY_TESTS[x.test].minutes} min`)}
                </p>
                <ul>
                  {x.classes.map((c) => (
                    <li key={c.dayId}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-[var(--ws-row-hover)]">
                        <input type="checkbox" name="dayId" value={c.dayId} checked={ticked(c.dayId)} onChange={() => toggle(c.dayId)} className={box} />
                        <span className="w-14 shrink-0 font-bold text-[var(--casa-ink)]">{c.label}</span>
                        <span className="min-w-0 truncate text-[0.82rem] text-[var(--casa-muted)]">
                          {[
                            x.classes.filter((o) => o.label === c.label).length > 1 ? t(`Gruppe ${c.groupIndex}`, `Group ${c.groupIndex}`) : null,
                            c.number ? `#${c.number}` : null,
                            c.roomName,
                            c.teacherName,
                            c.startsAt,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={!opening}>
            {opening === 1 ? t('1 Test öffnen', 'Open 1 test') : opening ? t(`${opening} Tests öffnen`, `Open ${opening} tests`) : t('Tests öffnen', 'Open tests')}
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}
