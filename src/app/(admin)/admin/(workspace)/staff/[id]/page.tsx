import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RecordFoot } from '../../bookings/record-foot';
import { AddressForm, BankAccountForm, PersonForm } from '../../people/person-form';
import {
  addStaffBankAccountAction,
  deleteStaffAction,
  removeContractAction,
  removeLicenceAction,
  removeStaffBankAccountAction,
  saveStaffAddressAction,
  setStaffActiveAction,
  takeBackAbsenceAction,
  updateStaffBankAccountAction,
  updateStaffPersonAction,
} from '../actions';
import { AbsenceForm, AccountForm, ContractForm, DeskForm, HrNumbersForm, LicenceForm, RolesForm, TeachingForm } from '../staff-forms';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, BirthDate, Button, Card, DetailList, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { EXAMINER_PART_LABELS, needsLicence } from '@/lib/admin/exam-parts';
import { licenceExams, staffLicences, staffSittings } from '@/lib/admin/examiners';
import { requireModule } from '@/lib/admin/guard';
import { cn } from '@/lib/utils';
import { counted, num, pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { ABSENCE_LABELS, WEEKDAY_LABELS } from '@/lib/admin/kursplanung/types';
import { getPerson, listBankAccounts, listCountries } from '@/lib/admin/people';
import { CONTRACT_KIND_LABELS, COURSE_KIND_LABELS } from '@/lib/admin/staff-labels';
import {
  getStaffMember,
  staffContracts,
  staffKeys,
  staffHrNumbers,
  staffRoles,
  unlinkedAccounts,
  upcomingAbsences,
  upcomingTeaching,
  type TeachingDay,
} from '@/lib/admin/staff-members';
import { staffDesk } from '@/lib/admin/day-plan';
import { staffTime } from '@/lib/admin/staff-time';
import { StaffHours } from './hours';
import { DESK_LABELS } from '@/lib/admin/day-plan-labels';
import { mailHref } from '@/lib/admin/mail/href';

/** How far ahead the lesson days are shown: four weeks unless a colleague asks for more (`?weeks=`). */
const SPANS = [4, 8, 12, 26] as const;
type Span = (typeof SPANS)[number];
const spanOf = (value: string | undefined): Span => SPANS.find((n) => String(n) === value) ?? 4;

/**
 * A colleague (2026-10-17, migration 0039; docs/ADMIN_WORKSPACE.md §Staff), in the record pages'
 * tabs: the overview — what they do, the next weeks (four, or up to 26 with `?weeks=`), days away,
 * their account; teaching — the
 * rules Kursplanung fits them by, their days on the board, their absences; their person; their
 * contracts and HR numbers and their bank details, with `staff_private`. Who teaches which group on
 * which day is changed on the board; here it is read.
 */
const WEEKDAY_NAMES: Record<number, { de: string; en: string }> = {
  1: { de: 'Montag', en: 'Monday' },
  2: { de: 'Dienstag', en: 'Tuesday' },
  3: { de: 'Mittwoch', en: 'Wednesday' },
  4: { de: 'Donnerstag', en: 'Thursday' },
  5: { de: 'Freitag', en: 'Friday' },
  6: { de: 'Samstag', en: 'Saturday' },
  7: { de: 'Sonntag', en: 'Sunday' },
};

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; weeks?: string; year?: string }>;
}) {
  const [{ id }, { tab, error, weeks: weeksParam, year: yearParam }, user] = await Promise.all([params, searchParams, requireModule('staff')]);
  const thisYear = new Date().getFullYear();
  const year = /^\d{4}$/.test(yearParam ?? '') && Math.abs(Number(yearParam) - thisYear) <= 5 ? Number(yearParam) : thisYear;
  const weeks = spanOf(weeksParam);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const member = await getStaffMember(id);
  if (!member) notFound();
  const { t, lang } = await getI18n();

  const canEdit = canAccess(user, 'staff', 'edit');
  const canDelete = canAccess(user, 'staff', 'full');
  const seesPrivate = canAccess(user, 'staff_private');
  const editsPrivate = canAccess(user, 'staff_private', 'edit');
  const removesPrivate = canAccess(user, 'staff_private', 'full');
  const managesAccounts = canAccess(user, 'team', 'edit');
  const teaches = member.roles.includes('teaching');
  const examines = member.roles.includes('examiner') || member.roles.includes('supervision');

  const [roles, person, teaching, absences, licences, sittings, examTypes, contracts, hr, bank, countries, accounts, keys, desk, time] = await Promise.all([
    staffRoles(),
    getPerson(member.personId),
    upcomingTeaching(id, weeks * 7),
    upcomingAbsences(id),
    staffLicences(id),
    staffSittings(id),
    canEdit ? licenceExams() : Promise.resolve([]),
    seesPrivate ? staffContracts(id) : Promise.resolve([]),
    seesPrivate ? staffHrNumbers(member.personId) : Promise.resolve(null),
    seesPrivate ? listBankAccounts(member.personId) : Promise.resolve([]),
    canEdit ? listCountries() : Promise.resolve([]),
    canEdit && managesAccounts ? unlinkedAccounts() : Promise.resolve([]),
    staffKeys(id),
    staffDesk(id),
    // Working time is HR's: with `staff_private`, like the contract (Rahman, 2026-10-22).
    seesPrivate ? staffTime(id, year) : Promise.resolve(null),
  ]);
  if (!person) notFound();
  const roleName = new Map(roles.map((r) => [r.code, pick(lang, r.name)]));
  const current = contracts.find((c) => c.current) ?? null;
  const email = person.emails.find((e) => e.isPrimary) ?? person.emails[0];
  const phone = person.phones.find((p) => p.isPrimary) ?? person.phones[0];
  const home = person.addresses.find((a) => a.kind === 'home');
  const hidden = { staffId: id };
  const day = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), opts);
  const full = (iso: string) => day(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const awayDays = absences.reduce((n, a) => n + a.days, 0);
  const teachingDays = new Set(teaching.map((d) => d.date)).size;
  const period = (from: string | null, to: string | null) =>
    from && to ? `${full(from)} – ${full(to)}` : from ? t(`seit ${full(from)}`, `since ${full(from)}`) : to ? t(`bis ${full(to)}`, `until ${full(to)}`) : t('ohne Datum', 'no dates');

  const tabs: RecordTab[] = [
    { id: 'overview', label: t('Übersicht', 'Overview'), icon: Icon.overview },
    ...(teaches || teaching.length ? [{ id: 'teaching', label: t('Unterricht', 'Teaching'), icon: Icon.kursplanung }] : []),
    ...(examines || licences.length || sittings.length ? [{ id: 'exams', label: t('Prüfungen', 'Exams'), icon: Icon.award }] : []),
    { id: 'details', label: t('Persönliche Daten', 'Personal details'), icon: Icon.person },
    ...(keys.length ? [{ id: 'keys', label: t('Schlüssel', 'Keys'), icon: Icon.lock, count: keys.filter((k) => k.isActive).length }] : []),
    ...(seesPrivate && (time?.hasSheet || contracts.length || teaching.length) ? [{ id: 'hours', label: t('Stunden', 'Hours'), icon: Icon.clock }] : []),
    ...(seesPrivate ? [{ id: 'contracts', label: t('Vertrag', 'Contract'), icon: Icon.registrations, count: contracts.length }] : []),
    ...(seesPrivate ? [{ id: 'bank', label: t('Bankverbindung', 'Bank details'), icon: Icon.money }] : []),
  ];

  const rolesDialog = canEdit ? (
    <FormDialog icon={Icon.team} tint="ink" trigger={t('Aufgaben', 'Roles')} title={t(`Aufgaben von ${member.name}`, `${member.name}'s roles`)} triggerVariant="ghost" size="sm" width="lg">
      <RolesForm staffId={id} roles={roles} checked={member.roles} />
    </FormDialog>
  ) : null;

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref="/admin/staff"
        backLabel={t('Mitarbeitende', 'Staff')}
        title={member.name}
        avatar={member.name}
        status={!member.isActive ? <Badge tone="quiet">{t('Ehemalig', 'Former')}</Badge> : null}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
              {member.roles.map((r) => roleName.get(r) ?? r).join(' · ') || t('Noch keine Aufgabe', 'No role yet')}
              <span className="ml-2 text-[0.84rem] font-semibold text-[var(--casa-muted)]">{member.shortName}</span>
            </span>
            <MetaLine>
              {email ? (
                <MetaItem icon={Icon.mail}>
                  <Link href={mailHref('staff', member.id, { address: email.address })} className="hover:text-[var(--casa-ink)] hover:underline">
                    {email.address}
                  </Link>
                </MetaItem>
              ) : null}
              {phone ? (
                <MetaItem icon={Icon.phone}>
                  <a href={`tel:${phone.number}`} className="hover:text-[var(--casa-ink)] hover:underline">
                    {phone.number}
                  </a>
                </MetaItem>
              ) : null}
              {member.account ? <MetaItem icon={Icon.lock}>{t('Konto im Arbeitsbereich', 'Workspace account')}</MetaItem> : null}
            </MetaLine>
          </>
        }
        bar={
          <StatBar>
            {seesPrivate ? (
              <Stat label={t('Vertrag', 'Contract')}>
                {current ? pick(lang, CONTRACT_KIND_LABELS[current.kind]) : <span className="font-semibold text-[var(--casa-muted)]">{t('keiner', 'none')}</span>}
                {current?.weeklyHours ? <span className="text-[0.78rem] font-semibold text-[var(--casa-muted)]"> · {t(`${num(lang, current.weeklyHours)} Std.`, `${num(lang, current.weeklyHours)} h`)}</span> : null}
              </Stat>
            ) : null}
            {teaches ? (
              <Stat label={t(`Unterricht, ${weeks} Wochen`, `Teaching, ${weeks} weeks`)}>
                {teaching.length ? counted(lang, teachingDays, t('Tag', 'day'), t('Tage', 'days')) : <span className="font-semibold text-[var(--casa-muted)]">{t('nichts geplant', 'nothing planned')}</span>}
              </Stat>
            ) : null}
            <Stat label={t('Abwesend', 'Away')}>
              {absences.length ? counted(lang, awayDays, t('Tag', 'day'), t('Tage', 'days')) : <span className="font-semibold text-[var(--casa-muted)]">{t('nein', 'no')}</span>}
            </Stat>
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${member.name}: Bereiche`, `${member.name}: sections`)} />}
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <RecordTabPanel id="overview">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            {teaches || teaching.length ? (
              <Card
                title={weeks === 4 ? t('Die nächsten vier Wochen', 'The next four weeks') : t(`Die nächsten ${weeks} Wochen`, `The next ${weeks} weeks`)}
                icon={Icon.kursplanung}
                tint="sun"
                actions={
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <SpanChoice id={id} tab={null} weeks={weeks} t={t} />
                    {canAccess(user, 'kursplanung') ? (
                      <Link href="/admin/kursplanung" className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
                        {t('Zur Kursplanung', 'Open Kursplanung')}
                      </Link>
                    ) : null}
                  </span>
                }
              >
                <TeachingWeeks days={teaching} weeks={weeks} lang={lang} />
              </Card>
            ) : null}
            <Card title={t('Abwesend', 'Away')} icon={Icon.calendar} tint="ink">
              {absences.length ? (
                <ul className="-my-1 divide-y divide-ws-line-soft">
                  {absences.map((a) => (
                    <li key={a.from} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="font-semibold">{pick(lang, ABSENCE_LABELS[a.reason])}</span>
                      <span className="text-[var(--casa-muted)] tabular-nums">{a.from === a.to ? day(a.from) : `${day(a.from)} – ${day(a.to)}`}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--casa-muted)]">{t('Keine Abwesenheit eingetragen.', 'No time away recorded.')}</p>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            {/* Reception or the office, and the usual week: the Tagesplan shows reception's shifts from it (2026-10-19). */}
            {desk.desk || (canEdit && !teaches) ? (
              <Card
                title={t('Arbeitsplatz', 'Desk')}
                icon={Icon.clock}
                tint="ink"
                actions={
                  canEdit ? (
                    <FormDialog icon={Icon.clock} tint="ink" trigger={t('Bearbeiten', 'Edit')} title={t('Arbeitsplatz und übliche Woche', 'Desk and usual week')} size="sm">
                      <DeskForm staffId={id} desk={desk} />
                    </FormDialog>
                  ) : null
                }
              >
                {desk.desk ? (
                  <>
                    <p className="text-sm font-semibold text-[var(--casa-ink)]">{pick(lang, DESK_LABELS[desk.desk])}</p>
                    {desk.shifts.length ? (
                      <ul className="mt-2 space-y-1 text-[0.84rem]">
                        {desk.shifts.map((s) => (
                          <li key={s.weekday} className="flex justify-between gap-3">
                            <span className="text-[var(--casa-muted)]">{pick(lang, WEEKDAY_NAMES[s.weekday])}</span>
                            <span className="font-semibold text-[var(--casa-ink)] tabular-nums">
                              {s.from}–{s.to}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-[var(--casa-muted)]">{t('Kein Arbeitsplatz im Büro.', 'No desk in the office.')}</p>
                )}
              </Card>
            ) : null}
            <Card title={t('Aufgaben', 'Roles')} icon={Icon.team} tint="blue" actions={rolesDialog}>
              {member.roles.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {member.roles.map((r) => (
                    <Badge key={r} tone={r === 'teaching' ? 'accent' : 'neutral'}>
                      {roleName.get(r) ?? r}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--casa-muted)]">{t('Noch keine Aufgabe.', 'No role yet.')}</p>
              )}
            </Card>
            <Card
              title={t('Zugang', 'Account')}
              icon={Icon.lock}
              tint="ink"
              actions={
                canEdit && managesAccounts ? (
                  <FormDialog icon={Icon.lock} tint="ink" trigger={member.account ? t('Ändern', 'Change') : t('Verbinden', 'Link')} title={t('Konto im Arbeitsbereich', 'Workspace account')} triggerVariant="ghost" size="sm">
                    <AccountForm staffId={id} current={member.account?.id ?? null} accounts={member.account ? [{ id: member.account.id, name: member.account.name, email: member.account.email }, ...accounts] : accounts} />
                  </FormDialog>
                ) : undefined
              }
            >
              {member.account ? (
                <DetailList
                  items={[
                    { label: t('Konto', 'Account'), value: member.account.email },
                    {
                      label: t('Zuletzt angemeldet', 'Last signed in'),
                      value: member.account.lastSeenAt ? new Date(member.account.lastSeenAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' }) : null,
                    },
                  ]}
                />
              ) : (
                <p className="text-sm text-[var(--casa-muted)]">{t('Meldet sich nicht im Arbeitsbereich an.', 'Does not sign in to the workspace.')}</p>
              )}
            </Card>
          </div>
        </div>
      </RecordTabPanel>

      {teaches || teaching.length ? (
        <RecordTabPanel id="teaching">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-4">
              <Card title={t('Auf dem Plan', 'On the board')} icon={Icon.kursplanung} tint="sun" actions={<SpanChoice id={id} tab="teaching" weeks={weeks} t={t} />}>
                <TeachingWeeks days={teaching} weeks={weeks} lang={lang} />
              </Card>
              <Card
                title={t('Abwesenheiten', 'Time away')}
                icon={Icon.calendar}
                tint="ink"
                actions={
                  canEdit ? (
                    <FormDialog icon={Icon.calendar} tint="sun" trigger={t('Eintragen', 'Add')} title={t('Abwesenheit eintragen', 'Add time away')} triggerVariant="ghost" size="sm">
                      <AbsenceForm staffId={id} />
                    </FormDialog>
                  ) : undefined
                }
              >
                {absences.length ? (
                  <ul className="-my-1 divide-y divide-ws-line-soft">
                    {absences.map((a) => (
                      <li key={a.from} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>
                          <span className="font-semibold">{pick(lang, ABSENCE_LABELS[a.reason])}</span>
                          <span className="ml-2 text-[var(--casa-muted)] tabular-nums">
                            {a.from === a.to ? day(a.from) : `${day(a.from)} – ${day(a.to)}`} · {a.days === 1 ? t('1 Tag', '1 day') : t(`${a.days} Tage`, `${a.days} days`)}
                          </span>
                        </span>
                        {canEdit && !a.fromFileMaker ? (
                          <form action={takeBackAbsenceAction}>
                            <input type="hidden" name="staffId" value={id} />
                            <input type="hidden" name="from" value={a.from} />
                            <input type="hidden" name="to" value={a.to} />
                            <Button type="submit" size="sm" variant="ghost">
                              {t('Zurücknehmen', 'Take back')}
                            </Button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--casa-muted)]">{t('Keine Abwesenheit eingetragen.', 'No time away recorded.')}</p>
                )}
              </Card>
            </div>
            <Card
              title={t('Regeln für die Kursplanung', 'Rules for Kursplanung')}
              icon={Icon.settings}
              tint="blue"
              actions={
                canEdit ? (
                  <FormDialog icon={Icon.kursplanung} tint="sun" trigger={t('Ändern', 'Change')} title={t('Regeln für die Kursplanung', 'Rules for Kursplanung')} triggerVariant="ghost" size="sm" width="lg">
                    <TeachingForm member={member} />
                  </FormDialog>
                ) : undefined
              }
            >
              <DetailList
                items={[
                  { label: t('Kürzel', 'Short name'), value: member.shortName },
                  {
                    label: t('Unterrichtet', 'Teaches'),
                    value: !member.teaching.active
                      ? t('Zurzeit nicht', 'Not at present')
                      : [
                          member.teaching.courseKinds.map((k) => pick(lang, COURSE_KIND_LABELS[k])).join(' · ') || null,
                          member.teaching.from ? t(`wieder ab ${full(member.teaching.from)}`, `again from ${full(member.teaching.from)}`) : null,
                          member.teaching.coverOnly ? t('nur als Vertretung', 'cover only') : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || null,
                  },
                  ...(['morning', 'afternoon', 'evening'] as const).map((s) => ({
                    label: { morning: t('Vormittag', 'Morning'), afternoon: t('Nachmittag', 'Afternoon'), evening: t('Abend', 'Evening') }[s],
                    value: member.teaching.days[s].map((d) => pick(lang, WEEKDAY_LABELS[d])).join(' · ') || null,
                  })),
                  { label: t('Tage pro Woche', 'Days per week'), value: String(member.teaching.daysPerWeek) },
                  { label: t('Niveaus', 'Levels'), value: member.teaching.levels.join(' · ') || null },
                  ...(member.teaching.note ? [{ label: t('Notiz', 'Note'), value: member.teaching.note, wide: true }] : []),
                ]}
              />
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}

      {examines || licences.length || sittings.length ? (
        <RecordTabPanel id="exams">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <Card title={t('Prüfungstermine', 'Exam sittings')} icon={Icon.calendar} tint="sun" bleed>
              {sittings.length ? (
                <ul className="divide-y divide-ws-line-soft">
                  {sittings.map((x) => (
                    <li key={x.sittingId}>
                      <Link href={`/admin/catalogue/exams/${x.sittingId}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="font-semibold text-[var(--casa-ink)]">{x.examName}</span>
                          <span className="text-[var(--casa-muted)]">{pick(lang, EXAMINER_PART_LABELS[x.part])}</span>
                          {x.cancelled ? <Badge tone="danger">{t('Abgesagt', 'Cancelled')}</Badge> : null}
                          {needsLicence(x.part) && !x.licensed ? <Badge tone="warning">{t('Keine gültige Lizenz', 'No valid licence')}</Badge> : null}
                        </span>
                        <span className="text-[0.84rem] text-[var(--casa-muted)] tabular-nums">
                          {x.startsAt.toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Auf keinem Termin eingetragen.', 'Not on any sitting.')}</p>
              )}
            </Card>
            <Card
              title={t('Lizenzen', 'Licences')}
              icon={Icon.award}
              tint="green"
              actions={
                canEdit && examTypes.length ? (
                  <FormDialog icon={Icon.award} tint="ink" trigger={t('Eintragen', 'Add')} title={t('Lizenz eintragen', 'Add a licence')} triggerVariant="ghost" size="sm">
                    <LicenceForm staffId={id} exams={examTypes} />
                  </FormDialog>
                ) : undefined
              }
            >
              {licences.length ? (
                <ul className="-my-1 divide-y divide-ws-line-soft">
                  {licences.map((l) => (
                    <li key={l.id} className="py-2.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--casa-ink)]">{l.examName}</span>
                        {l.current ? <Badge tone="positive">{t('Gültig', 'Valid')}</Badge> : <Badge tone="quiet">{t('Nicht gültig', 'Not valid')}</Badge>}
                      </span>
                      <span className="block text-[0.8rem] text-[var(--casa-muted)] tabular-nums">
                        {[l.number ? <span key="n" className="font-mono">{l.number}</span> : null, period(l.validFrom, l.validTo)].filter(Boolean).map((part, i) => (
                          <span key={i}>
                            {i ? ' · ' : ''}
                            {part}
                          </span>
                        ))}
                      </span>
                      {l.note ? <span className="block text-[0.8rem] text-[var(--casa-muted)]">{l.note}</span> : null}
                      {canEdit ? (
                        <span className="mt-1 flex items-center gap-1">
                          <FormDialog icon={Icon.award} tint="ink" trigger={t('Ändern', 'Change')} title={t('Lizenz', 'Licence')} triggerVariant="ghost" size="sm">
                            <LicenceForm staffId={id} exams={examTypes} licence={l} />
                          </FormDialog>
                          {canDelete ? (
                            <form action={removeLicenceAction}>
                              <input type="hidden" name="staffId" value={id} />
                              <input type="hidden" name="licenceId" value={l.id} />
                              <ConfirmSubmit title={t('Diese Lizenz entfernen?', 'Remove this licence?')} description={l.examName} confirmLabel={t('Entfernen', 'Remove')} size="sm" variant="ghost">
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
                <p className="text-sm text-[var(--casa-muted)]">{t('Keine Lizenz eingetragen.', 'No licence recorded.')}</p>
              )}
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}

      {keys.length ? (
        <RecordTabPanel id="keys">
          <Card bleed>
            <ul className="divide-y divide-ws-line-soft">
              {keys.map((k) => (
                <li key={k.id} className={cn('flex items-center justify-between gap-3 px-4 py-2.5 text-[0.86rem]', !k.isActive && 'opacity-60')}>
                  <span className="min-w-0">
                    <span className="font-semibold text-[var(--casa-ink)]">{k.kind ?? t('Schlüssel', 'Key')}</span>
                    {k.note ? <span className="text-[var(--casa-muted)]"> · {k.note}</span> : null}
                    {!k.isActive ? <span className="text-[var(--casa-muted)]"> · {t('zurückgegeben', 'returned')}</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--casa-muted)]">{k.number ? t(`Nr. ${k.number}`, `No. ${k.number}`) : null}</span>
                </li>
              ))}
            </ul>
          </Card>
        </RecordTabPanel>
      ) : null}

      <RecordTabPanel id="details">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card
            title={t('Person', 'Person')}
            icon={Icon.person}
            tint="ink"
            actions={
              canEdit ? (
                <FormDialog icon={Icon.person} tint="ink" trigger={t('Bearbeiten', 'Edit')} title={member.name} triggerVariant="ghost" size="sm" width="lg">
                  <PersonForm person={person} countries={countries} action={updateStaffPersonAction} hidden={hidden} />
                </FormDialog>
              ) : undefined
            }
          >
            <DetailList
              items={[
                { label: t('Geburtsdatum', 'Date of birth'), value: person.birthDate ? <BirthDate value={person.birthDate} /> : null },
                { label: t('Geburtsort', 'Place of birth'), value: person.facts.birthPlace },
                { label: t('Nationalität', 'Nationality'), value: person.nationalityName ?? person.nationalityRaw },
                { label: t('Muttersprache', 'Mother tongue'), value: person.facts.motherTongue },
                { label: t('E-Mail', 'Email'), value: email?.address ?? null },
                { label: t('Telefon', 'Phone'), value: phone?.number ?? null },
              ]}
            />
          </Card>
          <Card
            title={t('Adresse', 'Address')}
            icon={Icon.rooms}
            tint="ink"
            actions={
              canEdit ? (
                <FormDialog icon={Icon.globe} tint="ink" trigger={home ? t('Ändern', 'Change') : t('Hinzufügen', 'Add')} title={t('Adresse', 'Address')} triggerVariant="ghost" size="sm">
                  <AddressForm personId={person.id} kind="home" address={home} countries={countries} action={saveStaffAddressAction} hidden={hidden} />
                </FormDialog>
              ) : undefined
            }
          >
            {home ? (
              <p className="text-sm leading-relaxed">
                {[home.street, [home.postcode, home.city].filter(Boolean).join(' '), home.countryName].filter(Boolean).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-sm text-[var(--casa-muted)]">—</p>
            )}
          </Card>
        </div>
      </RecordTabPanel>

      {seesPrivate && time ? (
        <RecordTabPanel id="hours">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[1.05rem] font-bold text-[var(--casa-ink)]">{t(`Arbeitszeit ${year}`, `Working time ${year}`)}</h2>
            <span className="flex items-center gap-1">
              <Link href={`/admin/staff/${id}?tab=hours&year=${year - 1}`} className="rounded-lg px-2.5 py-1 text-[0.84rem] font-semibold text-[var(--casa-muted)] ring-1 ring-ws-line ring-inset hover:bg-ws-sunk hover:text-[var(--casa-ink)]" aria-label={t('Jahr davor', 'Year before')}>
                ‹ {year - 1}
              </Link>
              {year < thisYear ? (
                <Link href={`/admin/staff/${id}?tab=hours&year=${year + 1}`} className="rounded-lg px-2.5 py-1 text-[0.84rem] font-semibold text-[var(--casa-muted)] ring-1 ring-ws-line ring-inset hover:bg-ws-sunk hover:text-[var(--casa-ink)]" aria-label={t('Jahr danach', 'Year after')}>
                  {year + 1} ›
                </Link>
              ) : null}
            </span>
          </div>
          <StaffHours data={time} />
        </RecordTabPanel>
      ) : null}

      {seesPrivate ? (
        <RecordTabPanel id="contracts">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <Card
              title={t('Verträge', 'Contracts')}
              icon={Icon.registrations}
              tint="blue"
              actions={
                editsPrivate ? (
                  <FormDialog icon={Icon.statement} tint="ink" trigger={t('Vertrag hinzufügen', 'Add contract')} title={t('Neuer Vertrag', 'New contract')} triggerVariant="ghost" size="sm">
                    <ContractForm staffId={id} />
                  </FormDialog>
                ) : undefined
              }
            >
              {contracts.length ? (
                <ul className="-my-1 divide-y divide-ws-line-soft">
                  {contracts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--casa-ink)]">
                          {pick(lang, CONTRACT_KIND_LABELS[c.kind])}
                          {c.current ? <Badge tone="positive">{t('Läuft', 'Current')}</Badge> : null}
                        </span>
                        <span className="block text-[0.8rem] text-[var(--casa-muted)] tabular-nums">
                          {[
                            period(c.validFrom, c.validTo),
                            c.weeklyHours !== null ? t(`${num(lang, c.weeklyHours)} Std. pro Woche`, `${num(lang, c.weeklyHours)} h a week`) : null,
                            c.weeklyUnits !== null ? t(`${num(lang, c.weeklyUnits)} UE pro Woche`, `${num(lang, c.weeklyUnits)} lessons a week`) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {c.note ? <span className="block text-[0.8rem] text-[var(--casa-muted)]">{c.note}</span> : null}
                      </span>
                      <span className="flex items-center gap-1">
                        {editsPrivate ? (
                          <FormDialog icon={Icon.statement} tint="ink" trigger={t('Ändern', 'Change')} title={t('Vertrag', 'Contract')} triggerVariant="ghost" size="sm">
                            <ContractForm staffId={id} contract={c} />
                          </FormDialog>
                        ) : null}
                        {removesPrivate ? (
                          <form action={removeContractAction}>
                            <input type="hidden" name="staffId" value={id} />
                            <input type="hidden" name="contractId" value={c.id} />
                            <ConfirmSubmit title={t('Diesen Vertrag entfernen?', 'Remove this contract?')} description={t('Nur für einen Vertrag, der so nie bestand.', 'Only for a contract that never existed like this.')} confirmLabel={t('Entfernen', 'Remove')} size="sm" variant="ghost">
                              {t('Entfernen', 'Remove')}
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--casa-muted)]">{t('Noch kein Vertrag eingetragen.', 'No contract recorded yet.')}</p>
              )}
            </Card>
            <Card
              title={t('Steuer und Versicherung', 'Tax and insurance')}
              icon={Icon.lock}
              tint="ink"
              actions={
                editsPrivate && hr ? (
                  <FormDialog icon={Icon.lock} tint="ink" trigger={t('Ändern', 'Change')} title={t('Steuer und Versicherung', 'Tax and insurance')} triggerVariant="ghost" size="sm">
                    <HrNumbersForm staffId={id} numbers={hr} />
                  </FormDialog>
                ) : undefined
              }
            >
              <DetailList
                items={[
                  { label: t('Steuer-ID', 'Tax ID'), value: hr?.taxId ? <span className="font-mono">{hr.taxId}</span> : null },
                  { label: t('Rentenversicherung', 'Pension insurance'), value: hr?.pensionNumber ? <span className="font-mono">{hr.pensionNumber}</span> : null },
                  { label: t('Krankenversicherung', 'Health insurance'), value: hr?.healthNumber ? <span className="font-mono">{hr.healthNumber}</span> : null },
                ]}
              />
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}

      {seesPrivate ? (
        <RecordTabPanel id="bank">
          <Card
            title={t('Bankverbindung', 'Bank details')}
            icon={Icon.money}
            tint="green"
            actions={
              editsPrivate ? (
                <FormDialog icon={Icon.money} tint="ink" trigger={t('Konto hinzufügen', 'Add account')} title={t('Bankverbindung', 'Bank details')} triggerVariant="ghost" size="sm">
                  <BankAccountForm personId={person.id} holder={member.name} action={addStaffBankAccountAction} hidden={hidden} />
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
                      <span className="block text-[0.8rem] text-[var(--casa-muted)]">{[b.holder, b.bankName, b.bic].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {editsPrivate ? (
                        <FormDialog icon={Icon.money} tint="ink" trigger={t('Ändern', 'Change')} title={t('Bankverbindung', 'Bank details')} triggerVariant="ghost" size="sm">
                          <BankAccountForm personId={person.id} holder={member.name} account={b} action={updateStaffBankAccountAction} hidden={hidden} />
                        </FormDialog>
                      ) : null}
                      {removesPrivate ? (
                        <form action={removeStaffBankAccountAction}>
                          <input type="hidden" name="staffId" value={id} />
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

      {canEdit ? (
        <RecordFoot>
          <form action={setStaffActiveAction}>
            <input type="hidden" name="staffId" value={id} />
            <input type="hidden" name="active" value={member.isActive ? '0' : '1'} />
            <ConfirmSubmit
              title={member.isActive ? t(`${member.name} als ausgeschieden eintragen?`, `Mark ${member.name} as having left?`) : t(`${member.name} wieder aktiv?`, `${member.name} active again?`)}
              description={
                member.isActive
                  ? t('Die Person bleibt im Verzeichnis, unter „Ehemalige“, und verschwindet aus der Kursplanung.', 'They stay in the register under “Former” and leave Kursplanung.')
                  : t('Die Person erscheint wieder unter „Aktiv“ und in der Kursplanung.', 'They appear under “Active” and in Kursplanung again.')
              }
              confirmLabel={member.isActive ? t('Ausgeschieden', 'Has left') : t('Wieder aktiv', 'Active again')}
            >
              {member.isActive ? t('Ausgeschieden', 'Has left') : t('Wieder aktiv', 'Active again')}
            </ConfirmSubmit>
          </form>
          {canDelete && !teaching.length ? (
            <form action={deleteStaffAction}>
              <input type="hidden" name="staffId" value={id} />
              <ConfirmSubmit title={t('Diese Person löschen?', 'Delete this person?')} description={t('Nur für einen Eintrag aus Versehen.', 'Only for an entry made by mistake.')}>
                {t('Löschen', 'Delete')}
              </ConfirmSubmit>
            </form>
          ) : null}
        </RecordFoot>
      ) : null}
    </RecordTabs>
  );
}

/** „4 · 8 · 12 · 26 Wochen": how far ahead the lesson days reach, the chosen span in ink. */
function SpanChoice({ id, tab, weeks, t }: { id: string; tab: string | null; weeks: Span; t: T }) {
  return (
    <span className="inline-flex items-center gap-1 text-[0.78rem] text-[var(--casa-muted)]" role="group" aria-label={t('Zeitraum', 'Period')}>
      {SPANS.map((n) => {
        const query = new URLSearchParams({ ...(tab ? { tab } : {}), ...(n === 4 ? {} : { weeks: String(n) }) }).toString();
        return (
          <Link
            key={n}
            href={`/admin/staff/${id}${query ? `?${query}` : ''}`}
            scroll={false}
            aria-current={n === weeks ? 'true' : undefined}
            className={
              n === weeks
                ? 'rounded-md bg-ws-sunk px-1.5 py-0.5 font-bold text-[var(--casa-ink)] tabular-nums'
                : 'rounded-md px-1.5 py-0.5 font-semibold tabular-nums hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
            }
          >
            {n}
          </Link>
        );
      })}
      <span className="ml-0.5">{t('Wochen', 'weeks')}</span>
    </span>
  );
}

const SHIFT_SHORT = { morning: { de: 'Vorm.', en: 'a.m.' }, afternoon: { de: 'Nachm.', en: 'p.m.' }, evening: { de: 'Abends', en: 'eve.' } } as const;

/** Their lesson days, week by week: the days, the course, a substitution or a tentative day marked. */
function TeachingWeeks({ days, weeks, lang }: { days: TeachingDay[]; weeks: Span; lang: WsLang }) {
  if (!days.length)
    return (
      <p className="text-sm text-[var(--casa-muted)]">
        {weeks === 4
          ? lang === 'de'
            ? 'In den nächsten vier Wochen nichts geplant.'
            : 'Nothing planned in the next four weeks.'
          : lang === 'de'
            ? `In den nächsten ${weeks} Wochen nichts geplant.`
            : `Nothing planned in the next ${weeks} weeks.`}
      </p>
    );
  // One line per week and course: "26. Okt. · B1.1 Gruppe 2 · Vorm. · Mo, Di, Mi".
  const monday = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const lines = new Map<string, { week: string; group: string; shift: TeachingDay['shift']; dates: string[]; substitute: boolean; tentative: boolean }>();
  for (const d of days) {
    const group = `${d.label}${d.groupIndex > 1 ? ` · ${lang === 'de' ? 'Gruppe' : 'group'} ${d.groupIndex}` : ''}`;
    const key = `${monday(d.date)}|${group}|${d.shift}`;
    const line = lines.get(key) ?? { week: monday(d.date), group, shift: d.shift, dates: [], substitute: false, tentative: false };
    line.dates.push(d.date);
    line.substitute ||= d.substitute;
    line.tentative ||= d.tentative;
    lines.set(key, line);
  }
  const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short' }).replace('.', '');
  return (
    <ul className="-my-1 divide-y divide-ws-line-soft">
      {[...lines.values()].map((l) => (
        <li key={`${l.week}${l.group}${l.shift}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[0.8rem] text-[var(--casa-muted)] tabular-nums">
              {new Date(`${l.week}T12:00:00Z`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' })}
            </span>
            <span className="font-semibold">{l.group}</span>
            {l.shift ? <span className="text-[var(--casa-muted)]">{SHIFT_SHORT[l.shift][lang]}</span> : null}
            {l.substitute ? <Badge tone="warning">{lang === 'de' ? 'Vertretung' : 'Cover'}</Badge> : null}
            {l.tentative ? <Badge tone="quiet">?</Badge> : null}
          </span>
          <span className="text-[0.84rem] tabular-nums">{l.dates.map(weekday).join(', ')}</span>
        </li>
      ))}
    </ul>
  );
}
