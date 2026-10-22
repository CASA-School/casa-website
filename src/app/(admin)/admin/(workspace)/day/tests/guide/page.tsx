import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { PrintSheet } from '../print-sheet';
import { QrPicture } from '@/components/admin/qr-code';
import { PageHeader } from '@/components/admin/ui';
import { entryTestLink, entryTestOrigin, sittingGuide } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { ENTRY_TEST_IDS, ENTRY_TESTS } from '@/lib/entry-test/tests';
import { qrPath } from '@/lib/qr';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const longDay = (day: string) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

/**
 * The teachers' guide to the day-one test (Rahman, 2026-10-22), replacing the paper „Leitfaden zur
 * Durchführung der Einstufungstests" of the Google version: the learners write on their phone, so writing
 * and typing in are no longer two steps. Without a sitting it is the general guide with each test's time;
 * with one (`?sitting=`) it carries that test's day, classes, code and QR code, to print or send to its
 * teachers as a PDF ahead of the start. German, as the booklets; one A4 page.
 */
export default async function EntryTestGuidePage({ searchParams }: { searchParams: Promise<{ sitting?: string }> }) {
  const [{ sitting: sittingId }] = await Promise.all([searchParams, requireModule('day')]);
  const { t } = await getI18n();
  const focus = sittingId && UUID.test(sittingId) ? await sittingGuide(sittingId) : null;
  if (sittingId && !focus) notFound();
  const origin = await entryTestOrigin();
  const link = focus ? entryTestLink(origin, focus.test.test) : `${origin}/test`;
  const meta = focus ? ENTRY_TESTS[focus.test.test] : null;
  const title = focus ? `Leitfaden ${focus.test.title} ${focus.day}` : 'Leitfaden Einstufungstest Tag 1';
  const times = ENTRY_TEST_IDS.map((id) => `${ENTRY_TESTS[id].course} ${ENTRY_TESTS[id].minutes} Min.`).join(' · ');

  return (
    <>
      <PageHeader
        backHref="/admin/day/tests"
        backLabel={t('Einstufungstests', 'Placement tests')}
        title={focus ? t(`Leitfaden · ${focus.test.title}`, `Guide · ${focus.test.title}`) : t('Leitfaden für Lehrkräfte', 'Guide for teachers')}
      />
      <PrintSheet name={title}>
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

          {focus && meta ? (
            <section className="mt-4 flex flex-wrap items-center gap-6 rounded-2xl border border-[#d9e0ea] bg-[#f5f8fb] px-5 py-4 print:break-inside-avoid">
              <div className="min-w-0 flex-1">
                <p className="text-[9.5pt] font-semibold text-[#5b6b82]">
                  {longDay(focus.day)} · {focus.test.session === 'morning' ? 'Vormittag' : 'Nachmittag'}
                </p>
                <p className="mt-1 text-[14.5pt] leading-tight font-extrabold">{focus.test.title}</p>
                <p className="mt-0.5 text-[10pt] text-[#4b5563]">
                  Kurs {meta.course} · prüft {meta.checks} · {focus.sitting.minutes} Minuten
                </p>
                <ul className="mt-2 grid gap-0.5 text-[10pt]">
                  {focus.test.classes.map((c) => (
                    <li key={c.dayId}>
                      <span className="font-bold">{c.label}</span>
                      <span className="text-[#4b5563]">
                        {' · '}
                        {[
                          focus.test.classes.filter((o) => o.label === c.label).length > 1 ? `Gruppe ${c.groupIndex}` : null,
                          c.roomName,
                          c.teacherName,
                          c.startsAt,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 inline-flex items-baseline gap-3 rounded-xl bg-white px-4 py-2 ring-1 ring-[#d9e0ea]">
                  <span className="text-[9.5pt] font-semibold text-[#5b6b82]">Code für die Lehrkraft</span>
                  <span className="text-[22pt] leading-none font-extrabold tracking-[0.2em] tabular-nums">{focus.sitting.code}</span>
                </div>
              </div>
              <div className="shrink-0 text-center">
                <QrPicture qr={qrPath(link)} label={link} className="mx-auto aspect-square w-[36mm] rounded-lg" />
              </div>
            </section>
          ) : (
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
          )}

          <ol className="mt-5 grid gap-3">
            <Step n={1} title="Vorbereiten">
              <li>Den QR-Code an die Tafel projizieren oder ausgedruckt aufhängen.</li>
              <li>Wer kein funktionierendes Handy hat, schreibt auf Papier: Testheft A oder B aus dem Büro, im Wechsel ausgeteilt, und einen Bleistift.</li>
            </Step>
            <Step n={2} title="Starten">
              <li>Den QR-Code scannen.</li>
              <li>Vor- und Nachnamen und die E-Mail-Adresse der Anmeldung eingeben – so kommt das Ergebnis zur richtigen Person.</li>
              <li>Version A und B wechseln sich von selbst ab, und die Antworten stehen bei allen in anderer Reihenfolge.</li>
            </Step>
            <Step n={3} title={focus ? `Während des Tests · ${focus.sitting.minutes} Minuten` : `Während des Tests · ${times}`}>
              <li>Die Zeit läuft auf dem Handy; bei 0:00 wird der Test von selbst abgegeben.</li>
              <li>Wer die Seite verlässt (andere App, Bildschirm aus), wird pausiert. Die Lehrkraft gibt den Code ein, dann geht es weiter – die Zeit läuft dabei weiter.</li>
              <li>Den Code nicht an die Teilnehmenden weitergeben.</li>
            </Step>
            <Step n={4} title="Nach dem Test">
              <li>Die Teilnehmenden sehen kein Ergebnis.</li>
              <li>Alle Testhefte aus Papier einsammeln und ins Büro bringen; das Büro trägt sie ein.</li>
              <li>Das Büro sieht die Ergebnisse sofort.</li>
            </Step>
            <Step n={5} title="Ergebnisse besprechen">
              <li>Die Ergebnisse mit Studienleitung, Büro und Teilnehmenden besprechen.</li>
              <li>Zurückgestufte Teilnehmende in die Übersichtstabelle zum Kursstart eintragen.</li>
            </Step>
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
