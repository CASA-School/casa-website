import Link from 'next/link';
import { notFound } from 'next/navigation';

import { issueSittingLettersAction } from '../../actions';
import { Icon } from '@/components/admin/icons';
import { RecordLink } from '@/components/admin/record-link';
import { MetaItem, MetaLine } from '@/components/admin/record-parts';
import { LetterKindIcon } from '@/components/admin/letters/letter-kind';
import { LetterSheet } from '@/components/admin/letters/letter-sheet';
import { Badge, Button, Card, Field, RecordHeader, Select } from '@/components/admin/ui';
import { getSitting } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { pick, wsLocale } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { previewSittingLetter, SITTING_LETTER_KINDS, sittingLetterRows, type SittingLetterKind } from '@/lib/admin/letters/exam-bulk';
import { cn } from '@/lib/utils';

const KEYS: Record<SittingLetterKind, string> = { exam_invitation: 'invitation', exam_results: 'results', exam_participation: 'participation' };

/**
 * A letter to every candidate of a sitting (0038): the invitation before the day, „Ergebnis ist da"
 * and the confirmation of participation after it. Ticked are those it can go to and who have not had
 * it; each gets their own, in their language, kept on their booking. Then all of them to print.
 */
export default async function SittingLettersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; error?: string }>;
}) {
  const [{ id }, { kind: raw, error }, user] = await Promise.all([params, searchParams, requireModule('bookings', 'edit')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sitting = await getSitting(id);
  if (!sitting) notFound();
  const { t, lang } = await getI18n();
  // Before the day the invitation, after it the result.
  const sat = new Date(sitting.startsAt).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  const kind: SittingLetterKind = SITTING_LETTER_KINDS.find((k) => KEYS[k] === raw) ?? (sat ? 'exam_results' : 'exam_invitation');
  const { rows, contexts } = await sittingLetterRows(id, kind);
  const first = rows.find((r) => !r.blocked) ?? rows[0];
  const ctx = first ? contexts.get(first.bookingId) : undefined;
  const preview = ctx ? await previewSittingLetter(kind, ctx, user.id) : null;
  const staff = ctx?.staff ?? [];
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' });
  const back = `/admin/catalogue/exams/${id}`;

  return (
    <>
      <RecordHeader
        backHref={`${back}?tab=letters`}
        backLabel={sitting.examName}
        title={t('Briefe an alle', 'Letters to all')}
        subtitle={
          <MetaLine>
            <MetaItem icon={Icon.award}>
              <RecordLink href={back}>{sitting.examName}</RecordLink>
            </MetaItem>
            <MetaItem icon={Icon.calendar}>
              {new Date(sitting.startsAt).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' })}
            </MetaItem>
            <MetaItem icon={Icon.people}>{rows.length === 1 ? t('1 Teilnehmende/r', '1 candidate') : t(`${rows.length} Teilnehmende`, `${rows.length} candidates`)}</MetaItem>
          </MetaLine>
        }
      />

      <nav className="mb-4 inline-flex rounded-xl border border-ws-line bg-white p-1" aria-label={t('Brief', 'Letter')}>
        {SITTING_LETTER_KINDS.map((k) => (
          <Link
            key={k}
            href={`${back}/letters?kind=${KEYS[k]}`}
            aria-current={k === kind ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg py-1 pr-3 pl-1.5 text-[0.84rem] font-semibold',
              k === kind ? 'bg-[var(--fm-navy)] text-white' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
            )}
          >
            <LetterKindIcon kind={k} />
            {pick(lang, LETTER_KIND_LABELS[k])}
          </Link>
        ))}
      </nav>

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0">
          {preview ? (
            <>
              <p className="mb-2 text-[0.8rem] font-semibold text-[var(--casa-muted)]">
                {t('Vorschau', 'Preview')}: {first?.personName}
              </p>
              <LetterSheet letter={preview} />
            </>
          ) : (
            <Card>
              <p className="text-sm text-[var(--casa-muted)]">{t('Niemand gebucht.', 'Nobody booked.')}</p>
            </Card>
          )}
        </div>

        <Card title={t('Empfänger', 'Recipients')} icon={Icon.people} tint="blue" bleed>
          {rows.length ? (
            <form action={issueSittingLettersAction}>
              <input type="hidden" name="sittingId" value={id} />
              <input type="hidden" name="kind" value={kind} />
              <ul className="divide-y divide-ws-line-soft">
                {rows.map((r) => (
                  <li key={r.bookingId}>
                    <label className={cn('flex items-start gap-3 px-5 py-2.5 text-[0.86rem]', r.blocked ? 'opacity-60' : 'cursor-pointer')}>
                      <input
                        type="checkbox"
                        name="bookingIds"
                        value={r.bookingId}
                        defaultChecked={!r.blocked && !r.sentOn}
                        disabled={Boolean(r.blocked)}
                        className="mt-0.5 size-4 accent-[var(--casa-ink-deep)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold text-[var(--casa-ink)]">
                          {r.personName}
                          <Badge tone="quiet">{r.language.toUpperCase()}</Badge>
                        </span>
                        <span className="block text-xs text-[var(--casa-muted)]">
                          {r.blocked ? pick(lang, r.blocked) : r.sentOn ? t(`gesendet am ${day(r.sentOn)}`, `sent on ${day(r.sentOn)}`) : (r.email ?? t('keine E-Mail', 'no email'))}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="space-y-3 border-t border-ws-line-soft px-5 py-4">
                <Field label={t('Unterschrift', 'Signature')} htmlFor="bulk-signature">
                  <Select id="bulk-signature" name="signatureId" defaultValue={staff.some((s) => s.id === user.id) ? user.id : (staff[0]?.id ?? '')}>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                {/* Kept on each booking as sent; then on to the mail screen (a PDF each), or all of them to print. */}
                <Button type="submit" name="then" value="mail" className="w-full">
                  {Icon.mail}
                  {t('Speichern und per E-Mail senden', 'Save and send by e-mail')}
                </Button>
                <Button type="submit" name="then" value="print" variant="secondary" className="w-full">
                  {t('Speichern und drucken', 'Save and print')}
                </Button>
              </div>
            </form>
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Niemand gebucht.', 'Nobody booked.')}</p>
          )}
        </Card>
      </div>
    </>
  );
}
