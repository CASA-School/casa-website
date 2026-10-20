'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { closeEntryTestAction, deleteAttemptAction, enterPaperAction, handInAttemptAction, openEntryTestAction, releaseAttemptAction } from './actions';
import { ConfirmSubmit, DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { QrCode, shortLink } from '@/components/admin/qr-code';
import { useWsLang } from '@/components/admin/lang';
import { SidePanel } from '@/components/admin/side-panel';
import { Button, ButtonLink, Field, IconChip, Input } from '@/components/admin/ui';
import type { EntryTestAttempt, EntryTestView, SittingDetail } from '@/lib/admin/entry-tests';
import { SESSION_LABELS } from '@/lib/admin/day-plan-labels';
import { pick, type T } from '@/lib/admin/i18n';
import { DEFAULT_MINUTES } from '@/lib/entry-test/tests';
import { cn } from '@/lib/utils';

/**
 * The day-one test in the Tagesplan (0075, docs/ENTRY_TEST.md): on the first day of an intensive start,
 * one line per test and session — the A2 classes write the A1 test, B1 the A2 test, B1+ the B1 test. The
 * line opens the test at the side: open it, give the teachers its code, watch the phones, let a paused one
 * go on, type in a paper booklet, download the results.
 */

/** A day's tests: on the Tagesplan of a test day, and per day in the archive (`heading` names the day there). */
export function EntryTestCard({
  tests,
  day,
  isToday,
  canEdit,
  canDelete,
  heading,
  archived = false,
}: {
  tests: EntryTestView[];
  day: string;
  isToday: boolean;
  canEdit: boolean;
  canDelete: boolean;
  heading?: string;
  /** A day that is over: its tests are closed and in the archive. */
  archived?: boolean;
}) {
  const { t, lang } = useWsLang();
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex items-center gap-2.5 border-b border-ws-line-soft px-5 py-3.5">
        <IconChip icon={Icon.placement} tint="blue" />
        <h2 className="text-[0.95rem] font-extrabold text-[var(--casa-ink)]">{heading ?? t('Einstufungstest', 'Placement test')}</h2>
        <span className="ml-auto flex items-center gap-2">
          {tests.some((x) => x.detail?.attempts.length) ? (
            <ButtonLink href={`/admin/day/entry-test/export?date=${day}`} plain variant="ghost" size="sm">
              {Icon.download}
              {t('Excel des Tages', 'The day’s Excel')}
            </ButtonLink>
          ) : null}
          {heading ? null : (
            <ButtonLink href="/admin/day/tests" variant="ghost" size="sm">
              {t('Archiv', 'Archive')}
            </ButtonLink>
          )}
        </span>
      </header>
      <ul className="divide-y divide-ws-line-soft">
        {tests.map((test) => (
          <li key={`${test.session}-${test.test}`}>
            <SidePanel
              triggerClassName="block w-full text-left outline-none transition-colors hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]"
              trigger={<TestLine test={test} archived={archived} t={t} lang={lang} />}
              title={test.title}
              subtitle={`${pick(lang, SESSION_LABELS[test.session])} · ${t(`Kurs ${test.course} · prüft ${test.checks}`, `${test.course} course · checks ${test.checks}`)}`}
              icon={Icon.placement}
              tint="blue"
              width="lg"
              footer={<PanelFoot test={test} day={day} canEdit={canEdit} />}
            >
              <TestPanel test={test} day={day} isToday={isToday} archived={archived} canEdit={canEdit} canDelete={canDelete} />
            </SidePanel>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TestLine({ test, archived, t, lang }: { test: EntryTestView; archived: boolean; t: T; lang: 'de' | 'en' }) {
  const s = test.sitting;
  const groups = test.classes.length;
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
      <span className="w-[6.5rem] shrink-0 text-[0.8rem] font-semibold text-[var(--casa-muted)]">{pick(lang, SESSION_LABELS[test.session])}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-[var(--casa-ink)]">{test.title}</span>
        <span className="block truncate text-[0.8rem] text-[var(--casa-muted)]">
          {[
            [...new Set(test.classes.map((c) => c.label))].join(', '),
            groups === 1 ? t('1 Gruppe', '1 group') : groups ? t(`${groups} Gruppen`, `${groups} groups`) : null,
            [...new Set(test.classes.map((c) => c.roomName).filter(Boolean))].join(', ') || null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className="flex items-center gap-3 text-[0.8rem] tabular-nums">
        {s ? (
          <span className="text-[var(--casa-muted)]">
            {[
              s.running ? t(`${s.running} läuft`, `${s.running} writing`) : null,
              s.paused ? t(`${s.paused} pausiert`, `${s.paused} paused`) : null,
              s.handedIn ? t(`${s.handedIn} abgegeben`, `${s.handedIn} handed in`) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        ) : null}
        <StatePill test={test} archived={archived} t={t} />
        <span aria-hidden="true" className="text-[var(--casa-text-subtle)] [&_svg]:size-4">
          {Icon.chevronRight}
        </span>
      </span>
    </span>
  );
}

function StatePill({ test, archived, t }: { test: EntryTestView; archived: boolean; t: T }) {
  const s = test.sitting;
  const open = s?.state === 'open';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[0.72rem] font-bold whitespace-nowrap',
        open ? 'bg-[#e6f4ea] text-[#1e6b34]' : 'bg-ws-sunk text-[var(--casa-muted)]'
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', open ? 'bg-[#2e9e4f]' : 'bg-[var(--casa-text-subtle)]')} />
      {open ? t(`Offen · Code ${s.code}`, `Open · code ${s.code}`) : archived && s ? t('Archiviert', 'Archived') : s ? t('Geschlossen', 'Closed') : t('Nicht geöffnet', 'Not opened')}
    </span>
  );
}

/** While the panel is open and phones are writing, it reads the attempts again every few seconds. */
function LiveRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(timer);
  }, [active, router]);
  return null;
}

function TestPanel({ test, day, isToday, archived, canEdit, canDelete }: { test: EntryTestView; day: string; isToday: boolean; archived: boolean; canEdit: boolean; canDelete: boolean }) {
  const { t } = useWsLang();
  const detail = test.detail;
  const live = !!detail && (detail.state === 'open' || detail.attempts.some((a) => a.status === 'running' || a.status === 'paused'));
  const attempts = detail?.attempts ?? [];
  const handedIn = attempts.filter((a) => a.status === 'submitted' || a.status === 'expired');
  return (
    <>
      <LiveRefresh active={live} />
      <Section title={t('Test', 'Test')}>
        {detail?.state === 'open' ? (
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-2">
            <QrCode qr={test.qr} label={test.link} className="size-28 shrink-0" />
            <div className="mr-auto">
              <p className="text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Code für die Lehrkräfte', 'Code for the teachers')}</p>
              <p className="text-[2rem] leading-tight font-extrabold tracking-[0.18em] text-[var(--casa-ink)] tabular-nums" data-testid="entry-test-code">
                {detail.code}
              </p>
              <p className="text-[0.84rem] text-[var(--casa-muted)]">
                {shortLink(test.link)} · {t(`${detail.minutes} Minuten`, `${detail.minutes} minutes`)}
              </p>
            </div>
            {canEdit ? (
              <form action={closeEntryTestAction}>
                <input type="hidden" name="sittingId" value={detail.id} />
                <input type="hidden" name="day" value={day} />
                <Button type="submit" variant="secondary" size="sm">
                  {t('Test schließen', 'Close the test')}
                </Button>
              </form>
            ) : null}
          </div>
        ) : canEdit && isToday ? (
          <form action={openEntryTestAction} className="flex flex-wrap items-end gap-3 px-6 py-2">
            <input type="hidden" name="day" value={day} />
            <input type="hidden" name="session" value={test.session} />
            <input type="hidden" name="test" value={test.test} />
            <Field label={t('Minuten', 'Minutes')} htmlFor={`minutes-${test.session}-${test.test}`} className="w-24">
              <Input id={`minutes-${test.session}-${test.test}`} name="minutes" type="number" min={5} max={180} defaultValue={detail?.minutes ?? DEFAULT_MINUTES} />
            </Field>
            <Button type="submit" variant="primary">
              {detail ? t('Wieder öffnen', 'Open again') : t('Test öffnen', 'Open the test')}
            </Button>
          </form>
        ) : (
          <Quiet>{detail ? (archived ? t('Archiviert.', 'Archived.') : t('Geschlossen.', 'Closed.')) : t('Nicht geöffnet.', 'Not opened.')}</Quiet>
        )}
      </Section>

      <Section title={t('Drucken', 'Print')}>
        <div className="flex flex-wrap gap-2 px-6 py-1">
          {(['A', 'B'] as const).map((v) => (
            <ButtonLink key={v} href={`/admin/day/tests/booklet?kurs=${test.test}&version=${v}`} variant="secondary" size="sm">
              {t(`Testheft ${v}`, `Booklet ${v}`)}
            </ButtonLink>
          ))}
          <ButtonLink href={`/admin/day/tests/qr?kurs=${test.test}`} variant="secondary" size="sm">
            {t('QR-Code', 'QR code')}
          </ButtonLink>
        </div>
      </Section>

      <Section title={t('Klassen', 'Classes')}>
        <ul>
          {test.classes.map((c) => (
            <li key={c.dayId}>
              <Link
                href={`/admin/catalogue/courses/${c.courseId}${c.groupIndex > 1 ? `/${c.groupIndex}` : ''}`}
                className="flex items-baseline gap-3 px-6 py-1.5 text-[0.86rem] outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]"
              >
                <span className="font-bold text-[var(--casa-ink)]">{c.label}</span>
                {c.number ? <span className="text-[var(--casa-muted)] tabular-nums">#{c.number}</span> : null}
                <span className="min-w-0 flex-1 truncate text-[var(--casa-muted)]">{[c.startsAt, c.roomName, c.teacherName].filter(Boolean).join(' · ')}</span>
              </Link>
            </li>
          ))}
          {test.classes.length ? null : <Quiet>{t('Keine Klasse an diesem Tag.', 'No class on this day.')}</Quiet>}
        </ul>
      </Section>

      <Section title={attempts.length ? t(`Teilnehmende · ${handedIn.length} von ${attempts.length} abgegeben`, `Learners · ${handedIn.length} of ${attempts.length} handed in`) : t('Teilnehmende', 'Learners')}>
        {attempts.length ? (
          <ul className="divide-y divide-ws-line-soft">
            {attempts.map((a) => (
              <AttemptLine key={a.id} attempt={a} day={day} canEdit={canEdit} canDelete={canDelete} />
            ))}
          </ul>
        ) : (
          <Quiet>{t('Noch niemand.', 'Nobody yet.')}</Quiet>
        )}
      </Section>
    </>
  );
}

function PanelFoot({ test, day, canEdit }: { test: EntryTestView; day: string; canEdit: boolean }) {
  const { t } = useWsLang();
  const detail = test.detail;
  if (!detail) return undefined;
  return (
    <span className="flex flex-wrap gap-2">
      {canEdit ? <PaperForm key={detail.attempts.length} test={test} detail={detail} day={day} /> : null}
      {detail.attempts.length ? (
        <ButtonLink href={`/admin/day/entry-test/export?date=${day}&sitting=${detail.id}`} plain variant="secondary" size="sm">
          {Icon.download}
          {t('Excel', 'Excel')}
        </ButtonLink>
      ) : null}
    </span>
  );
}

const DOT: Record<EntryTestAttempt['status'], string> = { running: 'bg-[var(--casa-blue)]', paused: 'bg-[#d99a00]', submitted: 'bg-[#2e9e4f]', expired: 'bg-[#2e9e4f]' };

function AttemptLine({ attempt: a, day, canEdit, canDelete }: { attempt: EntryTestAttempt; day: string; canEdit: boolean; canDelete: boolean }) {
  const { t } = useWsLang();
  const handedIn = a.status === 'submitted' || a.status === 'expired';
  const [now] = useState(() => Date.now());
  const left = a.deadline ? Math.max(0, Math.ceil((new Date(a.deadline).getTime() - now) / 60000)) : null;
  const status =
    a.status === 'running'
      ? t(`schreibt · ${a.answered}/${a.slots}${left !== null ? ` · noch ${left} Min.` : ''}`, `writing · ${a.answered}/${a.slots}${left !== null ? ` · ${left} min left` : ''}`)
      : a.status === 'paused'
        ? t(`pausiert · ${a.answered}/${a.slots}`, `paused · ${a.answered}/${a.slots}`)
        : `${a.score}/${a.max} · ${Math.round(((a.score ?? 0) / Math.max(a.max ?? 1, 1)) * 100)} %`;
  const notes = [
    a.source === 'paper' ? t('Papier', 'Paper') : null,
    a.status === 'expired' ? t('Zeit abgelaufen', 'Time up') : null,
    a.interruptions ? t(`${a.interruptions}× verlassen`, `left ${a.interruptions}×`) : null,
    handedIn && a.blank ? t(`${a.blank} leer`, `${a.blank} blank`) : null,
  ].filter(Boolean);
  return (
    <li className="px-6 py-2.5" data-testid="entry-test-attempt">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[a.status])} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold text-[var(--casa-ink)]">{a.name}</span>
            <span className={cn('text-[0.84rem] tabular-nums', handedIn ? 'font-bold text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>{status}</span>
          </p>
          <p className="truncate text-[0.78rem] text-[var(--casa-muted)]">
            {[
              a.personId ? null : a.email,
              ...notes,
              handedIn ? t(`Aufgaben ${a.grammar}/${a.grammarMax} · Lesen ${a.reading}/${a.readingMax} · Version ${a.version}`, `Tasks ${a.grammar}/${a.grammarMax} · reading ${a.reading}/${a.readingMax} · version ${a.version}`) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {a.personId ? (
            <Link href={`/admin/people/${a.personId}?tab=tests`} className="text-[0.78rem] font-semibold text-[var(--casa-accent-text)] hover:underline">
              {a.personName}
            </Link>
          ) : handedIn ? (
            <p className="text-[0.78rem] text-[#9a6700]">{t('Keinem Lernenden zugeordnet', 'Not matched to a learner')}</p>
          ) : null}
        </div>
        {canEdit && !handedIn ? (
          <span className="flex shrink-0 gap-1.5">
            {a.status === 'paused' ? (
              <form action={releaseAttemptAction}>
                <input type="hidden" name="attemptId" value={a.id} />
                <input type="hidden" name="day" value={day} />
                <Button type="submit" variant="secondary" size="sm">
                  {t('Freigeben', 'Release')}
                </Button>
              </form>
            ) : null}
            <form action={handInAttemptAction}>
              <input type="hidden" name="attemptId" value={a.id} />
              <input type="hidden" name="day" value={day} />
              <ConfirmSubmit
                variant="ghost"
                title={t('Jetzt abgeben?', 'Hand in now?')}
                description={t(`${a.name}s Test wird mit den gespeicherten Antworten abgegeben (${a.answered} von ${a.slots}).`, `${a.name}'s test is handed in with the saved answers (${a.answered} of ${a.slots}).`)}
                confirmLabel={t('Ja, abgeben', 'Yes, hand in')}
              >
                {t('Abgeben', 'Hand in')}
              </ConfirmSubmit>
            </form>
          </span>
        ) : null}
      </div>
      {a.marks || a.log.length ? (
        <details className="mt-1.5 ml-5 text-[0.8rem]">
          <summary className="cursor-pointer text-[var(--casa-muted)] select-none hover:text-[var(--casa-ink)]">{a.marks ? t('Antworten und Verlauf', 'Answers and log') : t('Verlauf', 'Log')}</summary>
          {a.marks ? (
            <ol className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1">
              {a.marks.map((m, i) => (
                <li
                  key={i}
                  title={m.mark === 'right' ? undefined : t(`Lösung: ${m.solution}`, `Answer: ${m.solution}`)}
                  className={cn('rounded px-1.5 py-0.5 tabular-nums', m.mark === 'right' ? 'bg-[#e6f4ea] text-[#1e6b34]' : m.mark === 'wrong' ? 'bg-[#fdecec] text-[#9b1c1c]' : 'bg-ws-sunk text-[var(--casa-muted)]')}
                >
                  <span className="font-bold">{m.label}</span> {m.given ? (m.given.length > 1 ? m.given.slice(0, 1) : m.given) : '–'}
                  {m.mark === 'wrong' ? <span className="opacity-70"> ({m.solution.length > 1 ? m.solution.slice(0, 1) : m.solution})</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
          <ul className="mt-2 space-y-0.5 text-[var(--casa-muted)]">
            {a.log.map((entry, i) => (
              <li key={i} className="tabular-nums">
                {new Date(entry.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Berlin' })} · {entry.what}
              </li>
            ))}
          </ul>
          {canDelete ? (
            <form action={deleteAttemptAction} className="mt-2">
              <input type="hidden" name="attemptId" value={a.id} />
              <input type="hidden" name="day" value={day} />
              <ConfirmSubmit
                title={t('Diesen Test löschen?', 'Delete this test?')}
                description={t(`${a.name}s Test und sein Ergebnis beim Lernenden werden gelöscht.`, `${a.name}'s test and its result on the learner's record are deleted.`)}
                confirmLabel={t('Löschen', 'Delete')}
              >
                {t('Löschen', 'Delete')}
              </ConfirmSubmit>
            </form>
          ) : null}
        </details>
      ) : null}
    </li>
  );
}

/** A paper booklet typed in: name, e-mail, the version on the booklet, and each answer. */
function PaperForm({ test, detail, day }: { test: EntryTestView; detail: SittingDetail; day: string }) {
  const { t } = useWsLang();
  const slots = test.paper.reduce((n, task) => n + task.statements, 0);
  let slot = 0;
  return (
    <FormDialog trigger={t('Papierbogen eintragen', 'Enter a paper booklet')} title={t('Papierbogen eintragen', 'Enter a paper booklet')} icon={Icon.placement} tint="blue" width="xl" size="sm">
      <form action={enterPaperAction}>
        <input type="hidden" name="sittingId" value={detail.id} />
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="slots" value={slots} />
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label={t('Vor- und Nachname', 'First and last name')} htmlFor="paper-name">
            <Input id="paper-name" name="name" required minLength={3} autoComplete="off" />
          </Field>
          <Field label={t('E-Mail-Adresse', 'E-mail address')} htmlFor="paper-email">
            <Input id="paper-email" name="email" type="email" autoComplete="off" />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-xs font-bold text-[var(--casa-muted)]">{t('Version', 'Version')}</legend>
            <div className="flex h-9 items-center gap-4 text-sm">
              {(['A', 'B'] as const).map((v) => (
                <label key={v} className="inline-flex items-center gap-1.5">
                  <input type="radio" name="version" value={v} required className="accent-[var(--fm-navy)]" />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-x-6 gap-y-1">
          {test.paper.map((task) => {
            const rows: ReactNode[] = [];
            for (let s = 0; s < task.statements; s++) {
              const index = slot++;
              const label = task.kind === 'mc' ? String(task.n) : `${task.n}.${s + 1}`;
              const choices = task.kind === 'mc' ? ['A', 'B', 'C', 'D'] : ['richtig', 'falsch'];
              rows.push(
                <fieldset key={label} className="flex items-center gap-2 py-0.5 text-[0.84rem]">
                  <legend className="sr-only">{t(`Aufgabe ${label}`, `Task ${label}`)}</legend>
                  <span aria-hidden="true" className="w-9 shrink-0 font-bold text-[var(--casa-muted)] tabular-nums">
                    {label}
                  </span>
                  {choices.map((c) => (
                    <label key={c} className="inline-flex items-center gap-1">
                      <input type="radio" name={`a${index}`} value={c} className="accent-[var(--fm-navy)]" />
                      {c === 'richtig' ? 'r' : c === 'falsch' ? 'f' : c}
                    </label>
                  ))}
                </fieldset>
              );
            }
            return rows;
          })}
        </div>
        <DialogFooter>
          <Button type="submit">{t('Eintragen', 'Enter')}</Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-ws-line-soft py-3 last:border-b-0">
      <h3 className="px-6 pb-1.5 text-[0.76rem] font-bold text-[var(--casa-muted)]">{title}</h3>
      {children}
    </section>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="px-6 py-2 text-[0.86rem] text-[var(--casa-muted)]">{children}</p>;
}
