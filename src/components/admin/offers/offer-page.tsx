'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { GRUPPEN_ACTIVITIES, GRUPPEN_PACKAGES_BY_STACK, activityById, fullBoardBaseTotal, type GruppenActivity } from '@/config/gruppen/packages';
import { LetterSheet } from '@/components/admin/letters/letter-sheet';
import { PrintCopy, printLetter } from '@/components/admin/letters/print';
import { formatDateRange, formatLetterDate, formatMoney } from '@/lib/admin/letters/format';
import { hasProblems } from '@/lib/admin/offers/checks';
import { courseSpan, courseTitle, levelLabel, slotLabel, type CourseCatalogue, type CourseChoice, type LearnerHistory } from '@/lib/admin/offers/course';
import { offerLetter } from '@/lib/admin/offers/document';
import { addLine, moveLineTo, removeLine, resetLine, setChoices, setLinePrice, setLineQuantity, setLineText } from '@/lib/admin/offers/draft-ops';
import { activitiesOf, activityAllowance, extrasOf, isFixedPackage, measure, packageWeeks, pricedWeeks } from '@/lib/admin/offers/engine';
import { GROUP_EXTRAS, REDUCTION, isCredit, type ExtraPreset } from '@/lib/admin/offers/extras';
import type { EditorOptions, OfferRecord, PriceListItem, StandardTexts } from '@/lib/admin/offers/repo';
import { addDays, daysBetween } from '@/lib/admin/offers/stay';
import {
  ESCORT_PRICING_LABELS,
  OFFER_STATUS_LABELS,
  type Audience,
  type EscortPricing,
  type ModuleKey,
  type OfferDraft,
  type OfferLine,
  type OfferTotals,
  type PackageChoice,
  type StayChoices,
} from '@/lib/admin/offers/types';

import { DateRange, InlineDatePicker } from '@/components/admin/date-picker';
import { CoursePicker } from './course-picker';
import { NumberInput, Seg, Stepper } from './fields';
import { OfferFrame } from './frame';
import { Chip, ICONS, type Tint } from './icons';
import { OfferToolbarActions } from './offer-actions';
import ui from './offers.module.css';
import { ClickPanel } from './panel';
import { saveLabel, useOfferDraft } from './use-offer-draft';

const eur = (n: number | null) => (n == null ? '—' : formatMoney(n, 'de'));
const day = (d: Date | string) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

type Update = (change: Partial<OfferDraft> | ((d: OfferDraft) => OfferDraft)) => void;
type Countries = EditorOptions['countries'];

const PACKAGE_TINT: Record<PackageChoice, Tint> = { hahn: 'sun', katze: 'blue', hund: 'red', esel: 'ink', own: 'ink' };
const PACKAGE_COLOUR: Record<PackageChoice, [string, string]> = {
  hahn: ['var(--c-sun)', 'var(--c-sun-tint)'],
  katze: ['var(--c-blue)', 'var(--c-blue-tint)'],
  hund: ['var(--c-red)', 'var(--c-red-tint)'],
  esel: ['var(--c-ink)', 'var(--c-ink-tint)'],
  own: ['var(--o-line-firm)', '#f6f8fb'],
};
const ESCORT_SHORT: Record<EscortPricing, string> = { paid: 'paying', free: 'free', shared: 'shared' };
const ACTIVITY_TINT: Record<GruppenActivity['category'], Tint> = { city: 'blue', culture: 'red', science: 'sun', sport: 'ink', daytrip: 'ink' };
const CATEGORY_LABEL: Record<GruppenActivity['category'], string> = {
  city: 'In the city',
  culture: 'Culture and history',
  science: 'Science and nature',
  sport: 'Sport',
  daytrip: 'Day trips',
};
const ALL_MODULES: StayChoices['modules'] = { course: true, materials: true, accommodation: true, lunch: true, transport: true };

/** Esel built from what a package holds — the way to take something out of a fixed package. */
const asEsel = (d: OfferDraft): OfferDraft => {
  const from = d.stay.choices;
  if (from.package === 'esel') return d;
  const weeks = from.package === 'own' ? from.weeks : (packageWeeks(from.package) ?? from.weeks);
  return setChoices(d, { package: 'esel', weeks, modules: ALL_MODULES, activities: [...activitiesOf(from), ...extrasOf(from)], extras: [] });
};

/**
 * The offer: who it is for, what it is built on, what it includes, what is on
 * top, and what it all comes to. Framed cards on the workspace canvas — the
 * offer on the left, its price, its checks, its letter and its history on the
 * right. A click on anything opens a panel to change it. docs/OFFERS.md §Design.
 */
export function OfferPage({
  record,
  options,
  priceList,
  catalogue,
  history,
  texts,
  today,
  canWrite,
  canDelete,
  notice,
}: {
  record: OfferRecord;
  options: EditorOptions;
  priceList: PriceListItem[];
  catalogue: CourseCatalogue;
  /** What CASA knows of the learner from their bookings; null for an organisation. */
  history: LearnerHistory | null;
  texts: StandardTexts;
  today: string;
  canWrite: boolean;
  canDelete: boolean;
  notice: { ok?: string; error?: string };
}) {
  const { meta } = record;
  const router = useRouter();
  const od = useOfferDraft({
    id: meta.id,
    status: meta.status,
    initialDraft: record.draft,
    initialRevision: meta.revision,
    storedLines: record.lines,
    editable: canWrite && meta.status === 'draft',
    today,
  });
  const { draft, update, lines, totals, checks, editable } = od;
  const lang = draft.language;
  const name = draft.groupName || draft.recipientName || meta.number;
  const group = draft.kind === 'group';
  const pkg = draft.stay.choices.package;

  const countryName = options.countries.find((c) => c.code === draft.countryCode)?.[lang] ?? null;
  const signatureName = options.staff.find((s) => s.id === draft.ownerId)?.name ?? null;
  const letter = useMemo(
    () => offerLetter(draft, lines, totals, { number: meta.number, version: meta.version + 1, date: today, countryName, signatureName, standard: texts[lang] }),
    [draft, lines, totals, meta.number, meta.version, today, countryName, signatureName, texts, lang]
  );
  const print = () => printLetter(`${lang === 'de' ? 'Angebot' : 'Offer'} ${meta.number} ${name}`);
  const openLetter = async () => {
    await od.flush();
    router.push(`/admin/offers/${meta.id}/letter`);
  };

  const problems = checks.filter((c) => c.level === 'problem');
  const status = saveLabel(od.saveState, od.saveError, editable);

  return (
    <OfferFrame
      back={{ href: '/admin/offers', label: 'Offers', before: od.flush }}
      title={name}
      subtitle={`${meta.number} · ${OFFER_STATUS_LABELS[meta.status]}`}
      tabs={{ id: meta.id, active: 'offer', before: od.flush }}
      right={
        <>
          {status ? <span className={`${ui.status} ${od.saveState === 'error' ? ui.statusBad : ''}`}>{status}</span> : null}
          {notice.error ? <span className={`${ui.status} ${ui.statusBad}`}>{notice.error}</span> : null}
          <OfferToolbarActions
            id={meta.id}
            status={meta.status}
            canWrite={canWrite}
            canDelete={canDelete}
            extra={[{ label: 'Print / PDF', onSelect: print }]}
            send={{
              canSend: !hasProblems(checks) && od.saveState !== 'stale',
              busy: od.saveState === 'dirty' || od.saveState === 'saving',
              problems: problems.map((p) => p.message),
              email: draft.contactEmail,
              letter,
              onPrint: print,
              onBeforeSend: od.flush,
            }}
          />
        </>
      }
    >
      <main className={ui.page}>
        {od.saveState === 'stale' ? (
          <div className={ui.banner} style={{ marginBottom: 16 }}>
            A colleague has changed this offer in the meantime. The last change is not saved.
            <span style={{ flex: 1 }} />
            <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        ) : null}

        <div className={ui.layout}>
          <div className={ui.main}>
            <Head draft={draft} update={update} editable={editable} options={options} today={today} status={meta.status} />
            {group ? <Packages draft={draft} update={update} editable={editable} /> : null}
            {group && pkg !== 'own' ? <Included draft={draft} update={update} editable={editable} lines={lines} /> : null}
            {group ? null : <CourseCard draft={draft} update={update} editable={editable} lines={lines} catalogue={catalogue} history={history} />}
            <Extras draft={draft} update={update} editable={editable} lines={lines} priceList={priceList} chargeTypes={options.chargeTypes} />
          </div>

          <aside className={ui.aside} aria-label="Summary">
            <PriceCard draft={draft} totals={totals} />
            {meta.status === 'draft' ? <ChecksCard checks={checks} /> : null}
            <section className={ui.card} aria-label="Letter">
              <a
                href={`/admin/offers/${meta.id}/letter`}
                className={ui.thumb}
                aria-label="Open the letter"
                onClick={(e) => {
                  e.preventDefault();
                  void openLetter();
                }}
              >
                <div>
                  <LetterSheet letter={letter} variant="thumb" />
                </div>
              </a>
              <div className={ui.thumbFoot}>
                <span>
                  {lang === 'de' ? 'Deutsch' : 'English'} · {draft.presentation === 'package' ? 'one price per person' : 'every line priced'}
                </span>
                <button type="button" className={ui.link} onClick={() => void openLetter()}>
                  Open the letter →
                </button>
              </div>
            </section>
            <History record={record} />
          </aside>
        </div>
      </main>
      <PrintCopy letter={letter} />
    </OfferFrame>
  );
}

// ----------------------------------------------------------------- head

/** The ids the checks open: a problem in the list opens the panel that fixes it. */
const FIX: Record<string, string> = {
  recipient: 'fix-recipient',
  participants: 'fix-group',
  escorts: 'fix-group',
  dates: 'fix-dates',
  package: 'fix-dates',
  validity: 'fix-validity',
  programme: 'fix-programme',
  course: 'fix-course',
};

/** One cell of the head's bar: what it is, its value, a line under it. */
function Spec({ tint, icon, label, value, sub, warn }: { tint: Tint; icon: ReactNode; label: string; value: ReactNode; sub: ReactNode; warn?: boolean }) {
  return (
    <>
      <span className={ui.specLabel}>
        <Chip tint={tint} icon={icon} />
        {label}
      </span>
      <span className={`${ui.specValue} ${warn ? ui.factWarn : ''}`}>{value}</span>
      <span className={ui.specSub}>{sub}</span>
    </>
  );
}

function Head({
  draft,
  update,
  editable,
  options,
  today,
  status,
}: {
  draft: OfferDraft;
  update: Update;
  editable: boolean;
  options: EditorOptions;
  today: string;
  status: OfferRecord['meta']['status'];
}) {
  const group = draft.kind === 'group';
  const { nights, weeks, fromDates } = measure(draft);
  const c = draft.stay.choices;
  const fixedWeeks = packageWeeks(c.package);
  const owner = options.staff.find((s) => s.id === draft.ownerId)?.name;
  const validIn = draft.validUntil ? daysBetween(today, draft.validUntil) : null;
  const panel = { className: ui.spec, openClassName: ui.specOpen, disabled: !editable, block: true };

  return (
    <section className={ui.hero}>
      <div className={ui.heroTop}>
        <div>
          {editable ? (
            <input
              aria-label="Name of the offer"
              className={ui.titleInput}
              value={draft.groupName}
              placeholder={draft.recipientName || 'Name this offer'}
              onChange={(e) => update({ groupName: e.target.value })}
            />
          ) : (
            <h1 className={ui.pageTitle}>{draft.groupName || draft.recipientName}</h1>
          )}
          <div className={ui.subtitle}>
            <ClickPanel
              label="Recipient"
              icon={<Chip tint="ink" icon={ICONS.people} big />}
              className={ui.editable}
              triggerId={FIX.recipient}
              disabled={!editable}
              body={() => <RecipientFields draft={draft} update={update} countries={options.countries} />}
            >
              <RecipientSummary draft={draft} countries={options.countries} />
            </ClickPanel>
          </div>
        </div>
        <span className={`${ui.pill} ${ui[`pill_${status}`]}`}>{OFFER_STATUS_LABELS[status]}</span>
      </div>

      <div className={`${ui.specs} ${group ? '' : ui.specs3}`}>
        {group ? (
          <ClickPanel
            {...panel}
            label="Dates"
            icon={<Chip tint="blue" icon={ICONS.calendar} big />}
            triggerId={FIX.dates}
            dates
            body={() => (
              <>
                <DateRange
                  from={draft.arrival}
                  to={draft.departure}
                  today={today}
                  compact
                  suggestEnd={(a) => addDays(a, (fixedWeeks ?? c.weeks) * 7 - 1)}
                  onChange={(arrival, departure) => update({ arrival, departure })}
                />
                {!fromDates && !fixedWeeks ? (
                  <div className={ui.fld}>
                    <span>Weeks, until there are dates</span>
                    <Stepper label="Weeks" value={c.weeks} min={1} max={c.package === 'esel' ? 4 : 52} onChange={(v) => update((d) => setChoices(d, { weeks: v ?? 1 }))} />
                  </div>
                ) : null}
              </>
            )}
          >
            <Spec
              tint="blue"
              icon={ICONS.calendar}
              label="Dates"
              value={fromDates && draft.arrival && draft.departure ? formatDateRange(draft.arrival, draft.departure, 'en') : `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`}
              sub={fromDates ? `${nights} nights · ${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : 'No dates yet'}
            />
          </ClickPanel>
        ) : null}

        {group ? (
          <ClickPanel
            {...panel}
            label="The group"
            icon={<Chip tint="red" icon={ICONS.people} big />}
            triggerId={FIX.participants}
            wide
            body={() => (
              <>
                <div className={ui.row2}>
                  <div className={ui.fld}>
                    <span>Participants</span>
                    <Stepper label="Participants" value={draft.participants} min={1} max={500} onChange={(v) => update({ participants: v })} />
                  </div>
                  <div className={ui.fld}>
                    <span>Escorts</span>
                    <Stepper label="Escorts" value={draft.escorts} min={0} max={50} onChange={(v) => update({ escorts: v ?? 0 })} />
                  </div>
                </div>
                {draft.escorts > 0 ? (
                  <div className={ui.fld}>
                    <span>The escorts</span>
                    <div className={ui.choiceGrid}>
                      {(['paid', 'free', 'shared'] as const).map((k: EscortPricing) => (
                        <button
                          key={k}
                          type="button"
                          className={`${ui.choiceCard} ${c.escortPricing === k ? ui.choiceOn : ''}`}
                          aria-pressed={c.escortPricing === k}
                          onClick={() => update((d) => setChoices(d, { escortPricing: k }))}
                        >
                          <b>{ESCORT_PRICING_LABELS[k]}</b>
                          <span>{k === 'paid' ? 'Their own price' : k === 'free' ? 'CASA carries them' : 'In the price per person'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          >
            <Spec
              tint="red"
              icon={ICONS.people}
              label="The group"
              warn={!draft.participants}
              value={draft.participants ? `${draft.participants} participants` : 'Participants?'}
              sub={draft.escorts ? `${draft.escorts} ${draft.escorts === 1 ? 'escort' : 'escorts'}, ${ESCORT_SHORT[c.escortPricing]}` : 'No escorts'}
            />
          </ClickPanel>
        ) : null}

        <ClickPanel
          {...panel}
          label="Language"
          icon={<Chip tint="sun" icon={ICONS.language} big />}
          body={(close) => (
            <div className={ui.choiceGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
              {(['de', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`${ui.choiceCard} ${draft.language === l ? ui.choiceOn : ''}`}
                  onClick={() => {
                    update({ language: l });
                    close();
                  }}
                >
                  <b>{l === 'de' ? 'Deutsch' : 'English'}</b>
                  <span>{l === 'de' ? 'Angebot Nr. …' : 'Offer no. …'}</span>
                </button>
              ))}
            </div>
          )}
        >
          <Spec tint="sun" icon={ICONS.language} label="Language" value={draft.language === 'de' ? 'Deutsch' : 'English'} sub={null} />
        </ClickPanel>

        <ClickPanel
          {...panel}
          label="Valid until"
          icon={<Chip tint="ink" icon={ICONS.hourglass} big />}
          triggerId={FIX.validity}
          body={() => (
            <InlineDatePicker
              ariaLabel="Valid until"
              value={draft.validUntil}
              today={today}
              min={today}
              onChange={(v) => update({ validUntil: v })}
              quick={[
                ...[14, 28, 42].map((days) => ({ label: `${days / 7} weeks`, value: addDays(today, days) })),
                ...(draft.arrival && addDays(draft.arrival, -42) > today ? [{ label: '6 weeks before arrival', value: addDays(draft.arrival, -42) }] : []),
              ]}
            />
          )}
        >
          <Spec
            tint="ink"
            icon={ICONS.hourglass}
            label="Valid until"
            warn={validIn == null || validIn < 0}
            value={draft.validUntil ? formatLetterDate(draft.validUntil, 'en') : 'No date'}
            sub={validIn == null ? 'The letter gives none' : validIn < 0 ? 'Passed' : validIn === 0 ? 'Today' : `In ${validIn} ${validIn === 1 ? 'day' : 'days'}`}
          />
        </ClickPanel>

        <ClickPanel
          {...panel}
          label="Signed by"
          icon={<Chip tint="ink" icon={ICONS.pen} big />}
          body={(close) => (
            <div className={ui.radioList}>
              {options.staff.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`${ui.radio} ${st.id === draft.ownerId ? ui.radioOn : ''}`}
                  onClick={() => {
                    update({ ownerId: st.id });
                    close();
                  }}
                >
                  <i />
                  <span>
                    <b>{st.name}</b>
                  </span>
                </button>
              ))}
            </div>
          )}
        >
          <Spec tint="ink" icon={ICONS.pen} label="Signed by" warn={!owner} value={owner ?? 'Nobody'} sub={null} />
        </ClickPanel>
      </div>
    </section>
  );
}

function RecipientSummary({ draft, countries }: { draft: OfferDraft; countries: Countries }) {
  const contact = [draft.contactFirstName, draft.contactLastName].filter(Boolean).join(' ');
  const town = draft.address.split('\n').filter(Boolean).pop();
  const country = countries.find((c) => c.code === draft.countryCode)?.en;
  const parts = [draft.recipientName, contact === draft.recipientName ? '' : contact, draft.contactEmail, [town, country].filter(Boolean).join(', ')].filter(Boolean);
  return (
    <span>
      {parts.join(' · ') || <span className={ui.placeholder}>Who is it for?</span>}
      {!draft.contactEmail ? <span className={ui.missing}>{parts.length ? ' · ' : ''}Add contact and email</span> : null}
    </span>
  );
}

export function RecipientFields({ draft, update, countries }: { draft: OfferDraft; update: Update; countries: Countries }) {
  return (
    <>
      <div className={ui.fld}>
        <label htmlFor="r-name">{draft.kind === 'group' || draft.organisationId ? 'Organisation' : 'Name'}</label>
        <input id="r-name" className={ui.fi} value={draft.recipientName} onChange={(e) => update({ recipientName: e.target.value })} />
      </div>
      <div className={ui.fld}>
        <span>Contact</span>
        <Seg
          label="Salutation"
          value={draft.contactSalutation}
          options={[
            ['ms', 'Ms'],
            ['mr', 'Mr'],
            ['none', 'None'],
          ]}
          onChange={(v) => update({ contactSalutation: v })}
        />
      </div>
      <div className={ui.row2}>
        <div className={ui.fld}>
          <label htmlFor="r-first">First name</label>
          <input id="r-first" className={ui.fi} value={draft.contactFirstName} onChange={(e) => update({ contactFirstName: e.target.value })} />
        </div>
        <div className={ui.fld}>
          <label htmlFor="r-last">Last name</label>
          <input id="r-last" className={ui.fi} value={draft.contactLastName} onChange={(e) => update({ contactLastName: e.target.value })} />
        </div>
      </div>
      <div className={ui.fld}>
        <label htmlFor="r-email">Email</label>
        <input id="r-email" type="email" className={ui.fi} value={draft.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} />
      </div>
      <div className={ui.fld}>
        <label htmlFor="r-address">Address</label>
        <textarea id="r-address" rows={2} className={ui.fi} value={draft.address} placeholder={'Street and number\nPostcode and town'} onChange={(e) => update({ address: e.target.value })} />
      </div>
      <div className={ui.fld}>
        <label htmlFor="r-country">Country</label>
        <select id="r-country" className={ui.fi} value={draft.countryCode ?? ''} onChange={(e) => update({ countryCode: e.target.value || null })}>
          <option value="">—</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.en}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

// ------------------------------------------------------------- packages

const OWN = { name: 'Own offer', desc: 'No package: only what you put on it' };

function Packages({ draft, update, editable }: { draft: OfferDraft; update: Update; editable: boolean }) {
  const current = draft.stay.choices.package;
  const choose = (choice: PackageChoice) => update((d) => (choice === 'esel' ? asEsel(d) : setChoices(d, { package: choice })));
  const tiles: { choice: PackageChoice; name: string; desc: string; price: ReactNode }[] = [
    ...GRUPPEN_PACKAGES_BY_STACK.map((p) => ({
      choice: p.slug as PackageChoice,
      name: p.animal.en,
      desc: p.descriptor.en,
      price:
        p.priceFrom != null ? (
          <>
            {eur(p.priceFrom)} <small>per person</small>
          </>
        ) : (
          <>
            <small>from</small> {eur(fullBoardBaseTotal(1))} <small>· 1–4 weeks</small>
          </>
        ),
    })),
    { choice: 'own', name: OWN.name, desc: OWN.desc, price: <small>Lines of your choice</small> },
  ];

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>
          <Chip tint={PACKAGE_TINT[current]} icon={ICONS.package} />
          Built on
        </h2>
        <span>The packages of the groups page, or none</span>
      </div>
      <div className={ui.cardBody}>
        <div className={ui.pkgs} role="radiogroup" aria-label="Package">
          {tiles.map((t) => {
            const on = current === t.choice;
            const [colour, tint] = PACKAGE_COLOUR[t.choice];
            return (
              <button
                key={t.choice}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!editable}
                className={`${ui.pkg} ${on ? ui.pkgOn : ''} ${t.choice === 'own' ? ui.pkgOwn : ''}`}
                style={{ ['--pkg' as string]: colour, ['--pkg-tint' as string]: tint }}
                onClick={() => choose(t.choice)}
              >
                {on ? <span className={ui.pkgCheck}>✓</span> : null}
                <span className={ui.pkgName}>{t.name}</span>
                <span className={ui.pkgDesc}>{t.desc}</span>
                <span className={ui.pkgPrice}>{t.price}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- course

/** What each line of a learner's course is, in the workspace's words; the letter's own text sits under it. */
function courseRowName(l: OfferLine, course: CourseChoice): { name: string; tint: Tint; icon: ReactNode } {
  if (l.key.startsWith('course:')) {
    const step = course.steps[Number(l.key.slice(7))];
    return { name: `${course.name.en}${step?.level ? ` ${levelLabel(step, 'en')}` : ''}`, tint: 'red', icon: ICONS.book };
  }
  if (l.key.startsWith('book:')) return { name: 'Textbook', tint: 'red', icon: ICONS.layers };
  if (l.key === 'enrolment') return { name: 'Enrolment fee', tint: 'ink', icon: ICONS.people };
  if (l.key === 'accommodation') return { name: course.accommodation?.kind === 'shared_flat' ? 'CASA shared flat' : 'Host family', tint: 'blue', icon: ICONS.house };
  if (l.key === 'placement') return { name: 'Placement fee', tint: 'blue', icon: ICONS.house };
  if (l.key === 'deposit') return { name: 'Deposit', tint: 'blue', icon: ICONS.house };
  return { name: course.exam?.name ?? 'Exam', tint: 'sun', icon: ICONS.star };
}

/**
 * A learner's course: what they take, when and at what time of day, with
 * everything it brings — books, the enrolment fee on a first registration, a
 * room, the exam. Each line opens its price; the course itself is changed in
 * one panel, the same picker the new-offer wizard uses. docs/OFFERS.md
 * §A learner's course.
 */
function CourseCard({
  draft,
  update,
  editable,
  lines,
  catalogue,
  history,
}: {
  draft: OfferDraft;
  update: Update;
  editable: boolean;
  lines: OfferLine[];
  catalogue: CourseCatalogue;
  history: LearnerHistory | null;
}) {
  const course = draft.stay.choices.course;
  const rows = course ? lines.filter((l) => !l.manual && l.audience === 'participant') : [];
  const span = course ? courseSpan(course) : null;
  const change = (
    <ClickPanel
      wide
      label={course ? 'Change the course' : 'Choose the course'}
      icon={<Chip tint="red" icon={ICONS.book} big />}
      className={`${ui.btn} ${ui.btnSm}`}
      triggerId={FIX.course}
      disabled={!editable}
      body={() => (
        <CoursePicker catalogue={catalogue} value={course} onChange={(next) => update((d) => setChoices(d, { course: next }))} history={history} />
      )}
    >
      {course ? 'Change' : 'Choose a course'}
    </ClickPanel>
  );

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>
          <Chip tint="red" icon={ICONS.book} />
          {course ? courseTitle(course, 'en') : 'Course'}
        </h2>
        {course ? null : <span>Which course, from when, at which level</span>}
        {editable ? change : null}
      </div>
      {course && span ? (
        <div className={ui.courseFacts}>
          {course.slot ? (
            <span>
              {ICONS.clock}
              {slotLabel(course.slot, 'en').split(', ')[0]}
            </span>
          ) : null}
          <span>
            {ICONS.calendar}
            {span.start && span.end ? formatDateRange(span.start, span.end, 'en') : 'Dates by arrangement'}
          </span>
        </div>
      ) : null}
      {rows.length ? <ColumnHead group={false} escorts={false} /> : null}
      <div className={ui.rows}>
        {course ? (
          rows.map((l) => {
            const look = courseRowName(l, course);
            return (
              <ClickPanel
                key={l.key}
                block
                label={look.name}
                icon={<Chip tint={look.tint} icon={look.icon} big />}
                className={ui.inc}
                openClassName={ui.incOpen}
                disabled={!editable}
                body={() => <MoneyField label="Price" line={l} update={update} />}
              >
                <span className={ui.incMain}>
                  <Chip tint={look.tint} icon={look.icon} big />
                  <span className={ui.incText}>
                    <span className={ui.incName}>{look.name}</span>
                    <span className={ui.incDetail}>{l.description}</span>
                  </span>
                </span>
                {amountCell(l)}
              </ClickPanel>
            );
          })
        ) : (
          <div className={ui.empty}>No course on this offer — choose one, or put lines on below</div>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------- included

type ServiceKey = ModuleKey | 'programme';
type Service = { key: ServiceKey; name: string; tint: Tint; icon: ReactNode };
const SERVICES: Service[] = [
  { key: 'course', name: 'Intensive German course', tint: 'red', icon: ICONS.book },
  { key: 'materials', name: 'Course materials', tint: 'red', icon: ICONS.layers },
  { key: 'accommodation', name: 'Host family', tint: 'blue', icon: ICONS.house },
  { key: 'lunch', name: 'Lunch at the canteen', tint: 'blue', icon: ICONS.cup },
  { key: 'transport', name: 'Public transport', tint: 'ink', icon: ICONS.tram },
  { key: 'programme', name: 'Culture programme', tint: 'sun', icon: ICONS.star },
];
const NO_ESCORT: ServiceKey[] = ['course', 'materials'];

type AmountCell = (l: OfferLine | null, on?: boolean) => ReactNode;

const amountCell: AmountCell = (l, on = true) =>
  !on ? (
    <span className={ui.incOffTag}>Not included</span>
  ) : !l ? (
    <span className={ui.incNone}>—</span>
  ) : l.included ? (
    <span className={ui.incIncl}>Included</span>
  ) : l.amount == null ? (
    <span className={ui.amountMissing}>No price</span>
  ) : (
    <span className={`${ui.incAmt} ${l.amount < 0 ? ui.incCredit : ''}`}>
      {l.listUnitAmount != null && l.unitAmount !== l.listUnitAmount ? <i className={ui.changed} title="Changed from the price list" /> : null}
      {l.amount < 0 ? `− ${eur(-l.amount)}` : eur(l.amount)}
    </span>
  );

function ColumnHead({ group, escorts }: { group: boolean; escorts: boolean }) {
  return (
    <div className={`${ui.incHead} ${escorts ? ui.two : ''}`}>
      <span />
      <span>{group ? 'Per participant' : 'Amount'}</span>
      {escorts ? <span>Per escort</span> : null}
    </div>
  );
}

function Included({ draft, update, editable, lines }: { draft: OfferDraft; update: Update; editable: boolean; lines: OfferLine[] }) {
  const c = draft.stay.choices;
  const fixed = isFixedPackage(c.package);
  const escortCol = draft.escorts > 0;
  const two = escortCol ? ui.two : '';
  const { nights } = measure(draft);
  const weeks = pricedWeeks(draft);
  const find = (key: string, audience: Audience = 'participant') => lines.find((l) => l.key === key && l.audience === audience) ?? null;
  const activities = activitiesOf(c);
  const pkgLine = find('package');
  const pkg = GRUPPEN_PACKAGES_BY_STACK.find((p) => p.slug === c.package);

  const detail: Record<ServiceKey, string> = {
    course: `${weeks * 20} lessons · Mon–Fri 09:00–12:30`,
    materials: 'Workbook and copies, theirs to keep',
    accommodation: `Double room · breakfast and dinner · ${nights} nights`,
    lunch: 'Hot lunch on school days',
    transport: 'Trams and buses for the whole stay',
    programme: activities.length ? `${activities.length} ${activities.length === 1 ? 'afternoon' : 'afternoons'}` : 'No activities chosen',
  };
  const toEsel = () => (
    <button type="button" className={ui.link} onClick={() => update(asEsel)}>
      Leave something out: build it from blocks (Esel)
    </button>
  );

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>
          <Chip tint="blue" icon={ICONS.house} />
          Included
        </h2>
        <span>{fixed ? `Everything ${pkg?.animal.en ?? 'the package'} includes` : 'The blocks the group takes'}</span>
      </div>
      <ColumnHead group escorts={escortCol} />
      <div className={ui.rows}>
        {fixed && pkgLine ? (
          <ClickPanel
            block
            label={pkg ? `${pkg.animal.en} package` : pkgLine.description}
            icon={<Chip tint={PACKAGE_TINT[c.package]} icon={ICONS.package} big />}
            className={`${ui.inc} ${two}`}
            openClassName={ui.incOpen}
            disabled={!editable}
            body={() => (
              <>
                <MoneyField label="Price per participant" line={pkgLine} update={update} />
                <div className={ui.fieldNote}>A price agreed with the group replaces the package price on the letter.</div>
              </>
            )}
            foot={toEsel}
          >
            <span className={ui.incMain}>
              <Chip tint={PACKAGE_TINT[c.package]} icon={ICONS.package} big />
              <span className={ui.incText}>
                <span className={ui.incName}>{pkg ? `${pkg.animal.en} · ${pkg.descriptor.en}` : pkgLine.description}</span>
                <span className={ui.incDetail}>
                  The package price · everything below, for {weeks} {weeks === 1 ? 'week' : 'weeks'}
                </span>
              </span>
            </span>
            {amountCell(pkgLine)}
            {escortCol ? <span className={ui.incNone}>—</span> : null}
          </ClickPanel>
        ) : null}

        {SERVICES.map((s) => {
          if (s.key === 'programme' && fixed && !activities.length) return null;
          const on = s.key === 'programme' ? true : fixed || c.modules[s.key];
          const p = fixed ? find(`inc:${s.key}`) : find(s.key);
          const e = NO_ESCORT.includes(s.key) ? null : find(s.key, 'escort');
          return (
            <ClickPanel
              key={s.key}
              block
              label={s.name}
              subtitle={fixed ? `Part of ${pkg?.animal.en ?? 'the package'}` : on ? detail[s.key] : 'Not in this offer'}
              icon={<Chip tint={s.tint} icon={s.icon} big />}
              className={`${ui.inc} ${two} ${on ? '' : ui.incOff}`}
              openClassName={ui.incOpen}
              disabled={!editable}
              wide={s.key === 'programme' && !fixed}
              triggerId={s.key === 'programme' && !fixed ? FIX.programme : undefined}
              body={() => <ServiceBody service={s} draft={draft} update={update} fixed={fixed} on={on} participantLine={fixed ? null : p} escortLine={escortCol ? e : null} />}
              foot={fixed ? toEsel : undefined}
            >
              <span className={ui.incMain}>
                <Chip tint={s.tint} icon={s.icon} big />
                <span className={ui.incText}>
                  <span className={ui.incName}>{s.name}</span>
                  <span className={ui.incDetail}>{detail[s.key]}</span>
                  {s.key === 'programme' && activities.length ? <ActivityChips ids={activities} /> : null}
                </span>
              </span>
              {s.key === 'programme' && !activities.length ? <span className={ui.incOffTag}>Choose</span> : amountCell(p, on)}
              {escortCol ? amountCell(e, on) : null}
            </ClickPanel>
          );
        })}
      </div>
    </section>
  );
}

function ActivityChips({ ids }: { ids: string[] }) {
  return (
    <span className={ui.chips}>
      {ids.map((id) => {
        const a = activityById.get(id as never);
        return a ? (
          <span key={id} className={`${ui.chip} ${ui[`tint_${ACTIVITY_TINT[a.category]}`]}`}>
            {a.name}
          </span>
        ) : null;
      })}
    </span>
  );
}

/** The sixteen activities by category, to choose from; `taken` ones are already in the package. */
function ActivityPicker({ chosen, taken = [], onToggle, note }: { chosen: string[]; taken?: string[]; onToggle: (id: string) => void; note: ReactNode }) {
  const on = new Set(chosen);
  const off = new Set(taken);
  return (
    <>
      <div className={ui.fieldNote}>{note}</div>
      {(['city', 'culture', 'science', 'sport', 'daytrip'] as const).map((cat) => (
        <div key={cat} className={ui.actGroup}>
          <span>{CATEGORY_LABEL[cat]}</span>
          <div className={ui.acts}>
            {GRUPPEN_ACTIVITIES.filter((a) => a.category === cat).map((a) => {
              const isOn = on.has(a.id) || off.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={isOn}
                  disabled={off.has(a.id)}
                  title={off.has(a.id) ? 'In the package already' : undefined}
                  className={`${ui.act} ${isOn ? `${ui.actOn} ${ui[`tint_${ACTIVITY_TINT[a.category]}`]}` : ''}`}
                  onClick={() => onToggle(a.id)}
                >
                  {a.name} <small>{off.has(a.id) ? 'included' : eur(a.price)}</small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function ServiceBody({
  service,
  draft,
  update,
  fixed,
  on,
  participantLine,
  escortLine,
}: {
  service: Service;
  draft: OfferDraft;
  update: Update;
  fixed: boolean;
  on: boolean;
  participantLine: OfferLine | null;
  escortLine: OfferLine | null;
}) {
  const c = draft.stay.choices;
  const weeks = pricedWeeks(draft);
  if (service.key === 'programme') {
    if (fixed) {
      return (
        <>
          <ActivityChips ids={activitiesOf(c)} />
          <div className={ui.fieldNote}>More afternoons go under Extras, on top of the package.</div>
          {escortLine ? <MoneyField label="Price per escort" line={escortLine} update={update} /> : null}
        </>
      );
    }
    const chosen = activitiesOf(c);
    return (
      <>
        <ActivityPicker
          chosen={chosen}
          onToggle={(id) => update((d) => setChoices(d, { activities: toggleIn(d.stay.choices.activities, id) }))}
          note={`${chosen.length} chosen · up to ${activityAllowance(weeks)} for ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`}
        />
        {escortLine ? <MoneyField label="Price per escort" line={escortLine} update={update} /> : null}
      </>
    );
  }

  const key = service.key;
  return (
    <>
      {!fixed ? (
        <div className={ui.fld}>
          <span>In this offer</span>
          <div className={ui.choiceGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={on === v}
                className={`${ui.choiceCard} ${on === v ? ui.choiceOn : ''}`}
                onClick={() => update((d) => setChoices(d, { modules: { ...d.stay.choices.modules, [key]: v } }))}
              >
                <b>{v ? 'Included' : 'Not included'}</b>
                <span>{v ? 'Priced for the stay' : key === 'course' ? 'A stay without lessons' : 'The group arranges it'}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={ui.fieldNote}>Included in the package price.</div>
      )}
      {participantLine && on ? <MoneyField label="Price per participant" line={participantLine} update={update} /> : null}
      {escortLine && on ? <MoneyField label="Price per escort" line={escortLine} update={update} /> : null}
    </>
  );
}

function MoneyField({ label, line, update }: { label: string; line: OfferLine; update: Update }) {
  const changed = line.listUnitAmount != null && line.unitAmount !== line.listUnitAmount;
  return (
    <div className={ui.fld}>
      <span>{label}</span>
      <div className={ui.inline} style={{ flexWrap: 'nowrap' }}>
        <span className={ui.money} style={{ width: 140 }}>
          <NumberInput ariaLabel={`${label}: ${line.description}`} className={ui.fi} value={line.unitAmount} placeholder="0" onCommit={(v) => update((d) => setLinePrice(d, line, v))} />
        </span>
        <span className={ui.fieldNote}>
          {line.listUnitAmount == null ? 'No list price' : changed ? `List price ${eur(line.listUnitAmount)}` : 'The list price'}
          {changed ? (
            <button type="button" className={ui.link} onClick={() => update((d) => resetLine(d, line))}>
              Use it
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- extras

/**
 * What is on top: more afternoons than the package has, the share of the
 * escorts' costs, and every line put on by hand — a transfer, a single room,
 * a reduction. For an own offer and for one learner, this is the whole offer.
 */
function Extras({
  draft,
  update,
  editable,
  lines,
  priceList,
  chargeTypes,
}: {
  draft: OfferDraft;
  update: Update;
  editable: boolean;
  lines: OfferLine[];
  priceList: PriceListItem[];
  chargeTypes: EditorOptions['chargeTypes'];
}) {
  const group = draft.kind === 'group';
  const c = draft.stay.choices;
  const escortCol = group && draft.escorts > 0;
  const two = escortCol ? ui.two : '';
  const find = (key: string, audience: Audience = 'participant') => lines.find((l) => l.key === key && l.audience === audience) ?? null;
  const extras = extrasOf(c);
  const share = find('escort_share');
  const typed = lines.filter((l) => l.manual);
  const afternoons = group && c.package !== 'esel';
  const own = group && c.package === 'own';

  const title = !group ? (c.course ? 'Also on the offer' : 'On the offer') : own ? 'On the offer' : 'Extras';
  const sub = !group ? 'From the price list, or typed — a transfer, a reduction' : own ? 'Everything this offer is made of' : `On top of ${c.package === 'esel' ? 'the blocks' : 'the package'}`;
  const nothing = !extras.length && !share && !typed.length && !afternoons;

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>
          <Chip tint="sun" icon={ICONS.sparkle} />
          {title}
        </h2>
        <span>{sub}</span>
      </div>
      {nothing ? null : <ColumnHead group={group} escorts={escortCol} />}
      <div className={ui.rows}>
        {afternoons ? (
          <ClickPanel
            block
            wide
            label="More afternoons"
            icon={<Chip tint="sun" icon={ICONS.star} big />}
            className={`${ui.inc} ${two}`}
            openClassName={ui.incOpen}
            disabled={!editable}
            body={() => {
              const extraLine = find('extras', 'escort');
              return (
                <>
                  <ActivityPicker
                    chosen={extras}
                    taken={activitiesOf(c)}
                    onToggle={(id) => update((d) => setChoices(d, { extras: toggleIn(extrasOf(d.stay.choices), id) }))}
                    note={extras.length ? `${extras.length} chosen, priced per person` : 'Priced per person, as on the groups page'}
                  />
                  {extraLine ? <MoneyField label="Price per escort" line={extraLine} update={update} /> : null}
                </>
              );
            }}
          >
            <span className={ui.incMain}>
              <Chip tint="sun" icon={ICONS.star} big />
              <span className={ui.incText}>
                <span className={ui.incName}>More afternoons</span>
                <span className={ui.incDetail}>{extras.length ? `${extras.length} on top` : 'An excursion, a day trip, a visit the package does not have'}</span>
                {extras.length ? <ActivityChips ids={extras} /> : null}
              </span>
            </span>
            {extras.length ? amountCell(find('extras')) : <span className={ui.incOffTag}>Add</span>}
            {escortCol ? (extras.length ? amountCell(find('extras', 'escort')) : <span className={ui.incNone}>—</span>) : null}
          </ClickPanel>
        ) : null}

        {typed.map((l) => (
          <TypedRow key={l.key} line={l} update={update} editable={editable} two={two} escortCol={escortCol} chargeTypes={chargeTypes} />
        ))}

        {share ? (
          <ClickPanel
            block
            label="Share of the escorts"
            subtitle={`Their costs over ${draft.participants} participants, rounded up`}
            icon={<Chip tint="ink" icon={ICONS.share} big />}
            className={`${ui.inc} ${two}`}
            openClassName={ui.incOpen}
            disabled={!editable}
            body={() => <MoneyField label="Per participant" line={share} update={update} />}
          >
            <span className={ui.incMain}>
              <Chip tint="ink" icon={ICONS.share} big />
              <span className={ui.incText}>
                <span className={ui.incName}>Share of the escorts</span>
                <span className={ui.incDetail}>
                  {draft.escorts} {draft.escorts === 1 ? 'escort' : 'escorts'} over {draft.participants} participants
                </span>
              </span>
            </span>
            {amountCell(share)}
            {escortCol ? <span className={ui.incNone}>—</span> : null}
          </ClickPanel>
        ) : null}

        {nothing ? <div className={ui.empty}>{own ? 'Nothing on this offer yet' : 'No lines yet'}</div> : null}
      </div>
      {editable ? (
        <div className={ui.cardFoot}>
          <AddMenu priceList={priceList} update={update} group={group} />
        </div>
      ) : null}
    </section>
  );
}

function TypedRow({
  line,
  update,
  editable,
  two,
  escortCol,
  chargeTypes,
}: {
  line: OfferLine;
  update: Update;
  editable: boolean;
  two: string;
  escortCol: boolean;
  chargeTypes: EditorOptions['chargeTypes'];
}) {
  const credit = isCredit(line.chargeType);
  const setPrice = (v: number | null) => update((d) => setLinePrice(d, line, v == null ? null : credit ? -Math.abs(v) : v));
  const shown = line.unitAmount == null ? null : credit ? Math.abs(line.unitAmount) : line.unitAmount;
  const icon = credit ? ICONS.minus : ICONS.plus;
  const tint: Tint = credit ? 'green' : 'ink';
  return (
    <ClickPanel
      block
      label={line.description || 'New line'}
      icon={<Chip tint={tint} icon={icon} big />}
      className={`${ui.inc} ${two}`}
      openClassName={ui.incOpen}
      disabled={!editable}
      body={() => (
        <>
          <div className={ui.fld}>
            <label htmlFor={`t-${line.key}`}>Text on the offer</label>
            <input id={`t-${line.key}`} className={ui.fi} value={line.description} autoFocus={!line.description} onChange={(e) => update((d) => setLineText(d, line, e.target.value))} />
          </div>
          <div className={ui.row2}>
            <div className={ui.fld}>
              <label htmlFor={`q-${line.key}`}>Quantity</label>
              <NumberInput id={`q-${line.key}`} className={ui.fi} value={line.quantity} onCommit={(q) => update((d) => setLineQuantity(d, line.key, q ?? 1))} />
            </div>
            <div className={ui.fld}>
              <label htmlFor={`p-${line.key}`}>{credit ? 'Taken off, per person' : 'Price'}</label>
              <span className={ui.money}>
                <NumberInput id={`p-${line.key}`} className={ui.fi} value={shown} placeholder="0" onCommit={setPrice} />
              </span>
            </div>
          </div>
          <div className={ui.fld}>
            <label htmlFor={`k-${line.key}`}>Kind of cost</label>
            <select
              id={`k-${line.key}`}
              className={ui.fi}
              value={line.chargeType}
              onChange={(e) => update((d) => ({ ...d, stay: { ...d.stay, manual: d.stay.manual.map((m) => (m.key === line.key ? { ...m, chargeType: e.target.value } : m)) } }))}
            >
              {chargeTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.en}
                </option>
              ))}
            </select>
          </div>
          {escortCol ? (
            <div className={ui.fld}>
              <span>Paid by</span>
              <Seg<Audience>
                label="Paid by"
                value={line.audience}
                options={[
                  ['participant', 'Participants'],
                  ['escort', 'Escorts'],
                ]}
                onChange={(v) => update((d) => moveLineTo(d, line.key, v))}
              />
            </div>
          ) : null}
        </>
      )}
      foot={(close) => (
        <button
          type="button"
          className={ui.link}
          style={{ color: 'var(--o-red)' }}
          onClick={() => {
            update((d) => removeLine(d, line.key));
            close();
          }}
        >
          Remove the line
        </button>
      )}
    >
      <span className={ui.incMain}>
        <Chip tint={tint} icon={icon} big />
        <span className={ui.incText}>
          <span className={ui.incName}>{line.description || <span className={ui.placeholder}>New line</span>}</span>
          <span className={ui.incDetail}>
            {line.quantity !== 1 ? `${line.quantity} × ${eur(shown)}` : credit ? 'Reduction' : line.unitAmount == null ? 'Type the price' : 'Own line'}
          </span>
        </span>
      </span>
      {line.audience === 'participant' ? amountCell(line) : <span className={ui.incNone}>—</span>}
      {escortCol ? line.audience === 'escort' ? amountCell(line) : <span className={ui.incNone}>—</span> : null}
    </ClickPanel>
  );
}

function AddMenu({ priceList, update, group }: { priceList: PriceListItem[]; update: Update; group: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);
  const byGroup = priceList.reduce<Record<string, PriceListItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
  const addPreset = (p: ExtraPreset) => {
    update((d) => addLine(d, { audience: 'participant', chargeType: p.chargeType, description: d.language === 'de' ? p.de : p.en, quantity: 1, unitAmount: null }));
    setOpen(false);
  };

  return (
    <div ref={wrap} className={ui.menuWrap}>
      <button type="button" className={ui.add} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        + Add {group ? 'an extra' : 'a line'}
      </button>
      {open ? (
        <div className={ui.menu} role="menu" style={{ left: 0, right: 'auto', top: 'auto', bottom: 'calc(100% + 6px)', width: 330 }}>
          {group ? (
            <>
              <div className={ui.menuHead}>Often asked for</div>
              {GROUP_EXTRAS.map((p) => (
                <button key={p.label} type="button" role="menuitem" className={ui.menuItem} onClick={() => addPreset(p)}>
                  {p.label}
                </button>
              ))}
              <div className={ui.menuRule} />
            </>
          ) : null}
          <div style={{ padding: '4px 4px 6px' }}>
            <select
              aria-label="From the price list"
              className={ui.fi}
              value=""
              onChange={(e) => {
                const item = priceList[Number(e.target.value)];
                if (!item) return;
                update((d) => addLine(d, { audience: 'participant', chargeType: item.chargeType, description: d.language === 'de' ? item.de : item.en, quantity: 1, unitAmount: item.unitAmount }));
                setOpen(false);
              }}
            >
              <option value="">From the price list …</option>
              {Object.entries(byGroup).map(([name, items]) => (
                <optgroup key={name} label={name}>
                  {items.map((item) => (
                    <option key={priceList.indexOf(item)} value={priceList.indexOf(item)}>
                      {item.label}
                      {item.unitAmount != null ? ` · ${eur(item.unitAmount)}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button type="button" role="menuitem" className={ui.menuItem} onClick={() => addPreset(REDUCTION)}>
            A reduction
          </button>
          <button
            type="button"
            role="menuitem"
            className={ui.menuItem}
            onClick={() => {
              update((d) => addLine(d, { audience: 'participant', chargeType: 'additional_costs', description: '', quantity: 1, unitAmount: null }));
              setOpen(false);
            }}
          >
            A line of your own
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- aside

function PriceCard({ draft, totals }: { draft: OfferDraft; totals: OfferTotals }) {
  const pricing = draft.stay.choices.escortPricing;
  if (draft.kind !== 'group') {
    return (
      <section className={ui.price} aria-label="Price">
        <div className={ui.priceKey}>Total</div>
        <div className={ui.priceBig}>{eur(totals.perParticipant)}</div>
      </section>
    );
  }
  return (
    <section className={ui.price} aria-label="Price">
      <div className={ui.priceKey}>Per participant</div>
      <div className={ui.priceBig}>{eur(totals.perParticipant)}</div>
      {totals.escortShare != null ? <div className={ui.priceSub}>incl. {eur(totals.escortShare)} for the escorts</div> : null}
      <div className={ui.priceRows}>
        <div className={ui.priceRow}>
          <span>
            Per escort
            <small>
              {draft.escorts === 0
                ? 'No escorts'
                : pricing === 'free'
                  ? `Free · CASA carries ${eur(totals.carriedByCasa)}`
                  : pricing === 'shared'
                    ? 'Shared by the group'
                    : `${draft.escorts} ${draft.escorts === 1 ? 'escort' : 'escorts'}`}
            </small>
          </span>
          <b>{draft.escorts === 0 ? '—' : eur(totals.perEscort)}</b>
        </div>
        <div className={ui.priceRow}>
          <span>
            The group
            <small>
              {draft.participants ? `${draft.participants} × ${eur(totals.perParticipant)}` : 'Participants missing'}
              {pricing === 'paid' && draft.escorts && totals.perEscort != null ? ` + ${draft.escorts} × ${eur(totals.perEscort)}` : ''}
            </small>
          </span>
          <b>{eur(totals.groupTotal)}</b>
        </div>
      </div>
    </section>
  );
}

function ChecksCard({ checks }: { checks: OfferRecord['checks'] }) {
  const problems = checks.filter((c) => c.level === 'problem');
  const hints = checks.filter((c) => c.level === 'hint');
  return (
    <section className={ui.card} aria-label="Checks">
      {problems.length ? (
        <div className={`${ui.cardHead} ${ui.cardHeadWarn}`}>
          <h2>
            <span className={`${ui.checkMark} ${ui.tint_sun}`}>!</span>
            Before it can go
          </h2>
          <span className={ui.count}>{problems.length}</span>
        </div>
      ) : (
        <div className={`${ui.checksOk} ${hints.length ? ui.checksOkRule : ''}`}>
          <span className={`${ui.checkMark} ${ui.tint_green}`}>✓</span>
          Ready to send
        </div>
      )}
      {problems.length || hints.length ? (
        <div className={ui.checkList}>
          {[...problems, ...hints].map((c, i) => {
            const fix = FIX[c.field];
            const body = (
              <>
                <i className={c.level === 'problem' ? ui.dotProblem : ui.dotHint} />
                <span>{c.message}</span>
                {fix ? <span className={ui.checkGo}>→</span> : null}
              </>
            );
            const className = `${ui.check} ${c.level === 'hint' ? ui.checkHint : ''}`;
            return fix ? (
              <button
                key={i}
                type="button"
                className={`${className} ${ui.checkFix}`}
                onClick={() => {
                  const target = document.getElementById(fix);
                  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  target?.click();
                }}
              >
                {body}
              </button>
            ) : (
              <div key={i} className={className}>
                {body}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function History({ record }: { record: OfferRecord }) {
  const { meta } = record;
  return (
    <section className={ui.card} aria-label="History">
      <div className={ui.cardHead}>
        <h2>History</h2>
      </div>
      <div className={ui.timeline}>
        {meta.decidedAt ? (
          <div className={`${ui.event} ${meta.status === 'accepted' ? ui.eventGood : ''}`}>
            <i />
            <div>
              <b>{OFFER_STATUS_LABELS[meta.status]}</b>
              <span>
                {day(meta.decidedAt)}
                {meta.decidedByName ? ` · ${meta.decidedByName}` : ''}
                {meta.decisionNote ? ` · ${meta.decisionNote}` : ''}
              </span>
            </div>
          </div>
        ) : null}
        {record.letters.map((l) => (
          <div key={l.id} className={`${ui.event} ${ui.eventOn}`}>
            <i />
            <div>
              <Link href={`/admin/offers/${meta.id}/letter?version=${l.version}`}>Version {l.version} sent</Link>
              <span>
                {day(l.sentAt)}
                {l.sentByName ? ` · ${l.sentByName}` : ''}
              </span>
            </div>
          </div>
        ))}
        <div className={ui.event}>
          <i />
          <div>
            <b>Created</b>
            <span>
              {day(meta.createdAt)}
              {meta.createdByName ? ` · ${meta.createdByName}` : ''}
            </span>
            {meta.enquiryId ? (
              <span>
                From <Link href={`/admin/enquiries/${meta.enquiryId}`}>an enquiry</Link>
              </span>
            ) : null}
            {meta.personId ? (
              <span>
                For <Link href={`/admin/people/${meta.personId}`}>a learner</Link>
              </span>
            ) : null}
            {meta.copiedFrom ? (
              <span>
                Repeats <Link href={`/admin/offers/${meta.copiedFrom}`}>an earlier offer</Link>
              </span>
            ) : null}
          </div>
        </div>
        {record.related.length ? (
          <div className={ui.event}>
            <i />
            <div>
              <b>Earlier offers to {record.draft.recipientName}</b>
              {record.related.map((r) => (
                <span key={r.id}>
                  <Link href={`/admin/offers/${r.id}`}>{r.number}</Link> · {OFFER_STATUS_LABELS[r.status].toLowerCase()}
                  {r.perParticipant != null ? ` · ${eur(r.perParticipant)}` : ''}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
