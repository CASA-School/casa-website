import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmSubmit } from '@/components/admin/dialogs';
import { FeedbackGallery } from '@/components/admin/feedback/feedback-gallery';
import { Icon } from '@/components/admin/icons';
import { MetaItem, MetaLine, OwnerControl, StatusBar, Timeline } from '@/components/admin/record-parts';
import { Button, Card, DetailList, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { berlinTime, shortDay } from '@/lib/admin/days';
import { getFeedback } from '@/lib/admin/feedback';
import { describeBrowser, FEEDBACK_KIND_LABELS, FEEDBACK_LIMITS } from '@/lib/admin/feedback-shared';
import { requireModule } from '@/lib/admin/guard';
import { pick, relativeDays } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { listAssignableStaff } from '@/lib/admin/staff';

import { answerFeedbackAction, deleteFeedbackAction } from '../actions';

/**
 * One feedback (0112), in the inbox records' design: the colleague and what kind, the screen it came
 * from as a link back to it, and in the bar its state and owner; what they wrote with the screenshots;
 * the answer they will read under „Mein Feedback"; what travelled with it (the pages before, the
 * browser, errors the page met); beside it the notes and changes.
 */
export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireModule('feedback')]);
  const [feedback, { t, lang }] = await Promise.all([getFeedback(id), getI18n()]);

  if (!feedback) {
    notFound();
  }

  const canEdit = canAccess(user, 'feedback', 'edit');
  const [notes, activity, staff] = await Promise.all([listNotes('feedback', feedback.id), activityFor('feedback', feedback.id), listAssignableStaff()]);

  const first = feedback.senderName.trim().split(/\s+/)[0] ?? feedback.senderName;
  const kind = pick(lang, FEEDBACK_KIND_LABELS[feedback.kind]);
  const browser = describeBrowser(feedback.context.userAgent);
  const where = feedback.pageTitle || feedback.pagePath;
  const pictures = feedback.files.map((file) => `/admin/feedback/${feedback.id}/files/${file.id}`);
  const errors = feedback.context.errors ?? [];
  const trail = feedback.context.trail ?? [];
  const at = (value: Date) => `${shortDay(value, lang)}, ${berlinTime(value, lang)}`;

  return (
    <>
      <RecordHeader
        backHref="/admin/feedback"
        backLabel={t('Feedback', 'Feedback')}
        title={feedback.senderName}
        avatar={feedback.senderName}
        trailLabel={`#${feedback.number} · ${feedback.senderName}`}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
              #{feedback.number} · {kind}
            </span>
            <MetaLine>
              {where ? (
                <MetaItem icon={Icon.external}>
                  {feedback.pagePath ? (
                    <Link href={feedback.pagePath} className="hover:text-[var(--casa-ink)] hover:underline">
                      {where}
                    </Link>
                  ) : (
                    where
                  )}
                </MetaItem>
              ) : null}
              <MetaItem icon={Icon.clock}>{at(feedback.submittedAt)}</MetaItem>
              {browser ? <MetaItem icon={Icon.globe}>{browser}</MetaItem> : null}
            </MetaLine>
          </>
        }
        bar={
          <>
            <StatusBar entity="feedback" id={feedback.id} status={feedback.status} canEdit={canEdit} />
            <OwnerControl entity="feedback" id={feedback.id} assignedTo={feedback.assignedTo} staff={staff} me={user} canEdit={canEdit} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title={t('Nachricht', 'Message')} icon={Icon.feedback} tint="blue">
            {feedback.message ? <p className="max-w-prose text-base leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{feedback.message}</p> : null}
            {pictures.length ? (
              <div className={feedback.message ? 'mt-5' : undefined}>
                <FeedbackGallery pictures={pictures} />
              </div>
            ) : null}
          </Card>

          <Card title={t(`Antwort an ${first}`, `Answer to ${first}`)} icon={Icon.mail} tint="green">
            {canEdit ? (
              <form action={answerFeedbackAction} className="space-y-3">
                <input type="hidden" name="id" value={feedback.id} />
                <textarea
                  name="answer"
                  defaultValue={feedback.answer ?? ''}
                  maxLength={FEEDBACK_LIMITS.answer}
                  rows={3}
                  placeholder={t('Zum Beispiel: Ist behoben, danke!', 'For example: Fixed, thank you!')}
                  className="block field-sizing-content min-h-[5.5rem] w-full resize-none rounded-xl border border-ws-line-firm bg-white px-3.5 py-3 text-[0.92rem] leading-relaxed text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-text-subtle)] focus:border-[var(--casa-blue)]/60 focus:ring-3 focus:ring-[var(--casa-blue)]/15"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[0.78rem] text-[var(--casa-muted)]">
                    {feedback.answeredAt
                      ? [
                          `${feedback.answeredBy ?? ''} · ${relativeDays(feedback.answeredAt, lang)}`,
                          feedback.senderSeenAt && feedback.senderSeenAt >= feedback.answeredAt ? t(`${first} hat sie gelesen`, `${first} has read it`) : t('noch nicht gelesen', 'not read yet'),
                        ].join(' · ')
                      : null}
                  </span>
                  <Button type="submit" variant="secondary">
                    {feedback.answer ? t('Antwort ändern', 'Change answer') : t('Antwort senden', 'Send answer')}
                  </Button>
                </div>
              </form>
            ) : feedback.answer ? (
              <p className="text-[0.92rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{feedback.answer}</p>
            ) : (
              <p className="text-[0.88rem] text-[var(--casa-text-subtle)]">—</p>
            )}
          </Card>

          <Card title={t('Mitgeschickt', 'Sent with it')} icon={Icon.globe}>
            <DetailList
              items={[
                {
                  label: t('Seite', 'Page'),
                  value: feedback.pagePath ? (
                    <Link href={feedback.pagePath} className="text-[var(--casa-accent-text)] hover:underline">
                      {where}
                    </Link>
                  ) : (
                    where
                  ),
                },
                { label: t('Browser', 'Browser'), value: browser },
                { label: t('Fenster', 'Window'), value: feedback.context.viewport },
                { label: t('Bildschirm', 'Screen'), value: feedback.context.screen },
                { label: t('Sprache des Workspace', 'Workspace language'), value: feedback.context.lang === 'en' ? t('Englisch', 'English') : feedback.context.lang ? t('Deutsch', 'German') : null },
                {
                  label: t('Mail an admin@', 'Mail to admin@'),
                  value: feedback.mailedAt ? at(feedback.mailedAt) : t('nicht gesendet', 'not sent'),
                },
                ...(trail.length
                  ? [
                      {
                        label: t('Seiten davor', 'Pages before'),
                        wide: true,
                        value: (
                          <ol className="space-y-0.5">
                            {trail.map((page, index) => (
                              <li key={`${page.path}-${index}`} className="truncate">
                                <span className="mr-1.5 text-[var(--casa-text-subtle)] tabular-nums">{index + 1}.</span>
                                {page.title || page.path}
                              </li>
                            ))}
                          </ol>
                        ),
                      },
                    ]
                  : []),
                ...(errors.length
                  ? [
                      {
                        label: t('Fehler im Browser', 'Errors in the browser'),
                        wide: true,
                        value: (
                          <ul className="space-y-1.5">
                            {errors.map((error, index) => (
                              <li key={`${error.at}-${index}`} className="rounded-lg bg-[#fdecec] px-3 py-2 font-mono text-[0.78rem] break-words text-[#7f1d1d]">
                                {error.message}
                              </li>
                            ))}
                          </ul>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Timeline
            canWrite={canEdit}
            entity="feedback"
            id={feedback.id}
            notes={notes}
            activity={activity}
            origin={{ at: feedback.submittedAt, label: t('Gesendet mit „Feedback“', 'Sent with “Feedback”'), icon: Icon.feedback }}
          />
        </div>
      </div>

      {canAccess(user, 'feedback', 'full') ? (
        <form action={deleteFeedbackAction} className="mt-8 flex justify-end">
          <input type="hidden" name="id" value={feedback.id} />
          <ConfirmSubmit
            title={t(`Feedback #${feedback.number} löschen?`, `Delete feedback #${feedback.number}?`)}
            description={t('Mit den Screenshots und Notizen. Das lässt sich nicht rückgängig machen.', 'With its screenshots and notes. This cannot be undone.')}
            confirmLabel={t('Löschen', 'Delete')}
          >
            {t('Löschen', 'Delete')}
          </ConfirmSubmit>
        </form>
      ) : null}
    </>
  );
}
