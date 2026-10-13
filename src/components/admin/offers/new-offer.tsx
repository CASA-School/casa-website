'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { createOfferAction, findRecipientsAction, matchRecipientsAction, pickRecipientAction } from '@/app/(admin)/admin/(editor)/offers/actions';
import { GRUPPEN_PACKAGES_BY_STACK, fullBoardBaseTotal } from '@/config/gruppen/packages';
import { formatDateRange, formatLetterDate, formatMoney } from '@/lib/admin/letters/format';
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
import { Seg, Stepper } from './fields';
import { OfferFrame } from './frame';
import { ICONS, type Tint } from './icons';
import ui from './offers.module.css';

const eur = (n: number | null) => (n == null ? '—' : formatMoney(n, 'de'));

const KIND_LABEL: Record<RecipientKind, string> = {
  school: 'School',
  agency: 'Agency',
  company: 'Company',
  public_body: 'Public body',
  other: 'Other organisation',
  person: 'Learner',
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
const FILTERS: [RecipientFilter, string][] = [
  ['all', 'All'],
  ['school', 'Schools'],
  ['agency', 'Agencies'],
  ['company', 'Companies'],
  ['public_body', 'Public bodies'],
  ['person', 'Learners'],
];
const PACKAGE_COLOUR: Record<PackageChoice, [string, string]> = {
  hahn: ['var(--c-sun)', 'var(--c-sun-tint)'],
  katze: ['var(--c-blue)', 'var(--c-blue-tint)'],
  hund: ['var(--c-red)', 'var(--c-red-tint)'],
  esel: ['var(--c-ink)', 'var(--c-ink-tint)'],
  own: ['var(--o-line-firm)', '#f6f8fb'],
};
const PACKAGE_NAME: Record<PackageChoice, string> = { hahn: 'Hahn', katze: 'Katze', hund: 'Hund', esel: 'Esel', own: 'Own offer' };

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
  staff,
  countries,
  me,
  today,
}: {
  start: WizardStart | null;
  suggestions: RecipientHit[];
  priceList: PriceListItem[];
  staff: EditorOptions['staff'];
  countries: EditorOptions['countries'];
  me: string;
  today: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(start?.recipient ? 'offer' : 'recipient');
  const [recipient, setRecipient] = useState<Recipient | null>(() => recipientFromStart(start));
  const [enquiryId, setEnquiryId] = useState(start?.enquiryId ?? null);
  const [enquiryNote, setEnquiryNote] = useState(start?.enquiryNote ?? null);
  const [kind, setKind] = useState<'group' | 'individual'>(start?.kind ?? 'group');
  const [pkg, setPkg] = useState<PackageChoice>(start?.group?.package ?? 'katze');
  const [weeks, setWeeks] = useState(start?.group?.weeks ?? 2);
  const [basedOn, setBasedOn] = useState<string | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  const [departure, setDeparture] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number | null>(start?.group?.participants ?? null);
  const [escorts, setEscorts] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  /** The language: a colleague's choice, else what the record says (an enquiry's), else the recipient's country's. */
  const [languageChoice, setLanguageChoice] = useState<OfferLanguage | null>(null);
  const [suggestedLanguage, setSuggestedLanguage] = useState<OfferLanguage | null>(start?.language ?? null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState(addDays(today, VALID_FOR_DAYS));
  const [ownerId, setOwnerId] = useState<string>(me);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const group = kind === 'group';
  const country = recipientCountry(recipient);
  // Without a country: English to an organisation (groups come from abroad), German to a learner.
  const language = languageChoice ?? suggestedLanguage ?? languageFor(country, isOrganisation(recipient) ? 'en' : 'de');
  const steps: { id: StepId; title: string; summary: string | null }[] = [
    { id: 'recipient', title: 'Who it is for', summary: recipient ? recipientName(recipient) || 'New recipient' : null },
    {
      id: 'offer',
      title: 'What it is',
      summary: recipient && step !== 'recipient' ? (group ? `${PACKAGE_NAME[pkg]}${packageWeeks(pkg) ? '' : ` · ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`}` : picked.length ? `${picked.length} from the price list` : 'Courses') : null,
    },
    ...(group
      ? [
          {
            id: 'group' as const,
            title: 'The group',
            summary: arrival && departure ? `${formatDateRange(arrival, departure, 'en')}${participants ? ` · ${participants}` : ''}` : participants ? `${participants} participants` : null,
          },
        ]
      : []),
    { id: 'letter', title: 'The letter', summary: step === 'letter' ? `${language === 'de' ? 'Deutsch' : 'English'}` : null },
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
  const defaultTitle = DEFAULT_TITLE[kind][language];

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
    <OfferFrame back={{ href: '/admin/offers', label: 'Offers' }} title="New offer">
      <main className={ui.wz}>
        <div className={ui.wzCard}>
          <nav className={ui.wzRail} aria-label="Steps">
            <h1>New offer</h1>
            <p>Nothing is saved until you create it.</p>
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
                  <h2 className={ui.wzQ}>The letter</h2>
                  <p>What the offer is called, in which language it is written, how long it holds.</p>
                  <div className={ui.fld}>
                    <span>Language</span>
                    <div className={ui.inline}>
                      <Seg<OfferLanguage>
                        label="Language"
                        value={language}
                        options={[
                          ['de', 'Deutsch'],
                          ['en', 'English'],
                        ]}
                        onChange={setLanguageChoice}
                      />
                      {country && !languageChoice && !suggestedLanguage ? (
                        <span className={ui.guess}>From the country: {countries.find((c) => c.code === country)?.en ?? country}</span>
                      ) : null}
                    </div>
                  </div>
                  {group ? (
                    <div className={ui.fld}>
                      <label htmlFor="wz-name">Name of the offer</label>
                      <input id="wz-name" className={ui.fi} value={groupName ?? defaultGroupName} onChange={(e) => setGroupName(e.target.value)} />
                    </div>
                  ) : null}
                  <div className={ui.fld}>
                    <label htmlFor="wz-title">Title on the letter</label>
                    <input id="wz-title" className={ui.fi} value={title ?? defaultTitle} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className={ui.row2}>
                    <div className={ui.fld}>
                      <label htmlFor="wz-valid">Valid until</label>
                      <DateField
                        id="wz-valid"
                        value={validUntil}
                        today={today}
                        min={today}
                        onChange={(v) => setValidUntil(v ?? addDays(today, VALID_FOR_DAYS))}
                        quick={[
                          ...[14, 28, 42].map((days) => ({ label: `${days / 7} weeks`, value: addDays(today, days) })),
                          ...(arrival && addDays(arrival, -42) > today ? [{ label: '6 weeks before arrival', value: addDays(arrival, -42) }] : []),
                        ]}
                      />
                    </div>
                    <div className={ui.fld}>
                      <label htmlFor="wz-owner">Signed by</label>
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
                    <dt>For</dt>
                    <dd>
                      {name || '—'}
                      {recipient?.type === 'new-organisation' || recipient?.type === 'new-person' ? ' · new' : ''}
                    </dd>
                    <dt>Offer</dt>
                    <dd>
                      {group
                        ? `${PACKAGE_NAME[pkg]}${basedOn ? ' · like last time' : ''}`
                        : picked.length
                          ? picked.map((i) => priceList[i]?.label).filter(Boolean).join(', ')
                          : 'Lines added on the offer'}
                    </dd>
                    {group ? (
                      <>
                        <dt>Group</dt>
                        <dd>
                          {[arrival && departure ? formatDateRange(arrival, departure, 'en') : null, participants ? `${participants} participants` : null, escorts ? `${escorts} ${escorts === 1 ? 'escort' : 'escorts'}` : null]
                            .filter(Boolean)
                            .join(' · ') || 'To be filled in'}
                        </dd>
                      </>
                    ) : null}
                    <dt>Valid until</dt>
                    <dd>{formatLetterDate(validUntil, 'en')}</dd>
                  </dl>
                </>
              ) : null}
            </div>

            <div className={ui.wzFoot}>
              <span className={error ? ui.wzError : undefined}>{error ?? (step === 'recipient' && !recipient ? 'Pick someone, or add them new.' : '')}</span>
              {index > 0 ? (
                <button type="button" className={ui.btn} onClick={back} disabled={busy}>
                  Back
                </button>
              ) : null}
              {last ? (
                <button type="button" className={ui.primary} disabled={!recipientReady || busy} onClick={() => void create()}>
                  {busy ? 'Creating …' : 'Create offer'}
                </button>
              ) : (
                <button type="button" className={ui.primary} disabled={!canContinue} onClick={next}>
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
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
    const t = setTimeout(
      async () => {
        const found = term || filter !== 'all' ? await findRecipientsAction(term, filter) : suggestions;
        if (n === asked.current) {
          setHits(found);
          setActive(0);
        }
      },
      term ? 180 : 0
    );
    return () => clearTimeout(t);
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
    { head: q ? 'Enquiries' : 'Enquiries waiting for an offer', items: hits.filter((h) => h.type === 'enquiry') },
    { head: q || filter !== 'all' ? 'Organisations' : 'Written to lately', items: hits.filter((h) => h.type === 'organisation') },
    { head: 'Learners', items: hits.filter((h) => h.type === 'person') },
  ].filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  const typed = q.trim() ? fromTyped(q, filter) : null;

  return (
    <>
      <h2 className={ui.wzQ}>Who is it for?</h2>
      <p>A school, an agency, a company, a learner — or an address someone wrote from.</p>
      <div className={ui.searchBox}>
        {ICONS.search}
        <input
          autoFocus
          value={q}
          placeholder="Name, contact or email"
          aria-label="Who the offer is for"
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
      <div className={ui.kinds} role="radiogroup" aria-label="Kind">
        {FILTERS.map(([f, label]) => (
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
                    <span className={ui.hitGo}>{picking === h.id ? 'Opening …' : 'Choose →'}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : q.trim() ? (
        <div className={ui.note}>Nobody by that name yet.</div>
      ) : null}

      {typed ? (
        <button type="button" className={ui.newHit} onClick={() => setRecipient(typed)}>
          <Mark kind={typed.type === 'new-person' ? 'person' : typed.type === 'new-organisation' ? typed.kind : 'other'} />
          <span className={ui.hitText}>
            <b>Add “{q.trim()}” as new</b>
            <span>Not in the list: it is made with the offer</span>
          </span>
          <span className={ui.hitGo}>{'Add →'}</span>
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
  const isNew = recipient.type === 'new-organisation' || recipient.type === 'new-person';
  const kind: RecipientKind =
    recipient.type === 'organisation' ? recipient.org.kind : recipient.type === 'new-organisation' ? recipient.kind : 'person';
  const detail =
    recipient.type === 'organisation'
      ? [KIND_LABEL[recipient.org.kind], countries.find((c) => c.code === recipient.org.countryCode)?.en, recipient.org.lastOffer ? `last offer ${recipient.org.lastOffer.number}` : 'no offer yet'].filter(Boolean).join(' · ')
      : recipient.type === 'person'
        ? recipient.person.detail
        : `New ${KIND_LABEL[kind].toLowerCase()} · made with the offer`;

  return (
    <>
      <h2 className={ui.wzQ}>{isNew ? 'Someone new' : 'Who is it for?'}</h2>
      <div className={ui.chosen}>
        <Mark kind={kind} />
        <div>
          <b>{recipientName(recipient) || (recipient.type === 'new-person' ? 'A new learner' : 'A new organisation')}</b>
          <span>{detail}</span>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={onClear}>
          Change
        </button>
      </div>

      {recipient.type === 'organisation' ? <ContactChoice recipient={recipient} setRecipient={setRecipient} /> : null}
      {isNew ? <NewRecipientForm recipient={recipient} setRecipient={setRecipient} countries={countries} onUse={onUse} /> : null}
    </>
  );
}

function ContactFields({ value, onChange, idPrefix }: { value: ContactInput; onChange: (c: ContactInput) => void; idPrefix: string }) {
  return (
    <>
      <div className={ui.row3}>
        <div className={ui.fld}>
          <span>Salutation</span>
          <Seg<Salutation>
            label="Salutation"
            value={value.salutation}
            options={[
              ['ms', 'Ms'],
              ['mr', 'Mr'],
              ['none', '—'],
            ]}
            onChange={(v) => onChange({ ...value, salutation: v })}
          />
        </div>
        <div className={ui.fld}>
          <label htmlFor={`${idPrefix}-first`}>First name</label>
          <input id={`${idPrefix}-first`} className={ui.fi} value={value.firstName} onChange={(e) => onChange({ ...value, firstName: e.target.value })} />
        </div>
        <div className={ui.fld}>
          <label htmlFor={`${idPrefix}-last`}>Last name</label>
          <input id={`${idPrefix}-last`} className={ui.fi} value={value.lastName} onChange={(e) => onChange({ ...value, lastName: e.target.value })} />
        </div>
      </div>
      <div className={ui.fld}>
        <label htmlFor={`${idPrefix}-email`}>Email</label>
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
  const { org } = recipient;
  const someoneElse = recipient.contactId == null;
  if (!org.contacts.length) {
    return (
      <div className={ui.section}>
        <span className={ui.sectionLabel}>The person to write to</span>
        <ContactFields idPrefix="oc" value={recipient.newContact ?? NO_CONTACT} onChange={(c) => setRecipient({ ...recipient, contactId: null, newContact: c })} />
      </div>
    );
  }
  return (
    <div className={ui.section}>
      <span className={ui.sectionLabel}>Written to</span>
      <div className={ui.radioList} role="radiogroup" aria-label="Contact">
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
              <span>{c.email || 'No email'}</span>
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
            <b>Someone else</b>
            <span>A new name at the organisation</span>
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
  const [matches, setMatches] = useState<RecipientMatch[]>([]);
  const kind: RecipientKind = recipient.type === 'new-person' ? 'person' : recipient.kind;
  const name = recipientName(recipient);
  const email = recipient.type === 'new-person' ? recipient.email : recipient.contact.email;

  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const found = name.trim().length >= 3 || email.includes('@') ? await matchRecipientsAction({ name, email }) : [];
      if (live) setMatches(found);
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
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
          {c.en}
        </option>
      ))}
    </select>
  );
  const guessedCountry = email ? countryFromEmail(email) : null;

  return (
    <>
      <div className={ui.section}>
        <span className={ui.sectionLabel}>What they are</span>
        <div className={ui.kinds} role="radiogroup" aria-label="Kind of recipient">
          {[...ORGANISATION_KINDS, 'person' as const].map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={`${ui.kind} ${kind === k ? ui.kindOn : ''}`} onClick={() => switchKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {recipient.type === 'new-organisation' ? (
        <>
          <div className={ui.fld}>
            <label htmlFor="nr-name">Name</label>
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
              <label htmlFor="nr-country">Country</label>
              {countrySelect(recipient.countryCode, (v) => setRecipient({ ...recipient, countryCode: v }))}
            </div>
            <div className={ui.fld}>
              <label htmlFor="nr-address">Address</label>
              <textarea id="nr-address" rows={2} className={ui.fi} value={recipient.address} placeholder={'Street and number\nPostcode and town'} onChange={(e) => setRecipient({ ...recipient, address: e.target.value })} />
            </div>
          </div>
          <div className={ui.section}>
            <span className={ui.sectionLabel}>The person to write to</span>
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
              <span>Salutation</span>
              <Seg<Salutation>
                label="Salutation"
                value={recipient.salutation}
                options={[
                  ['ms', 'Ms'],
                  ['mr', 'Mr'],
                  ['none', '—'],
                ]}
                onChange={(v) => setRecipient({ ...recipient, salutation: v })}
              />
            </div>
            <div className={ui.fld}>
              <label htmlFor="np-first">First name</label>
              <input id="np-first" className={ui.fi} value={recipient.firstName} autoFocus={!recipient.firstName} onChange={(e) => setRecipient({ ...recipient, firstName: e.target.value })} />
            </div>
            <div className={ui.fld}>
              <label htmlFor="np-last">Last name</label>
              <input id="np-last" className={ui.fi} value={recipient.lastName} onChange={(e) => setRecipient({ ...recipient, lastName: e.target.value })} />
            </div>
          </div>
          <div className={ui.row2}>
            <div className={ui.fld}>
              <label htmlFor="np-email">Email</label>
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
              <label htmlFor="nr-country">Nationality</label>
              {countrySelect(recipient.countryCode, (v) => setRecipient({ ...recipient, countryCode: v }))}
            </div>
          </div>
        </>
      )}

      {guessedCountry && recipient.countryCode === guessedCountry ? (
        <span className={ui.guess}>Country read from the address: {countries.find((c) => c.code === guessedCountry)?.en ?? guessedCountry}</span>
      ) : null}

      {matches.length ? (
        <div className={ui.matches} role="status">
          <b>CASA may have them already</b>
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
                      : { type: 'person', id: m.id, name: m.name, detail: '', salutation: 'none', firstName: '', lastName: '', email: null, countryCode: null }
                  )
                }
              >
                Use this
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
}) {
  const org = recipient?.type === 'organisation' ? recipient.org : null;
  const last = org?.lastOffer ?? null;
  const [q, setQ] = useState('');
  const shown = useMemo(
    () => priceList.map((item, i) => ({ item, i })).filter(({ item }) => !q.trim() || item.label.toLowerCase().includes(q.trim().toLowerCase())),
    [priceList, q]
  );
  const tiles: { choice: PackageChoice; name: string; desc: string; price: ReactNode }[] = [
    ...GRUPPEN_PACKAGES_BY_STACK.map((p) => ({
      choice: p.slug as PackageChoice,
      name: p.animal.en,
      desc: p.descriptor.en,
      price:
        p.priceFrom != null ? (
          <>
            {eur(p.priceFrom)} <small>p. p.</small>
          </>
        ) : (
          <>
            <small>from</small> {eur(fullBoardBaseTotal(1))}
          </>
        ),
    })),
    { choice: 'own', name: 'Own offer', desc: 'Lines of your choice', price: <small>No package</small> },
  ];

  return (
    <>
      <h2 className={ui.wzQ}>What is it?</h2>
      <p>{kind === 'group' ? 'A group stay on one of the packages — adjusted later on the offer, or built without one.' : 'Courses, fees, books or exams from the price list.'}</p>
      {isOrganisation(recipient) ? (
        <div className={ui.choiceGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
          {(
            [
              ['group', 'A group stay', 'Course, host families, programme — a package'],
              ['individual', 'Courses', 'For one learner or a few, from the price list'],
            ] as const
          ).map(([k, b, s]) => (
            <button key={k} type="button" aria-pressed={kind === k} className={`${ui.choiceCard} ${kind === k ? ui.choiceOn : ''}`} onClick={() => setKind(k)}>
              <b>{b}</b>
              <span>{s}</span>
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
                <b>Like last time</b>
                <span>
                  {last.number} · {PACKAGE_NAME[last.package]}
                  {last.participants ? ` · ${last.participants} participants` : ''}
                  {last.escorts ? ` · ${last.escorts} ${last.escorts === 1 ? 'escort' : 'escorts'}` : ''} · {last.year} — with its extras and prices
                </span>
              </span>
              {basedOn === last.id ? <span className={ui.pkgCheck} style={{ position: 'static' }}>✓</span> : null}
            </button>
          ) : null}
          <div className={ui.pkgs} role="radiogroup" aria-label="Package">
            {tiles.map((t) => {
              const on = pkg === t.choice;
              const [colour, tint] = PACKAGE_COLOUR[t.choice];
              return (
                <button
                  key={t.choice}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${ui.pkg} ${on ? ui.pkgOn : ''} ${t.choice === 'own' ? ui.pkgOwn : ''}`}
                  style={{ ['--pkg' as string]: colour, ['--pkg-tint' as string]: tint }}
                  onClick={() => setPkg(t.choice)}
                >
                  {on ? <span className={ui.pkgCheck}>✓</span> : null}
                  <span className={ui.pkgName}>{t.name}</span>
                  <span className={ui.pkgDesc}>{t.desc}</span>
                  <span className={ui.pkgPrice}>{t.price}</span>
                </button>
              );
            })}
          </div>
          {packageWeeks(pkg) == null ? (
            <div className={ui.fld}>
              <span>How long, until there are dates</span>
              <Stepper label="Weeks" value={weeks} min={1} max={pkg === 'esel' ? 4 : 52} onChange={(v) => setWeeks(v ?? 1)} />
            </div>
          ) : null}
          <div className={ui.note}>Extras — more afternoons, a transfer, a single room, a reduction — are added on the offer.</div>
        </>
      ) : (
        <>
          <div className={ui.searchBox}>
            {ICONS.search}
            <input value={q} placeholder="Find a course, a fee, a book, an exam" aria-label="Find in the price list" onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className={ui.courseList} role="group" aria-label="Price list">
            {shown.length ? (
              shown.map(({ item, i }) => {
                const on = picked.includes(i);
                return (
                  <button key={i} type="button" aria-pressed={on} className={`${ui.course} ${on ? ui.courseOn : ''}`} onClick={() => setPicked(on ? picked.filter((x) => x !== i) : [...picked, i])}>
                    <i>{on ? '✓' : ''}</i>
                    <span>
                      {item.label} <span className={ui.note}>· {item.group}</span>
                    </span>
                    <small>{item.unitAmount != null ? eur(item.unitAmount) : 'no price'}</small>
                  </button>
                );
              })
            ) : (
              <div className={ui.empty}>Nothing matches</div>
            )}
          </div>
          <div className={ui.note}>
            {picked.length
              ? `${picked.length} chosen · ${eur(picked.reduce((s, i) => s + (priceList[i]?.unitAmount ?? 0), 0))}`
              : 'Nothing chosen: lines can also be added on the offer.'}
          </div>
        </>
      )}
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
  const length = packageWeeks(pkg) ?? weeks;
  const stay = stayLength(arrival, departure);
  return (
    <>
      <h2 className={ui.wzQ}>The group</h2>
      <p>When they come and how many they are. Both can wait until the group knows.</p>
      {note ? <span className={ui.guess}>{note}</span> : null}
      <div className={ui.wzDates}>
        <DateRange from={arrival} to={departure} today={today} suggestEnd={(a) => addDays(a, length * 7 - 1)} onChange={setDates} />
      </div>
      <div className={ui.note}>
        {stay
          ? `Priced as ${stay.weeks} ${stay.weeks === 1 ? 'week' : 'weeks'}${packageWeeks(pkg) && stay.weeks !== packageWeeks(pkg) ? ` — ${PACKAGE_NAME[pkg]} is ${packageWeeks(pkg)}` : ''}.`
          : `The departure follows from the arrival: ${length} ${length === 1 ? 'week' : 'weeks'}, Sunday to Saturday.`}
      </div>
      <div className={ui.row2}>
        <div className={ui.fld}>
          <span>Participants</span>
          <Stepper label="Participants" value={participants} min={1} max={500} placeholder="—" onChange={setParticipants} />
        </div>
        <div className={ui.fld}>
          <span>Escorts</span>
          <Stepper label="Escorts" value={escorts} min={0} max={50} onChange={(v) => setEscorts(v ?? 0)} />
        </div>
      </div>
    </>
  );
}
