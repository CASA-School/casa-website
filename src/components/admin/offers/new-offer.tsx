'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { createOfferAction, findRecipientsAction, matchRecipientsAction, pickRecipientAction } from '@/app/(admin)/admin/(workspace)/offers/actions';
import { useWsLang } from '@/components/admin/lang';
import { GRUPPEN_PACKAGES_BY_STACK, fullBoardBaseTotal } from '@/config/gruppen/packages';
import { pick, type Bilingual, type T } from '@/lib/admin/i18n';
import { formatDateRange, formatLetterDate, formatMoney } from '@/lib/admin/letters/format';
import { courseFacts, courseLines, courseSpan, courseTitle, type CourseCatalogue, type CourseChoice, type LearnerHistory } from '@/lib/admin/offers/course';
import { packageWeeks } from '@/lib/admin/offers/engine';
import { countryFromEmail, guessKind, languageFor, nameFromEmail, offerName, type RecipientKind } from '@/lib/admin/offers/recipient-guess';
import type { EditorOptions, PriceListItem } from '@/lib/admin/offers/repo';
import { addDays, stayLength } from '@/lib/admin/offers/stay';
import { ORGANISATION_KINDS, type OfferLanguage, type OrganisationKind, type PackageChoice, type Salutation } from '@/lib/admin/offers/types';
import {
  DEFAULT_TITLE,
  VALID_FOR_DAYS,
  type ContactInput,
  type NewOfferInput,
  type OrganisationForOffer,
  type PersonHit,
  type RecipientFilter,
  type RecipientHit,
  type RecipientMatch,
  type WizardStart,
} from '@/lib/admin/offers/wizard';

import { DateField, DateRange } from '@/components/admin/date-picker';
import { CoursePicker } from './course-picker';
import { Seg, Stepper } from './fields';
import { OfferFrame } from './frame';
import { ICONS, type Tint } from './icons';
import ui from './offers.module.css';

const eur = (n: number | null) => (n == null ? '—' : formatMoney(n, 'de'));

const KIND_LABEL: Record<RecipientKind, Bilingual> = {
  school: { de: 'Schule', en: 'School' },
  agency: { de: 'Agentur', en: 'Agency' },
  company: { de: 'Unternehmen', en: 'Company' },
  public_body: { de: 'Behörde', en: 'Public body' },
  other: { de: 'Andere Organisation', en: 'Other organisation' },
  person: { de: 'Lernende', en: 'Learner' },
};
const KIND_LOOK: Record<RecipientKind | 'enquiry', { tint: Tint; icon: ReactNode }> = {
  school: { tint: 'blue', icon: ICONS.school },
  agency: { tint: 'sun', icon: ICONS.globe },
  company: { tint: 'ink', icon: ICONS.building },
  public_body: { tint: 'red', icon: ICONS.building },
  other: { tint: 'ink', icon: ICONS.building },
  person: { tint: 'green', icon: ICONS.person },
  enquiry: { tint: 'sun', icon: ICONS.mail },
};
const filters = (t: T): [RecipientFilter, string][] => [
  ['all', t('Alle', 'All')],
  ['school', t('Schulen', 'Schools')],
  ['agency', t('Agenturen', 'Agencies')],
  ['company', t('Unternehmen', 'Companies')],
  ['public_body', t('Behörden', 'Public bodies')],
  ['person', t('Lernende', 'Learners')],
];
const PACKAGE_COLOUR: Record<PackageChoice, [string, string]> = {
  hahn: ['var(--c-sun)', 'var(--c-sun-tint)'],
  katze: ['var(--c-blue)', 'var(--c-blue-tint)'],
  hund: ['var(--c-red)', 'var(--c-red-tint)'],
  esel: ['var(--c-ink)', 'var(--c-ink-tint)'],
  own: ['var(--o-line-firm)', '#f6f8fb'],
};
const PACKAGE_NAME: Record<PackageChoice, Bilingual> = {
  hahn: { de: 'Hahn', en: 'Hahn' },
  katze: { de: 'Katze', en: 'Katze' },
  hund: { de: 'Hund', en: 'Hund' },
  esel: { de: 'Esel', en: 'Esel' },
  own: { de: 'Eigenes Angebot', en: 'Own offer' },
};
const weeksWord = (t: T, n: number) => (n === 1 ? t('Woche', 'week') : t('Wochen', 'weeks'));
const escortsWord = (t: T, n: number) => (n === 1 ? t('Begleitperson', 'escort') : t('Begleitpersonen', 'escorts'));

const NO_CONTACT: ContactInput = { salutation: 'none', firstName: '', lastName: '', email: '' };

type Recipient =
  | { type: 'organisation'; org: OrganisationForOffer; contactId: string | null; newContact: ContactInput | null }
  | { type: 'new-organisation'; name: string; kind: OrganisationKind; countryCode: string | null; address: string; contact: ContactInput }
  | { type: 'person'; person: PersonHit }
  | { type: 'new-person'; salutation: Salutation; firstName: string; lastName: string; email: string; countryCode: string | null };

const recipientName = (r: Recipient | null) =>
  !r ? '' : r.type === 'organisation' ? r.org.name : r.type === 'new-organisation' ? r.name : r.type === 'person' ? r.person.name : [r.firstName, r.lastName].filter(Boolean).join(' ');
const recipientCountry = (r: Recipient | null) =>
  !r ? null : r.type === 'organisation' ? r.org.countryCode : r.type === 'person' ? r.person.countryCode : r.countryCode;
const isOrganisation = (r: Recipient | null) => r?.type === 'organisation' || r?.type === 'new-organisation';
const validEmail = (v: string) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function Mark({ kind }: { kind: RecipientKind | 'enquiry' }) {
  const look = KIND_LOOK[kind];
  return <span className={`${ui.mark} ${ui[`tint_${look.tint}`]}`}>{look.icon}</span>;
}

/** A recipient from what was typed: a name, or an address to read a name and a country from. */
function fromTyped(q: string, filter: RecipientFilter): Recipient {
  const text = q.trim();
  const email = text.includes('@') ? text : '';
  const named = email ? nameFromEmail(email) : null;
  const countryCode = email ? countryFromEmail(email) : null;
  const guessed = email ? null : guessKind(text);
  const person = filter === 'person' || guessed === 'person';
  if (person) {
    const [first, ...rest] = email ? [] : text.split(/\s+/);
    return { type: 'new-person', salutation: 'none', firstName: named?.firstName ?? first ?? '', lastName: named?.lastName ?? rest.join(' '), email, countryCode };
  }
  const kind: OrganisationKind = guessed ?? (filter === 'all' ? 'school' : filter);
  return {
    type: 'new-organisation',
    name: email ? '' : text,
    kind,
    countryCode,
    address: '',
    contact: { salutation: 'none', firstName: named?.firstName ?? '', lastName: named?.lastName ?? '', email },
  };
}

type StepId = 'recipient' | 'offer' | 'group' | 'letter';

/**
 * A new offer, in four steps: who it is for, what it is, the group, the
 * letter. The recipient is found among CASA's organisations, contacts,
 * learners and waiting enquiries — or made new, with its kind, name and
 * country read from what was typed and a warning when CASA already has it.
 * A school that came before can repeat its last offer. Nothing is written
 * until "Create offer". docs/OFFERS.md §New offer.
 */
export function NewOffer({
  start,
  suggestions,
  priceList,
  catalogue,
  staff,
  countries,
  me,
  today,
}: {
  start: WizardStart | null;
  suggestions: RecipientHit[];
  priceList: PriceListItem[];
  catalogue: CourseCatalogue;
  staff: EditorOptions['staff'];
  countries: EditorOptions['countries'];
  me: string;
  today: string;
}) {
  const router = useRouter();
  const { t, lang } = useWsLang();
  const [step, setStep] = useState<StepId>(start?.recipient ? 'offer' : 'recipient');
  const [recipient, setRecipient] = useState<Recipient | null>(() => recipientFromStart(start));
  const [enquiryId, setEnquiryId] = useState(start?.enquiryId ?? null);
  const [enquiryNote, setEnquiryNote] = useState(start?.enquiryNote ?? null);
  const [kindChoice, setKind] = useState<'group' | 'individual'>(start?.kind ?? 'group');
  const [pkg, setPkg] = useState<PackageChoice>(start?.group?.package ?? 'katze');
  const [weeks, setWeeks] = useState(start?.group?.weeks ?? 2);
  const [basedOn, setBasedOn] = useState<string | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  const [departure, setDeparture] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number | null>(start?.group?.participants ?? null);
  const [escorts, setEscorts] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [course, setCourse] = useState<CourseChoice | null>(null);
  /** The language: a colleague's choice, else what the record says (an enquiry's), else the recipient's country's. */
  const [languageChoice, setLanguageChoice] = useState<OfferLanguage | null>(null);
  const [suggestedLanguage, setSuggestedLanguage] = useState<OfferLanguage | null>(start?.language ?? null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [validChoice, setValidChoice] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string>(me);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A learner's offer is a course; only an organisation chooses between a group stay and courses.
  const kind = recipient?.type === 'person' || recipient?.type === 'new-person' ? 'individual' : kindChoice;
  const group = kind === 'group';
  const country = recipientCountry(recipient);
  // Without a country: English to an organisation (groups come from abroad), German to a learner.
  const language = languageChoice ?? suggestedLanguage ?? languageFor(country, isOrganisation(recipient) ? 'en' : 'de');
  const steps: { id: StepId; title: string; summary: string | null }[] = [
    { id: 'recipient', title: t('Für wen', 'Who it is for'), summary: recipient ? recipientName(recipient) || t('Neuer Empfänger', 'New recipient') : null },
    {
      id: 'offer',
      title: t('Was es ist', 'What it is'),
      summary:
        recipient && step !== 'recipient'
          ? group
            ? `${pick(lang, PACKAGE_NAME[pkg])}${packageWeeks(pkg) ? '' : ` · ${weeks} ${weeksWord(t, weeks)}`}`
            : [
                course ? courseTitle(course, lang) : null,
                picked.length ? t(`${picked.length} aus der Preisliste`, `${picked.length} from the price list`) : null,
              ]
                .filter(Boolean)
                .join(' · ') || t('Ein Kurs', 'A course')
          : null,
    },
    ...(group
      ? [
          {
            id: 'group' as const,
            title: t('Die Gruppe', 'The group'),
            summary:
              arrival && departure
                ? `${formatDateRange(arrival, departure, lang)}${participants ? ` · ${participants}` : ''}`
                : participants
                  ? t(`${participants} Teilnehmende`, `${participants} participants`)
                  : null,
          },
        ]
      : []),
    { id: 'letter', title: t('Der Brief', 'The letter'), summary: step === 'letter' ? `${language === 'de' ? 'Deutsch' : 'English'}` : null },
  ];
  const index = steps.findIndex((s) => s.id === step);
  const [reached, setReached] = useState<StepId[]>([step]);


  const applyStart = (ws: WizardStart | null) => {
    if (!ws) return;
    setRecipient(recipientFromStart(ws));
    setEnquiryId(ws.enquiryId);
    setEnquiryNote(ws.enquiryNote);
    setKind(ws.kind);
    if (ws.group) {
      setPkg(ws.group.package);
      setWeeks(ws.group.weeks);
      setParticipants(ws.group.participants);
    }
    setSuggestedLanguage(ws.language);
    setLanguageChoice(null);
    setBasedOn(null);
  };

  const recipientReady =
    recipient != null &&
    (recipient.type === 'new-organisation'
      ? recipient.name.trim().length > 0 && validEmail(recipient.contact.email)
      : recipient.type === 'new-person'
        ? recipient.firstName.trim().length > 0 && validEmail(recipient.email)
        : recipient.type === 'organisation'
          ? !recipient.newContact || validEmail(recipient.newContact.email)
          : true);

  const name = recipientName(recipient);
  const defaultGroupName = offerName(name, arrival);
  const defaultTitle = !group && course ? courseTitle(course, language) : DEFAULT_TITLE[kind][language];
  // An offer for a course holds until a week before it starts, at most the usual four weeks, at least three days.
  const courseStart = !group && course ? courseSpan(course).start : null;
  const weekBefore = courseStart ? addDays(courseStart, -7) : null;
  const usual = addDays(today, VALID_FOR_DAYS);
  const validUntil = validChoice ?? (weekBefore && weekBefore < usual ? (weekBefore > addDays(today, 3) ? weekBefore : addDays(today, 3)) : usual);
  const courseTotal = !group && course ? courseLines(course, language).reduce((sum, l) => sum + (l.unitAmount ?? 0), 0) : null;
  // A learner who has studied or stayed before pays no enrolment fee, no placement fee and no deposit; someone new pays them; for an organisation nobody can tell.
  const history: LearnerHistory | null =
    recipient?.type === 'person'
      ? { studiedBefore: recipient.person.studiedBefore, stayedBefore: recipient.person.stayedBefore }
      : recipient?.type === 'new-person'
        ? { studiedBefore: false, stayedBefore: false }
        : null;

  const go = (to: StepId) => {
    setError(null);
    setStep(to);
    setReached((r) => (r.includes(to) ? r : [...r, to]));
  };
  const next = () => {
    const n = steps[index + 1];
    if (n) go(n.id);
  };
  const back = () => {
    const p = steps[index - 1];
    if (p) go(p.id);
  };

  const create = async () => {
    if (!recipient) return;
    setBusy(true);
    setError(null);
    const input: NewOfferInput = {
      recipient:
        recipient.type === 'organisation'
          ? { type: 'organisation', id: recipient.org.id, contactId: recipient.contactId, newContact: recipient.contactId ? null : recipient.newContact }
          : recipient.type === 'person'
            ? { type: 'person', id: recipient.person.id }
            : recipient.type === 'new-organisation'
              ? {
                  type: 'new-organisation',
                  name: recipient.name,
                  kind: recipient.kind,
                  countryCode: recipient.countryCode,
                  address: recipient.address,
                  contact: recipient.contact.firstName || recipient.contact.lastName || recipient.contact.email ? recipient.contact : null,
                }
              : { ...recipient },
      enquiryId,
      basedOn,
      kind,
      group: group ? { package: pkg, weeks: packageWeeks(pkg) ?? weeks, arrival, departure, participants, escorts } : null,
      course: group ? null : course,
      lines: group ? [] : picked.map((i) => priceList[i]).filter(Boolean).map((p) => ({ chargeType: p.chargeType, de: p.de, en: p.en, unitAmount: p.unitAmount })),
      language,
      groupName: groupName ?? (group ? defaultGroupName : ''),
      title: title ?? defaultTitle,
      validUntil,
      ownerId,
    };
    const result = await createOfferAction(input);
    if (result.ok) router.push(`/admin/offers/${result.id}`);
    else {
      setError(result.error);
      setBusy(false);
    }
  };

  const last = index === steps.length - 1;
  const canContinue = step === 'recipient' ? recipientReady : true;

  return (
    <OfferFrame back={{ href: '/admin/offers', label: t('Angebote', 'Offers') }} title={t('Neues Angebot', 'New offer')}>
      <div className={ui.wz}>
        <div className={ui.wzCard}>
          <nav className={ui.wzRail} aria-label={t('Schritte', 'Steps')}>
            <ol className={ui.wzSteps}>
              {steps.map((s, i) => {
                const done = i < index;
                const can = reached.includes(s.id) || i <= index || (i === index + 1 && canContinue);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`${ui.wzStep} ${s.id === step ? ui.wzStepOn : ''} ${done ? ui.wzDone : ''}`}
                      disabled={!can || (s.id !== 'recipient' && !recipientReady)}
                      aria-current={s.id === step ? 'step' : undefined}
                      onClick={() => go(s.id)}
                    >
                      <span className={ui.wzNum}>{done ? '✓' : i + 1}</span>
                      <span className={ui.wzStepText}>
                        <b>{s.title}</b>
                        {s.summary ? <small>{s.summary}</small> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className={ui.wzMain}>
            <div className={ui.wzBody}>
              {step === 'recipient' ? (
                <RecipientStep
                  recipient={recipient}
                  setRecipient={setRecipient}
                  suggestions={suggestions}
                  countries={countries}
                  onPick={async (hit) => applyStart(await pickRecipientAction(hit.type === 'enquiry' ? { enquiryId: hit.id } : hit.type === 'person' ? { personId: hit.id } : { organisationId: hit.id }))}
                  onClear={() => {
                    setRecipient(null);
                    setSuggestedLanguage(null);
                    setEnquiryId(null);
                    setEnquiryNote(null);
                    setBasedOn(null);
                  }}
                />
              ) : null}

              {step === 'offer' ? (
                <OfferStep
                  recipient={recipient}
                  kind={kind}
                  setKind={setKind}
                  pkg={pkg}
                  setPkg={(p) => {
                    setPkg(p);
                    setBasedOn(null);
                  }}
                  weeks={weeks}
                  setWeeks={setWeeks}
                  basedOn={basedOn}
                  repeat={(o) => {
                    if (basedOn === o.id) return setBasedOn(null);
                    setBasedOn(o.id);
                    setKind(o.kind);
                    setPkg(o.package);
                    setParticipants(o.participants);
                    setEscorts(o.escorts);
                  }}
                  priceList={priceList}
                  picked={picked}
                  setPicked={setPicked}
                  catalogue={catalogue}
                  course={course}
                  setCourse={setCourse}
                  history={history}
                />
              ) : null}

              {step === 'group' ? (
                <GroupStep
                  today={today}
                  pkg={pkg}
                  weeks={weeks}
                  arrival={arrival}
                  departure={departure}
                  setDates={(a, d) => {
                    setArrival(a);
                    setDeparture(d);
                  }}
                  participants={participants}
                  setParticipants={setParticipants}
                  escorts={escorts}
                  setEscorts={setEscorts}
                  note={enquiryNote}
                />
              ) : null}

              {step === 'letter' ? (
                <>
                  <h2 className={ui.wzQ}>{t('Der Brief', 'The letter')}</h2>
                  <div className={ui.fld}>
                    <span>{t('Sprache', 'Language')}</span>
                    <div className={ui.inline}>
                      <Seg<OfferLanguage>
                        label={t('Sprache', 'Language')}
                        value={language}
                        options={[
                          ['de', 'Deutsch'],
                          ['en', 'English'],
                        ]}
                        onChange={setLanguageChoice}
                      />
                      {country && !languageChoice && !suggestedLanguage ? (
                        <span className={ui.guess}>
                          {t('Aus dem Land', 'From the country')}: {countries.find((c) => c.code === country)?.[lang] ?? country}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {group ? (
                    <div className={ui.fld}>
                      <label htmlFor="wz-name">{t('Name des Angebots', 'Name of the offer')}</label>
                      <input id="wz-name" className={ui.fi} value={groupName ?? defaultGroupName} onChange={(e) => setGroupName(e.target.value)} />
                    </div>
                  ) : null}
                  <div className={ui.fld}>
                    <label htmlFor="wz-title">{t('Titel im Brief', 'Title on the letter')}</label>
                    <input id="wz-title" className={ui.fi} value={title ?? defaultTitle} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className={ui.row2}>
                    <div className={ui.fld}>
                      <label htmlFor="wz-valid">{t('Gültig bis', 'Valid until')}</label>
                      <DateField
                        id="wz-valid"
                        value={validUntil}
                        today={today}
                        min={today}
                        onChange={setValidChoice}
                        quick={[
                          ...[14, 28, 42].map((days) => ({ label: t(`${days / 7} Wochen`, `${days / 7} weeks`), value: addDays(today, days) })),
                          ...(group && arrival && addDays(arrival, -42) > today
                            ? [{ label: t('6 Wochen vor der Anreise', '6 weeks before arrival'), value: addDays(arrival, -42) }]
                            : []),
                          ...(weekBefore && weekBefore > today ? [{ label: t('Eine Woche vor dem Kurs', 'A week before the course'), value: weekBefore }] : []),
                        ]}
                      />
                    </div>
                    <div className={ui.fld}>
                      <label htmlFor="wz-owner">{t('Unterschrift', 'Signed by')}</label>
                      <select id="wz-owner" className={ui.fi} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <dl className={ui.summary}>
                    <dt>{t('Für', 'For')}</dt>
                    <dd>
                      {name || '—'}
                      {recipient?.type === 'new-organisation' || recipient?.type === 'new-person' ? t(' · neu', ' · new') : ''}
                    </dd>
                    <dt>{t('Angebot', 'Offer')}</dt>
                    <dd>
                      {group
                        ? `${pick(lang, PACKAGE_NAME[pkg])}${basedOn ? t(' · wie beim letzten Mal', ' · like last time') : ''}`
                        : [course ? courseTitle(course, lang) : null, ...picked.map((i) => priceList[i]?.label)].filter(Boolean).join(', ') ||
                          t('Noch keine Zeilen', 'No lines yet')}
                    </dd>
                    {course && !group ? (
                      <>
                        <dt>{t('Kurs', 'Course')}</dt>
                        <dd>{courseFacts(course, lang)}</dd>
                        <dt>{t('Gesamt', 'Total')}</dt>
                        <dd>{eur((courseTotal ?? 0) + picked.reduce((sum, i) => sum + (priceList[i]?.unitAmount ?? 0), 0))}</dd>
                      </>
                    ) : null}
                    {group ? (
                      <>
                        <dt>{t('Gruppe', 'Group')}</dt>
                        <dd>
                          {[
                            arrival && departure ? formatDateRange(arrival, departure, lang) : null,
                            participants ? t(`${participants} Teilnehmende`, `${participants} participants`) : null,
                            escorts ? `${escorts} ${escortsWord(t, escorts)}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || t('Noch offen', 'To be filled in')}
                        </dd>
                      </>
                    ) : null}
                    <dt>{t('Gültig bis', 'Valid until')}</dt>
                    <dd>{formatLetterDate(validUntil, lang)}</dd>
                  </dl>
                </>
              ) : null}
            </div>

            <div className={ui.wzFoot}>
              <span className={error ? ui.wzError : undefined}>
                {error ?? ''}
              </span>
              {index > 0 ? (
                <button type="button" className={ui.btn} onClick={back} disabled={busy}>
                  {t('Zurück', 'Back')}
                </button>
              ) : null}
              {last ? (
                <button type="button" className={ui.primary} disabled={!recipientReady || busy} onClick={() => void create()}>
                  {busy ? t('Wird angelegt …', 'Creating …') : t('Angebot anlegen', 'Create offer')}
                </button>
              ) : (
                <button type="button" className={ui.primary} disabled={!canContinue} onClick={next}>
                  {t('Weiter', 'Continue')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </OfferFrame>
  );
}

function recipientFromStart(ws: WizardStart | null): Recipient | null {
  const r = ws?.recipient;
  if (!r) return null;
  if (r.type === 'organisation') return { type: 'organisation', org: r.organisation, contactId: r.contactId, newContact: r.newContact };
  if (r.type === 'person') return { type: 'person', person: r.person };
  return { type: 'new-organisation', name: r.name, kind: r.kind, countryCode: r.countryCode, address: '', contact: r.contact ?? NO_CONTACT };
}

// ------------------------------------------------------- 1 · who it is for

function RecipientStep({
  recipient,
  setRecipient,
  suggestions,
  countries,
  onPick,
  onClear,
}: {
  recipient: Recipient | null;
  setRecipient: (r: Recipient | null) => void;
  suggestions: RecipientHit[];
  countries: EditorOptions['countries'];
  onPick: (hit: RecipientHit) => Promise<void>;
  onClear: () => void;
}) {
  const { t } = useWsLang();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<RecipientFilter>('all');
  const [hits, setHits] = useState(suggestions);
  const [active, setActive] = useState(0);
  const [picking, setPicking] = useState<string | null>(null);
  const asked = useRef(0);

  useEffect(() => {
    if (recipient) return;
    const term = q.trim();
    const n = ++asked.current;
    const timer = setTimeout(
      async () => {
        const found = term || filter !== 'all' ? await findRecipientsAction(term, filter) : suggestions;
        if (n === asked.current) {
          setHits(found);
          setActive(0);
        }
      },
      term ? 180 : 0
    );
    return () => clearTimeout(timer);
  }, [q, filter, suggestions, recipient]);

  const pick = async (hit: RecipientHit) => {
    setPicking(hit.id);
    await onPick(hit);
    setPicking(null);
  };

  if (recipient) {
    return <ChosenRecipient recipient={recipient} setRecipient={setRecipient} countries={countries} onClear={onClear} onUse={(hit) => void pick(hit)} />;
  }

  const groups: { head: string; items: RecipientHit[] }[] = [
    { head: q ? t('Anfragen', 'Enquiries') : t('Anfragen, die auf ein Angebot warten', 'Enquiries waiting for an offer'), items: hits.filter((h) => h.type === 'enquiry') },
    {
      head: q || filter !== 'all' ? t('Organisationen', 'Organisations') : t('Zuletzt angeschrieben', 'Written to lately'),
      items: hits.filter((h) => h.type === 'organisation'),
    },
    { head: t('Lernende', 'Learners'), items: hits.filter((h) => h.type === 'person') },
  ].filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  const typed = q.trim() ? fromTyped(q, filter) : null;

  return (
    <>
      <h2 className={ui.wzQ}>{t('Für wen ist es?', 'Who is it for?')}</h2>
      <div className={ui.searchBox}>
        {ICONS.search}
        <input
          autoFocus
          value={q}
          placeholder={t('Name, Kontakt oder E-Mail', 'Name, contact or email')}
          aria-label={t('Für wen das Angebot ist', 'Who the offer is for')}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(flat.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (flat[active]) void pick(flat[active]);
              else if (typed) setRecipient(typed);
            }
          }}
        />
      </div>
      <div className={ui.kinds} role="radiogroup" aria-label={t('Art', 'Kind')}>
        {filters(t).map(([f, label]) => (
          <button key={f} type="button" role="radio" aria-checked={filter === f} className={`${ui.kind} ${filter === f ? ui.kindOn : ''}`} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>

      {flat.length ? (
        <div className={ui.hits}>
          {groups.map((g) => (
            <div key={g.head}>
              <div className={ui.hitsHead}>{g.head}</div>
              {g.items.map((h) => {
                const i = flat.indexOf(h);
                return (
                  <button
                    key={`${h.type}:${h.id}`}
                    type="button"
                    className={`${ui.hit} ${i === active ? ui.hitOn : ''}`}
                    onMouseEnter={() => setActive(i)}
                    disabled={picking != null}
                    onClick={() => void pick(h)}
                  >
                    <Mark kind={h.type === 'enquiry' ? 'enquiry' : h.type === 'person' ? 'person' : h.kind} />
                    <span className={ui.hitText}>
                      <b>{h.name}</b>
                      <span>{h.detail}</span>
                    </span>
                    <span className={ui.hitGo}>{picking === h.id ? t('Wird geöffnet …', 'Opening …') : t('Auswählen →', 'Choose →')}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : q.trim() ? (
        <div className={ui.note}>{t('Noch niemand mit diesem Namen.', 'Nobody by that name yet.')}</div>
      ) : null}

      {typed ? (
        <button type="button" className={ui.newHit} onClick={() => setRecipient(typed)}>
          <Mark kind={typed.type === 'new-person' ? 'person' : typed.type === 'new-organisation' ? typed.kind : 'other'} />
          <span className={ui.hitText}>
            <b>{t(`„${q.trim()}“ neu anlegen`, `Add “${q.trim()}” as new`)}</b>
            <span>{typed.type === 'new-person' ? t('Neue Person', 'New person') : t('Neue Organisation', 'New organisation')}</span>
          </span>
          <span className={ui.hitGo}>{t('Anlegen →', 'Add →')}</span>
        </button>
      ) : null}
    </>
  );
}

function ChosenRecipient({
  recipient,
  setRecipient,
  countries,
  onClear,
  onUse,
}: {
  recipient: Recipient;
  setRecipient: (r: Recipient) => void;
  countries: EditorOptions['countries'];
  onClear: () => void;
  onUse: (hit: RecipientHit) => void;
}) {
  const { t, lang } = useWsLang();
  const isNew = recipient.type === 'new-organisation' || recipient.type === 'new-person';
  const kind: RecipientKind =
    recipient.type === 'organisation' ? recipient.org.kind : recipient.type === 'new-organisation' ? recipient.kind : 'person';
  const detail =
    recipient.type === 'organisation'
      ? [
          pick(lang, KIND_LABEL[recipient.org.kind]),
          countries.find((c) => c.code === recipient.org.countryCode)?.[lang],
          recipient.org.lastOffer
            ? t(`letztes Angebot ${recipient.org.lastOffer.number}`, `last offer ${recipient.org.lastOffer.number}`)
            : t('noch kein Angebot', 'no offer yet'),
        ]
          .filter(Boolean)
          .join(' · ')
      : recipient.type === 'person'
        ? recipient.person.detail
        : t(`${KIND_LABEL[kind].de} (neu) · wird mit dem Angebot angelegt`, `New ${KIND_LABEL[kind].en.toLowerCase()} · made with the offer`);
  const bookings = recipient.type === 'person' ? recipient.person.bookings : 0;

  return (
    <>
      <h2 className={ui.wzQ}>{isNew ? t('Jemand Neues', 'Someone new') : t('Für wen ist es?', 'Who is it for?')}</h2>
      <div className={ui.chosen}>
        <Mark kind={kind} />
        <div>
          <b>{recipientName(recipient) || (recipient.type === 'new-person' ? t('Neue Person', 'A new learner') : t('Neue Organisation', 'A new organisation'))}</b>
          <span>{detail}</span>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={onClear}>
          {t('Ändern', 'Change')}
        </button>
      </div>

      {recipient.type === 'person' ? (
        <dl className={ui.summary}>
          <dt>{t('E-Mail', 'Email')}</dt>
          <dd>{recipient.person.email ?? '—'}</dd>
          <dt>{t('Telefon', 'Phone')}</dt>
          <dd>{recipient.person.phone ?? '—'}</dd>
          <dt>{t('Nationalität', 'Nationality')}</dt>
          <dd>{countries.find((c) => c.code === recipient.person.countryCode)?.[lang] ?? '—'}</dd>
          <dt>{t('Bei CASA', 'At CASA')}</dt>
          <dd>
            {bookings
              ? `${bookings === 1 ? t('1 Buchung', '1 booking') : t(`${bookings} Buchungen`, `${bookings} bookings`)}${
                  recipient.person.studiedBefore ? t(' · keine Einschreibegebühr', ' · no enrolment fee') : ''
                }${recipient.person.stayedBefore ? t(' · hat schon bei CASA gewohnt', ' · has stayed with CASA') : ''}`
              : t('Zum ersten Mal – Einschreibegebühr fällig', 'First time — enrolment fee due')}
          </dd>
        </dl>
      ) : null}
      {recipient.type === 'organisation' ? <ContactChoice recipient={recipient} setRecipient={setRecipient} /> : null}
      {isNew ? <NewRecipientForm recipient={recipient} setRecipient={setRecipient} countries={countries} onUse={onUse} /> : null}
    </>
  );
}

function ContactFields({ value, onChange, idPrefix }: { value: ContactInput; onChange: (c: ContactInput) => void; idPrefix: string }) {
  const { t } = useWsLang();
  return (
    <>
      <div className={ui.row3}>
        <div className={ui.fld}>
          <span>{t('Anrede', 'Salutation')}</span>
          <Seg<Salutation>
            label={t('Anrede', 'Salutation')}
            value={value.salutation}
            options={[
              ['ms', t('Frau', 'Ms')],
              ['mr', t('Herr', 'Mr')],
              ['none', '—'],
            ]}
            onChange={(v) => onChange({ ...value, salutation: v })}
          />
        </div>
        <div className={ui.fld}>
          <label htmlFor={`${idPrefix}-first`}>{t('Vorname', 'First name')}</label>
          <input id={`${idPrefix}-first`} className={ui.fi} value={value.firstName} onChange={(e) => onChange({ ...value, firstName: e.target.value })} />
        </div>
        <div className={ui.fld}>
          <label htmlFor={`${idPrefix}-last`}>{t('Nachname', 'Last name')}</label>
          <input id={`${idPrefix}-last`} className={ui.fi} value={value.lastName} onChange={(e) => onChange({ ...value, lastName: e.target.value })} />
        </div>
      </div>
      <div className={ui.fld}>
        <label htmlFor={`${idPrefix}-email`}>{t('E-Mail', 'Email')}</label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          className={ui.fi}
          value={value.email}
          aria-invalid={!validEmail(value.email) || undefined}
          onChange={(e) => {
            const email = e.target.value;
            const named = !value.firstName && !value.lastName ? nameFromEmail(email) : null;
            onChange({ ...value, email, ...(named ?? {}) });
          }}
        />
      </div>
    </>
  );
}

function ContactChoice({ recipient, setRecipient }: { recipient: Extract<Recipient, { type: 'organisation' }>; setRecipient: (r: Recipient) => void }) {
  const { t } = useWsLang();
  const { org } = recipient;
  const someoneElse = recipient.contactId == null;
  if (!org.contacts.length) {
    return (
      <div className={ui.section}>
        <span className={ui.sectionLabel}>{t('An wen wir schreiben', 'The person to write to')}</span>
        <ContactFields idPrefix="oc" value={recipient.newContact ?? NO_CONTACT} onChange={(c) => setRecipient({ ...recipient, contactId: null, newContact: c })} />
      </div>
    );
  }
  return (
    <div className={ui.section}>
      <span className={ui.sectionLabel}>{t('Angeschrieben', 'Written to')}</span>
      <div className={ui.radioList} role="radiogroup" aria-label={t('Kontakt', 'Contact')}>
        {org.contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={recipient.contactId === c.id}
            className={`${ui.radio} ${recipient.contactId === c.id ? ui.radioOn : ''}`}
            onClick={() => setRecipient({ ...recipient, contactId: c.id, newContact: null })}
          >
            <i />
            <span>
              <b>{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}</b>
              <span>{c.email || t('Keine E-Mail', 'No email')}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={someoneElse}
          className={`${ui.radio} ${someoneElse ? ui.radioOn : ''}`}
          onClick={() => setRecipient({ ...recipient, contactId: null, newContact: recipient.newContact ?? NO_CONTACT })}
        >
          <i />
          <span>
            <b>{t('Jemand anderes', 'Someone else')}</b>
            <span>{t('Ein neuer Name bei der Organisation', 'A new name at the organisation')}</span>
          </span>
        </button>
      </div>
      {someoneElse ? (
        <ContactFields idPrefix="oc" value={recipient.newContact ?? NO_CONTACT} onChange={(c) => setRecipient({ ...recipient, newContact: c })} />
      ) : null}
    </div>
  );
}

function NewRecipientForm({
  recipient,
  setRecipient,
  countries,
  onUse,
}: {
  recipient: Extract<Recipient, { type: 'new-organisation' | 'new-person' }>;
  setRecipient: (r: Recipient) => void;
  countries: EditorOptions['countries'];
  onUse: (hit: RecipientHit) => void;
}) {
  const { t, lang } = useWsLang();
  const [matches, setMatches] = useState<RecipientMatch[]>([]);
  const kind: RecipientKind = recipient.type === 'new-person' ? 'person' : recipient.kind;
  const name = recipientName(recipient);
  const email = recipient.type === 'new-person' ? recipient.email : recipient.contact.email;

  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      const found = name.trim().length >= 3 || email.includes('@') ? await matchRecipientsAction({ name, email }) : [];
      if (live) setMatches(found);
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [name, email]);

  const switchKind = (k: RecipientKind) => {
    if (k === kind) return;
    if (k === 'person') {
      const c = recipient.type === 'new-organisation' ? recipient.contact : null;
      setRecipient({ type: 'new-person', salutation: c?.salutation ?? 'none', firstName: c?.firstName ?? '', lastName: c?.lastName ?? '', email: c?.email ?? '', countryCode: recipient.countryCode });
    } else if (recipient.type === 'new-person') {
      setRecipient({
        type: 'new-organisation',
        name: '',
        kind: k,
        countryCode: recipient.countryCode,
        address: '',
        contact: { salutation: recipient.salutation, firstName: recipient.firstName, lastName: recipient.lastName, email: recipient.email },
      });
    } else {
      setRecipient({ ...recipient, kind: k });
    }
  };

  const countrySelect = (value: string | null, onChange: (v: string | null) => void) => (
    <select id="nr-country" className={ui.fi} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {c[lang]}
        </option>
      ))}
    </select>
  );
  const guessedCountry = email ? countryFromEmail(email) : null;

  return (
    <>
      <div className={ui.section}>
        <span className={ui.sectionLabel}>{t('Was sie sind', 'What they are')}</span>
        <div className={ui.kinds} role="radiogroup" aria-label={t('Art des Empfängers', 'Kind of recipient')}>
          {[...ORGANISATION_KINDS, 'person' as const].map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={`${ui.kind} ${kind === k ? ui.kindOn : ''}`} onClick={() => switchKind(k)}>
              {pick(lang, KIND_LABEL[k])}
            </button>
          ))}
        </div>
      </div>

      {recipient.type === 'new-organisation' ? (
        <>
          <div className={ui.fld}>
            <label htmlFor="nr-name">{t('Name', 'Name')}</label>
            <input
              id="nr-name"
              className={ui.fi}
              value={recipient.name}
              autoFocus={!recipient.name}
              onChange={(e) => {
                const next = e.target.value;
                const guessed = guessKind(next);
                setRecipient({ ...recipient, name: next, kind: guessed && guessed !== 'person' && !recipient.name ? guessed : recipient.kind });
              }}
            />
          </div>
          <div className={ui.row2}>
            <div className={ui.fld}>
              <label htmlFor="nr-country">{t('Land', 'Country')}</label>
              {countrySelect(recipient.countryCode, (v) => setRecipient({ ...recipient, countryCode: v }))}
            </div>
            <div className={ui.fld}>
              <label htmlFor="nr-address">{t('Adresse', 'Address')}</label>
              <textarea
                id="nr-address"
                rows={2}
                className={ui.fi}
                value={recipient.address}
                placeholder={t('Straße und Hausnummer\nPLZ und Ort', 'Street and number\nPostcode and town')}
                onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
              />
            </div>
          </div>
          <div className={ui.section}>
            <span className={ui.sectionLabel}>{t('An wen wir schreiben', 'The person to write to')}</span>
            <ContactFields
              idPrefix="nr"
              value={recipient.contact}
              onChange={(c) => setRecipient({ ...recipient, contact: c, countryCode: recipient.countryCode ?? countryFromEmail(c.email) })}
            />
          </div>
        </>
      ) : (
        <>
          <div className={ui.row3}>
            <div className={ui.fld}>
              <span>{t('Anrede', 'Salutation')}</span>
              <Seg<Salutation>
                label={t('Anrede', 'Salutation')}
                value={recipient.salutation}
                options={[
                  ['ms', t('Frau', 'Ms')],
                  ['mr', t('Herr', 'Mr')],
                  ['none', '—'],
                ]}
                onChange={(v) => setRecipient({ ...recipient, salutation: v })}
              />
            </div>
            <div className={ui.fld}>
              <label htmlFor="np-first">{t('Vorname', 'First name')}</label>
              <input id="np-first" className={ui.fi} value={recipient.firstName} autoFocus={!recipient.firstName} onChange={(e) => setRecipient({ ...recipient, firstName: e.target.value })} />
            </div>
            <div className={ui.fld}>
              <label htmlFor="np-last">{t('Nachname', 'Last name')}</label>
              <input id="np-last" className={ui.fi} value={recipient.lastName} onChange={(e) => setRecipient({ ...recipient, lastName: e.target.value })} />
            </div>
          </div>
          <div className={ui.row2}>
            <div className={ui.fld}>
              <label htmlFor="np-email">{t('E-Mail', 'Email')}</label>
              <input
                id="np-email"
                type="email"
                className={ui.fi}
                value={recipient.email}
                aria-invalid={!validEmail(recipient.email) || undefined}
                onChange={(e) => setRecipient({ ...recipient, email: e.target.value, countryCode: recipient.countryCode ?? countryFromEmail(e.target.value) })}
              />
            </div>
            <div className={ui.fld}>
              <label htmlFor="nr-country">{t('Nationalität', 'Nationality')}</label>
              {countrySelect(recipient.countryCode, (v) => setRecipient({ ...recipient, countryCode: v }))}
            </div>
          </div>
        </>
      )}

      {guessedCountry && recipient.countryCode === guessedCountry ? (
        <span className={ui.guess}>
          {t('Land aus der E-Mail-Adresse', 'Country read from the address')}: {countries.find((c) => c.code === guessedCountry)?.[lang] ?? guessedCountry}
        </span>
      ) : null}

      {matches.length ? (
        <div className={ui.matches} role="status">
          <b>{t('CASA hat sie vielleicht schon', 'CASA may have them already')}</b>
          {matches.map((m) => (
            <div key={`${m.type}:${m.id}`} className={ui.match}>
              <span>
                {m.name} <small>· {m.reason}</small>
              </span>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnSm}`}
                onClick={() =>
                  onUse(
                    m.type === 'organisation'
                      ? { type: 'organisation', id: m.id, name: m.name, kind: 'other', detail: '', language: 'en', countryCode: null }
                      : { type: 'person', id: m.id, name: m.name, detail: '', salutation: 'none', firstName: '', lastName: '', email: null, countryCode: null, phone: null, bookings: 0, studiedBefore: false, stayedBefore: false }
                  )
                }
              >
                {t('Übernehmen', 'Use this')}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------- 2 · what it is

function OfferStep({
  recipient,
  kind,
  setKind,
  pkg,
  setPkg,
  weeks,
  setWeeks,
  basedOn,
  repeat,
  priceList,
  picked,
  setPicked,
  catalogue,
  course,
  setCourse,
  history,
}: {
  recipient: Recipient | null;
  kind: 'group' | 'individual';
  setKind: (k: 'group' | 'individual') => void;
  pkg: PackageChoice;
  setPkg: (p: PackageChoice) => void;
  weeks: number;
  setWeeks: (w: number) => void;
  basedOn: string | null;
  repeat: (o: NonNullable<OrganisationForOffer['lastOffer']>) => void;
  priceList: PriceListItem[];
  picked: number[];
  setPicked: (p: number[]) => void;
  catalogue: CourseCatalogue;
  course: CourseChoice | null;
  setCourse: (c: CourseChoice | null) => void;
  history: LearnerHistory | null;
}) {
  const { t, lang } = useWsLang();
  const org = recipient?.type === 'organisation' ? recipient.org : null;
  const last = org?.lastOffer ?? null;
  // A learner's offer is a course; the price list is for what is not one (an exam, a fee, books alone).
  const [from, setFrom] = useState<'course' | 'list'>(picked.length && !course ? 'list' : 'course');
  const tiles: { choice: PackageChoice; name: string; desc: string; price: ReactNode }[] = [
    ...GRUPPEN_PACKAGES_BY_STACK.map((p) => ({
      choice: p.slug as PackageChoice,
      name: p.animal[lang],
      desc: p.descriptor[lang],
      price:
        p.priceFrom != null ? (
          <>
            {eur(p.priceFrom)} <small>{t('p. P.', 'p. p.')}</small>
          </>
        ) : (
          <>
            <small>{t('ab', 'from')}</small> {eur(fullBoardBaseTotal(1))}
          </>
        ),
    })),
    { choice: 'own', name: pick(lang, PACKAGE_NAME.own), desc: t('Zeilen nach Wahl', 'Lines of your choice'), price: <small>{t('Kein Paket', 'No package')}</small> },
  ];

  return (
    <>
      <h2 className={ui.wzQ}>{t('Was ist es?', 'What is it?')}</h2>
      {isOrganisation(recipient) ? (
        <div className={ui.choiceGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
          {(
            [
              ['group', t('Ein Gruppenaufenthalt', 'A group stay')],
              ['individual', t('Ein Kurs', 'A course')],
            ] as const
          ).map(([k, b]) => (
            <button key={k} type="button" aria-pressed={kind === k} className={`${ui.choiceCard} ${kind === k ? ui.choiceOn : ''}`} onClick={() => setKind(k)}>
              <b>{b}</b>
            </button>
          ))}
        </div>
      ) : null}

      {kind === 'group' ? (
        <>
          {last && last.kind === 'group' ? (
            <button type="button" aria-pressed={basedOn === last.id} className={`${ui.again} ${basedOn === last.id ? ui.choiceOn : ''}`} onClick={() => repeat(last)}>
              <span className={`${ui.mark} ${ui.tint_blue}`}>{ICONS.repeat}</span>
              <span style={{ flex: 1 }}>
                <b>{t('Wie beim letzten Mal', 'Like last time')}</b>
                <span>
                  {last.number} · {pick(lang, PACKAGE_NAME[last.package])}
                  {last.participants ? t(` · ${last.participants} Teilnehmende`, ` · ${last.participants} participants`) : ''}
                  {last.escorts ? ` · ${last.escorts} ${escortsWord(t, last.escorts)}` : ''} · {last.year}{' '}
                  {t('– mit seinen Extras und Preisen', '— with its extras and prices')}
                </span>
              </span>
              {basedOn === last.id ? <span className={ui.pkgCheck} style={{ position: 'static' }}>✓</span> : null}
            </button>
          ) : null}
          <div className={ui.pkgs} role="radiogroup" aria-label={t('Paket', 'Package')}>
            {tiles.map((tile) => {
              const on = pkg === tile.choice;
              const [colour, tint] = PACKAGE_COLOUR[tile.choice];
              return (
                <button
                  key={tile.choice}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${ui.pkg} ${on ? ui.pkgOn : ''} ${tile.choice === 'own' ? ui.pkgOwn : ''}`}
                  style={{ ['--pkg' as string]: colour, ['--pkg-tint' as string]: tint }}
                  onClick={() => setPkg(tile.choice)}
                >
                  {on ? <span className={ui.pkgCheck}>✓</span> : null}
                  <span className={ui.pkgName}>{tile.name}</span>
                  <span className={ui.pkgDesc}>{tile.desc}</span>
                  <span className={ui.pkgPrice}>{tile.price}</span>
                </button>
              );
            })}
          </div>
          {packageWeeks(pkg) == null ? (
            <div className={ui.fld}>
              <span>{t('Wie lange, bis es Daten gibt', 'How long, until there are dates')}</span>
              <Stepper label={t('Wochen', 'Weeks')} value={weeks} min={1} max={pkg === 'esel' ? 4 : 52} onChange={(v) => setWeeks(v ?? 1)} />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <Seg<'course' | 'list'>
            label={t('Was es ist', 'What it is')}
            value={from}
            options={[
              ['course', t('Ein Kurs', 'A course')],
              ['list', picked.length ? t(`Aus der Preisliste · ${picked.length}`, `From the price list · ${picked.length}`) : t('Aus der Preisliste', 'From the price list')],
            ]}
            onChange={setFrom}
          />
          {from === 'course' ? (
            <CoursePicker catalogue={catalogue} value={course} onChange={setCourse} history={history} />
          ) : (
            <PriceListPicker priceList={priceList} picked={picked} setPicked={setPicked} />
          )}
        </>
      )}
    </>
  );
}

/** What is not a course — an exam, a fee, books alone — from the price list. */
function PriceListPicker({
  priceList,
  picked,
  setPicked,
}: {
  priceList: PriceListItem[];
  picked: number[];
  setPicked: (p: number[]) => void;
}) {
  const { t } = useWsLang();
  const [q, setQ] = useState('');
  const shown = useMemo(
    () => priceList.map((item, i) => ({ item, i })).filter(({ item }) => !q.trim() || item.label.toLowerCase().includes(q.trim().toLowerCase())),
    [priceList, q]
  );
  return (
    <>
      <div className={ui.searchBox}>
        {ICONS.search}
        <input
          value={q}
          placeholder={t('Kurs, Gebühr, Buch oder Prüfung finden', 'Find a course, a fee, a book, an exam')}
          aria-label={t('In der Preisliste suchen', 'Find in the price list')}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className={ui.courseList} role="group" aria-label={t('Preisliste', 'Price list')}>
        {shown.length ? (
          shown.map(({ item, i }) => {
            const on = picked.includes(i);
            return (
              <button key={i} type="button" aria-pressed={on} className={`${ui.course} ${on ? ui.courseOn : ''}`} onClick={() => setPicked(on ? picked.filter((x) => x !== i) : [...picked, i])}>
                <i>{on ? '✓' : ''}</i>
                <span>
                  {item.label} <span className={ui.note}>· {item.group}</span>
                </span>
                <small>{item.unitAmount != null ? eur(item.unitAmount) : t('kein Preis', 'no price')}</small>
              </button>
            );
          })
        ) : (
          <div className={ui.empty}>{t('Nichts passt', 'Nothing matches')}</div>
        )}
      </div>
      <div className={ui.note}>
        {picked.length
          ? `${t(`${picked.length} ausgewählt`, `${picked.length} chosen`)} · ${eur(picked.reduce((s, i) => s + (priceList[i]?.unitAmount ?? 0), 0))}`
          : t('Nichts ausgewählt', 'Nothing chosen')}
      </div>
    </>
  );
}

// ------------------------------------------------------------ 3 · the group

function GroupStep({
  today,
  pkg,
  weeks,
  arrival,
  departure,
  setDates,
  participants,
  setParticipants,
  escorts,
  setEscorts,
  note,
}: {
  today: string;
  pkg: PackageChoice;
  weeks: number;
  arrival: string | null;
  departure: string | null;
  setDates: (arrival: string | null, departure: string | null) => void;
  participants: number | null;
  setParticipants: (n: number | null) => void;
  escorts: number;
  setEscorts: (n: number) => void;
  note: string | null;
}) {
  const { t, lang } = useWsLang();
  const length = packageWeeks(pkg) ?? weeks;
  const stay = stayLength(arrival, departure);
  const sold = packageWeeks(pkg);
  return (
    <>
      <h2 className={ui.wzQ}>{t('Die Gruppe', 'The group')}</h2>
      {note ? <span className={ui.guess}>{note}</span> : null}
      <div className={ui.wzDates}>
        <DateRange from={arrival} to={departure} today={today} suggestEnd={(a) => addDays(a, length * 7 - 1)} onChange={setDates} />
      </div>
      <div className={ui.note}>
        {stay
          ? t(
              `Berechnet als ${stay.weeks} ${weeksWord(t, stay.weeks)}${sold && stay.weeks !== sold ? ` – ${pick(lang, PACKAGE_NAME[pkg])} hat ${sold}` : ''}.`,
              `Priced as ${stay.weeks} ${weeksWord(t, stay.weeks)}${sold && stay.weeks !== sold ? ` — ${pick(lang, PACKAGE_NAME[pkg])} is ${sold}` : ''}.`
            )
          : t(`${length} ${weeksWord(t, length)}, Sonntag bis Samstag`, `${length} ${weeksWord(t, length)}, Sunday to Saturday`)}
      </div>
      <div className={ui.row2}>
        <div className={ui.fld}>
          <span>{t('Teilnehmende', 'Participants')}</span>
          <Stepper label={t('Teilnehmende', 'Participants')} value={participants} min={1} max={500} placeholder="—" onChange={setParticipants} />
        </div>
        <div className={ui.fld}>
          <span>{t('Begleitpersonen', 'Escorts')}</span>
          <Stepper label={t('Begleitpersonen', 'Escorts')} value={escorts} min={0} max={50} onChange={(v) => setEscorts(v ?? 0)} />
        </div>
      </div>
    </>
  );
}
