'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { sendTeacherMailAction } from '../../actions';
import { ConfirmSubmit } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { ButtonLink, Card, Field, Input, Textarea } from '@/components/admin/ui';
import type { TeacherMailDraft } from '@/lib/admin/entry-test-mail';
import { SESSION_LABELS } from '@/lib/admin/day-plan-labels';
import { pick } from '@/lib/admin/i18n';
import { teacherMailHtml } from '@/lib/entry-test/teacher-mail';
import { cn } from '@/lib/utils';

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const box = 'size-4 shrink-0 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]';
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * The mail to a start day's teachers, composed and checked (Rahman, 2026-10-22: „a preview page where
 * the team checks the e-mails, the text and the subject"): the day and its tests on the left, who gets it,
 * the subject and the text; on the right the mail as it will arrive, built by the same function that
 * builds the one sent. Sending is confirmed in a dialog.
 */
export function TeacherMailComposer({
  draft,
  days,
  from,
  sent,
}: {
  draft: TeacherMailDraft;
  days: { day: string; label: string }[];
  from: string | null;
  sent: boolean;
}) {
  const { t, lang } = useWsLang();
  const [subject, setSubject] = useState(draft.subject);
  const [intro, setIntro] = useState(draft.intro);
  const main = draft.recipients.filter((r) => !r.optional);
  const others = draft.recipients.filter((r) => r.optional);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(main.map((r) => r.email)));
  const [extra, setExtra] = useState('');
  const [width, setWidth] = useState<'desktop' | 'phone'>('desktop');
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1200);

  const extras = extra.split(/[\s,;]+/).filter(Boolean);
  const wrong = extras.filter((e) => !EMAIL.test(e));
  const people = draft.recipients.filter((r) => chosen.has(r.email));
  const to = [...people.map((r) => r.email), ...extras.filter((e) => EMAIL.test(e))];
  const allChosen = main.every((r) => chosen.has(r.email));
  const html = useMemo(
    () => teacherMailHtml({ subject, heading: draft.heading, intro, tests: draft.tests, logoSrc: '/brand/casa-logo.png' }),
    [subject, intro, draft.heading, draft.tests]
  );
  const ready = !!from && draft.tests.length > 0 && to.length > 0 && subject.trim() !== '' && intro.trim() !== '' && wrong.length === 0;
  const last = draft.sent[0];
  const toLine = [...people.map((r) => r.name), ...extras.filter((e) => EMAIL.test(e))];

  // A narrower frame reflows the mail without loading it again: measure it once it has.
  useEffect(() => {
    const timer = setTimeout(() => {
      const doc = frame.current?.contentDocument;
      if (doc) setHeight(doc.documentElement.scrollHeight);
    }, 80);
    return () => clearTimeout(timer);
  }, [width]);

  const toggle = (email: string) => {
    const next = new Set(chosen);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setChosen(next);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
      <div className="grid content-start gap-5">
        {sent && last ? (
          <p role="status" className="flex items-center gap-2.5 rounded-2xl border border-[#bfe3c9] bg-[#ecf7ef] px-4 py-3 text-[0.88rem] font-semibold text-[#1e6b34] [&_svg]:size-4">
            {Icon.check}
            {t(`Gesendet an ${last.recipients.length} Empfänger · ${last.when}`, `Sent to ${last.recipients.length} recipients · ${last.when}`)}
          </p>
        ) : null}

        <Card title={t('Testtag', 'Test day')} icon={Icon.calendar} tint="blue">
          <nav aria-label={t('Testtage', 'Test days')} className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <Link
                key={d.day}
                href={`/admin/day/tests/mail?date=${d.day}`}
                aria-current={d.day === draft.day ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center rounded-full px-3.5 text-[0.82rem] font-semibold ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
                  d.day === draft.day ? 'bg-[var(--casa-ink-deep)] text-white ring-[var(--casa-ink-deep)]' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
                )}
              >
                {d.label}
              </Link>
            ))}
          </nav>
          <ul className="mt-4 divide-y divide-ws-line-soft rounded-2xl border border-ws-line">
            {draft.tests.map((x) => (
              <li key={x.key} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.86rem] font-bold text-[var(--casa-ink)]">{x.title}</span>
                  <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">
                    {pick(lang, SESSION_LABELS[x.session])} · {[...new Set(x.classes.map((c) => c.label))].join(', ')} · {t(`${x.minutes} Min.`, `${x.minutes} min`)}
                  </span>
                </span>
                {x.code ? (
                  <span className="rounded-full bg-[#e3f4fc] px-2.5 py-1 text-[0.74rem] font-bold text-[#075985] tabular-nums">{t(`Code ${x.code}`, `Code ${x.code}`)}</span>
                ) : (
                  <span className="rounded-full bg-ws-sunk px-2.5 py-1 text-[0.74rem] font-bold text-[var(--casa-muted)]">{t('Öffnet beim Senden', 'Opens on sending')}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {draft.tests.some((x) => x.code) ? (
              <ButtonLink href={`/admin/day/tests/codes?date=${draft.day}`} variant="ghost" size="sm">
                {t('Code-Karten', 'Code cards')}
              </ButtonLink>
            ) : null}
            {[...new Set(draft.tests.map((x) => x.test))].map((test) => (
              <ButtonLink key={test} href={`/admin/day/tests/qr?kurs=${test}`} variant="ghost" size="sm">
                {t(`QR-Code ${draft.tests.find((x) => x.test === test)?.course}`, `QR code ${draft.tests.find((x) => x.test === test)?.course}`)}
              </ButtonLink>
            ))}
            <ButtonLink href="/admin/day/tests/guide" variant="ghost" size="sm">
              {t('Leitfaden', 'Guide')}
            </ButtonLink>
          </div>
        </Card>

        <form action={sendTeacherMailAction} className="grid gap-5">
          <input type="hidden" name="day" value={draft.day} />
          {extras.filter((e) => EMAIL.test(e)).map((e) => (
            <input key={e} type="hidden" name="email" value={e} />
          ))}

          <Card
            title={t('Empfänger', 'Recipients')}
            icon={Icon.people}
            tint="blue"
            bleed
            actions={<span className="text-[0.8rem] font-semibold text-[var(--casa-muted)] tabular-nums">{to.length}</span>}
          >
            {main.length ? (
              <>
                <label className="flex cursor-pointer items-center gap-3 border-b border-ws-line-soft bg-ws-sunk/50 px-4 py-2.5 text-[0.84rem] font-semibold text-[var(--casa-ink)]">
                  <input
                    type="checkbox"
                    checked={allChosen}
                    onChange={() => {
                      const next = new Set(chosen);
                      for (const r of main) {
                        if (allChosen) next.delete(r.email);
                        else next.add(r.email);
                      }
                      setChosen(next);
                    }}
                    className={box}
                  />
                  {t('Lehrkräfte am Testtag', 'Teachers on the test day')}
                </label>
                <RecipientList list={main} chosen={chosen} toggle={toggle} />
              </>
            ) : null}
            {others.length ? (
              <>
                <p className="border-y border-ws-line-soft bg-ws-sunk/50 px-4 py-2.5 text-[0.84rem] font-semibold text-[var(--casa-ink)]">
                  {t('Weitere Lehrkräfte dieser Kurse', 'Other teachers of these courses')}
                </p>
                <RecipientList list={others} chosen={chosen} toggle={toggle} />
              </>
            ) : null}
            {draft.missing.length ? (
              <p className="flex items-start gap-2 border-t border-ws-line-soft px-4 py-2.5 text-[0.8rem] text-[#8a5a00] [&_svg]:mt-0.5 [&_svg]:size-3.5 [&_svg]:shrink-0">
                {Icon.attention}
                {t(`Ohne E-Mail-Adresse: ${draft.missing.join(', ')}`, `No e-mail address: ${draft.missing.join(', ')}`)}
              </p>
            ) : null}
            <div className="border-t border-ws-line-soft px-4 py-3">
              <Field label={t('Weitere Adressen', 'More addresses')} htmlFor="mail-extra">
                <Input
                  id="mail-extra"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={t('z. B. studienleitung@casa-bremen.de', 'e.g. studienleitung@casa-bremen.de')}
                  aria-invalid={wrong.length > 0 || undefined}
                />
              </Field>
              {wrong.length ? (
                <p className="mt-1.5 text-[0.78rem] text-[var(--casa-danger-text)]">{t(`Keine E-Mail-Adresse: ${wrong.join(', ')}`, `Not an e-mail address: ${wrong.join(', ')}`)}</p>
              ) : null}
            </div>
          </Card>

          <Card title={t('Nachricht', 'Message')} icon={Icon.mail} tint="blue">
            <div className="grid gap-4">
              <Field label={t('Betreff', 'Subject')} htmlFor="mail-subject">
                <Input id="mail-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
              </Field>
              <Field label={t('Text', 'Text')} htmlFor="mail-intro">
                <Textarea id="mail-intro" name="intro" value={intro} onChange={(e) => setIntro(e.target.value)} rows={9} maxLength={4000} required />
              </Field>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ws-line bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="text-[0.84rem] text-[var(--casa-muted)]">
              {from
                ? t(`An ${to.length} Empfänger · ${draft.tests.length} ${draft.tests.length === 1 ? 'Test' : 'Tests'}`, `To ${to.length} recipients · ${draft.tests.length} ${draft.tests.length === 1 ? 'test' : 'tests'}`)
                : t('Versand hier nicht eingerichtet', 'Sending not set up here')}
            </span>
            <ConfirmSubmit
              variant="primary"
              size="md"
              disabled={!ready}
              title={t('E-Mail jetzt senden?', 'Send the e-mail now?')}
              description={t(
                `An ${to.length} Empfänger: ${toLine.join(', ')}. Betreff: „${subject.trim()}".`,
                `To ${to.length} recipients: ${toLine.join(', ')}. Subject: “${subject.trim()}”.`
              )}
              confirmLabel={t('Senden', 'Send')}
            >
              {Icon.mail}
              {t('Senden', 'Send')}
            </ConfirmSubmit>
          </div>

          {draft.sent.length ? (
            <Card title={t('Gesendet', 'Sent')} icon={Icon.check} bleed>
              <ul className="divide-y divide-ws-line-soft">
                {draft.sent.map((m) => (
                  <li key={m.id} className="px-4 py-2.5">
                    <span className="block text-[0.84rem] font-semibold text-[var(--casa-ink)]">{m.subject}</span>
                    <span className="block text-[0.76rem] text-[var(--casa-muted)]">
                      {[m.when, m.by, t(`${m.recipients.length} Empfänger`, `${m.recipients.length} recipients`)].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </form>
      </div>

      <section aria-label={t('Vorschau', 'Preview')} className="self-start overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_40px_-28px_rgba(15,23,42,0.35)] xl:sticky xl:top-20">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-2.5">
          <h2 className="text-sm font-extrabold text-[var(--casa-ink)]">{t('Vorschau', 'Preview')}</h2>
          <div role="radiogroup" aria-label={t('Breite', 'Width')} className="inline-flex gap-0.5 rounded-xl bg-ws-sunk p-0.5">
            {(['desktop', 'phone'] as const).map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={width === w}
                onClick={() => setWidth(w)}
                className={cn(
                  'h-7 rounded-lg px-3 text-[0.78rem] font-semibold transition-colors',
                  width === w ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                )}
              >
                {w === 'desktop' ? t('Computer', 'Desktop') : t('Handy', 'Phone')}
              </button>
            ))}
          </div>
        </header>
        <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-b border-ws-line-soft px-4 py-3 text-[0.82rem]">
          <dt className="text-[var(--casa-muted)]">{t('Von', 'From')}</dt>
          <dd className="truncate text-[var(--casa-ink)]">{from ?? '—'}</dd>
          <dt className="text-[var(--casa-muted)]">{t('An', 'To')}</dt>
          <dd className="truncate text-[var(--casa-ink)]">{from ?? '—'}</dd>
          <dt className="text-[var(--casa-muted)]">Bcc</dt>
          <dd className="text-[var(--casa-ink)]">{toLine.length ? toLine.join(', ') : '—'}</dd>
          <dt className="text-[var(--casa-muted)]">{t('Betreff', 'Subject')}</dt>
          <dd className="font-semibold text-[var(--casa-ink)]">{subject.trim() || '—'}</dd>
        </dl>
        <div className="bg-[#eef2f7] px-3 py-4">
          <iframe
            ref={frame}
            title={t('Vorschau der E-Mail', 'E-mail preview')}
            srcDoc={html}
            sandbox="allow-same-origin"
            onLoad={() => {
              const doc = frame.current?.contentDocument;
              if (doc) setHeight(doc.documentElement.scrollHeight);
            }}
            style={{ height }}
            className={cn('mx-auto block w-full rounded-xl border-0 bg-white transition-[max-width]', width === 'phone' ? 'max-w-[390px]' : 'max-w-[700px]')}
          />
        </div>
      </section>
    </div>
  );
}

function RecipientList({ list, chosen, toggle }: { list: TeacherMailDraft['recipients']; chosen: ReadonlySet<string>; toggle: (email: string) => void }) {
  return (
    <ul className="divide-y divide-ws-line-soft">
      {list.map((r) => (
        <li key={r.email}>
          <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)]">
            <input type="checkbox" name="email" value={r.email} checked={chosen.has(r.email)} onChange={() => toggle(r.email)} className={box} />
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8eef7] text-[0.7rem] font-bold text-[var(--casa-ink)]">
              {initials(r.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.86rem] font-semibold text-[var(--casa-ink)]">{r.name}</span>
              <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">
                {[r.classes, r.email].filter(Boolean).join(' · ')}
              </span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
