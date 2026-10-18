import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { RecordFoot } from '../../bookings/record-foot';
import { courseHref } from '../../catalogue/course-href';
import { deleteGroupAction, setGroupStatusAction } from '../actions';
import { EditGroupForm } from '../group-forms';
import { BookingLightPill } from '@/components/admin/booking-light';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange, euros } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar, Timeline } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, Card, DateText, DetailList, IconChip, RecordHeader, type BadgeTone } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { canAccess } from '@/lib/admin/access';
import { bookingLight, bookingLightLabel, OBSERVATION_REASON_LABELS } from '@/lib/admin/bookings';
import { GROUP_STATUS_LABELS, type GroupStatus } from '@/lib/admin/group-labels';
import { getGroup, groupCourses, groupDeletable, groupFigures, groupOffers, groupOptions, groupParticipants, type GroupParticipant } from '@/lib/admin/groups';
import { requireModule } from '@/lib/admin/guard';
import { num, pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/admin/offers/types';
import { toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

const STATUS_TONES: Record<GroupStatus, BadgeTone> = { open: 'accent', confirmed: 'positive', cancelled: 'quiet' };

const OFFER_TONES: Record<OfferStatus, BadgeTone> = { draft: 'neutral', sent: 'accent', accepted: 'positive', declined: 'quiet', withdrawn: 'quiet', lapsed: 'quiet' };

const range = (from: Date | null, to: Date | null, lang: WsLang) => (from ? dayRange(toDateInputValue(from), toDateInputValue(to ?? from), lang) : null);

/**
 * One group visit (2026-10-18, migration 0058; docs/ADMIN_WORKSPACE.md §Groups), in the record pages'
 * tabs. The head: the name, whether it is on, who sends it and through whom, where from, and the figures
 * — how many come, how many are booked, the stay, what their bookings still owe. Übersicht holds the
 * visit's details, how it travels, the note, and what has been said and done (SchoolMan's comments and
 * work log among it); then the participants, the offers made for it and the group's own courses, each shown to whoever holds that
 * module, and only when there is something in it.
 */
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const [{ id }, { tab, error }, user] = await Promise.all([params, searchParams, requireModule('groups')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const group = await getGroup(id);
  if (!group) notFound();
  const { t, lang } = await getI18n();

  const canEdit = canAccess(user, 'groups', 'edit');
  const canDelete = canAccess(user, 'groups', 'full');
  const seesBookings = canAccess(user, 'bookings');
  const seesCourses = canAccess(user, 'catalogue');
  const seesOrganisations = canAccess(user, 'organisations');
  const seesOffers = canAccess(user, 'offers');

  const [figures, participants, courses, offers, notes, activity, options, deletable] = await Promise.all([
    seesBookings ? groupFigures(id) : Promise.resolve(null),
    seesBookings ? groupParticipants(id) : Promise.resolve([]),
    seesCourses ? groupCourses(id) : Promise.resolve([]),
    seesOffers ? groupOffers(id) : Promise.resolve([]),
    listNotes('group_visit', id),
    activityFor('group_visit', id, 100),
    canEdit ? groupOptions([group.organisationId, group.agencyId, group.courseTypeId]) : Promise.resolve(null),
    canDelete ? groupDeletable(id) : Promise.resolve(false),
  ]);
  const open = figures ? figures.charged - figures.paid : 0;

  const tabs: RecordTab[] = [
    { id: 'overview', label: t('Übersicht', 'Overview'), icon: Icon.overview },
    ...(participants.length ? [{ id: 'participants', label: t('Teilnehmende', 'Students'), icon: Icon.people, count: participants.length }] : []),
    ...(offers.length ? [{ id: 'offers', label: t('Angebote', 'Offers'), icon: Icon.offers, count: offers.length }] : []),
    ...(courses.length ? [{ id: 'courses', label: t('Kurse', 'Courses'), icon: Icon.catalogue, count: courses.length }] : []),
  ];
  const hidden = <input type="hidden" name="groupId" value={id} />;
  const muted = (text: string) => <span className="font-semibold text-[var(--casa-muted)]">{text}</span>;
  const orgLink = (orgId: string | null, name: string | null) =>
    name && orgId && seesOrganisations ? (
      <Link href={`/admin/organisations/${orgId}`} className="hover:text-[var(--casa-ink)] hover:underline">
        {name}
      </Link>
    ) : (
      name
    );
  const ages =
    group.ageFrom != null ? (group.ageTo != null && group.ageTo !== group.ageFrom ? `${group.ageFrom}–${group.ageTo}` : String(group.ageFrom)) : null;
  const people =
    group.participants != null
      ? `${num(lang, group.participants)}${group.escorts ? t(` + ${num(lang, group.escorts)} Begleitung`, ` + ${num(lang, group.escorts)} escorts`) : ''}`
      : null;

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref="/admin/groups"
        backLabel={t('Gruppen', 'Groups')}
        title={group.name}
        avatar={group.name}
        status={
          <Badge tone={STATUS_TONES[group.status]}>
            {group.status === 'confirmed' && group.isOver ? t('Vorbei', 'Over') : pick(lang, GROUP_STATUS_LABELS[group.status])}
          </Badge>
        }
        subtitle={
          <>
            {group.organisationName || group.agencyName ? (
              <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
                {orgLink(group.organisationId, group.organisationName)}
                {group.agencyName && group.agencyId !== group.organisationId ? (
                  <span className="font-normal text-[var(--casa-muted)]">
                    {group.organisationName ? ' · ' : ''}
                    {t('über ', 'via ')}
                    {orgLink(group.agencyId, group.agencyName)}
                  </span>
                ) : null}
              </span>
            ) : null}
            <MetaLine>
              {group.country ? <MetaItem icon={Icon.globe}>{pick(lang, group.country)}</MetaItem> : null}
              {ages ? <MetaItem icon={Icon.people}>{t(`${ages} Jahre`, `aged ${ages}`)}</MetaItem> : null}
              {group.courseTypeName || group.level ? (
                <MetaItem icon={Icon.catalogue}>{[group.courseTypeName, group.level].filter(Boolean).join(' · ')}</MetaItem>
              ) : null}
            </MetaLine>
          </>
        }
        actions={
          options ? (
            <FormDialog icon={Icon.group} tint="ink" trigger={t('Bearbeiten', 'Edit')} title={group.name} width="lg">
              <EditGroupForm group={group} options={options} />
            </FormDialog>
          ) : null
        }
        bar={
          <StatBar>
            <Stat label={t('Personen', 'People')}>{people ?? muted(t('offen', 'not set'))}</Stat>
            {figures ? <Stat label={t('Gebucht', 'Booked')}>{figures.booked ? num(lang, figures.booked) : muted(t('niemand', 'nobody'))}</Stat> : null}
            <Stat label={t('Zeitraum', 'Dates')}>
              {range(group.arrival, group.departure, lang) ?? range(group.courseFrom, group.courseTo, lang) ?? muted(t('offen', 'not set'))}
            </Stat>
            {figures && figures.booked ? <Stat label={t('Offen', 'Owing')}>{open > 0.005 ? euros(open) : muted(t('nichts', 'nothing'))}</Stat> : null}
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${group.name}: Bereiche`, `${group.name}: sections`)} />}
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <RecordTabPanel id="overview">
        <div className={cn('grid gap-4 lg:items-start', (group.travelNote || group.note) && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
          <div className="space-y-4">
            <Card title={t('Gruppe', 'Group')} icon={Icon.group} tint="green">
              <DetailList
                items={[
                  { label: t('Schule oder Firma', 'School or company'), value: orgLink(group.organisationId, group.organisationName) },
                  { label: t('Agentur', 'Agency'), value: orgLink(group.agencyId, group.agencyName) },
                  { label: t('Teilnehmende', 'Students'), value: group.participants != null ? num(lang, group.participants) : null },
                  { label: t('Begleitung', 'Escorts'), value: group.escorts != null ? num(lang, group.escorts) : null },
                  { label: t('Alter', 'Age'), value: ages ? t(`${ages} Jahre`, `${ages} years`) : null },
                  { label: t('Land', 'Country'), value: group.country ? pick(lang, group.country) : null },
                  { label: t('Kursart', 'Course type'), value: group.courseTypeName },
                  { label: t('Niveau', 'Level'), value: group.level },
                  { label: t('Aufenthalt', 'Stay'), value: range(group.arrival, group.departure, lang) },
                  { label: t('Unterricht', 'Lessons'), value: range(group.courseFrom, group.courseTo, lang) },
                ]}
              />
            </Card>
            <Timeline
              canWrite={canEdit}
              entity="group_visit"
              id={id}
              notes={notes}
              activity={activity.filter((entry) => entry.action !== 'group_created')}
              origin={{
                at: group.createdAt,
                label: group.fromSchoolMan ? t('In SchoolMan angelegt', 'Created in SchoolMan') : t('Angelegt', 'Created'),
                icon: Icon.group,
              }}
            />
          </div>
          {group.travelNote || group.note ? (
            <div className="space-y-4">
              {group.travelNote ? (
                <Card title={t('An- und Abreise', 'Travel')} icon={Icon.clock} tint="sun">
                  <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{group.travelNote}</p>
                </Card>
              ) : null}
              {group.note ? (
                <Card title={t('Notiz', 'Note')} icon={Icon.note} tint="sun">
                  <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{group.note}</p>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      </RecordTabPanel>

      {participants.length ? (
        <RecordTabPanel id="participants">
          <Card bleed>
            <ParticipantRows participants={participants} lang={lang} t={t} />
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
                  quiet={!['draft', 'sent', 'accepted'].includes(o.status)}
                  icon={<IconChip icon={Icon.offers} tint="blue" />}
                  title={`${o.title || t('Angebot', 'Offer')} · ${o.number}`}
                  state={<Badge tone={OFFER_TONES[o.status]}>{pick(lang, OFFER_STATUS_LABELS[o.status])}</Badge>}
                  detail={o.perPerson != null ? t(`${euros(o.perPerson)} pro Person`, `${euros(o.perPerson)} per person`) : null}
                  end={<DateText value={o.createdAt} compact />}
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

      {canEdit ? (
        <RecordFoot>
          {group.status !== 'confirmed' ? (
            <StatusForm
              hidden={hidden}
              to="confirmed"
              title={t(`${group.name} bestätigen?`, `Confirm ${group.name}?`)}
              description={t('Die Gruppe kommt.', 'The group is coming.')}
              label={t('Bestätigen', 'Confirm')}
            />
          ) : null}
          {group.status !== 'cancelled' ? (
            <StatusForm
              hidden={hidden}
              to="cancelled"
              title={t(`${group.name} absagen?`, `Cancel ${group.name}?`)}
              description={t(
                'Sie bleibt mit allem erhalten und steht unter „Abgesagt“. Die Buchungen der Teilnehmenden bleiben, wie sie sind.',
                'It stays with everything and is listed under “Cancelled”. The participants’ bookings stay as they are.',
              )}
              label={t('Absagen', 'Cancel')}
            />
          ) : (
            <StatusForm
              hidden={hidden}
              to="open"
              title={t(`${group.name} wieder öffnen?`, `Reopen ${group.name}?`)}
              description={t('Sie steht wieder unter „Angefragt“.', 'It is listed under “Requested” again.')}
              label={t('Wieder öffnen', 'Reopen')}
            />
          )}
          {deletable ? (
            <form action={deleteGroupAction}>
              {hidden}
              <ConfirmSubmit
                title={t('Diese Gruppe löschen?', 'Delete this group?')}
                description={t('Ihre Notizen werden mit gelöscht.', 'Its notes are deleted with it.')}
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

function StatusForm({ hidden, to, title, description, label }: { hidden: ReactNode; to: GroupStatus; title: string; description: string; label: string }) {
  return (
    <form action={setGroupStatusAction}>
      {hidden}
      <input type="hidden" name="status" value={to} />
      <ConfirmSubmit title={title} description={description} confirmLabel={label}>
        {label}
      </ConfirmSubmit>
    </form>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="py-1.5">{children}</ul>;
}

/** One row: its mark, what it is, its state, a line under it, and what stands at its end. */
function Row({
  href,
  icon,
  title,
  state,
  detail,
  end,
  quiet = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  state?: ReactNode;
  detail?: string | null;
  end?: ReactNode;
  quiet?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]"
      >
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
    </li>
  );
}

/** The participants: the learner, the booking's colour, number, dates and stay, what is still open. */
function ParticipantRows({ participants, lang, t }: { participants: readonly GroupParticipant[]; lang: WsLang; t: T }) {
  return (
    <Rows>
      {participants.map((p) => {
        const open = p.charged - p.paid;
        return (
          <Row
            key={p.bookingId}
            href={`/admin/bookings/${p.bookingId}`}
            quiet={p.status === 'cancelled'}
            icon={<IconChip icon={Icon.bookings} tint="sun" />}
            title={p.personName}
            state={
              <BookingLightPill
                light={bookingLight(p)}
                label={pick(lang, bookingLightLabel(p))}
                detail={p.observationReason && p.status !== 'cancelled' ? pick(lang, OBSERVATION_REASON_LABELS[p.observationReason]) : undefined}
              />
            }
            detail={[p.number, range(p.startDate, p.endDate, lang) ?? t('Keine Daten', 'No dates'), p.stay].filter(Boolean).join(' · ')}
            end={
              p.status !== 'cancelled' && open > 0.005 ? (
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
