'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { GRUPPEN_ACTIVITIES, GRUPPEN_PACKAGES_BY_STACK, activityById, fullBoardBaseTotal, type GruppenActivity } from '@/config/gruppen/packages';
import { hasProblems } from '@/lib/admin/offers/checks';
import { buildLetter, formatDateRange, formatLetterDate, formatMoney } from '@/lib/admin/offers/document';
import { addLine, moveLineTo, removeLine, resetLine, setChoices, setLinePrice, setLineQuantity, setLineText } from '@/lib/admin/offers/draft-ops';
import { activitiesOf, activityAllowance, measure, packageWeeks, pricedWeeks } from '@/lib/admin/offers/engine';
import type { EditorOptions, OfferRecord, PriceListItem, StandardTexts } from '@/lib/admin/offers/repo';
import { addDays } from '@/lib/admin/offers/stay';
import {
  ESCORT_PRICING_LABELS,
  OFFER_STATUS_LABELS,
  type Audience,
  type EscortPricing,
  type ModuleKey,
  type OfferDraft,
  type OfferLine,
  type OfferTotals,
  type PackageSlug,
  type StayChoices,
} from '@/lib/admin/offers/types';

import { NumberInput, Seg, Stepper } from './fields';
import { OfferFrame } from './frame';
import { OfferToolbarActions } from './offer-actions';
import ui from './offers.module.css';
import { ClickPanel } from './panel';
import { PrintCopy, printOffer } from './print';
import { saveLabel, useOfferDraft } from './use-offer-draft';

const eur = (n: number | null) => (n == null ? '—' : formatMoney(n, 'de'));
const day = (d: Date | string) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

type Update = (change: Partial<OfferDraft> | ((d: OfferDraft) => OfferDraft)) => void;
type Countries = EditorOptions['countries'];
type Tint = 'red' | 'blue' | 'sun' | 'ink';

// ------------------------------------------------------------------ icons

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const ICONS = {
  calendar: svg(<><rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 7h11M5.5 2v3M10.5 2v3" /></>),
  people: svg(<><circle cx="6" cy="5.5" r="2.3" /><path d="M2 13.5a4 4 0 0 1 8 0" /><path d="M11 4a2 2 0 0 1 0 4M12 13.5a3.5 3.5 0 0 0-1.6-2.9" /></>),
  language: svg(<><path d="M2.5 4h7M6 2.5V4M4 4c.5 2.5 2.2 4.4 4.5 5.5M8 4c-.6 2.6-2.4 4.6-5 5.8" /><path d="M9 14l2.5-6 2.5 6M9.8 12h3.4" /></>),
  hourglass: svg(<><path d="M4 2h8M4 14h8M5 2c0 3 6 3 6 6s-6 3-6 6M11 2c0 3-6 3-6 6s6 3 6 6" /></>),
  pen: svg(<><path d="M10.5 2.5l3 3-8 8H2.5v-3z" /></>),
  book: svg(<><path d="M3 3.5c1.7-.8 3.4-.8 5 0v10c-1.6-.8-3.3-.8-5 0z" /><path d="M8 3.5c1.6-.8 3.3-.8 5 0v10c-1.7-.8-3.4-.8-5 0" /></>),
  layers: svg(<><path d="M8 2l6 3-6 3-6-3z" /><path d="M2 8l6 3 6-3M2 11l6 3 6-3" /></>),
  house: svg(<><path d="M2.5 7.5L8 3l5.5 4.5V13a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8z" /><path d="M6.5 13.8V10h3v3.8" /></>),
  cup: svg(<><path d="M3 5h8v4a4 4 0 0 1-8 0z" /><path d="M11 6h1a1.5 1.5 0 0 1 0 3h-1M5 2v1.5M7 2v1.5M9 2v1.5" /></>),
  tram: svg(<><rect x="3.5" y="3" width="9" height="8.5" rx="2" /><path d="M3.5 8h9M6 13.5l-1 1.2M10 13.5l1 1.2M6.5 1.5h3" /></>),
  star: svg(<><path d="M8 2l1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3l-3.7 2 .8-4.1L2 6.3l4.2-.5z" /></>),
  package: svg(<><path d="M2.5 5L8 2.5 13.5 5v6L8 13.5 2.5 11z" /><path d="M2.5 5L8 7.5 13.5 5M8 7.5v6" /></>),
  plus: svg(<><path d="M8 3v10M3 8h10" /></>),
  share: svg(<><circle cx="4" cy="8" r="1.8" /><circle cx="12" cy="4" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="M5.6 7.1l4.8-2.3M5.6 8.9l4.8 2.3" /></>),
};
const Chip = ({ tint, icon, big }: { tint: Tint; icon: ReactNode; big?: boolean }) => (
  <span className={`${big ? ui.incIcon : ui.factIcon} ${ui[`tint_${tint}`]}`}>{icon}</span>
);

const PACKAGE_TINT: Record<PackageSlug, Tint> = { hahn: 'sun', katze: 'blue', hund: 'red', esel: 'ink' };
const PACKAGE_COLOUR: Record<PackageSlug, [string, string]> = {
  hahn: ['var(--c-sun)', 'var(--c-sun-tint)'],
  katze: ['var(--c-blue)', 'var(--c-blue-tint)'],
  hund: ['var(--c-red)', 'var(--c-red-tint)'],
  esel: ['var(--c-ink)', 'var(--c-ink-tint)'],
};
const ACTIVITY_TINT: Record<GruppenActivity['category'], Tint> = { city: 'blue', culture: 'red', science: 'sun', sport: 'ink', daytrip: 'ink' };
const CATEGORY_LABEL: Record<GruppenActivity['category'], string> = {
  city: 'In the city',
  culture: 'Culture and history',
  science: 'Science and nature',
  sport: 'Sport',
  daytrip: 'Day trips',
};
const ALL_MODULES: StayChoices['modules'] = { course: true, materials: true, accommodation: true, lunch: true, transport: true };

/** Esel built from what a package holds — the way to change a fixed package. */
const asEsel = (d: OfferDraft): OfferDraft => {
  const from = d.stay.choices;
  if (from.package === 'esel') return d;
  return setChoices(d, { package: 'esel', weeks: packageWeeks(from.package) ?? from.weeks, modules: ALL_MODULES, activities: activitiesOf(from) });
};

/**
 * The offer: who it is for, which package, what it includes, what it costs.
 * A tinted head with the facts, the four packages in the four CASA colours, a
 * card of what is included — red the course, blue the stay, yellow the
 * programme — and the price on a dark card. A click on anything opens a small
 * panel to change it. docs/OFFERS.md §Design.
 */
export function OfferPage({
  record,
  options,
  priceList,
  texts,
  today,
  canWrite,
  canDelete,
  notice,
}: {
  record: OfferRecord;
  options: EditorOptions;
  priceList: PriceListItem[];
  texts: StandardTexts;
  today: string;
  canWrite: boolean;
  canDelete: boolean;
  notice: { ok?: string; error?: string };
}) {
  const { meta } = record;
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

  const countryName = options.countries.find((c) => c.code === draft.countryCode)?.[lang] ?? null;
  const signatureName = options.staff.find((s) => s.id === draft.ownerId)?.name ?? null;
  const letter = useMemo(
    () => buildLetter(draft, lines, totals, { number: meta.number, version: meta.version + 1, date: today, countryName, signatureName, standard: texts[lang] }),
    [draft, lines, totals, meta.number, meta.version, today, countryName, signatureName, texts, lang]
  );
  const print = () => printOffer(`${lang === 'de' ? 'Angebot' : 'Offer'} ${meta.number} ${name}`);

  const problems = checks.filter((c) => c.level === 'problem');
  const hints = checks.filter((c) => c.level === 'hint');
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
      <main className={ui.page} style={{ maxWidth: 880 }}>
        {od.saveState === 'stale' ? (
          <div className={ui.banner}>
            A colleague has changed this offer in the meantime. The last change is not saved.
            <span style={{ flex: 1 }} />
            <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        ) : null}

        <Head draft={draft} update={update} editable={editable} options={options} today={today} status={meta.status} />

        {draft.kind === 'group' ? <Packages draft={draft} update={update} editable={editable} /> : null}

        <Included draft={draft} update={update} editable={editable} lines={lines} priceList={priceList} chargeTypes={options.chargeTypes} />

        <PriceCard draft={draft} totals={totals} />

        {meta.status === 'draft' ? (
          problems.length ? (
            <div className={`${ui.callout} ${ui.calloutWarn}`} aria-label="Checks">
              {problems.map((c, i) => (
                <div key={`p${i}`} className={ui.check}>
                  <i className={ui.dotProblem} />
                  {c.message}
                </div>
              ))}
              {hints.map((c, i) => (
                <div key={`h${i}`} className={`${ui.check} ${ui.checkHint}`}>
                  <i className={ui.dotHint} />
                  {c.message}
                </div>
              ))}
            </div>
          ) : (
            <div className={`${ui.callout} ${ui.calloutOk}`} aria-label="Checks">
              <span className={ui.factIcon} style={{ background: '#fff', color: 'var(--o-green)' }}>
                ✓
              </span>
              <span style={{ flex: 1 }}>
                Ready to send
                {hints.length ? <span className={ui.calloutHints}>{hints.map((c) => c.message).join(' · ')}</span> : null}
              </span>
            </div>
          )
        ) : null}

        <History record={record} />
      </main>
      <PrintCopy letter={letter} />
    </OfferFrame>
  );
}

// ----------------------------------------------------------------- head

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

  return (
    <section className={ui.head2}>
      <div className={ui.headTop}>
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
              subtitle="Who the letter is addressed to"
              icon={<Chip tint="ink" icon={ICONS.people} big />}
              className={ui.editable}
              disabled={!editable}
              body={() => <RecipientFields draft={draft} update={update} countries={options.countries} />}
            >
              <RecipientSummary draft={draft} countries={options.countries} />
            </ClickPanel>
          </div>
        </div>
        <span className={`${ui.pill} ${ui[`pill_${status}`]}`}>{OFFER_STATUS_LABELS[status]}</span>
      </div>

      <div className={ui.facts}>
        {group ? (
          <ClickPanel
            label="Dates"
            subtitle={fixedWeeks ? `The package is ${fixedWeeks} ${fixedWeeks === 1 ? 'week' : 'weeks'}` : 'Esel takes the length of the stay'}
            icon={<Chip tint="blue" icon={ICONS.calendar} big />}
            className={ui.fact}
            openClassName={ui.factOpen}
            disabled={!editable}
            body={() => (
              <>
                <div className={ui.row2}>
                  <div className={ui.fld}>
                    <label htmlFor="d-arrival">Arrival</label>
                    <input id="d-arrival" aria-label="Arrival" type="date" className={ui.fi} value={draft.arrival ?? ''} onChange={(e) => update({ arrival: e.target.value || null })} />
                  </div>
                  <div className={ui.fld}>
                    <label htmlFor="d-departure">Departure</label>
                    <input id="d-departure" aria-label="Departure" type="date" className={ui.fi} value={draft.departure ?? ''} min={draft.arrival ?? undefined} onChange={(e) => update({ departure: e.target.value || null })} />
                  </div>
                </div>
                {!fromDates && c.package === 'esel' ? (
                  <div className={ui.fld}>
                    <span>Weeks, until there are dates</span>
                    <Stepper label="Weeks" value={c.weeks} min={1} max={4} onChange={(v) => update((d) => setChoices(d, { weeks: v ?? 1 }))} />
                  </div>
                ) : null}
              </>
            )}
          >
            <Chip tint="blue" icon={ICONS.calendar} />
            {fromDates && draft.arrival && draft.departure ? (
              `${formatDateRange(draft.arrival, draft.departure, 'en')} · ${nights} nights`
            ) : (
              <>
                {weeks} {weeks === 1 ? 'week' : 'weeks'} <span className={ui.factMuted}>· no dates yet</span>
              </>
            )}
          </ClickPanel>
        ) : null}

        {group ? (
          <ClickPanel
            label="The group"
            subtitle="Participants and the teachers who come with them"
            icon={<Chip tint="red" icon={ICONS.people} big />}
            className={ui.fact}
            openClassName={ui.factOpen}
            disabled={!editable}
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
            <Chip tint="red" icon={ICONS.people} />
            {draft.participants ? `${draft.participants} participants` : <span className={ui.factWarn}>Participants?</span>}
            {draft.escorts > 0 ? (
              <span className={ui.factMuted}>
                · {draft.escorts} {draft.escorts === 1 ? 'escort' : 'escorts'}
              </span>
            ) : null}
          </ClickPanel>
        ) : null}

        <ClickPanel
          label="Language"
          subtitle="Of the letter"
          icon={<Chip tint="sun" icon={ICONS.language} big />}
          className={ui.fact}
          openClassName={ui.factOpen}
          disabled={!editable}
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
          <Chip tint="sun" icon={ICONS.language} />
          {draft.language === 'de' ? 'Deutsch' : 'English'}
        </ClickPanel>

        <ClickPanel
          label="Valid until"
          subtitle="The date the letter gives"
          icon={<Chip tint="ink" icon={ICONS.hourglass} big />}
          className={ui.fact}
          openClassName={ui.factOpen}
          disabled={!editable}
          body={(close) => (
            <>
              <input aria-label="Valid until" type="date" className={ui.fi} value={draft.validUntil ?? ''} onChange={(e) => update({ validUntil: e.target.value || null })} />
              <div className={ui.inline}>
                {[14, 28, 42].map((days) => (
                  <button
                    key={days}
                    type="button"
                    className={`${ui.btn} ${ui.btnSm}`}
                    onClick={() => {
                      update({ validUntil: addDays(today, days) });
                      close();
                    }}
                  >
                    In {days / 7} weeks
                  </button>
                ))}
              </div>
            </>
          )}
        >
          <Chip tint="ink" icon={ICONS.hourglass} />
          {draft.validUntil ? `Valid until ${formatLetterDate(draft.validUntil, 'en')}` : <span className={ui.factWarn}>No validity</span>}
        </ClickPanel>

        <ClickPanel
          label="Signed by"
          subtitle="Whose name is under the letter"
          icon={<Chip tint="ink" icon={ICONS.pen} big />}
          className={ui.fact}
          openClassName={ui.factOpen}
          disabled={!editable}
          body={(close) => (
            <select
              aria-label="Signed by"
              className={ui.fi}
              value={draft.ownerId ?? ''}
              onChange={(e) => {
                update({ ownerId: e.target.value || null });
                close();
              }}
            >
              <option value="">—</option>
              {options.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        >
          <Chip tint="ink" icon={ICONS.pen} />
          {owner ?? <span className={ui.factWarn}>Not signed</span>}
        </ClickPanel>
      </div>
    </section>
  );
}

function RecipientSummary({ draft, countries }: { draft: OfferDraft; countries: Countries }) {
  const contact = [draft.contactFirstName, draft.contactLastName].filter(Boolean).join(' ');
  const town = draft.address.split('\n').filter(Boolean).pop();
  const country = countries.find((c) => c.code === draft.countryCode)?.de;
  const parts = [draft.recipientName, contact, draft.contactEmail, [town, country].filter(Boolean).join(', ')].filter(Boolean);
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
        <label htmlFor="r-name">{draft.kind === 'group' ? 'Organisation' : 'Name'}</label>
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
              {c.de}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

// ------------------------------------------------------------- packages

function Packages({ draft, update, editable }: { draft: OfferDraft; update: Update; editable: boolean }) {
  const current = draft.stay.choices.package;
  const choose = (slug: PackageSlug) => update((d) => (slug === 'esel' ? asEsel(d) : setChoices(d, { package: slug })));

  return (
    <>
      <div className={ui.sectionTitle}>
        <h2>Package</h2>
        <span>As on the groups page</span>
      </div>
      <div className={ui.pkgs} role="radiogroup" aria-label="Package">
        {GRUPPEN_PACKAGES_BY_STACK.map((p) => {
          const slug = p.slug as PackageSlug;
          const on = current === slug;
          const [colour, tint] = PACKAGE_COLOUR[slug];
          return (
            <button
              key={slug}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!editable}
              className={`${ui.pkg} ${on ? ui.pkgOn : ''}`}
              style={{ ['--pkg' as string]: colour, ['--pkg-tint' as string]: tint }}
              onClick={() => choose(slug)}
            >
              {on ? <span className={ui.pkgCheck}>✓</span> : null}
              <span className={ui.pkgName}>{p.animal.en}</span>
              <span className={ui.pkgDesc}>{p.descriptor.en}</span>
              <span className={ui.pkgPrice}>
                {p.priceFrom != null ? (
                  <>
                    {eur(p.priceFrom)} <small>per person</small>
                  </>
                ) : (
                  <>
                    <small>from</small> {eur(fullBoardBaseTotal(1))} <small>· 1–4 weeks</small>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
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

function Included({
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
  const fixed = group && c.package !== 'esel';
  const escortCol = group && draft.escorts > 0;
  const two = escortCol ? ui.two : '';
  const { nights } = measure(draft);
  const weeks = pricedWeeks(draft);
  const find = (key: string, audience: Audience = 'participant') => lines.find((l) => l.key === key && l.audience === audience) ?? null;
  const activities = activitiesOf(c);
  const pkgLine = find('package');
  const pkg = GRUPPEN_PACKAGES_BY_STACK.find((p) => p.slug === c.package);
  const share = find('escort_share');
  const typed = lines.filter((l) => l.manual);

  const detail: Record<ServiceKey, string> = {
    course: `${weeks * 20} lessons · Mon–Fri 09:00–12:30`,
    materials: 'Workbook and copies, theirs to keep',
    accommodation: `Double room · breakfast and dinner · ${nights} nights`,
    lunch: 'Hot lunch on school days',
    transport: 'Trams and buses for the whole stay',
    programme: activities.length ? `${activities.length} ${activities.length === 1 ? 'afternoon' : 'afternoons'}` : 'No activities chosen',
  };

  const amount: AmountCell = (l, on = true) =>
    !on ? (
      <span className={ui.incOffTag}>Not included</span>
    ) : !l ? (
      <span className={ui.incNone}>—</span>
    ) : l.included ? (
      <span className={ui.incIncl}>Included</span>
    ) : l.amount == null ? (
      <span className={ui.amountMissing}>No price</span>
    ) : (
      <span className={ui.incAmt}>
        {l.listUnitAmount != null && l.unitAmount !== l.listUnitAmount ? <i className={ui.changed} title="Changed from the price list" /> : null}
        {eur(l.amount)}
      </span>
    );

  return (
    <>
      <div className={ui.sectionTitle}>
        <h2>{group ? 'Included' : 'Prices'}</h2>
        <span>{group ? (fixed ? 'Everything the package includes' : 'The blocks the group takes') : 'From the price list'}</span>
      </div>
      <div className={ui.incCard}>
        <div className={`${ui.incHead} ${two}`}>
          <span />
          <span>{group ? 'Per participant' : 'Amount'}</span>
          {escortCol ? <span>Per escort</span> : null}
        </div>

        {fixed && pkgLine ? (
          <ClickPanel
            block
            label={pkg ? `${pkg.animal.en} package` : pkgLine.description}
            subtitle="One price per person for the whole package"
            icon={<Chip tint={PACKAGE_TINT[c.package]} icon={ICONS.package} big />}
            className={`${ui.inc} ${two}`}
            openClassName={ui.incOpen}
            disabled={!editable}
            body={() => <MoneyField label="Price per participant" line={pkgLine} update={update} />}
          >
            <span className={ui.incMain}>
              <Chip tint={PACKAGE_TINT[c.package]} icon={ICONS.package} big />
              <span className={ui.incText}>
                <span className={ui.incName} style={{ display: 'block' }}>
                  {pkg ? `${pkg.animal.en} · ${pkg.descriptor.en}` : pkgLine.description}
                </span>
                <span className={ui.incDetail} style={{ display: 'block' }}>
                  The package price · everything below, for {weeks} {weeks === 1 ? 'week' : 'weeks'}
                </span>
              </span>
            </span>
            {amount(pkgLine)}
            {escortCol ? <span className={ui.incNone}>—</span> : null}
          </ClickPanel>
        ) : null}

        {group
          ? SERVICES.map((s) => {
              if (s.key === 'programme' && fixed && !activities.length) return null;
              const on = s.key === 'programme' ? true : fixed || c.modules[s.key];
              const p = fixed ? find(`inc:${s.key}`) : find(s.key);
              const e = NO_ESCORT.includes(s.key) ? null : find(s.key, 'escort');
              return (
                <ClickPanel
                  key={s.key}
                  block
                  label={s.name}
                  subtitle={fixed ? 'Part of the package' : on ? detail[s.key] : 'Not in this offer'}
                  icon={<Chip tint={s.tint} icon={s.icon} big />}
                  className={`${ui.inc} ${two} ${on ? '' : ui.incOff}`}
                  openClassName={ui.incOpen}
                  disabled={!editable}
                  wide={s.key === 'programme' && !fixed}
                  body={() => <ServiceBody service={s} draft={draft} update={update} fixed={fixed} on={on} participantLine={fixed ? null : p} escortLine={escortCol ? e : null} />}
                  foot={
                    fixed
                      ? () => (
                          <button type="button" className={ui.link} onClick={() => update(asEsel)}>
                            Change it as Esel
                          </button>
                        )
                      : undefined
                  }
                >
                  <span className={ui.incMain}>
                    <Chip tint={s.tint} icon={s.icon} big />
                    <span className={ui.incText}>
                      <span className={ui.incName} style={{ display: 'block' }}>
                        {s.name}
                      </span>
                      <span className={ui.incDetail} style={{ display: 'block' }}>
                        {detail[s.key]}
                      </span>
                      {s.key === 'programme' && activities.length ? (
                        <span className={ui.chips}>
                          {activities.map((id) => {
                            const a = activityById.get(id as never);
                            return a ? (
                              <span key={id} className={`${ui.chip} ${ui[`tint_${ACTIVITY_TINT[a.category]}`]}`}>
                                {a.name}
                              </span>
                            ) : null;
                          })}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {s.key === 'programme' && !activities.length ? <span className={ui.incOffTag}>Choose</span> : amount(p, on)}
                  {escortCol ? amount(e, on) : null}
                </ClickPanel>
              );
            })
          : null}

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
                <span className={ui.incName} style={{ display: 'block' }}>
                  Share of the escorts
                </span>
                <span className={ui.incDetail} style={{ display: 'block' }}>
                  {draft.escorts} {draft.escorts === 1 ? 'escort' : 'escorts'} over {draft.participants} participants
                </span>
              </span>
            </span>
            {amount(share)}
            {escortCol ? <span className={ui.incNone}>—</span> : null}
          </ClickPanel>
        ) : null}

        {typed.map((l) => (
          <TypedRow key={l.key} line={l} draft={draft} update={update} editable={editable} two={two} escortCol={escortCol} chargeTypes={chargeTypes} amount={amount} />
        ))}

        {!group && typed.length === 0 ? <div className={ui.note} style={{ padding: '22px 18px' }}>No lines yet</div> : null}

        {editable ? (
          <div className={ui.incFoot}>
            <AddMenu priceList={priceList} update={update} />
          </div>
        ) : null}
      </div>
    </>
  );
}

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
    const chosen = new Set(activitiesOf(c));
    if (fixed) {
      return (
        <>
          <div className={ui.acts}>
            {[...chosen].map((id) => {
              const a = activityById.get(id as never);
              return a ? (
                <span key={id} className={`${ui.act} ${ui.actOn} ${ui[`tint_${ACTIVITY_TINT[a.category]}`]}`}>
                  {a.name}
                </span>
              ) : null;
            })}
          </div>
          {escortLine ? <MoneyField label="Price per escort" line={escortLine} update={update} /> : null}
        </>
      );
    }
    const toggle = (id: string) =>
      update((d) => {
        const list = d.stay.choices.activities;
        return setChoices(d, { activities: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
      });
    const categories = ['city', 'culture', 'science', 'sport', 'daytrip'] as const;
    return (
      <>
        <div className={ui.fieldNote}>
          {chosen.size} chosen · up to {activityAllowance(weeks)} for {weeks} {weeks === 1 ? 'week' : 'weeks'}
        </div>
        {categories.map((cat) => (
          <div key={cat} className={ui.actGroup}>
            <span>{CATEGORY_LABEL[cat]}</span>
            <div className={ui.acts}>
              {GRUPPEN_ACTIVITIES.filter((a) => a.category === cat).map((a) => {
                const isOn = chosen.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={isOn}
                    className={`${ui.act} ${isOn ? `${ui.actOn} ${ui[`tint_${ACTIVITY_TINT[a.category]}`]}` : ''}`}
                    onClick={() => toggle(a.id)}
                  >
                    {a.name} <small>{eur(a.price)}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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

function TypedRow({
  line,
  draft,
  update,
  editable,
  two,
  escortCol,
  chargeTypes,
  amount,
}: {
  line: OfferLine;
  draft: OfferDraft;
  update: Update;
  editable: boolean;
  two: string;
  escortCol: boolean;
  chargeTypes: EditorOptions['chargeTypes'];
  amount: AmountCell;
}) {
  const manual = draft.stay.manual.find((m) => m.key === line.key);
  return (
    <ClickPanel
      block
      label={line.description || 'New line'}
      subtitle="A line of your own"
      icon={<Chip tint="ink" icon={ICONS.plus} big />}
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
              <label htmlFor={`p-${line.key}`}>Price</label>
              <span className={ui.money}>
                <NumberInput id={`p-${line.key}`} className={ui.fi} value={line.unitAmount} placeholder="0" onCommit={(v) => update((d) => setLinePrice(d, line, v))} />
              </span>
            </div>
          </div>
          <div className={ui.fld}>
            <label htmlFor={`k-${line.key}`}>Kind of cost</label>
            <select
              id={`k-${line.key}`}
              className={ui.fi}
              value={manual?.chargeType ?? 'additional_costs'}
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
        <Chip tint="ink" icon={ICONS.plus} big />
        <span className={ui.incText}>
          <span className={ui.incName} style={{ display: 'block' }}>
            {line.description || <span className={ui.placeholder}>New line</span>}
          </span>
          <span className={ui.incDetail} style={{ display: 'block' }}>
            {line.quantity !== 1 ? `${line.quantity} × ${eur(line.unitAmount)}` : 'Own line'}
          </span>
        </span>
      </span>
      {line.audience === 'participant' ? amount(line) : <span className={ui.incNone}>—</span>}
      {escortCol ? line.audience === 'escort' ? amount(line) : <span className={ui.incNone}>—</span> : null}
    </ClickPanel>
  );
}

function AddMenu({ priceList, update }: { priceList: PriceListItem[]; update: Update }) {
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

  return (
    <div ref={wrap} className={ui.menuWrap} style={{ display: 'inline-block' }}>
      <button type="button" className={ui.add} style={{ margin: 0 }} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        + Add a line
      </button>
      {open ? (
        <div className={ui.menu} role="menu" style={{ left: 0, right: 'auto', top: 'auto', bottom: 'calc(100% + 6px)', width: 320 }}>
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
          <button
            type="button"
            role="menuitem"
            className={ui.menuItem}
            onClick={() => {
              update((d) => addLine(d, { audience: 'participant', chargeType: 'additional_costs', description: '', quantity: 1, unitAmount: null }));
              setOpen(false);
            }}
          >
            Own line
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- price

function PriceCard({ draft, totals }: { draft: OfferDraft; totals: OfferTotals }) {
  const pricing = draft.stay.choices.escortPricing;
  if (draft.kind !== 'group') {
    return (
      <div className={ui.priceCard} style={{ gridTemplateColumns: '1fr' }}>
        <div className={ui.pcMain}>
          <div className={ui.pcKey}>Total</div>
          <div className={ui.pcVal}>{eur(totals.perParticipant)}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={ui.priceCard}>
      <div className={ui.pcMain}>
        <div className={ui.pcKey}>Per participant</div>
        <div className={ui.pcVal}>{eur(totals.perParticipant)}</div>
        {totals.escortShare != null ? <div className={ui.pcSub}>incl. {eur(totals.escortShare)} for the escorts</div> : null}
      </div>
      <div>
        <div className={ui.pcKey}>Per escort</div>
        <div className={ui.pcVal}>{draft.escorts === 0 ? '—' : pricing === 'paid' ? eur(totals.perEscort) : pricing === 'free' ? 'Free' : 'Shared'}</div>
        <div className={ui.pcSub}>
          {draft.escorts === 0
            ? 'No escorts'
            : pricing === 'free'
              ? `CASA carries ${eur(totals.carriedByCasa)}`
              : pricing === 'shared'
                ? `${eur(totals.perEscort)} each, in the price`
                : `${draft.escorts} ${draft.escorts === 1 ? 'escort' : 'escorts'}`}
        </div>
      </div>
      <div>
        <div className={ui.pcKey}>The group</div>
        <div className={ui.pcVal}>{eur(totals.groupTotal)}</div>
        <div className={ui.pcSub}>
          {draft.participants ? `${draft.participants} × ${eur(totals.perParticipant)}` : 'Participants missing'}
          {pricing === 'paid' && draft.escorts && totals.perEscort != null ? ` + ${draft.escorts} × ${eur(totals.perEscort)}` : ''}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- history

function History({ record }: { record: OfferRecord }) {
  const { meta } = record;
  return (
    <div className={ui.history}>
      <div className={ui.historyRow}>
        <span>
          Created {day(meta.createdAt)}
          {meta.createdByName ? ` by ${meta.createdByName}` : ''}
        </span>
        {meta.enquiryId ? (
          <span>
            · from <Link href={`/admin/enquiries/${meta.enquiryId}`}>an enquiry</Link>
          </span>
        ) : null}
        {meta.personId ? (
          <span>
            · for <Link href={`/admin/people/${meta.personId}`}>a student</Link>
          </span>
        ) : null}
        {meta.copiedFrom ? (
          <span>
            · copy of <Link href={`/admin/offers/${meta.copiedFrom}`}>an earlier offer</Link>
          </span>
        ) : null}
      </div>
      {record.versions.length ? (
        <div className={ui.historyRow}>
          {record.versions.map((v) => (
            <span key={v.version}>
              <Link href={`/admin/offers/${meta.id}/letter?version=${v.version}`}>Version {v.version}</Link> sent {day(v.sentAt)}
              {v.sentByName ? ` by ${v.sentByName}` : ''}
            </span>
          ))}
          {meta.decidedAt ? (
            <span>
              · {OFFER_STATUS_LABELS[meta.status].toLowerCase()} {day(meta.decidedAt)}
              {meta.decisionNote ? `: ${meta.decisionNote}` : ''}
            </span>
          ) : null}
        </div>
      ) : null}
      {record.related.length ? (
        <div className={ui.historyRow}>
          <span>Earlier offers to {record.draft.recipientName}:</span>
          {record.related.map((r) => (
            <Link key={r.id} href={`/admin/offers/${r.id}`}>
              {r.number}
              {r.perParticipant != null ? ` (${eur(r.perParticipant)})` : ''}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
