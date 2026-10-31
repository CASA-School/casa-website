import Link from 'next/link';

import { resolveFlagAction } from '../../actions';
import {
  confirmRegistrationPersonAction,
  dismissSchoolmanBookingAction,
  linkSchoolmanBookingAction,
  newRegistrationPersonAction,
  searchRegistrationPeopleAction,
  separateRegistrationPersonAction,
} from '../actions';
import { PersonCompare, type SchoolmanHint, type SentFacts } from './person-compare';
import { Icon } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/list';
import { Badge, Button, Card } from '@/components/admin/ui';
import { FLAG_LABELS, type RecordFlag } from '@/lib/admin/flags';
import { pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import type { PersonSummary } from '@/lib/admin/people';
import type { PersonCandidate } from '@/lib/admin/person-match';

const TRIGGER = 'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40';
const TRIGGER_MAIN = `${TRIGGER} bg-[var(--casa-ink-deep)] text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)] hover:bg-[var(--casa-ink-deep-hover)]`;
const TRIGGER_QUIET = `${TRIGGER} h-8 px-3 text-xs text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]`;

/**
 * „Person" at the top of an Anmeldung's rail (2026-10-31): who sent it, the first question — someone
 * already at CASA, or new. The background search's answer in a line or two; „Vergleichen" opens the side
 * panel with the fields side by side and the decision. Once decided, the person it is, with their course.
 */
export async function RegistrationPersonCard({
  registrationId,
  firstName,
  sent,
  person,
  suggestions,
  linked,
  schoolman,
  flags,
  canEdit,
  openPanel,
}: {
  registrationId: string;
  firstName: string;
  sent: SentFacts;
  person: PersonSummary | null;
  suggestions: readonly PersonCandidate[];
  linked: PersonCandidate | null;
  schoolman: readonly SchoolmanHint[];
  flags: readonly RecordFlag[];
  canEdit: boolean;
  openPanel: boolean;
}) {
  const { t, lang } = await getI18n();
  const isNew = Boolean(person && !linked && person.listed);
  const top = suggestions.find((c) => c.judgement.strength === 'sure' || c.judgement.strength === 'likely') ?? null;
  const others = suggestions.length - (top ? 1 : 0);
  const search = searchRegistrationPeopleAction.bind(null, registrationId);
  const panel = (trigger: string, className: string) => (
    <PersonCompare
      registrationId={registrationId}
      firstName={firstName}
      sent={sent}
      suggestions={suggestions}
      linked={linked}
      isNew={isNew}
      schoolman={schoolman}
      canEdit={canEdit}
      search={search}
      confirm={confirmRegistrationPersonAction}
      makeNew={newRegistrationPersonAction}
      separate={separateRegistrationPersonAction}
      linkBooking={linkSchoolmanBookingAction}
      dismissBooking={dismissSchoolmanBookingAction}
      trigger={trigger}
      triggerClassName={className}
      defaultOpen={openPanel}
    />
  );
  const otherFlags = flags.filter((f) => f.resolvedAt === null && f.code !== 'duplicate_candidate');

  return (
    <Card title={t('Person', 'Person')} icon={Icon.person} tint="green">
      {linked ? (
        <>
          <State tone="good">{t('Schon bei CASA', 'Already at CASA')}</State>
          <PersonRow person={linked} t={t} lang={lang} />
          <div className="mt-3 flex justify-end">{panel(t('Ändern', 'Change'), TRIGGER_QUIET)}</div>
        </>
      ) : isNew && person ? (
        <>
          <State tone="good">{t('Neu bei CASA', 'New at CASA')}</State>
          <Link href={`/admin/people/${person.canonicalId}`} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-ws-line-soft ring-inset hover:bg-ws-sunk">
            <Avatar name={person.displayName} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{person.displayName}</span>
            <span aria-hidden="true" className="text-[var(--casa-text-subtle)] [&_svg]:size-4">{Icon.chevronRight}</span>
          </Link>
          <div className="mt-3 flex justify-end">{panel(t('Doch schon bei CASA?', 'At CASA after all?'), TRIGGER_QUIET)}</div>
        </>
      ) : top ? (
        <>
          <State tone="ask">{t('Schon bei CASA?', 'Already at CASA?')}</State>
          <PersonRow person={top} t={t} lang={lang} reasons />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {canEdit ? (
              <form action={newRegistrationPersonAction}>
                <input type="hidden" name="id" value={registrationId} />
                <Button type="submit" variant="ghost" size="sm">
                  {t('Neue Person', 'New person')}
                </Button>
              </form>
            ) : (
              <span />
            )}
            {panel(others > 0 ? t(`Vergleichen · ${others + 1}`, `Compare · ${others + 1}`) : t('Vergleichen', 'Compare'), TRIGGER_MAIN)}
          </div>
        </>
      ) : (
        <>
          <State tone="plain">{t('Neu bei CASA?', 'New at CASA?')}</State>
          <p className="text-[0.86rem] text-[var(--casa-muted)]">
            {suggestions.length
              ? suggestions.length === 1
                ? t('Nur eine entfernte Ähnlichkeit gefunden.', 'Only a faint resemblance found.')
                : t(`Nur ${suggestions.length} entfernte Ähnlichkeiten gefunden.`, `Only ${suggestions.length} faint resemblances found.`)
              : t('Niemand bei CASA passt dazu.', 'Nobody at CASA matches.')}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {panel(t('Selbst suchen', 'Search'), TRIGGER_QUIET)}
            {canEdit ? (
              <form action={newRegistrationPersonAction}>
                <input type="hidden" name="id" value={registrationId} />
                <Button type="submit" variant="secondary" size="md">
                  {t('Als neue Person anlegen', 'Add as a new person')}
                </Button>
              </form>
            ) : null}
          </div>
        </>
      )}

      {otherFlags.length ? (
        <ul className="mt-4 space-y-2 border-t border-ws-line-soft pt-3">
          {otherFlags.map((flag) => (
            <li key={flag.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {Icon.flag} {pick(lang, FLAG_LABELS[flag.code])}
                </span>
                {typeof flag.detail?.raw === 'string' ? <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">{t(`„${flag.detail.raw}“`, `“${flag.detail.raw}”`)}</span> : null}
              </span>
              {canEdit ? (
                <form action={resolveFlagAction} className="shrink-0">
                  <input type="hidden" name="flagId" value={flag.id} />
                  <input type="hidden" name="returnTo" value={`/admin/registrations/${registrationId}`} />
                  <Button type="submit" variant="ghost" size="sm">
                    {t('Erledigt', 'Clear')}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function State({ tone, children }: { tone: 'good' | 'ask' | 'plain'; children: string }) {
  return (
    <p className="mb-2.5 flex items-center gap-2 text-[0.8rem] font-bold text-[var(--casa-ink)]">
      <span aria-hidden="true" className={tone === 'good' ? 'size-2 rounded-full bg-[#2f9e5b]' : tone === 'ask' ? 'size-2 rounded-full bg-[#d99a00]' : 'size-2 rounded-full bg-[#9aa6b6]'} />
      {children}
    </p>
  );
}

const month = (iso: string, lang: WsLang) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { month: 'short', year: 'numeric' });
const day = (iso: string, lang: WsLang) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: '2-digit', month: '2-digit', year: 'numeric' });

/** A person at CASA in two lines: who, their number and since when; their course now, next or last. */
function PersonRow({ person: c, t, lang, reasons = false }: { person: PersonCandidate; t: T; lang: WsLang; reasons?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const course = c.course
    ? c.course.end >= today
      ? c.course.start <= today
        ? t(`${c.course.name} · bis ${day(c.course.end, lang)}`, `${c.course.name} · until ${day(c.course.end, lang)}`)
        : t(`${c.course.name} · ab ${day(c.course.start, lang)}`, `${c.course.name} · from ${day(c.course.start, lang)}`)
      : t(`Zuletzt ${c.course.name} · ${c.course.end.slice(0, 4)}`, `Last ${c.course.name} · ${c.course.end.slice(0, 4)}`)
    : null;
  const facts = [c.customerNumber ? t(`Kd.-Nr. ${c.customerNumber}`, `No. ${c.customerNumber}`) : null, c.since ? t(`seit ${month(c.since, lang)}`, `since ${month(c.since, lang)}`) : null]
    .filter(Boolean)
    .join(' · ');
  const agree = c.judgement.reasons.filter((r) => r === 'email' || r === 'phone' || r === 'birth' || r === 'name' || r === 'name_swapped' || r === 'name_close');
  return (
    <Link href={`/admin/people/${c.id}`} className="group flex items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-ws-line-soft ring-inset transition-colors hover:bg-ws-sunk">
      <Avatar name={c.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--casa-ink)]">{c.name}</span>
        {facts ? <span className="block truncate text-xs text-[var(--casa-muted)]">{facts}</span> : null}
        {course ? <span className="block truncate text-xs text-[var(--casa-muted)]">{course}</span> : null}
        {reasons && agree.length ? (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {agree.map((r) => (
              <Badge key={r} tone="positive">
                {REASON_SHORT[r](t)}
              </Badge>
            ))}
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="mt-2 text-[var(--casa-text-subtle)] [&_svg]:size-4">
        {Icon.chevronRight}
      </span>
    </Link>
  );
}

const REASON_SHORT: Record<string, (t: T) => string> = {
  email: (t) => t('E-Mail', 'Email'),
  phone: (t) => t('Telefon', 'Phone'),
  birth: (t) => t('Geburtsdatum', 'Date of birth'),
  name: (t) => t('Name', 'Name'),
  name_swapped: (t) => t('Name vertauscht', 'Name swapped'),
  name_close: (t) => t('Name ähnlich', 'Name similar'),
};
