import Link from 'next/link';

import { createSittingAction } from './actions';
import { SittingForm } from './sitting-form';
import { FormDialog } from '@/components/admin/dialogs';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';

import { ListEmpty, ListGroup } from '@/components/admin/list';
import { Badge, Card, PageHeader } from '@/components/admin/ui';
import { listSittings, sittingDefaults } from '@/lib/admin/exams';
import { groupRuns, monthKey, monthLabel, openCell, OpenTable, SeatLine, sentenceCase, shortDate } from '../list-parts';
import { pick, wsLocale, type Bilingual } from '@/lib/admin/i18n';
import { Tally } from '@/components/admin/inbox';
import { getI18n } from '@/lib/admin/i18n.server';

/** A sitting's status other than scheduled, in words; an unknown one as stored. */
const STATUS_LABELS: Record<string, Bilingual> = {
  cancelled: { de: 'Abgesagt', en: 'Cancelled' },
  draft: { de: 'Entwurf', en: 'Draft' },
};

/**
 * Exam sittings, with the candidates booked into them (0036) — each opens on its own page.
 *
 * The deadline column is the point of this screen. A telc entry cannot be filed
 * after the deadline, so a sitting with three days left and eleven of twenty
 * seats sold is a decision — chase, or hand the seats back — and it is a
 * decision nobody can make from an inbox.
 *
 * The sittings group by month, as on Courses (docs/ADMIN_WORKSPACE.md §Lists).
 * The days left are named only when they are near (a month or less) and turn
 * amber in the last week; a status badge appears only for a sitting that is
 * not simply scheduled, and a level only when the exam's name does not
 * already say it.
 */
export default async function ExamCataloguePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [sessions, { t, lang }, user, { error }] = await Promise.all([listSittings(30), getI18n(), requireModule('catalogue'), searchParams]);
  // A new sitting (0038): `catalogue` at `edit`, starting from its exam's last one.
  const exams = canAccess(user, 'catalogue', 'edit') ? await sittingDefaults() : [];
  const months = groupRuns(sessions, (session) => monthKey(session.startsAt));
  const today = new Date().setHours(0, 0, 0, 0);
  const subtle = 'text-[var(--casa-muted)]';
  const hide = 'hidden md:table-cell';
  const ahead = sessions.filter((session) => new Date(session.startsAt).getTime() >= today);
  const nextDeadline = ahead
    .map((session) => (session.registrationDeadline ? new Date(session.registrationDeadline) : null))
    .find((deadline): deadline is Date => deadline !== null && deadline.setHours(0, 0, 0, 0) >= today);
  const daysToDeadline = nextDeadline ? Math.round((nextDeadline.getTime() - today) / 86_400_000) : null;

  return (
    <>
      <PageHeader
        title={t('Prüfungen', 'Exams')}
        actions={
          exams.length ? (
            <FormDialog trigger={t('Neuer Termin', 'New sitting')} title={t('Neuer Prüfungstermin', 'New exam sitting')} triggerVariant="primary">
              <SittingForm action={createSittingAction} exams={exams} />
            </FormDialog>
          ) : null
        }
      />
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      {/* What is coming, how many have entered, and the next deadline: a telc entry cannot be filed after it. */}
      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="working" n={ahead.length} label={ahead.length === 1 ? t('kommender Termin', 'sitting ahead') : t('kommende Termine', 'sittings ahead')} lang={lang} />
        <Tally tone="done" n={ahead.reduce((sum, s) => sum + s.booked, 0)} label={t('gebucht', 'booked')} lang={lang} />
        {nextDeadline && daysToDeadline !== null ? (
          <span className={daysToDeadline <= 7 ? 'font-semibold text-[#9a5b00]' : undefined}>
            {t('Nächster Anmeldeschluss', 'Next deadline')}{' '}
            <b className="font-semibold text-[var(--casa-ink)]">{shortDate(nextDeadline, lang)}</b>
            {' · '}
            {daysToDeadline === 0 ? t('heute', 'today') : daysToDeadline === 1 ? t('noch 1 Tag', '1 day left') : t(`noch ${daysToDeadline} Tage`, `${daysToDeadline} days left`)}
          </span>
        ) : null}
      </p>

      <Card bleed>
        {sessions.length === 0 ? (
          <ListEmpty title={t('Keine Prüfungstermine geplant', 'No sittings scheduled')} />
        ) : (
          <OpenTable
            head={[
              { label: t('Prüfung', 'Exam') },
              { label: t('Termin', 'Sitting'), className: 'w-px md:w-[11rem]' },
              { label: t('Anmeldeschluss', 'Entries close'), className: `w-[12rem] ${hide}` },
              { label: t('Teilnehmende', 'Candidates'), className: `w-[13rem] ${hide}` },
            ]}
          >
            {months.flatMap((month) => [
              <ListGroup key={month.key} label={monthLabel(month.key, lang)} count={month.items.length} span={4} />,
              ...month.items.map((session) => {
                const startsAt = new Date(session.startsAt);
                const deadline = session.registrationDeadline ? new Date(session.registrationDeadline) : null;
                const daysLeft = deadline
                  ? Math.round((new Date(deadline).setHours(0, 0, 0, 0) - today) / 86_400_000)
                  : null;
                const closing = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                const closed = daysLeft !== null && daysLeft < 0;
                // Most exam names carry the level ("telc Deutsch B2"); say it only when not.
                const level = session.level && !session.examName.includes(session.level) ? session.level : null;
                // The last fortnight's sittings stay for what follows them (results, certificates), marked as past.
                const past = startsAt.getTime() < today;

                return (
                  <tr key={session.id}>
                    <td className={`${openCell} py-3.5 md:max-w-0`}>
                      <span className="flex min-w-0 items-center gap-2">
                        <Link
                          href={`/admin/catalogue/exams/${session.id}`}
                          className={`text-[0.9rem] font-semibold hover:underline md:truncate ${past ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]'}`}
                        >
                          {session.examName}
                        </Link>
                        {past ? <Badge tone="quiet">{t('Vorbei', 'Past')}</Badge> : null}
                        {session.status !== 'scheduled' ? (
                          <Badge tone={session.status === 'cancelled' ? 'danger' : 'neutral'}>
                            {STATUS_LABELS[session.status]
                              ? pick(lang, STATUS_LABELS[session.status])
                              : sentenceCase(session.status)}
                          </Badge>
                        ) : null}
                      </span>
                      {level ? <span className="mt-0.5 block text-[0.8rem] text-[var(--casa-muted)]">{level}</span> : null}
                    </td>
                    <td className={`${openCell} py-3.5 text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums`}>
                      <time dateTime={startsAt.toISOString()}>
                        {shortDate(startsAt, lang, { weekday: true })}
                        <span className={subtle}>
                          {' · '}
                          {startsAt.toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </time>
                    </td>
                    <td className={`${openCell} py-3.5 text-[0.84rem] whitespace-nowrap tabular-nums ${hide}`}>
                      {deadline ? (
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className={closed ? subtle : 'text-[#2b3546]'}>{shortDate(deadline, lang)}</span>
                          {closed ? (
                            <span className={`text-xs ${subtle}`}>{t('Geschlossen', 'Closed')}</span>
                          ) : daysLeft !== null && daysLeft <= 30 ? (
                            <span className={closing ? 'text-xs font-semibold text-[#9a5b00]' : `text-xs ${subtle}`}>
                              {daysLeft === 0
                                ? t('Heute', 'Today')
                                : daysLeft === 1
                                  ? t('noch 1 Tag', '1 day left')
                                  : t(`noch ${daysLeft} Tage`, `${daysLeft} days left`)}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </td>
                    <td className={`${openCell} py-3.5 ${hide}`}>
                      <SeatLine
                        taken={session.booked}
                        capacity={session.capacity}
                        label={t(`${session.booked} von ${session.capacity} Plätzen gebucht`, `${session.booked} of ${session.capacity} places booked`)}
                        warn={closing}
                        note={
                          // Who still needs an answer: on the waiting list, or registered on the website and not booked.
                          session.waiting + session.offered || session.openRegistrations ? (
                            <span className="text-[var(--casa-muted)]">
                              {[
                                session.waiting + session.offered ? t(`${session.waiting + session.offered} warten`, `${session.waiting + session.offered} waiting`) : null,
                                session.openRegistrations ? t(`${session.openRegistrations} neu`, `${session.openRegistrations} new`) : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                );
              }),
            ])}
          </OpenTable>
        )}
      </Card>
    </>
  );
}
