'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Avatar } from '@/components/admin/list';
import { SidePanel } from '@/components/admin/side-panel';
import { Badge, Button, Input, type BadgeTone } from '@/components/admin/ui';
import { wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import type { PersonCandidate } from '@/lib/admin/person-match';
import type { FieldVerdict, MatchField, MatchReason, MatchStrength } from '@/lib/admin/person-match-rules';
import { cn } from '@/lib/utils';

/** What the registration says, as the panel shows it beside each candidate. */
export type SentFacts = { name: string; birthDate: string | null; email: string; phone: string; nationality: string | null };

/** A SchoolMan booking that may have been made from one of the lines (0113), under the person it belongs to. */
export type SchoolmanHint = {
  personId: string;
  bookingId: string;
  number: string;
  what: string | null;
  when: string | null;
  line: string;
  lineId: string;
  lineKind: 'course' | 'exam';
  exact: boolean;
  bookedAfter: boolean;
};

type Action = (formData: FormData) => void | Promise<void>;

/**
 * „Wer ist das?" (2026-10-31, Rahman: „a popup or sidebar that compares some fields … not only with
 * SchoolMan but also if the person is already at CASA"). The side panel beside an Anmeldung: the people
 * the background search found, the surest first; one chosen shows what was sent beside what CASA holds,
 * field by field (the same, nearly, different), what they did here, and — while SchoolMan still takes
 * bookings — the booking a colleague may already have made there. A search of one's own above it: the
 * name, an address, a phone or customer number, as the team searched FileMaker. One decision at its foot:
 * „Das ist …" or a new person.
 */
export function PersonCompare({
  registrationId,
  firstName,
  sent,
  suggestions,
  linked,
  isNew,
  schoolman,
  canEdit,
  search,
  confirm,
  makeNew,
  separate,
  linkBooking,
  dismissBooking,
  trigger,
  triggerClassName,
  defaultOpen,
}: {
  registrationId: string;
  firstName: string;
  sent: SentFacts;
  suggestions: readonly PersonCandidate[];
  /** The person at CASA the sender is joined to, when decided. */
  linked: PersonCandidate | null;
  /** Put on the register as someone new. */
  isNew: boolean;
  schoolman: readonly SchoolmanHint[];
  canEdit: boolean;
  search: (text: string) => Promise<PersonCandidate[]>;
  confirm: Action;
  makeNew: Action;
  separate: Action;
  linkBooking: Action;
  dismissBooking: Action;
  trigger: ReactNode;
  triggerClassName?: string;
  defaultOpen?: boolean;
}) {
  const { t, lang } = useWsLang();
  const [text, setText] = useState('');
  const [found, setFound] = useState<{ term: string; people: PersonCandidate[] } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const asked = useRef(0);
  const term = text.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const ask = ++asked.current;
    const wait = setTimeout(() => {
      search(term)
        .then((people) => {
          if (ask === asked.current) setFound({ term, people });
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(wait);
  }, [term, search]);

  const base = useMemo(() => (linked ? [linked, ...suggestions.filter((c) => c.id !== linked.id)] : [...suggestions]), [linked, suggestions]);
  const searching = term.length >= 2;
  const list = searching ? (found?.term === term ? found.people : null) : base;
  const selected = list?.find((c) => c.id === chosen) ?? list?.[0] ?? null;

  return (
    <SidePanel
      trigger={trigger}
      triggerClassName={triggerClassName}
      defaultOpen={defaultOpen}
      width="lg"
      icon={Icon.person}
      tint="green"
      title={t(`Wer ist ${firstName}?`, `Who is ${firstName}?`)}
      subtitle={t('Mit den Personen bei CASA vergleichen', 'Compared with the people at CASA')}
      footer={
        canEdit ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isNew && !linked ? (
              <span className="text-[0.82rem] text-[var(--casa-muted)]">{t('Als neue Person angelegt', 'Added as a new person')}</span>
            ) : (
              <form action={makeNew}>
                <input type="hidden" name="id" value={registrationId} />
                <Button type="submit" variant="ghost" size="md">
                  {t('Neue Person anlegen', 'Add as a new person')}
                </Button>
              </form>
            )}
            {selected && linked?.id === selected.id ? (
              <form action={separate}>
                <input type="hidden" name="id" value={registrationId} />
                <Button type="submit" variant="secondary" size="md">
                  {t('Trennen', 'Separate')}
                </Button>
              </form>
            ) : selected ? (
              <form action={confirm}>
                <input type="hidden" name="id" value={registrationId} />
                <input type="hidden" name="personId" value={selected.id} />
                <Button type="submit" size="md">
                  {t(`Das ist ${selected.name}`, `This is ${selected.name}`)}
                </Button>
              </form>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="sticky top-0 z-10 border-b border-ws-line-soft bg-white px-6 py-3">
        <label className="relative block">
          <span className="sr-only">{t('Suchen', 'Search')}</span>
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--casa-text-subtle)] [&_svg]:size-4">
            {Icon.search}
          </span>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('Name, E-Mail, Telefon oder Kd.-Nr.', 'Name, email, phone or customer no.')}
            className="pl-9"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="space-y-2 px-6 py-4">
        <p className="text-[0.74rem] font-semibold text-[var(--casa-muted)]">
          {searching ? t('Treffer', 'Results') : linked ? t('Verknüpft', 'Linked') : t('Vorschläge', 'Suggestions')}
        </p>
        {list === null ? (
          <p className="py-6 text-center text-sm text-[var(--casa-muted)]">{t('Suche …', 'Searching …')}</p>
        ) : list.length === 0 ? (
          <p className="rounded-xl bg-ws-sunk px-4 py-5 text-center text-sm text-[var(--casa-muted)]">
            {searching ? t('Niemand gefunden.', 'Nobody found.') : t(`Niemand bei CASA passt zu ${firstName}.`, `Nobody at CASA matches ${firstName}.`)}
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => {
              const open = selected?.id === c.id;
              return (
                <li key={c.id} className={cn('rounded-2xl border transition-colors', open ? 'border-[var(--casa-ink)]/70 shadow-[0_0_0_1px_var(--casa-ink)]/40' : 'border-ws-line hover:border-ws-line-firm')}>
                  <button type="button" onClick={() => setChosen(c.id)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30">
                    <Avatar name={c.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-[0.92rem] font-bold text-[var(--casa-ink)]">{c.name}</span>
                        {linked?.id === c.id ? (
                          <Badge tone="positive">{t('Verknüpft', 'Linked')}</Badge>
                        ) : c.judgement.strength ? (
                          <Badge tone={STRENGTH_TONE[c.judgement.strength]}>{strengthLabel(c.judgement.strength, t)}</Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.78rem] text-[var(--casa-muted)]">{about(c, t, lang)}</span>
                    </span>
                    <span aria-hidden="true" className={cn('shrink-0 text-[var(--casa-text-subtle)] transition-transform [&_svg]:size-4', open && 'rotate-90')}>
                      {Icon.chevronRight}
                    </span>
                  </button>
                  {open ? (
                    <Comparison
                      sent={sent}
                      candidate={c}
                      hints={schoolman.filter((h) => h.personId === c.id)}
                      registrationId={registrationId}
                      canEdit={canEdit}
                      linkBooking={linkBooking}
                      dismissBooking={dismissBooking}
                      today={today}
                      t={t}
                      lang={lang}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SidePanel>
  );
}

const STRENGTH_TONE: Record<MatchStrength, BadgeTone> = { sure: 'positive', likely: 'accent', possible: 'neutral' };

const strengthLabel = (s: MatchStrength, t: T) =>
  s === 'sure' ? t('Sehr wahrscheinlich', 'Very likely') : s === 'likely' ? t('Wahrscheinlich', 'Likely') : t('Möglich', 'Possible');

const day = (iso: string, lang: WsLang) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: '2-digit', month: '2-digit', year: 'numeric' });
const month = (iso: string, lang: WsLang) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { month: 'short', year: 'numeric' });

/** Under a candidate's name: their number, since when, how much — or that they only wrote to us once. */
function about(c: PersonCandidate, t: T, lang: WsLang): string {
  return [
    c.customerNumber ? t(`Kd.-Nr. ${c.customerNumber}`, `No. ${c.customerNumber}`) : null,
    !c.listed ? t('früherer Website-Kontakt', 'earlier website contact') : c.since ? t(`seit ${month(c.since, lang)}`, `since ${month(c.since, lang)}`) : null,
    c.bookings ? (c.bookings === 1 ? t('1 Buchung', '1 booking') : t(`${c.bookings} Buchungen`, `${c.bookings} bookings`)) : c.listed ? t('noch keine Buchung', 'no booking yet') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const REASONS: Record<MatchReason, { de: string; en: string; against?: boolean }> = {
  name: { de: 'gleicher Name', en: 'same name' },
  name_swapped: { de: 'Vor- und Nachname vertauscht', en: 'first and last name swapped' },
  name_close: { de: 'ähnlicher Name', en: 'similar name' },
  email: { de: 'gleiche E-Mail', en: 'same email' },
  email_close: { de: 'ähnliche E-Mail', en: 'similar email' },
  phone: { de: 'gleiche Telefonnummer', en: 'same phone' },
  birth: { de: 'gleiches Geburtsdatum', en: 'same date of birth' },
  birth_close: { de: 'Geburtsdatum fast gleich', en: 'date of birth nearly the same' },
  surname: { de: 'gleicher Nachname', en: 'same surname' },
  first_name_differs: { de: 'anderer Vorname', en: 'another first name', against: true },
  birth_differs: { de: 'anderes Geburtsdatum', en: 'another date of birth', against: true },
};

const MARK: Record<FieldVerdict, { sign: string; className: string; de: string; en: string }> = {
  same: { sign: '✓', className: 'bg-[#e9f7ef] text-[#17693a]', de: 'gleich', en: 'same' },
  close: { sign: '≈', className: 'bg-[#fff4dc] text-[#8a5a00]', de: 'ähnlich', en: 'similar' },
  different: { sign: '≠', className: 'bg-[#fdecec] text-[#a3241f]', de: 'anders', en: 'different' },
  unknown: { sign: '–', className: 'bg-[#f1f4f8] text-[var(--casa-text-subtle)]', de: 'fehlt', en: 'missing' },
};

/** One candidate opened: the fields side by side, what they did at CASA, a SchoolMan booking that may be this registration's. */
function Comparison({
  sent,
  candidate: c,
  hints,
  registrationId,
  canEdit,
  linkBooking,
  dismissBooking,
  today,
  t,
  lang,
}: {
  sent: SentFacts;
  candidate: PersonCandidate;
  hints: readonly SchoolmanHint[];
  registrationId: string;
  canEdit: boolean;
  linkBooking: Action;
  dismissBooking: Action;
  today: string;
  t: T;
  lang: WsLang;
}) {
  // The address and number shown on their side: the one that matches, else their first.
  const near = (list: readonly string[], to: string, digits = false) => {
    const plain = (v: string) => (digits ? v.replace(/\D/g, '').slice(-9) : v.toLowerCase());
    return list.find((v) => plain(v) === plain(to)) ?? list[0] ?? null;
  };
  const rows: { field: MatchField; label: string; sent: string | null; theirs: string | null }[] = [
    { field: 'name', label: t('Name', 'Name'), sent: sent.name, theirs: c.name },
    { field: 'birthDate', label: t('Geburtsdatum', 'Date of birth'), sent: sent.birthDate ? day(sent.birthDate, lang) : null, theirs: c.birthDate ? day(c.birthDate, lang) : null },
    { field: 'email', label: t('E-Mail', 'Email'), sent: sent.email || null, theirs: near(c.emails, sent.email) },
    { field: 'phone', label: t('Telefon', 'Phone'), sent: sent.phone || null, theirs: near(c.phones, sent.phone, true) },
    { field: 'nationality', label: t('Nationalität', 'Nationality'), sent: sent.nationality, theirs: c.nationality },
  ];
  const reasons = c.judgement.reasons.map((r) => REASONS[r]);

  return (
    <div className="space-y-4 border-t border-ws-line-soft px-3.5 pt-3 pb-4">
      {reasons.length ? (
        <p className="flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <Badge key={r.de} tone={r.against ? 'warning' : 'positive'}>
              {lang === 'de' ? r.de : r.en}
            </Badge>
          ))}
        </p>
      ) : null}

      <table className="w-full table-fixed text-[0.82rem]">
        <thead>
          <tr className="text-left text-[0.7rem] font-semibold text-[var(--casa-muted)]">
            <th className="w-[6.5rem] pb-1.5 font-semibold" />
            <th className="pb-1.5 font-semibold">{t('Anmeldung', 'Registration')}</th>
            <th className="pb-1.5 font-semibold">{t('Bei CASA', 'At CASA')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ws-line-soft">
          {rows.map((row) => {
            const verdict = c.judgement.fields[row.field];
            const mark = MARK[verdict];
            return (
              <tr key={row.field} className="align-top">
                <th scope="row" className="py-2 pr-2 text-left text-[0.74rem] font-medium text-[var(--casa-muted)]">
                  {row.label}
                </th>
                <td className="py-2 pr-3 break-words text-[var(--casa-ink)]">{row.sent ?? <span className="text-[var(--casa-text-subtle)]">–</span>}</td>
                <td className="py-2">
                  <span className="flex items-start gap-2">
                    <span
                      title={lang === 'de' ? mark.de : mark.en}
                      aria-label={lang === 'de' ? mark.de : mark.en}
                      className={cn('mt-px inline-grid size-[1.15rem] shrink-0 place-items-center rounded-full text-[0.7rem] font-extrabold', mark.className)}
                    >
                      {mark.sign}
                    </span>
                    <span className="min-w-0 break-words text-[var(--casa-ink)]">{row.theirs ?? <span className="text-[var(--casa-text-subtle)]">–</span>}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ws-sunk px-3.5 py-2.5 text-[0.8rem]">
        <span className="min-w-0 text-[var(--casa-ink)]">
          {c.course
            ? c.course.end >= today
              ? c.course.start <= today
                ? t(`Jetzt im Kurs: ${c.course.name} bis ${day(c.course.end, lang)}`, `In a course now: ${c.course.name} until ${day(c.course.end, lang)}`)
                : t(`Gebucht: ${c.course.name} ab ${day(c.course.start, lang)}`, `Booked: ${c.course.name} from ${day(c.course.start, lang)}`)
              : t(`Zuletzt: ${c.course.name} bis ${day(c.course.end, lang)}`, `Last: ${c.course.name} until ${day(c.course.end, lang)}`)
            : c.listed
              ? t('Noch nie in einem Kurs', 'Never in a course yet')
              : t('Hat uns schon einmal geschrieben', 'Wrote to us before')}
          {c.fromSchoolman ? <span className="text-[var(--casa-muted)]"> · {t('aus SchoolMan', 'from SchoolMan')}</span> : null}
        </span>
        <Link href={`/admin/people/${c.id}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)] [&_svg]:size-3.5">
          {t('Profil', 'Profile')} {Icon.external}
        </Link>
      </div>

      {hints.length ? (
        <div className="space-y-2">
          <p className="text-[0.74rem] font-semibold text-[var(--casa-muted)]">{t('In SchoolMan schon gebucht', 'Already booked in SchoolMan')}</p>
          {hints.map((h) => (
            <div key={`${h.lineId}-${h.bookingId}`} className="rounded-xl px-3.5 py-2.5 ring-1 ring-ws-line ring-inset">
              <p className="text-[0.84rem] font-semibold text-[var(--casa-ink)]">
                <Link href={`/admin/bookings/${h.bookingId}`} target="_blank" className="hover:underline">
                  {h.number}
                </Link>
                {h.what ? <span className="font-normal"> · {h.what}</span> : null}
                {h.when ? <span className="font-normal text-[var(--casa-muted)]"> · {h.when}</span> : null}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.76rem] text-[var(--casa-muted)]">
                {t(`für ${h.line}`, `for ${h.line}`)}
                <Badge tone={h.exact ? 'positive' : 'warning'}>
                  {h.exact
                    ? h.lineKind === 'exam'
                      ? t('gleicher Prüfungstermin', 'same sitting')
                      : t('gleicher Termin', 'same start')
                    : h.lineKind === 'exam'
                      ? t('anderer Prüfungstermin', 'another sitting')
                      : t('anderer Termin', 'another start')}
                </Badge>
                {h.bookedAfter ? null : <Badge tone="warning">{t('vor der Anmeldung gebucht', 'booked before the registration')}</Badge>}
              </p>
              {canEdit ? (
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <form action={dismissBooking}>
                    <input type="hidden" name="id" value={registrationId} />
                    <input type="hidden" name="lineId" value={h.lineId} />
                    <input type="hidden" name="bookingId" value={h.bookingId} />
                    <Button type="submit" variant="ghost" size="sm">
                      {t('Nicht diese Buchung', 'Not this booking')}
                    </Button>
                  </form>
                  <form action={linkBooking}>
                    <input type="hidden" name="id" value={registrationId} />
                    <input type="hidden" name="lineId" value={h.lineId} />
                    <input type="hidden" name="bookingId" value={h.bookingId} />
                    <input type="hidden" name="kind" value={h.lineKind} />
                    <Button type="submit" variant="secondary" size="sm">
                      {t('Mit der Position verknüpfen', 'Link to the line')}
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
