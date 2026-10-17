import { notFound } from 'next/navigation';

import { saveLetterStandardAction } from '../../../bookings/actions';
import { issueLearnerLetterAction } from '../../actions';
import { LetterComposer } from '@/components/admin/letters/letter-composer';
import { sentDay } from '@/components/admin/letters/letter-kind';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { learnerLetterContext } from '@/lib/admin/letters/booking-context';
import { LETTER_KIND_LABELS, LETTER_STANDARD_DEFAULTS } from '@/lib/admin/letters/booking-letters';
import { lettersForPerson, standardTexts } from '@/lib/admin/letters/repo';
import { todayInputValue, toDateInputValue } from '@/lib/dates';

/**
 * A learner's confirmation of several bookings (docs/LETTERS.md, 0035): SchoolMan's
 * `ConfirmationStudentIndividual`. The bookings are ticked beside the letter — those named in the
 * address (`?bookings=`), else every booking not cancelled that has not ended.
 */
export default async function LearnerLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bookings?: string; error?: string }>;
}) {
  const [{ id }, { bookings: asked, error }, user] = await Promise.all([params, searchParams, requireModule('bookings')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await learnerLetterContext(id);
  if (!ctx) notFound();
  const { t, lang } = await getI18n();
  const [standards, letters] = await Promise.all([standardTexts('learner_confirmation', LETTER_STANDARD_DEFAULTS.learner_confirmation), lettersForPerson(ctx.personId)]);
  const sent = letters.filter((l) => l.kind === 'learner_confirmation');
  const today = todayInputValue();
  const named = (asked ?? '').split(',').filter((b) => ctx.bookings.some((x) => x.id === b));
  const initial = named.length
    ? named
    : ctx.bookings.filter((b) => b.status !== 'cancelled' && (!b.course || b.course.endDate >= today)).map((b) => b.id);
  const name = [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' ');

  return (
    <LetterComposer
      source={{ type: 'learner', kind: 'learner_confirmation', ctx }}
      standards={standards}
      today={today}
      version={sent.length + 1}
      me={user.id}
      defaultLanguage={ctx.language}
      canIssue={canAccess(user, 'bookings', 'edit')}
      canSetStandard={canAccess(user, 'bookings', 'full')}
      issueAction={issueLearnerLetterAction}
      saveStandardAction={saveLetterStandardAction}
      hidden={{ personId: ctx.personId }}
      initialBookingIds={initial}
      sent={sent.map((l) => ({
        id: l.id,
        label: l.version > 1 ? t(`Fassung ${l.version}`, `Version ${l.version}`) : pick(lang, LETTER_KIND_LABELS.learner_confirmation),
        detail: [toDateInputValue(l.sentAt).split('-').reverse().join('.'), l.sentByName].filter(Boolean).join(' · '),
      }))}
      back={{ href: `/admin/people/${ctx.personId}?tab=letters`, label: t('Zur Person', 'Back to the person') }}
      title={pick(lang, LETTER_KIND_LABELS.learner_confirmation)}
      subtitle={name}
      // One kind here: no switcher, but the head says whether and when it went.
      kindGroups={[
        {
          label: '',
          items: [
            {
              kind: 'learner_confirmation',
              label: pick(lang, LETTER_KIND_LABELS.learner_confirmation),
              href: `/admin/people/${ctx.personId}/letter`,
              active: true,
              sentOn: sent[0] ? sentDay(toDateInputValue(sent.reduce((a, b) => (a.sentAt > b.sentAt ? a : b)).sentAt), lang) : null,
              count: sent.length,
              blocked: null,
              suggested: false,
            },
          ],
        },
      ]}
      error={error}
    />
  );
}
