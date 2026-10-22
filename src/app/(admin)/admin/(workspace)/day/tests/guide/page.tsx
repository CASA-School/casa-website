import type { ReactNode } from 'react';

import { PrintSheet } from '../print-sheet';
import { Icon } from '@/components/admin/icons';
import { ButtonLink, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { guideSteps } from '@/lib/entry-test/guide';
import { ENTRY_TEST_IDS, ENTRY_TESTS } from '@/lib/entry-test/tests';

/**
 * The teachers' guide to the day-one test (Rahman, 2026-10-22), replacing the paper „Leitfaden zur
 * Durchführung der Einstufungstests" of the Google version: the learners write on their phone, so writing
 * and typing in are no longer two steps. The guide alone — each test's time and the steps; the QR code
 * (`/qr`) and the teachers' code (`/codes`) are pages of their own, so nobody mixes them up. German, as
 * the booklets; one A4 page.
 */
export default async function EntryTestGuidePage() {
  const user = await requireModule('day');
  const { t } = await getI18n();
  const times = ENTRY_TEST_IDS.map((id) => `${ENTRY_TESTS[id].course} ${ENTRY_TESTS[id].minutes} Min.`).join(' · ');

  return (
    <>
      <PageHeader
        backHref="/admin/day/tests"
        backLabel={t('Einstufungstests', 'Placement tests')}
        title={t('Leitfaden für Lehrkräfte', 'Guide for teachers')}
      />
      <PrintSheet
        name="Leitfaden Einstufungstest Tag 1"
        actions={
          canAccess(user, 'day', 'edit') ? (
            <ButtonLink href="/admin/day/tests/mail" variant="secondary">
              {Icon.mail}
              {t('Als E-Mail an Lehrkräfte', 'Email to the teachers')}
            </ButtonLink>
          ) : null
        }
      >
        <div className="text-[10.5pt] leading-snug text-[#111827]">
          <header className="flex items-end justify-between gap-6 border-b border-[#d9e0ea] pb-4">
            <div
              role="img"
              aria-label="CASA Internationale Sprachschule"
              className="aspect-[1155/325] w-[44mm] max-w-[40%] bg-contain bg-left bg-no-repeat"
              style={{ backgroundImage: 'url(/brand/casa-logo.png)' }}
            />
            <p className="text-right text-[9.5pt] font-semibold text-[#5b6b82]">Leitfaden für Lehrkräfte</p>
          </header>

          <h1 className="mt-4 text-[21pt] leading-tight font-extrabold tracking-[-0.01em]">Einstufungstest Tag 1</h1>
          <p className="mt-1.5 max-w-[150mm] text-[10.5pt] text-[#4b5563]">
            Am ersten Tag eines Intensivkurses schreiben die neuen Teilnehmenden der Kurse A2, B1 und B1+ einen kurzen Test auf dem Handy, im
            Unterricht.
          </p>

            <section className="mt-4 grid grid-cols-3 gap-3 print:break-inside-avoid">
              {ENTRY_TEST_IDS.map((id) => (
                <div key={id} className="rounded-2xl border border-[#d9e0ea] bg-[#f5f8fb] px-4 py-3.5">
                  <p className="text-[9.5pt] font-semibold text-[#5b6b82]">
                    Kurs {ENTRY_TESTS[id].course} · prüft {ENTRY_TESTS[id].checks}
                  </p>
                  <p className="mt-1 text-[20pt] leading-none font-extrabold tabular-nums">
                    {ENTRY_TESTS[id].minutes}
                    <span className="ml-1 text-[11pt] font-bold text-[#4b5563]">Minuten</span>
                  </p>
                </div>
              ))}
            </section>

          <ol className="mt-5 grid gap-3">
            {guideSteps(times).map((step, i) => (
              <Step key={step.title} n={i + 1} title={step.title}>
                {step.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </Step>
            ))}
          </ol>

          <footer className="mt-5 border-t border-[#d9e0ea] pt-3 text-[8.5pt] text-[#6b7a90]">CASA Internationale Sprachschule Bremen · Einstufungstest Tag 1</footer>
        </div>
      </PrintSheet>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.1rem_1fr] gap-3 print:break-inside-avoid">
      <span className="flex size-[1.9rem] items-center justify-center rounded-full bg-[#1d2f4f] text-[10.5pt] font-extrabold text-white" style={{ printColorAdjust: 'exact' }}>
        {n}
      </span>
      <div>
        <h2 className="text-[11.5pt] leading-[1.9rem] font-extrabold">{title}</h2>
        <ul className="grid list-disc gap-0.5 pl-4 text-[10pt] text-[#1f2937] marker:text-[#8a99ae]">{children}</ul>
      </div>
    </li>
  );
}
