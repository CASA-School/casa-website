'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { openEntryTestsAction, sendTeacherMailAction } from '../../actions';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { MailComposer, type RenderInput } from '@/components/admin/mail/mail-composer';
import { Button, ButtonLink, Card } from '@/components/admin/ui';
import type { TeacherMailDraft } from '@/lib/admin/entry-test-mail';
import { SESSION_LABELS } from '@/lib/admin/day-plan-labels';
import { pick } from '@/lib/admin/i18n';
import { teacherMailHtml } from '@/lib/entry-test/teacher-mail';
import { cn } from '@/lib/utils';

/**
 * The mail to a start day's teachers (Rahman, 2026-10-22): the codes, the QR codes and the guide in one
 * mail, a few days ahead, on the workspace's mail screen (MailComposer): the day and its tests here, the
 * rest is the same for every mail the workspace sends.
 */
export function TeacherMailComposer({
  draft,
  days,
  from,
  logo,
  sent,
}: {
  draft: TeacherMailDraft;
  days: { day: string; label: string }[];
  from: string | null;
  /** The CASA logo as a picture, for the mail copied into the mail program. */
  logo: string;
  sent: boolean;
}) {
  const { t, lang } = useWsLang();
  const waiting = draft.tests.some((x) => !x.code);
  const last = draft.sent[0];

  const render = useCallback(
    ({ subject, text, signature, target }: RenderInput) =>
      teacherMailHtml({
        subject,
        heading: draft.heading,
        intro: text,
        tests: draft.tests,
        logoSrc: target === 'mailapp' ? logo : '/brand/casa-logo.png',
        // In the mail program (Outlook at CASA) the CASA add-in adds the signature, with its greeting.
        signature: target === 'mailapp' ? null : signature,
        closing: target === 'mailapp' || signature ? null : draft.closing,
      }),
    [draft, logo]
  );

  const context = (
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
              <span className="rounded-full bg-ws-sunk px-2.5 py-1 text-[0.74rem] font-bold text-[var(--casa-muted)]">{t('Nicht geöffnet', 'Not opened')}</span>
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
  );

  // The codes go out with the mail: until the tests are opened there is nothing to send.
  const blocker = waiting ? (
    <form action={openEntryTestsAction} className="flex flex-wrap items-center justify-end gap-3">
      <input type="hidden" name="day" value={draft.day} />
      <input type="hidden" name="from" value="mail" />
      <input type="hidden" name="scope" value="all" />
      <span className="mr-auto text-[0.84rem] text-[var(--casa-muted)]">{t('Noch ohne Codes', 'No codes yet')}</span>
      <Button type="submit" variant="primary" size="md">
        {t('Tests öffnen', 'Open the tests')}
      </Button>
    </form>
  ) : undefined;

  return (
    <MailComposer
      context={context}
      recipients={draft.recipients.map((r) => ({
        email: r.email,
        name: r.name,
        detail: r.classes,
        group: r.optional ? t('Weitere Lehrkräfte dieser Kurse', 'Other teachers of these courses') : t('Lehrkräfte am Testtag', 'Teachers on the test day'),
        chosen: !r.optional,
      }))}
      missing={draft.missing}
      variants={[{ key: 'main', label: 'Deutsch', subject: draft.subject, text: draft.intro }]}
      signature={draft.signature}
      from={from}
      replyTo={draft.replyTo}
      render={render}
      action={sendTeacherMailAction}
      hidden={{ day: draft.day }}
      blocker={blocker}
      inText={t(`${draft.tests.length} ${draft.tests.length === 1 ? 'QR-Code' : 'QR-Codes'}`, `${draft.tests.length} QR ${draft.tests.length === 1 ? 'code' : 'codes'}`)}
      sentNotice={sent && last ? t(`Gesendet an ${last.recipients.length} Empfänger · ${last.when}`, `Sent to ${last.recipients.length} recipients · ${last.when}`) : null}
      history={draft.sent.map((m) => ({
        id: m.id,
        title: m.subject,
        detail: [m.when, m.by, t(`${m.recipients.length} Empfänger`, `${m.recipients.length} recipients`)].filter(Boolean).join(' · '),
      }))}
    />
  );
}
