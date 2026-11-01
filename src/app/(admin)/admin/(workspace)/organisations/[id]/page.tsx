import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { RecordFoot } from '../../bookings/record-foot';
import { courseHref } from '../../catalogue/course-href';
import {
  addOrganisationBankAccountAction,
  deleteOrganisationAction,
  removeCommissionAction,
  removeContactAction,
  removeOrganisationBankAccountAction,
  setOrganisationActiveAction,
  updateOrganisationBankAccountAction,
} from '../actions';
import { BankAddresses } from '../../people/bank-addresses';
import { BankAccountForm } from '../../people/person-form';
import { CommissionForm, ContactForm, EditOrganisationForm } from '../organisation-forms';
import { BookingLightDot } from '@/components/admin/booking-light';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { LetterList } from '@/components/admin/letters/letter-list';
import { dayRange, euros } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar, Timeline } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, Card, DateText, IconChip, RecordHeader, type BadgeTone } from '@/components/admin/ui';
import { MoreInPanel, MoreLink } from '@/components/admin/more-in-panel';
import { canAccess, type WorkspaceModule } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingLight, bookingLightLabel } from '@/lib/admin/bookings';
import { GROUP_STATUS_LABELS, type GroupStatus } from '@/lib/admin/group-labels';
import { organisationGroups } from '@/lib/admin/groups';
import { requireModule } from '@/lib/admin/guard';
import { listNotes } from '@/lib/admin/notes';
import { num, pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import type { LetterKind } from '@/lib/admin/letters/types';
import { OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/admin/offers/types';
import { CONTACT_SALUTATION_LABELS, ORGANISATION_KIND_LABELS, ORGANISATION_RELATION_LABELS } from '@/lib/admin/organisation-labels';
import {
  commissionChargeTypes,
  commissionTerms,
  getOrganisation,
  organisationBookings,
  organisationContacts,
  organisationCountries,
  organisationCourses,
  organisationDeletable,
  organisationFigures,
  organisationLetters,
  organisationInvoices,
  organisationOffers,
  organisationOrders,
  organisationPayouts,
  type OrganisationPayout,
  type CommissionTerm,
  type OrganisationBooking,
} from '@/lib/admin/organisations';
import { toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { owesMoney } from '@/lib/admin/open-money';
import { listOrganisationBankAccounts } from '@/lib/admin/people';
import { mailHref } from '@/lib/admin/mail/href';

const GROUP_TONES: Record<GroupStatus, BadgeTone> = { open: 'accent', confirmed: 'positive', cancelled: 'quiet' };

const OFFER_TONES: Record<OfferStatus, BadgeTone> = {
  draft: 'neutral',
  sent: 'accent',
  accepted: 'positive',
  declined: 'quiet',
  withdrawn: 'quiet',
  lapsed: 'quiet',
};

/** The module a letter is opened with (`/admin/letters/[id]` asks for it): an offer's, a registration's, a booking's. */
const letterModule = (kind: LetterKind): WorkspaceModule => (kind === 'offer' ? 'offers' : kind.startsWith('registration_') ? 'registrations' : 'bookings');

/** „20 % auf Kurspreis". */
const termLine = (term: CommissionTerm, lang: WsLang, t: T) =>
  `${num(lang, term.percentage)} %${term.chargeType ? ` ${t('auf', 'on')} ${pick(lang, term.chargeType)}` : ''}`;

const range = (from: Date | null, to: Date | null, lang: WsLang) => (from && to ? dayRange(toDateInputValue(from), toDateInputValue(to), lang) : null);

/**
 * One organisation (2026-10-18, migration 0057; docs/ADMIN_WORKSPACE.md §Organisations), in the record
 * pages' tabs. The head: the name, what it is, whether CASA still works with it, how to reach it, and the
 * figures — the bookings it pays now or ahead and their learners, its contacts, an agency's commission.
 * Übersicht holds the contacts, an agency's commission, its agreement and the note; then the bookings it
 * pays, the group visits it sends or books (0058), a company's own courses, the offers made to it and the
 * letters sent to it — each shown to whoever holds that module, and only when there is something in it.
 */
export default async function OrganisationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const [{ id }, { tab, error }, user] = await Promise.all([params, searchParams, requireModule('organisations')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const organisation = await getOrganisation(id);
  if (!organisation) notFound();
  const { t, lang } = await getI18n();

  const canEdit = canAccess(user, 'organisations', 'edit');
  const canDelete = canAccess(user, 'organisations', 'full');
  const seesBookings = canAccess(user, 'bookings');
  const seesCourses = canAccess(user, 'catalogue');
  const seesOffers = canAccess(user, 'offers');
  const seesGroups = canAccess(user, 'groups');
  const isAgency = organisation.kind === 'agency';
  // Its own bank accounts (0092): the module `private_data`, as a person's.
  const seesBank = canAccess(user, 'private_data');
  const editsBank = canEdit && canAccess(user, 'private_data', 'edit');
  const removesBank = canEdit && canAccess(user, 'private_data', 'full');

  const [contacts, terms, figures, bookings, groups, courses, offers, letters, countries, chargeTypes, deletable, invoices, payouts, orders, notes, activity, bank] = await Promise.all([
    organisationContacts(id),
    commissionTerms(id),
    seesBookings ? organisationFigures(id) : Promise.resolve(null),
    seesBookings ? organisationBookings(id) : Promise.resolve(null),
    seesGroups ? organisationGroups(id) : Promise.resolve([]),
    seesCourses ? organisationCourses(id) : Promise.resolve([]),
    seesOffers ? organisationOffers(id) : Promise.resolve([]),
    organisationLetters(id),
    canEdit ? organisationCountries() : Promise.resolve([]),
    canEdit ? commissionChargeTypes() : Promise.resolve([]),
    canDelete ? organisationDeletable(id) : Promise.resolve(false),
    seesBookings ? organisationInvoices(id) : Promise.resolve([]),
    seesBookings ? organisationPayouts(id) : Promise.resolve([]),
    organisation.relation === 'publisher' ? organisationOrders(id) : Promise.resolve([]),
    listNotes('organisation', id),
    // Its history: what colleagues changed here, and SchoolMan's work-log lines about it (the bridge, 2026-10-26).
    activityFor('organisation', id),
    seesBank ? listOrganisationBankAccounts(id) : Promise.resolve([]),
  ]);
  const seenLetters = letters.items.filter((l) => canAccess(user, letterModule(l.kind)));
  const letterCount = seenLetters.length === letters.items.length ? letters.total : seenLetters.length;
  const bookingCount = bookings ? bookings.current.length + bookings.earlierTotal : 0;
  const showsCommission = isAgency || terms.length > 0;

  const tabs: RecordTab[] = [
    { id: 'overview', label: t('Übersicht', 'Overview'), icon: Icon.overview },
    ...(bookingCount ? [{ id: 'bookings', label: t('Buchungen', 'Bookings'), icon: Icon.bookings, count: bookingCount }] : []),
    ...(groups.length ? [{ id: 'groups', label: t('Gruppen', 'Groups'), icon: Icon.group, count: groups.length }] : []),
    ...(courses.length ? [{ id: 'courses', label: t('Kurse', 'Courses'), icon: Icon.catalogue, count: courses.length }] : []),
    ...(offers.length ? [{ id: 'offers', label: t('Angebote', 'Offers'), icon: Icon.offers, count: offers.length }] : []),
    ...(seenLetters.length ? [{ id: 'letters', label: t('Briefe', 'Letters'), icon: Icon.mail, count: letterCount }] : []),
    ...(invoices.length ? [{ id: 'invoices', label: t('Rechnungen', 'Invoices'), icon: Icon.statement, count: invoices.length }] : []),
    ...(payouts.length ? [{ id: 'payouts', label: t('Auszahlungen', 'Paid out'), icon: Icon.money, count: payouts.length }] : []),
    ...(orders.length ? [{ id: 'orders', label: t('Bestellungen', 'Orders'), icon: Icon.book, count: orders.length }] : []),
    // An agency's account is where its commission goes; another organisation shows the tab once it has one.
    ...(seesBank && (bank.length || (isAgency && editsBank)) ? [{ id: 'bank', label: t('Bankverbindung', 'Bank details'), icon: Icon.money }] : []),
    { id: 'history', label: t('Notizen und Verlauf', 'Notes and history'), icon: Icon.note, count: notes.length },
  ];
  const hidden = <input type="hidden" name="organisationId" value={id} />;
  const muted = (text: string) => <span className="font-semibold text-[var(--casa-muted)]">{text}</span>;

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref="/admin/organisations"
        backLabel={t('Organisationen', 'Organisations')}
        title={organisation.name}
        avatar={organisation.name}
        status={!organisation.isActive ? <Badge tone="quiet">{t('Inaktiv', 'Inactive')}</Badge> : null}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
              {pick(lang, ORGANISATION_KIND_LABELS[organisation.kind])}
              {organisation.relation ? <span className="font-normal text-[var(--casa-muted)]"> · {pick(lang, ORGANISATION_RELATION_LABELS[organisation.relation])}</span> : null}
            </span>
            <MetaLine>
              <MetaItem icon={Icon.globe}>
                {[organisation.country ? pick(lang, organisation.country) : null, organisation.language === 'de' ? t('auf Deutsch', 'in German') : t('auf Englisch', 'in English')]
                  .filter(Boolean)
                  .join(' · ')}
              </MetaItem>
              {organisation.email ? (
                <MetaItem icon={Icon.mail}>
                  <Link href={mailHref('organisation', organisation.id)} className="hover:text-[var(--casa-ink)] hover:underline">
                    {organisation.email}
                  </Link>
                  {organisation.emailNote ? <span> · {organisation.emailNote}</span> : null}
                </MetaItem>
              ) : null}
              {organisation.phone ? (
                <MetaItem icon={Icon.phone}>
                  <a href={`tel:${organisation.phone}`} className="hover:text-[var(--casa-ink)] hover:underline">
                    {organisation.phone}
                  </a>
                </MetaItem>
              ) : null}
              {organisation.address ? (
                <MetaItem icon={Icon.rooms}>
                  {organisation.address
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .join(', ')}
                </MetaItem>
              ) : null}
            </MetaLine>
          </>
        }
        actions={
          canEdit ? (
            <FormDialog icon={Icon.globe} tint="ink" trigger={t('Bearbeiten', 'Edit')} title={organisation.name} width="lg">
              <EditOrganisationForm organisation={organisation} countries={countries} />
            </FormDialog>
          ) : null
        }
        bar={
          <StatBar>
            {figures ? (
              <>
                <Stat label={t('Laufende Buchungen', 'Current bookings')}>{figures.currentBookings ? num(lang, figures.currentBookings) : muted(t('keine', 'none'))}</Stat>
                <Stat label={t('Teilnehmende', 'Students')}>{figures.learners ? num(lang, figures.learners) : muted(t('keine', 'none'))}</Stat>
              </>
            ) : null}
            <Stat label={t('Kontakte', 'Contacts')}>{contacts.length ? num(lang, contacts.length) : muted(t('keine', 'none'))}</Stat>
            {isAgency ? (
              <Stat label={t('Provision', 'Commission')}>{terms.length ? terms.map((term) => termLine(term, lang, t)).join(' · ') : muted(t('keine', 'none'))}</Stat>
            ) : null}
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${organisation.name}: Bereiche`, `${organisation.name}: sections`)} />}
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <RecordTabPanel id="overview">
        <div className={cn('grid gap-4 lg:items-start', (organisation.agreement || organisation.note) && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
          <div className="space-y-4">
            <Card
              title={t('Kontakte', 'Contacts')}
              icon={Icon.people}
              tint="green"
              actions={
                canEdit ? (
                  <FormDialog icon={Icon.person} tint="green" trigger={t('Kontakt hinzufügen', 'Add contact')} title={t('Neuer Kontakt', 'New contact')} triggerVariant="tertiary" size="sm" width="lg">
                    <ContactForm organisationId={id} />
                  </FormDialog>
                ) : undefined
              }
            >
              {contacts.length ? (
                <ul className="-my-1 divide-y divide-ws-line-soft">
                  {contacts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[var(--casa-ink)]">
                          {c.salutation !== 'none' && (c.firstName || c.lastName) ? `${pick(lang, CONTACT_SALUTATION_LABELS[c.salutation])} ` : ''}
                          {c.name}
                          {c.role ? <span className="ml-2 font-normal text-[var(--casa-muted)]">{c.role}</span> : null}
                          {c.isMain && contacts.length > 1 ? (
                            <Badge tone="accent" className="ml-2 align-middle">
                              {t('Hauptkontakt', 'Main contact')}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.8rem] text-[var(--casa-muted)]">
                          {c.email && c.email !== c.name ? (
                            <Link href={mailHref('contact', c.id)} className="hover:text-[var(--casa-ink)] hover:underline">
                              {c.email}
                            </Link>
                          ) : null}
                          {c.phone ? (
                            <a href={`tel:${c.phone}`} className="tabular-nums hover:text-[var(--casa-ink)] hover:underline">
                              {c.phone}
                            </a>
                          ) : null}
                        </span>
                      </span>
                      {canEdit ? (
                        <span className="flex items-center gap-1">
                          <FormDialog icon={Icon.person} tint="green" trigger={t('Ändern', 'Change')} title={c.name} triggerVariant="tertiary" size="sm" width="lg">
                            <ContactForm organisationId={id} contact={c} />
                          </FormDialog>
                          {canDelete ? (
                            <form action={removeContactAction}>
                              {hidden}
                              <input type="hidden" name="contactId" value={c.id} />
                              <ConfirmSubmit title={t('Diesen Kontakt entfernen?', 'Remove this contact?')} description={c.name} confirmLabel={t('Entfernen', 'Remove')} size="sm" variant="ghost">
                                {t('Entfernen', 'Remove')}
                              </ConfirmSubmit>
                            </form>
                          ) : null}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--casa-muted)]">{t('Noch kein Kontakt.', 'No contact yet.')}</p>
              )}
            </Card>

            {showsCommission ? (
              <Card
                title={t('Provision', 'Commission')}
                icon={Icon.money}
                tint="green"
                actions={
                  canEdit ? (
                    <FormDialog icon={Icon.money} tint="green" trigger={t('Provision eintragen', 'Add commission')} title={t('Provision', 'Commission')} triggerVariant="tertiary" size="sm">
                      <CommissionForm organisationId={id} chargeTypes={chargeTypes} />
                    </FormDialog>
                  ) : undefined
                }
              >
                {terms.length ? (
                  <ul className="-my-1 divide-y divide-ws-line-soft">
                    {terms.map((term) => (
                      <li key={term.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--casa-ink)] tabular-nums">{termLine(term, lang, t)}</span>
                          {term.note ? <span className="block text-[0.8rem] text-[var(--casa-muted)]">{term.note}</span> : null}
                        </span>
                        {canEdit ? (
                          <span className="flex items-center gap-1">
                            <FormDialog icon={Icon.money} tint="green" trigger={t('Ändern', 'Change')} title={t('Provision', 'Commission')} triggerVariant="tertiary" size="sm">
                              <CommissionForm organisationId={id} chargeTypes={chargeTypes} term={term} />
                            </FormDialog>
                            {canDelete ? (
                              <form action={removeCommissionAction}>
                                {hidden}
                                <input type="hidden" name="termId" value={term.id} />
                                <ConfirmSubmit
                                  title={t('Diese Provision entfernen?', 'Remove this commission?')}
                                  description={termLine(term, lang, t)}
                                  confirmLabel={t('Entfernen', 'Remove')}
                                  size="sm"
                                  variant="ghost"
                                >
                                  {t('Entfernen', 'Remove')}
                                </ConfirmSubmit>
                              </form>
                            ) : null}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--casa-muted)]">{t('Keine Provision eingetragen.', 'No commission recorded.')}</p>
                )}
              </Card>
            ) : null}
          </div>

          {organisation.agreement || organisation.note ? (
            <div className="space-y-4">
              {organisation.agreement ? (
                <Card title={t('Vereinbarung', 'Agreement')} icon={Icon.statement} tint="sun">
                  <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{organisation.agreement}</p>
                </Card>
              ) : null}
              {organisation.note ? (
                <Card title={t('Notiz', 'Note')} icon={Icon.note} tint="sun">
                  <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{organisation.note}</p>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      </RecordTabPanel>

      {bookings && bookingCount ? (
        <RecordTabPanel id="bookings">
          {/* The soonest few here; all of them in the Buchungen list, narrowed to what it pays (2026-10-20). */}
          <Card bleed>
            {bookings.current.length ? (
              <Group label={t('Laufend und kommend', 'Current and upcoming')} count={bookings.current.length}>
                <BookingRows bookings={bookings.current.slice(0, SHOWN)} lang={lang} t={t} />
              </Group>
            ) : (
              <Group label={t('Frühere', 'Earlier')} count={bookings.earlierTotal}>
                <BookingRows bookings={bookings.earlier.slice(0, SHOWN)} lang={lang} t={t} quiet />
              </Group>
            )}
            {bookings.current.length + bookings.earlierTotal > SHOWN ? (
              <div className="px-4 pt-1 pb-4">
                <MoreLink
                  href={`/admin/bookings?${bookings.current.length ? '' : 'filter=all&'}org=${id}`}
                  label={t('Alle Buchungen', 'All bookings')}
                  count={bookings.current.length + bookings.earlierTotal}
                />
              </div>
            ) : null}
          </Card>
        </RecordTabPanel>
      ) : null}

      {groups.length ? (
        <RecordTabPanel id="groups">
          <Card bleed>
            <Rows>
              {groups.map((g) => (
                <Row
                  key={g.id}
                  href={`/admin/groups/${g.id}`}
                  quiet={g.status === 'cancelled' || g.isOver}
                  icon={<IconChip icon={Icon.group} tint="green" />}
                  title={g.name}
                  state={
                    <Badge tone={GROUP_TONES[g.status]}>{g.status === 'confirmed' && g.isOver ? t('Vorbei', 'Over') : pick(lang, GROUP_STATUS_LABELS[g.status])}</Badge>
                  }
                  detail={[range(g.startDate, g.endDate ?? g.startDate, lang), g.viaAgency ? t('als Agentur', 'as the agency') : null].filter(Boolean).join(' · ') || null}
                />
              ))}
            </Rows>
          </Card>
        </RecordTabPanel>
      ) : null}

      {courses.length ? (
        <RecordTabPanel id="courses">
          <Card bleed>
            <Rows>
              {courses.map((c) => (
                <Row
                  key={c.id}
                  href={courseHref(c.id)}
                  icon={<IconChip icon={Icon.catalogue} tint="red" />}
                  title={c.label}
                  state={c.cancelled ? <Badge tone="danger">{t('Abgesagt', 'Cancelled')}</Badge> : null}
                  detail={range(c.startDate, c.endDate, lang)}
                />
              ))}
            </Rows>
          </Card>
        </RecordTabPanel>
      ) : null}

      {offers.length ? (
        <RecordTabPanel id="offers">
          <Card bleed>
            <Rows>
              {offers.map((o) => (
                <Row
                  key={o.id}
                  href={`/admin/offers/${o.id}`}
                  icon={<IconChip icon={Icon.offers} tint="blue" />}
                  title={`${o.title || o.groupName || t('Angebot', 'Offer')} · ${o.number}`}
                  state={<Badge tone={OFFER_TONES[o.status]}>{pick(lang, OFFER_STATUS_LABELS[o.status])}</Badge>}
                  detail={range(o.arrival, o.departure, lang)}
                  end={<DateText value={o.createdAt} compact />}
                />
              ))}
            </Rows>
          </Card>
        </RecordTabPanel>
      ) : null}

      {seenLetters.length ? (
        <RecordTabPanel id="letters">
          <Card bleed>
            <LetterList
              variant="tab"
              title={t('Briefe', 'Letters')}
              total={letterCount}
              rows={seenLetters.map((l) => ({
                id: l.id,
                kind: l.kind,
                kindLabel: pick(lang, LETTER_KIND_LABELS[l.kind]),
                subject: l.subject,
                by: l.sentByName,
                sentAt: new Date(l.sentAt).toISOString(),
              }))}
            />
          </Card>
        </RecordTabPanel>
      ) : null}

      {invoices.length ? (
        <RecordTabPanel id="invoices">
          <Card bleed>
            <Rows>
              {invoices.map((i) => (
                <Row
                  key={i.id}
                  href={
                    i.letterId && canAccess(user, 'bookings')
                      ? `/admin/letters/${i.letterId}`
                      : i.bookingId
                        ? `/admin/bookings/${i.bookingId}`
                        : `/admin/organisations/${id}?tab=invoices`
                  }
                  icon={<IconChip icon={Icon.statement} tint="blue" />}
                  title={t(`Rechnung ${i.number}`, `Invoice ${i.number}`)}
                  state={i.cancelled ? <Badge tone="danger">{t('storniert', 'cancelled')}</Badge> : undefined}
                  detail={[i.issuedOn ? dayRange(i.issuedOn, i.issuedOn, lang) : null, i.subject].filter(Boolean).join(' · ') || null}
                  end={i.amount != null ? euros(i.amount) : null}
                />
              ))}
            </Rows>
          </Card>
        </RecordTabPanel>
      ) : null}

      {orders.length ? (
        <RecordTabPanel id="orders">
          <Card bleed>
            <ul className="divide-y divide-ws-line-soft">
              {orders.map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-[0.88rem] font-semibold text-[var(--casa-ink)]">
                      {o.orderedOn ? dayRange(o.orderedOn, o.orderedOn, lang) : t('Bestellung', 'Order')}
                      {o.done === false ? <span className="ml-2"><Badge tone="accent">{t('Offen', 'Open')}</Badge></span> : null}
                    </span>
                    <span className="text-[0.86rem] font-semibold tabular-nums">{euros(o.net)}</span>
                  </span>
                  <span className="mt-0.5 block text-[0.8rem] text-[var(--casa-muted)]">
                    {o.lines.map((l) => `${l.quantity != null ? `${num(lang, l.quantity)} × ` : ''}${l.title ?? '—'}`).join(' · ')}
                    {o.orderedBy ? ` · ${o.orderedBy}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </RecordTabPanel>
      ) : null}

      {payouts.length ? (
        <RecordTabPanel id="payouts">
          {/* The last few here; every payout at the side, by month with the month's sum (2026-10-20). */}
          <Card bleed>
            <Rows>
              {payouts.slice(0, SHOWN).map((p) => (
                <li key={p.id}>
                  <PayoutLine payout={p} id={id} t={t} lang={lang} />
                </li>
              ))}
            </Rows>
            {payouts.length > SHOWN ? (
              <div className="px-4 pt-1 pb-4">
                <MoreInPanel
                  title={t('Ausgezahlt', 'Paid out')}
                  label={t('Alle Auszahlungen', 'All payouts')}
                  icon={Icon.money}
                  tint="sun"
                  rows={payouts.map((p) => ({
                    key: p.id,
                    node: <PayoutLine payout={p} id={id} t={t} lang={lang} />,
                    search: [p.personName, p.bookingNumber].filter(Boolean).join(' '),
                    at: p.paidOn ? `${p.paidOn}T12:00:00Z` : undefined,
                    amount: p.amount,
                  }))}
                />
              </div>
            ) : null}
          </Card>
        </RecordTabPanel>
      ) : null}

      {seesBank && (bank.length || (isAgency && editsBank)) ? (
        <RecordTabPanel id="bank">
          <Card
            title={t('Bankverbindung', 'Bank details')}
            icon={Icon.money}
            tint="green"
            actions={
              editsBank ? (
                <FormDialog icon={Icon.money} tint="ink" trigger={t('Konto hinzufügen', 'Add account')} title={t('Bankverbindung', 'Bank details')} triggerVariant="tertiary" size="sm">
                  <BankAccountForm holder={organisation.name} action={addOrganisationBankAccountAction} hidden={{ organisationId: id }} />
                </FormDialog>
              ) : undefined
            }
          >
            {bank.length ? (
              <ul className="-my-1 divide-y divide-ws-line-soft">
                {bank.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      <span className="block font-mono font-semibold">{b.iban.replace(/(.{4})/g, '$1 ').trim()}</span>
                      <span className="block text-[0.8rem] text-[var(--casa-muted)]">{[b.holder, b.bankName, b.bic, b.note].filter(Boolean).join(' · ')}</span>
                      <BankAddresses account={b} t={t} />
                    </span>
                    <span className="flex items-center gap-1">
                      {editsBank ? (
                        <FormDialog icon={Icon.money} tint="ink" trigger={t('Ändern', 'Change')} title={t('Bankverbindung', 'Bank details')} triggerVariant="tertiary" size="sm">
                          <BankAccountForm holder={organisation.name} account={b} action={updateOrganisationBankAccountAction} hidden={{ organisationId: id }} />
                        </FormDialog>
                      ) : null}
                      {removesBank ? (
                        <form action={removeOrganisationBankAccountAction}>
                          {hidden}
                          <input type="hidden" name="accountId" value={b.id} />
                          <ConfirmSubmit title={t('Dieses Konto entfernen?', 'Remove this account?')} description={b.iban.replace(/(.{4})/g, '$1 ').trim()} confirmLabel={t('Entfernen', 'Remove')} size="sm" variant="ghost">
                            {t('Entfernen', 'Remove')}
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--casa-muted)]">{t('Noch keine Bankverbindung.', 'No bank details yet.')}</p>
            )}
          </Card>
        </RecordTabPanel>
      ) : null}

      <RecordTabPanel id="history">
        <div className="max-w-3xl">
          <Timeline canWrite={canEdit} entity="organisation" id={id} notes={notes} activity={activity} />
        </div>
      </RecordTabPanel>

      {canEdit ? (
        <RecordFoot>
          <form action={setOrganisationActiveAction}>
            {hidden}
            <input type="hidden" name="active" value={organisation.isActive ? '0' : '1'} />
            <ConfirmSubmit
              title={
                organisation.isActive
                  ? t(`${organisation.name} auf inaktiv setzen?`, `Set ${organisation.name} inactive?`)
                  : t(`${organisation.name} wieder aktiv?`, `${organisation.name} active again?`)
              }
              description={
                organisation.isActive
                  ? t('Sie bleibt mit allem erhalten und steht unter „Inaktiv“.', 'It stays with everything and is listed under “Inactive”.')
                  : t('Sie steht wieder unter den aktiven Organisationen.', 'It is listed with the active organisations again.')
              }
              confirmLabel={organisation.isActive ? t('Inaktiv setzen', 'Set inactive') : t('Wieder aktiv', 'Active again')}
            >
              {organisation.isActive ? t('Inaktiv setzen', 'Set inactive') : t('Wieder aktiv', 'Active again')}
            </ConfirmSubmit>
          </form>
          {deletable ? (
            <form action={deleteOrganisationAction}>
              {hidden}
              <ConfirmSubmit
                title={t('Diese Organisation löschen?', 'Delete this organisation?')}
                description={t('Ihre Kontakte und ihre Provision werden mit gelöscht.', 'Its contacts and commission are deleted with it.')}
              >
                {t('Löschen', 'Delete')}
              </ConfirmSubmit>
            </form>
          ) : null}
        </RecordFoot>
      ) : null}
    </RecordTabs>
  );
}

/** A group of rows in a tab's card: its label and how many. */
function Group({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <section className="border-t border-ws-line-soft first:border-t-0">
      <h3 className="px-4 pt-3.5 pb-1.5 text-xs font-bold text-[var(--casa-ink)]">
        {label} <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-[var(--ws-head)] px-1.5 py-px text-[0.68rem] font-semibold tabular-nums">{count}</span>
      </h3>
      {children}
    </section>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="py-1.5">{children}</ul>;
}

/** One row: its mark, what it is, its state, a line under it, and what stands at its end. */
function Row(props: RowProps) {
  return (
    <li>
      <RowLink {...props} />
    </li>
  );
}

type RowProps = { href: string; icon: ReactNode; title: string; state?: ReactNode; detail?: string | null; end?: ReactNode; quiet?: boolean };

/** A row's link without its list item, for the side panel, which holds its own list. */
function RowLink({ href, icon, title, state, detail, end, quiet = false }: RowProps) {
  return (
    <Link href={href} className="group flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]">
      <span className={cn(quiet && 'opacity-70')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('truncate text-[0.88rem] font-semibold', quiet ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]')}>{title}</span>
          {state}
        </span>
        {detail ? <span className="mt-0.5 block truncate text-[0.78rem] text-[var(--casa-muted)]">{detail}</span> : null}
      </span>
      {end ? <span className="shrink-0 text-right text-[0.76rem] text-[var(--casa-muted)] tabular-nums">{end}</span> : null}
    </Link>
  );
}

/** How many rows a long tab shows before the rest is a click away (2026-10-20). */
const SHOWN = 10;

/** One payout: to whom, for which booking, when, how much. */
function PayoutLine({ payout: p, id, t, lang }: { payout: OrganisationPayout; id: string; t: T; lang: WsLang }) {
  return (
    <RowLink
      href={p.bookingId ? `/admin/bookings/${p.bookingId}` : `/admin/organisations/${id}?tab=payouts`}
      icon={<IconChip icon={Icon.money} tint="sun" />}
      title={[p.personName, p.bookingNumber].filter(Boolean).join(' · ') || t('Auszahlung', 'Payout')}
      detail={p.paidOn ? dayRange(p.paidOn, p.paidOn, lang) : null}
      end={euros(p.amount)}
    />
  );
}

/** The bookings it pays: the learner, the booking's colour, the course, number and dates, what is still open. */
function BookingRows({ bookings, lang, t, quiet = false }: { bookings: readonly OrganisationBooking[]; lang: WsLang; t: T; quiet?: boolean }) {
  return (
    <Rows>
      {bookings.map((b) => {
        const open = b.charged - b.paid;
        return (
          <Row
            key={b.id}
            href={`/admin/bookings/${b.id}`}
            quiet={quiet}
            icon={<IconChip icon={Icon.bookings} tint="sun" />}
            title={b.personName}
            state={
              <BookingLightDot
                light={bookingLight(b)}
                label={pick(lang, bookingLightLabel(b))}
                size="md"
              />
            }
            detail={[b.courseTypeName, b.number, range(b.startDate, b.endDate, lang) ?? t('Keine Daten', 'No dates')].filter(Boolean).join(' · ')}
            end={
              b.status !== 'cancelled' && owesMoney(open) ? (
                <>
                  <span className="block text-[0.86rem] font-bold text-[#9a5b00]">{euros(open)}</span>
                  <span className="block text-[0.72rem]">{t('offen', 'open')}</span>
                </>
              ) : null
            }
          />
        );
      })}
    </Rows>
  );
}
