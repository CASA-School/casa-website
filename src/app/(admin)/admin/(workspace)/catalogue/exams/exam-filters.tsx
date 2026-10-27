'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Select } from '@/components/admin/menu-select';
import { SidePanel } from '@/components/admin/side-panel';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

type Chip = { value: string; label: string };

/**
 * The Prüfungen list's filters at the side, as Buchungen has them (2026-10-27): the exam, the month, the
 * places, who examines, and whether every candidate is reported to telc. Applied as the list's address, so
 * the tabs and the search keep them and a filtered list can be shared; each one in force is a label above
 * the list with its ×.
 */
export function ExamFilters({
  base,
  exam,
  month,
  places,
  examiner,
  filed,
  exams,
  months,
  examiners,
}: {
  /** What the filters keep: the view and the search. */
  base: Record<string, string | undefined>;
  exam?: string;
  month?: string;
  places?: string;
  examiner?: string;
  filed?: string;
  exams: readonly { id: string; name: string }[];
  /** `YYYY-MM` with its words, newest first. */
  months: readonly { value: string; label: string; year: string }[];
  examiners: readonly { id: string; name: string }[];
}) {
  const { t } = useWsLang();
  const [open, setOpen] = useState(false);
  const [chosenPlaces, setChosenPlaces] = useState(places ?? '');
  const [chosenFiled, setChosenFiled] = useState(filed ?? '');
  const active = [exam, month, places, examiner, filed].filter(Boolean).length;
  const reset = `/admin/catalogue/exams${(() => {
    const q = new URLSearchParams(Object.entries(base).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    return q ? `?${q}` : '';
  })()}`;
  const years = [...new Set(months.map((m) => m.year))];

  return (
    <SidePanel
      open={open}
      onOpenChange={setOpen}
      trigger={
        <span className="inline-flex items-center gap-1.5">
          {Icon.settings}
          {t('Filter', 'Filters')}
          {active ? (
            <span className="ml-0.5 inline-grid min-w-[1.15rem] place-items-center rounded-full bg-[var(--fm-navy)] px-1 text-[0.68rem] font-bold text-white tabular-nums">{active}</span>
          ) : null}
        </span>
      }
      triggerClassName="inline-flex h-8 items-center rounded-lg px-2.5 text-[0.82rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line transition-colors ring-inset outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-3.5 [&_svg]:text-[var(--casa-muted)]"
      title={t('Prüfungstermine filtern', 'Filter sittings')}
      icon={Icon.award}
      tint="red"
      footer={
        <span className="flex w-full items-center justify-between gap-2">
          <Link href={reset} className="text-[0.84rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)]">
            {t('Zurücksetzen', 'Reset')}
          </Link>
          <Button type="submit" form="exam-filters" size="md">
            {t('Anwenden', 'Apply')}
          </Button>
        </span>
      }
    >
      <form id="exam-filters" action="/admin/catalogue/exams" method="get" onSubmit={() => setOpen(false)} className="space-y-5 px-6 py-5">
        {Object.entries(base).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
        <label className="block">
          <span className={LABEL}>{t('Prüfung', 'Exam')}</span>
          <Select name="exam" defaultValue={exam ?? ''}>
            <option value="">{t('Alle Prüfungen', 'All exams')}</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className={LABEL}>{t('Monat', 'Month')}</span>
          <Select name="month" defaultValue={month ?? ''}>
            <option value="">{t('Alle Monate', 'All months')}</option>
            {years.map((year) => (
              <optgroup key={year} label={year}>
                {months
                  .filter((m) => m.year === year)
                  .map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </label>
        <Chips
          legend={t('Plätze', 'Places')}
          name="places"
          value={chosenPlaces}
          onChange={setChosenPlaces}
          choices={[
            { value: '', label: t('Alle', 'All') },
            { value: 'free', label: t('Frei', 'Free') },
            { value: 'full', label: t('Voll', 'Full') },
            { value: 'waiting', label: t('Mit Warteliste', 'With a waiting list') },
          ]}
        />
        <label className="block">
          <span className={LABEL}>{t('Prüfende', 'Examiners')}</span>
          <Select name="examiner" defaultValue={examiner ?? ''}>
            <option value="">{t('Alle', 'All')}</option>
            <option value="none">{t('Noch ohne Prüfende', 'No examiner yet')}</option>
            {examiners.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
        </label>
        <Chips
          legend={t('Meldung an telc', 'Report to telc')}
          name="filed"
          value={chosenFiled}
          onChange={setChosenFiled}
          choices={[
            { value: '', label: t('Alle', 'All') },
            { value: 'open', label: t('Noch nicht alle gemeldet', 'Not everyone reported') },
          ]}
        />
      </form>
    </SidePanel>
  );
}

const LABEL = 'mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]';

/** One choice of a few, as pills: the value travels in a hidden field. */
function Chips({ legend, name, value, onChange, choices }: { legend: string; name: string; value: string; onChange: (value: string) => void; choices: readonly Chip[] }) {
  return (
    <fieldset>
      <legend className={LABEL}>{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <span className="flex flex-wrap gap-1.5">
        {choices.map((c) => (
          <button
            key={c.value || 'all'}
            type="button"
            aria-pressed={value === c.value}
            onClick={() => onChange(c.value)}
            className={cn(
              'inline-flex h-8 items-center rounded-full px-3 text-[0.82rem] font-semibold ring-1 transition-colors ring-inset outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
              value === c.value ? 'bg-[var(--fm-navy)] text-white ring-[var(--fm-navy)]' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
            )}
          >
            {c.label}
          </button>
        ))}
      </span>
    </fieldset>
  );
}
