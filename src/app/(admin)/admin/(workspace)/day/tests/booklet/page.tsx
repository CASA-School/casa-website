import { notFound } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';

import { PrintSheet } from '../print-sheet';
import { PageHeader } from '@/components/admin/ui';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { CONTENT } from '@/lib/entry-test/content';
import { ENTRY_TESTS, isEntryTestId, slotKinds } from '@/lib/entry-test/tests';
import type { Choice, McTask, ReadingTask } from '@/lib/entry-test/types';

/**
 * The paper booklet of a test's Version A or B (2026-10-20), for the learner without a working phone:
 * printed from the same questions the phones show, so paper and phone never differ — the four items the
 * teachers' review changed (docs/ENTRY_TEST.md) are on paper as on the phone. The office types the crosses
 * into the panel („Papierbogen eintragen") and it is marked like a phone. Questions only, no answers.
 */
export default async function EntryTestBookletPage({ searchParams }: { searchParams: Promise<{ kurs?: string; version?: string }> }) {
  const [{ kurs, version }] = await Promise.all([searchParams, requireModule('day')]);
  if (!isEntryTestId(kurs) || (version !== 'A' && version !== 'B')) notFound();
  const { t } = await getI18n();
  const test = ENTRY_TESTS[kurs];
  const tasks = CONTENT[kurs][version];
  const answers = slotKinds(tasks).length;
  return (
    <>
      <PageHeader
        backHref="/admin/day/tests"
        backLabel={t('Einstufungstests', 'Placement tests')}
        title={t(`Testheft ${test.title} · Version ${version}`, `Booklet ${test.title} · version ${version}`)}
      />
      <PrintSheet name={`${test.title} Version ${version}`}>
        <div className="text-[10.5pt] leading-snug text-[#111827]">
          <div className="flex items-end justify-between border-b-2 border-[#111827] pb-2">
            <div className="flex items-baseline gap-3">
              <span className="font-[family-name:var(--font-display)] text-[1.45rem] leading-none font-semibold tracking-[0.06em]">CASA</span>
              <span className="text-[1.05rem] font-extrabold">{test.title}</span>
            </div>
            <span className="rounded border-2 border-[#111827] px-2.5 py-0.5 text-[0.95rem] font-extrabold tracking-[0.04em]">
              {test.course} / VERSION {version}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 text-[0.85rem]">
            {['Name', 'Datum', 'Kurs', 'Lehrkraft'].map((label) => (
              <div key={label} className="flex items-end gap-2">
                <span className="font-semibold">{label}</span>
                <span className="h-0 flex-1 border-b border-[#6b7280]" />
              </div>
            ))}
          </div>
          <div className="mt-5 rounded border border-[#d1d5db] bg-[#f9fafb] px-3.5 py-2.5 text-[0.82rem]">
            <p className="font-bold">Hinweise</p>
            <p>
              {tasks.length} Aufgaben, {answers} Antworten. Kreuzen Sie bei jeder Aufgabe eine Antwort an: A, B, C oder D. Bei den Leseaufgaben kreuzen Sie bei jeder Aussage
              richtig oder falsch an. Arbeiten Sie allein, ohne Handy und ohne Wörterbuch.
            </p>
          </div>
          <div className="mt-5 columns-2 gap-8">
            {tasks.map((task) => (task.type === 'mc' ? <McBlock key={task.n} task={task} /> : <ReadingBlock key={task.n} task={task} />))}
          </div>
        </div>
      </PrintSheet>
    </>
  );
}

const number = (n: number) => `Aufgabe ${String(n).padStart(2, '0')}`;

/** A prompt line with its gaps drawn as lines to write on. */
function Line({ text }: { text: string }) {
  const parts = text.split(/_{4,}/);
  return (
    <p>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? <span className="mx-0.5 inline-block w-[5.5em] border-b border-[#111827] align-baseline" /> : null}
        </Fragment>
      ))}
    </p>
  );
}

function Box({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span aria-hidden="true" className="inline-block size-[0.8em] translate-y-[0.08em] border border-[#111827]" />
      {children}
    </span>
  );
}

function McBlock({ task }: { task: McTask }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <p className="mb-1 text-[0.82rem] font-extrabold tracking-[0.02em]">{number(task.n)}</p>
      <div className="space-y-0.5">
        {task.prompt.map((line, i) => (
          <Line key={i} text={line} />
        ))}
      </div>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
        {(['A', 'B', 'C', 'D'] as Choice[]).map((id) => (
          <li key={id}>
            <Box>
              <span className="font-bold">{id}</span> {task.options[id]}
            </Box>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadingBlock({ task }: { task: ReadingTask }) {
  return (
    <section className="mb-5 break-inside-avoid [column-span:all]">
      <p className="mb-1 text-[0.82rem] font-extrabold tracking-[0.02em]">{number(task.n)} | Lesen</p>
      {task.intro ? <p className="mb-2 italic">{task.intro}</p> : null}
      <div className="rounded border border-[#d1d5db] px-3.5 py-2.5">
        <p className="mb-1.5 font-bold">{task.title}</p>
        <div className="space-y-1.5">
          {task.text.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
      <ol className="mt-2 space-y-1.5">
        {task.statements.map((statement, i) => (
          <li key={i} className="flex items-baseline gap-4">
            <span className="flex-1">
              {i + 1}. {statement}
            </span>
            <Box>richtig</Box>
            <Box>falsch</Box>
          </li>
        ))}
      </ol>
    </section>
  );
}
