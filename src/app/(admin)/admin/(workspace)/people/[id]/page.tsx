import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { unlinkPersonAction } from '../../actions';
import { deletePersonAction } from '../actions';
import { PersonForm } from '../person-form';
import { BookingWizard } from '../../bookings/booking-wizard';
import { createBookingFromWizardAction } from '../../bookings/actions';
import { RecordFoot } from '../../bookings/record-foot';
import { courseNameResolver } from '../../registrations/course-names';
import { optionLine } from '../../registrations/option-label';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { bookingOffer } from '@/lib/admin/booking-offer';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_TONES, personBookings } from '@/lib/admin/bookings';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { Icon } from '@/components/admin/icons';
import { MakeOffer } from '@/components/admin/make-offer';
import {
  Badge,
  BirthDate,
  Button,
  Card,
  DateText,
  DetailList,
  IconChip,
  RecordHeader,
  type Tint,
} from '@/components/admin/ui';
import { pick, relativeDays, wsLocale, type Bilingual, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { activityFor, describeActivity } from '@/lib/admin/activity';
import { offersFor } from '@/lib/admin/offers/repo';
import { listFileMakerLinks } from '@/lib/admin/filemaker-links';
import { FLAG_LABELS, listFlags } from '@/lib/admin/flags';
import {
  getPerson,
  latestConfirmedLevel,
  listCountries,
  personTimeline,
  type TimelineItem,
} from '@/lib/admin/people';
import { normaliseStatus, STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { cn } from '@/lib/utils';

const SALUTATIONS: Record<string, Bilingual> = {
  mr: { de: 'Herr', en: 'Mr' },
  ms: { de: 'Frau', en: 'Ms' },
  mx: { de: 'Mx', en: 'Mx' },
  neutral: { de: '', en: '' },
};

/** What each kind of history entry is, and its meaning colour. */
const KINDS: Record<TimelineItem['kind'], { label: Bilingual; icon: ReactNode; tint: Tint }> = {
  enquiry: { label: { de: 'Anfrage', en: 'Enquiry' }, icon: Icon.enquiries, tint: 'ink' },
  course: { label: { de: 'Kursanmeldung', en: 'Course registration' }, icon: Icon.registrations, tint: 'red' },
  exam: { label: { de: 'Prüfungsanmeldung', en: 'Exam registration' }, icon: Icon.registrations, tint: 'blue' },
  review: { label: { de: 'Einstufung', en: 'Placement' }, icon: Icon.placement, tint: 'red' },
};

/** How the record came to be, in a few words; nothing for a demo seed. */
function origin(t: T, createdBy: string, label: string): string | null {
  if (createdBy === 'demo-seed') return null;
  if (createdBy === 'public-site') return t('Über die Website gekommen', 'Came through the website');
  if (createdBy.startsWith('migration-')) return t('Importiert', 'Imported');
  return t(`Angelegt von ${label}`, `Added by ${label}`);
}

/**
 * One person, and everything that has ever come in under their name.
 *
 * The head carries the five things a colleague looks for first — how to reach
 * them, where they are from, when they were born, the level a teacher
 * confirmed — so the cards below are the record's lists: bookings and the
 * history on the left, what still needs a look and the identity decisions on
 * the right.
 *
 * The history is the point of the screen. A registration on its own says
 * "someone wants a B1 course"; the same registration under a person who
 * enquired twice, sat a placement and was confirmed A2.2 by a teacher says
 * something quite different, and staff should not have to search four queues
 * to find that out.
 *
 * If this row was linked INTO another, the page redirects its reader to the
 * survivor by rendering the survivor: `getPerson` follows `merged_into`. The
 * rows that were linked into THIS one are listed under the history, each with
 * an undo, because a wrong link is the one identity mistake that must stay
 * cheap to reverse.
 */
export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }, user] = await Promise.all([
    params,
    searchParams,
    requireModule('people'),
  ]);
  const person = await getPerson(id);

  if (!person) {
    notFound();
  }
  const { t, lang } = await getI18n();

  const canEdit = canAccess(user, 'people', 'edit');
  const canBook = canAccess(user, 'bookings', 'edit');
  const seesBookings = canAccess(user, 'bookings');
  const canOffer = canAccess(user, 'offers', 'edit');
  const [timeline, confirmed, flags, activity, fileMakerLinks, countries, bookings, offer, offers, courseName] =
    await Promise.all([
      personTimeline(person.id, lang),
      latestConfirmedLevel(person.id),
      listFlags('person', person.id),
      activityFor('person', person.id),
      listFileMakerLinks('person', person.id),
      canEdit ? listCountries() : Promise.resolve([]),
      seesBookings ? personBookings(person.id) : Promise.resolve([]),
      canBook ? bookingOffer() : Promise.resolve(null),
      canOffer ? offersFor({ personId: person.id }) : Promise.resolve([]),
      courseNameResolver(),
    ]);

  const salutation = SALUTATIONS[person.salutation ?? ''];
  const title = [salutation ? pick(lang, salutation) : '', person.displayName]
    .filter(Boolean)
    .join(' ');

  const email = person.emails.find((e) => e.isPrimary) ?? person.emails[0];
  const phone = person.phones.find((p) => p.isPrimary) ?? person.phones[0];
  const more = (n: number) => (n > 1 ? t(`+${n - 1} weitere`, `+${n - 1} more`) : undefined);
  const openFlags = flags.filter((f) => !f.resolvedAt);
  const manyChannels = person.emails.length > 1 || person.phones.length > 1;
  // "Added by" is in the head already; the card keeps the decisions after it.
  const decisions = activity.filter((entry) => entry.action !== 'person_created');
  // The side column holds only what this person has; without any of it the
  // record's lists take the full width rather than leaving an empty gutter.
  const hasSide =
    openFlags.length > 0 || manyChannels || fileMakerLinks.length > 0 || decisions.length > 0;
  const canDelete = canAccess(user, 'people', 'full');
  // A registration's course and dates as the queues show them, not as the
  // public form stored them.
  const history = timeline.map((item) =>
    item.kind === 'course'
      ? { ...item, title: courseName(item.title) ?? item.title, detail: optionLine(item.detail, 'course', lang) }
      : item.kind === 'exam'
        ? { ...item, detail: optionLine(item.detail, 'exam', lang) }
        : item
  );

  return (
    <>
      <RecordHeader
        backHref="/admin/people"
        backLabel={t('Alle Teilnehmenden', 'All students')}
        title={title}
        avatar={person.displayName}
        subtitle={[
          person.id !== id
            ? t('Über einen verknüpften Datensatz geöffnet', 'Opened from a linked record')
            : t('In Kontakt seit', 'In touch since') +
              ` ${person.createdAt.toLocaleDateString(wsLocale(lang), { month: 'long', year: 'numeric' })}`,
          origin(t, person.createdBy, pick(lang, person.createdByLabel)),
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            {canEdit ? (
              <FormDialog trigger={t('Bearbeiten', 'Edit')} title={person.displayName}>
                <PersonForm person={person} countries={countries} />
              </FormDialog>
            ) : null}
            {canOffer ? <MakeOffer from={{ personId: person.id }} existing={offers} /> : null}
            {canBook && offer ? (
              <FormDialog
                trigger={t('Neue Buchung', 'New booking')}
                title={t(`${person.displayName} buchen`, `Book ${person.displayName}`)}
                triggerVariant="primary"
                width="lg"
              >
                <BookingWizard
                  personId={person.id}
                  personName={person.displayName}
                  offer={offer}
                  returnTo={`/admin/people/${person.id}`}
                  action={createBookingFromWizardAction}
                />
              </FormDialog>
            ) : null}
          </>
        }
        facts={[
          {
            label: t('E-Mail', 'Email'),
            icon: Icon.mail,
            tint: 'ink',
            value: email?.address,
            sub: more(person.emails.length),
            href: email ? `mailto:${email.address}` : undefined,
          },
          {
            label: t('Telefon', 'Phone'),
            icon: Icon.person,
            tint: 'green',
            value: phone?.number,
            sub: more(person.phones.length),
            href: phone ? `tel:${phone.number}` : undefined,
          },
          {
            // With the date of birth under it, as the person panel on every
            // queue record shows them: five columns cut the address short.
            label: t('Nationalität', 'Nationality'),
            icon: Icon.globe,
            tint: 'sun',
            value: person.nationalityName ?? person.nationalityRaw,
            sub:
              person.birthDate || (!person.nationalityName && person.nationalityRaw) ? (
                <>
                  {!person.nationalityName && person.nationalityRaw ? t('Nicht erkannt', 'Not recognised') : null}
                  {!person.nationalityName && person.nationalityRaw && person.birthDate ? ' · ' : null}
                  {person.birthDate ? (
                    <>
                      {t('Geboren', 'Born')} <BirthDate value={person.birthDate} />
                    </>
                  ) : null}
                </>
              ) : undefined,
          },
          {
            label: t('Niveau', 'Level'),
            icon: Icon.placement,
            tint: 'red',
            value: confirmed?.level,
            sub: confirmed ? (
              <>
                {confirmed.reviewerName ?? t('Ehemaliges Teammitglied', 'A former colleague')} ·{' '}
                <DateText value={confirmed.decidedAt} />
              </>
            ) : (
              t('Noch nicht bestätigt', 'Not confirmed yet')
            ),
          },
        ]}
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          'grid gap-4 lg:items-start',
          hasSide ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : undefined
        )}
      >
        <div className="space-y-4">
          {seesBookings && bookings.length > 0 ? (
            <Card title={t('Buchungen', 'Bookings')} icon={Icon.bookings} tint="red">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {bookings.map((b) => {
                  const balance = b.charged - b.paid;
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ws-sunk"
                      >
                        <span className="min-w-0 text-sm">
                          <span className="flex items-center gap-2 font-semibold">
                            {b.courseTypeName ?? t('Buchung', 'Booking')}
                            <Badge tone={BOOKING_STATUS_TONES[b.status]}>
                              {pick(lang, BOOKING_STATUS_LABELS[b.status])}
                            </Badge>
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">
                            {b.startDate ? (
                              <>
                                <DateText value={b.startDate} /> – <DateText value={b.endDate} />
                              </>
                            ) : (
                              t('Keine Daten', 'No dates')
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span
                            className={cn(
                              'block text-sm font-extrabold tabular-nums',
                              balance > 0
                                ? 'text-[var(--casa-warning-text)]'
                                : 'text-[var(--casa-success-text)]'
                            )}
                          >
                            {new Intl.NumberFormat('de-DE', {
                              style: 'currency',
                              currency: b.currency,
                            }).format(balance)}
                          </span>
                          <span className="block text-xs text-[var(--casa-text-subtle)]">
                            {balance > 0 ? t('offen', 'open') : t('bezahlt', 'paid')}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {history.length > 0 ? (
            <Card title={t('Verlauf', 'History')} icon={Icon.clock} tint="blue">
              <ol className="-my-1.5 divide-y divide-ws-line-soft">
                {history.map((item) => {
                  const kind = KINDS[item.kind];
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link
                        href={item.href}
                        className="group -mx-2 flex items-start gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-ws-sunk"
                      >
                        <IconChip icon={kind.icon} tint={kind.tint} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{item.title}</span>
                            {item.status ? (
                              <Badge tone={STATUS_TONES[normaliseStatus(item.status)]}>
                                {pick(lang, STATUS_LABELS[normaliseStatus(item.status)])}
                              </Badge>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--casa-text-subtle)]">
                            {[pick(lang, kind.label), item.detail].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="shrink-0 pt-0.5 text-xs text-[var(--casa-text-subtle)]">
                          <DateText value={item.at} compact />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Card>
          ) : null}

          {person.linkedDuplicates.length > 0 ? (
            <Card title={t('Verknüpfte Datensätze', 'Linked records')} icon={Icon.people} tint="ink">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {person.linkedDuplicates.map((dup) => (
                  <li key={dup.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold">{dup.displayName}</span>
                      <span className="block text-xs text-[var(--casa-text-subtle)]">
                        {t('Angelegt', 'Created')} <DateText value={dup.createdAt} /> · {dup.createdBy}
                      </span>
                    </span>
                    <form action={unlinkPersonAction}>
                      <input type="hidden" name="personId" value={dup.id} />
                      <input type="hidden" name="returnTo" value={`/admin/people/${person.id}`} />
                      <Button type="submit" variant="ghost" size="sm">
                        {t('Trennen', 'Unlink')}
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {hasSide ? (
          <div className="space-y-4">
            {openFlags.length > 0 ? (
              <Card title={t('Zu prüfen', 'Needs a look')} icon={Icon.flag} tint="sun">
                <ul className="space-y-2">
                  {openFlags.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 rounded-xl bg-[#fffbea] px-3 py-2 text-sm font-semibold"
                    >
                      <span className="text-[var(--casa-warning-text)]">{Icon.flag}</span>
                      {pick(lang, FLAG_LABELS[f.code])}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {manyChannels ? (
              <Card title={t('Kontakt', 'Contact')} icon={Icon.mail} tint="ink">
                <DetailList
                  items={[
                    {
                      label: t('E-Mail', 'Email'),
                      wide: true,
                      value: (
                        <ul className="space-y-1">
                          {person.emails.map((e) => (
                            <li key={e.address}>
                              <a
                                href={`mailto:${e.address}`}
                                className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                              >
                                {e.address}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                    {
                      label: t('Telefon', 'Phone'),
                      wide: true,
                      value:
                        person.phones.length > 0 ? (
                          <ul className="space-y-1">
                            {person.phones.map((p) => (
                              <li key={p.number}>
                                <a href={`tel:${p.number}`} className="font-medium">
                                  {p.number}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null,
                    },
                  ]}
                />
              </Card>
            ) : null}

            {fileMakerLinks.length > 0 ? (
              <Card title={t('In FileMaker', 'In FileMaker')} icon={Icon.external} tint="ink">
                <ul className="space-y-1.5 text-sm">
                  {fileMakerLinks.map((link) => (
                    <li key={link.id} className="flex items-center justify-between gap-2">
                      <span>
                        {link.sourceLayout}{' '}
                        <span className="font-mono text-xs text-[var(--casa-text-subtle)]">
                          {link.sourcePrimaryKey ?? `#${link.sourceRecordId}`}
                        </span>
                      </span>
                      <span className="text-xs text-[var(--casa-text-subtle)]">
                        <DateText value={link.linkedAt} compact />
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {decisions.length > 0 ? (
              <Card title={t('Entscheidungen zur Identität', 'Identity decisions')} icon={Icon.check} tint="green">
                <ol className="relative space-y-3 before:absolute before:top-1 before:bottom-1 before:left-[4px] before:w-px before:bg-ws-line">
                  {decisions.map((entry) => (
                    <li key={entry.id} className="relative flex gap-3 text-xs">
                      <span
                        aria-hidden="true"
                        className="relative mt-1 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-white bg-ws-line-firm"
                      />
                      <span className="text-[var(--casa-text-subtle)]">
                        <span className="font-bold text-[var(--casa-ink)]">
                          {entry.staffName ?? t('Jemand', 'Someone')}
                        </span>{' '}
                        {describeActivity(entry, lang)} · {relativeDays(entry.createdAt, lang)}
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>

      {canDelete ? (
        <RecordFoot>
          <form action={deletePersonAction}>
            <input type="hidden" name="personId" value={person.id} />
            <ConfirmSubmit
              title={t(`${person.displayName} löschen?`, `Delete ${person.displayName}?`)}
              description={t(
                'Die Person verschwindet aus allen Listen. Ihre Anmeldungen und Anfragen bleiben im Posteingang. Ein Inhaber kann den Datensatz wiederherstellen.',
                'The person disappears from every list. Their registrations and enquiries stay in the queues. An owner can restore the record.'
              )}
            >
              {t('Person löschen', 'Delete person')}
            </ConfirmSubmit>
          </form>
        </RecordFoot>
      ) : null}
    </>
  );
}
