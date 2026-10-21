import { notFound } from 'next/navigation';

import { saveLetterStandardAction } from '../../../../bookings/actions';
import { issueRegistrationLetterAction } from '../../../letter-actions';
import { LetterComposer } from '@/components/admin/letters/letter-composer';
import { sentDay } from '@/components/admin/letters/letter-kind';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { registrationLetterContext } from '@/lib/admin/letters/booking-context';
import { LETTER_KIND_LABELS, LETTER_STANDARD_DEFAULTS } from '@/lib/admin/letters/booking-letters';
import { lettersForRegistration, standardTexts } from '@/lib/admin/letters/repo';
import { sentStates } from '@/lib/admin/letters/suggest';
import type { RegistrationLetterKind } from '@/lib/admin/letters/types';
import { todayInputValue, toDateInputValue } from '@/lib/dates';

const KINDS: Record<string, RegistrationLetterKind> = { deposit: 'registration_deposit_request', test: 'registration_test_request', later: 'registration_later_course' };

/**
 * A website registration's letters (docs/LETTERS.md, 0035), before there is a booking: please send
 * the down payment (`?kind=deposit`, the default), or the placement-test result (`?kind=test`).
 * Sending one leaves the registration waiting for the learner's answer.
 */
export default async function RegistrationLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; error?: string }>;
}) {
  const [{ id }, { kind: raw, error }, user] = await Promise.all([params, searchParams, requireModule('registrations')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const kind = KINDS[raw ?? ''] ?? 'registration_deposit_request';
  const ctx = await registrationLetterContext(id);
  if (!ctx) notFound();
  const { t, lang } = await getI18n();
  const [standards, letters] = await Promise.all([standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]), lettersForRegistration(id)]);
  const sent = letters.filter((l) => l.kind === kind);
  const states = sentStates(Object.values(KINDS), letters.map((l) => ({ kind: l.kind, date: toDateInputValue(l.sentAt) })));
  const name = [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' ');

  return (
    <LetterComposer
      source={{ type: 'registration', kind, ctx }}
      standards={standards}
      today={todayInputValue()}
      version={sent.length + 1}
      me={user.id}
      defaultLanguage={ctx.language}
      canIssue={canAccess(user, 'registrations', 'edit')}
      canSetStandard={canAccess(user, 'registrations', 'full')}
      issueAction={issueRegistrationLetterAction}
      saveStandardAction={saveLetterStandardAction}
      hidden={{ registrationId: id, kind }}
      kindGroups={[
        {
          label: t('Anmeldung', 'Registration'),
          items: Object.entries(KINDS).map(([key, k]) => {
            const state = states.get(k)!;
            return {
              kind: k,
              label: pick(lang, LETTER_KIND_LABELS[k]),
              href: `/admin/registrations/course/${id}/letter?kind=${key}`,
              active: k === kind,
              sentOn: state.lastSent ? sentDay(state.lastSent, lang) : null,
              count: state.count,
              blocked: null,
              suggested: false,
            };
          }),
        },
      ]}
      sent={sent.map((l) => ({
        id: l.id,
        label: l.version > 1 ? t(`Fassung ${l.version}`, `Version ${l.version}`) : pick(lang, LETTER_KIND_LABELS[kind]),
        detail: [toDateInputValue(l.sentAt).split('-').reverse().join('.'), l.sentByName].filter(Boolean).join(' · '),
      }))}
      back={{ href: `/admin/registrations/course/${id}`, label: t('Zur Anmeldung', 'Back to the registration') }}
      title={pick(lang, LETTER_KIND_LABELS[kind])}
      subtitle={[name, ctx.courseLabel].filter(Boolean).join(' · ')}
      error={error}
    />
  );
}
