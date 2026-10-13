'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { buildLetter, formatDateRange, formatLetterDate, formatMoney } from '@/lib/admin/offers/document';
import { addLine, moveLineTo, removeLine, resetLine, setChoices, setLinePrice, setLineQuantity, setLineText } from '@/lib/admin/offers/draft-ops';
import { measure, type GroupRateCard } from '@/lib/admin/offers/engine';
import { hasProblems } from '@/lib/admin/offers/checks';
import type { EditorOptions, OfferRecord, PriceListItem, StandardTexts } from '@/lib/admin/offers/repo';
import { addDays } from '@/lib/admin/offers/stay';
import {
  ESCORT_PRICING_LABELS,
  OFFER_STATUS_LABELS,
  type Audience,
  type EscortPricing,
  type OfferDraft,
  type OfferLine,
  type OfferTotals,
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

/**
 * The offer — what it is, for whom, and what it costs — as a calm page of
 * plain values. A click on a value opens a small panel to change it; the
 * letter is the other tab. docs/OFFERS.md §Design.
 */
export function OfferPage({
  record,
  card,
  options,
  priceList,
  texts,
  today,
  canWrite,
  canDelete,
  notice,
}: {
  record: OfferRecord;
  card: GroupRateCard;
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
    initialCard: card,
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
      <main className={ui.page}>
        {od.saveState === 'stale' ? (
          <div className={ui.banner}>
            A colleague has changed this offer in the meantime. The last change is not saved.
            <span style={{ flex: 1 }} />
            <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        ) : null}

        {editable ? (
          <input
            aria-label="Name of the offer"
            className={ui.titleInput}
            value={draft.groupName}
            placeholder={draft.recipientName || 'Name this offer'}
            onChange={(e) => update({ groupName: e.target.value })}
          />
        ) : (
          <h1 className={ui.pageTitle}>{name}</h1>
        )}
        <div className={ui.subtitle}>
          <ClickPanel label="Recipient" disabled={!editable} width={400} panel={() => <RecipientFields draft={draft} update={update} countries={options.countries} />}>
            <RecipientSummary draft={draft} countries={options.countries} />
          </ClickPanel>
        </div>

        <Properties draft={draft} update={update} editable={editable} staff={options.staff} today={today} />

        <Included draft={draft} update={update} editable={editable} lines={lines} priceList={priceList} chargeTypes={options.chargeTypes} />

        <Totals draft={draft} totals={totals} />

        {meta.status === 'draft' ? (
          problems.length ? (
            <div className={ui.checks} aria-label="Checks">
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
            <>
              <div className={ui.ready}>
                <i>✓</i> Ready to send
              </div>
              {hints.length ? (
                <div className={ui.checks} aria-label="Checks" style={{ marginTop: 12 }}>
                  {hints.map((c, i) => (
                    <div key={`h${i}`} className={`${ui.check} ${ui.checkHint}`}>
                      <i className={ui.dotHint} />
                      {c.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )
        ) : null}

        <History record={record} />
      </main>
      <PrintCopy letter={letter} />
    </OfferFrame>
  );
}

// ------------------------------------------------------------ recipient

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
      <div>
        <label className={ui.lbl} htmlFor="r-name">
          {draft.kind === 'group' ? 'Organisation' : 'Name'}
        </label>
        <input id="r-name" className={ui.input} value={draft.recipientName} onChange={(e) => update({ recipientName: e.target.value })} />
      </div>
      <div>
        <span className={ui.lbl}>Contact</span>
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
        <div>
          <label className={ui.lbl} htmlFor="r-first">
            First name
          </label>
          <input id="r-first" className={ui.input} value={draft.contactFirstName} onChange={(e) => update({ contactFirstName: e.target.value })} />
        </div>
        <div>
          <label className={ui.lbl} htmlFor="r-last">
            Last name
          </label>
          <input id="r-last" className={ui.input} value={draft.contactLastName} onChange={(e) => update({ contactLastName: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={ui.lbl} htmlFor="r-email">
          Email
        </label>
        <input id="r-email" type="email" className={ui.input} value={draft.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} />
      </div>
      <div>
        <label className={ui.lbl} htmlFor="r-address">
          Address
        </label>
        <textarea id="r-address" rows={2} className={ui.textarea} value={draft.address} onChange={(e) => update({ address: e.target.value })} />
      </div>
      <div>
        <label className={ui.lbl} htmlFor="r-country">
          Country
        </label>
        <select id="r-country" className={ui.sel} value={draft.countryCode ?? ''} onChange={(e) => update({ countryCode: e.target.value || null })}>
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

// ----------------------------------------------------------- properties

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className={ui.propKey}>{label}</div>
      <div className={ui.propVal}>{children}</div>
    </>
  );
}

function Properties({ draft, update, editable, staff, today }: { draft: OfferDraft; update: Update; editable: boolean; staff: { id: string; name: string }[]; today: string }) {
  const group = draft.kind === 'group';
  const { nights, weeks, fromDates } = measure(draft);
  const c = draft.stay.choices;
  const set = (patch: Partial<StayChoices>) => update((d) => setChoices(d, patch));
  const owner = staff.find((s) => s.id === draft.ownerId)?.name;

  return (
    <div className={ui.props}>
      {group ? (
        <Prop label="Dates">
          <ClickPanel
            label="Dates"
            disabled={!editable}
            panel={() => (
              <>
                <div className={ui.row2}>
                  <div>
                    <label className={ui.lbl} htmlFor="d-arrival">
                      Arrival
                    </label>
                    <input id="d-arrival" aria-label="Arrival" type="date" className={ui.input} value={draft.arrival ?? ''} onChange={(e) => update({ arrival: e.target.value || null })} />
                  </div>
                  <div>
                    <label className={ui.lbl} htmlFor="d-departure">
                      Departure
                    </label>
                    <input
                      id="d-departure"
                      aria-label="Departure"
                      type="date"
                      className={ui.input}
                      value={draft.departure ?? ''}
                      min={draft.arrival ?? undefined}
                      onChange={(e) => update({ departure: e.target.value || null })}
                    />
                  </div>
                </div>
                {!fromDates ? (
                  <div className={ui.inline}>
                    <Stepper label="Weeks" value={c.weeks} min={1} max={52} onChange={(v) => set({ weeks: v ?? 1 })} />
                    <span className={ui.note}>weeks, until there are dates</span>
                  </div>
                ) : null}
              </>
            )}
          >
            {fromDates && draft.arrival && draft.departure ? (
              `${formatDateRange(draft.arrival, draft.departure, 'en')} · ${nights} nights`
            ) : (
              <>
                {weeks} {weeks === 1 ? 'week' : 'weeks'} <span className={ui.placeholder}>· no dates yet</span>
              </>
            )}
          </ClickPanel>
        </Prop>
      ) : null}

      {group ? (
        <Prop label="Group">
          <ClickPanel
            label="Group"
            disabled={!editable}
            panel={() => (
              <>
                <div className={ui.inline}>
                  <Stepper label="Participants" value={draft.participants} min={1} max={500} onChange={(v) => update({ participants: v })} />
                  <span className={ui.note}>participants</span>
                </div>
                <div className={ui.inline}>
                  <Stepper label="Escorts" value={draft.escorts} min={0} max={50} onChange={(v) => update({ escorts: v ?? 0 })} />
                  <span className={ui.note}>escorts (teachers, group leaders)</span>
                </div>
                {draft.escorts > 0 ? (
                  <div>
                    <span className={ui.lbl}>The escorts</span>
                    <Seg<EscortPricing>
                      label="How escorts are charged"
                      value={c.escortPricing}
                      options={(['paid', 'free', 'shared'] as const).map((k) => [k, ESCORT_PRICING_LABELS[k]] as const)}
                      onChange={(v) => set({ escortPricing: v })}
                    />
                  </div>
                ) : null}
              </>
            )}
          >
            {draft.participants ? `${draft.participants} participants` : <span className={ui.placeholder}>How many participants?</span>}
            {draft.escorts > 0 ? ` · ${draft.escorts} ${draft.escorts === 1 ? 'escort' : 'escorts'}, ${ESCORT_PRICING_LABELS[c.escortPricing].toLowerCase()}` : ''}
          </ClickPanel>
        </Prop>
      ) : null}

      <Prop label="Language">
        <ClickPanel
          label="Language of the offer"
          disabled={!editable}
          width={280}
          panel={(close) => (
            <Seg
              label="Language"
              value={draft.language}
              options={[
                ['de', 'Deutsch'],
                ['en', 'English'],
              ]}
              onChange={(v) => {
                update({ language: v });
                close();
              }}
            />
          )}
        >
          {draft.language === 'de' ? 'Deutsch' : 'English'}
        </ClickPanel>
      </Prop>

      <Prop label="Valid until">
        <ClickPanel
          label="Valid until"
          disabled={!editable}
          width={320}
          panel={(close) => (
            <>
              <input aria-label="Valid until" type="date" className={ui.input} value={draft.validUntil ?? ''} onChange={(e) => update({ validUntil: e.target.value || null })} />
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
                    {days / 7} weeks
                  </button>
                ))}
              </div>
            </>
          )}
        >
          {draft.validUntil ? formatLetterDate(draft.validUntil, 'en') : <span className={ui.placeholder}>Not set</span>}
        </ClickPanel>
      </Prop>

      <Prop label="Signed by">
        <ClickPanel
          label="Signed by"
          disabled={!editable}
          width={280}
          panel={(close) => (
            <select
              aria-label="Signed by"
              className={ui.sel}
              value={draft.ownerId ?? ''}
              onChange={(e) => {
                update({ ownerId: e.target.value || null });
                close();
              }}
            >
              <option value="">—</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        >
          {owner ?? <span className={ui.placeholder}>Nobody</span>}
        </ClickPanel>
      </Prop>
    </div>
  );
}

// ------------------------------------------------------------- included

type ServiceKey = 'tuition' | 'accommodation' | 'canteen' | 'transit' | 'culture' | 'materials' | 'handling';
type Service = { key: ServiceKey; name: string; on: boolean; toggle: (v: boolean) => void; detail: string; options?: ReactNode };

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
  const escortCol = group && draft.escorts > 0;
  const set = (patch: Partial<StayChoices>) => update((d) => setChoices(d, patch));
  const { weeks, nights, courseWeeks } = measure(draft);
  const find = (key: string, audience: Audience) => lines.find((l) => l.key === key && l.audience === audience) ?? null;
  const mix = find('transit', 'participant')?.description.split(': ')[1] ?? '';

  const services: Service[] = group
    ? [
        {
          key: 'tuition',
          name: 'German course',
          on: c.course,
          toggle: (v) => set({ course: v }),
          detail: `${c.lessonsPerWeek} lessons a week · ${courseWeeks} ${courseWeeks === 1 ? 'week' : 'weeks'}`,
          options: (
            <>
              <div className={ui.inline}>
                <Stepper label="Lessons a week" value={c.lessonsPerWeek} min={1} max={60} onChange={(v) => set({ lessonsPerWeek: v ?? 20 })} />
                <span className={ui.note}>lessons a week</span>
              </div>
              <div className={ui.inline}>
                <Stepper label="Course weeks" value={c.courseWeeks} placeholder={String(weeks)} min={1} max={52} onChange={(v) => set({ courseWeeks: v })} />
                <span className={ui.note}>weeks of course</span>
              </div>
            </>
          ),
        },
        {
          key: 'accommodation',
          name: 'Host family',
          on: c.accommodation,
          toggle: (v) => set({ accommodation: v }),
          detail: `${c.room === 'double' ? 'double room' : 'single room'} · half board · ${nights} nights`,
          options: (
            <>
              <div>
                <span className={ui.lbl}>Participants</span>
                <Seg
                  label="Room"
                  value={c.room}
                  options={[
                    ['double', 'Double room'],
                    ['single', 'Single room'],
                  ]}
                  onChange={(v) => set({ room: v })}
                />
              </div>
              {escortCol ? (
                <div>
                  <span className={ui.lbl}>Escorts</span>
                  <Seg
                    label="Escorts' room"
                    value={c.escortRoom}
                    options={[
                      ['single', 'Single room'],
                      ['double', 'Double room'],
                    ]}
                    onChange={(v) => set({ escortRoom: v })}
                  />
                </div>
              ) : null}
            </>
          ),
        },
        { key: 'canteen', name: 'Lunch at the canteen', on: c.canteen, toggle: (v) => set({ canteen: v }), detail: 'on course days' },
        {
          key: 'transit',
          name: 'Public transport',
          on: c.transit,
          toggle: (v) => set({ transit: v }),
          detail: [mix, c.fare === 'student' ? "pupils' fare" : 'adult fare'].filter(Boolean).join(' · '),
          options: (
            <Seg
              label="Fare"
              value={c.fare}
              options={[
                ['student', "Pupils' fare"],
                ['adult', 'Adult fare'],
              ]}
              onChange={(v) => set({ fare: v })}
            />
          ),
        },
        {
          key: 'culture',
          name: 'Culture programme',
          on: c.culture !== 'none',
          toggle: (v) => set({ culture: v ? 'medium' : 'none' }),
          detail: c.culture === 'none' ? '' : `${c.culture} programme`,
          options:
            c.culture !== 'none' ? (
              <Seg
                label="Size of the programme"
                value={c.culture}
                options={[
                  ['small', 'Small'],
                  ['medium', 'Medium'],
                  ['large', 'Large'],
                ]}
                onChange={(v) => set({ culture: v })}
              />
            ) : null,
        },
        { key: 'materials', name: 'Learning material', on: c.materials && c.course, toggle: (v) => set({ materials: v, ...(v ? { course: true } : {}) }), detail: '' },
        { key: 'handling', name: 'Handling fee', on: c.handling, toggle: (v) => set({ handling: v }), detail: '' },
      ]
    : [];

  const on = services.filter((s) => s.on);
  const off = services.filter((s) => !s.on);
  const typed = lines.filter((l) => l.manual);
  const share = find('escort_share', 'participant');
  const cols = escortCol ? `${ui.twoCol}` : '';

  const amountCell = (line: OfferLine | null, show = true) =>
    !show || !line ? (
      <span className={ui.amountMute}>—</span>
    ) : line.amount == null ? (
      <span className={ui.amountMissing}>No price</span>
    ) : (
      <span className={ui.amount}>
        {line.listUnitAmount != null && line.unitAmount !== line.listUnitAmount ? <i className={ui.changed} title="Changed from the price list" /> : null}
        {eur(line.amount)}
      </span>
    );

  return (
    <section className={ui.section} aria-label="Included">
      <div className={`${ui.sectionHead} ${cols}`}>
        <h2>{group ? 'Included' : 'Prices'}</h2>
        <span>{group ? 'per person' : 'amount'}</span>
        {escortCol ? <span>per escort</span> : null}
      </div>

      {on.map((s) => {
        const p = find(s.key, 'participant');
        const e = find(s.key, 'escort');
        const escortShown = s.key !== 'tuition' && s.key !== 'materials';
        return (
          <div key={s.key}>
            <ClickPanel
              as="row"
              className={`${ui.item} ${cols}`}
              label={s.name}
              disabled={!editable}
              align="left"
              width={380}
              panel={(close) => (
                <>
                  {s.options}
                  {p ? <PriceField label={escortCol ? 'Price per participant' : 'Price per person'} line={p} update={update} /> : null}
                  {escortCol && escortShown && e ? <PriceField label="Price per escort" line={e} update={update} /> : null}
                  <div className={ui.panelFoot}>
                    <button
                      type="button"
                      className={ui.link}
                      style={{ color: 'var(--o-red)' }}
                      onClick={() => {
                        s.toggle(false);
                        close();
                      }}
                    >
                      Remove from the offer
                    </button>
                  </div>
                </>
              )}
            >
              <span>
                <span className={ui.itemName}>{s.name}</span>
                {s.detail ? <span className={ui.itemDetail}> · {s.detail}</span> : null}
              </span>
              {amountCell(p)}
              {escortCol ? amountCell(e, escortShown) : null}
            </ClickPanel>
          </div>
        );
      })}

      {share ? (
        <ClickPanel
          as="row"
          className={`${ui.item} ${cols}`}
          label="Share of the escorts"
          disabled={!editable}
          width={360}
          panel={() => <PriceField label="Per participant" line={share} update={update} />}
        >
          <span>
            <span className={ui.itemName}>Share of the escorts</span>
            <span className={ui.itemDetail}> · their costs over {draft.participants} participants, rounded up</span>
          </span>
          {amountCell(share)}
          {escortCol ? <span className={ui.amountMute}>—</span> : null}
        </ClickPanel>
      ) : null}

      {typed.map((line) => {
        const manual = draft.stay.manual.find((m) => m.key === line.key);
        return (
          <ClickPanel
            key={line.key}
            as="row"
            className={`${ui.item} ${cols}`}
            label="Line"
            disabled={!editable}
            width={400}
            panel={(close) => (
              <>
                <div>
                  <label className={ui.lbl} htmlFor={`t-${line.key}`}>
                    Text on the offer
                  </label>
                  <input id={`t-${line.key}`} className={ui.input} value={line.description} autoFocus={!line.description} onChange={(e) => update((d) => setLineText(d, line, e.target.value))} />
                </div>
                <div className={ui.row2}>
                  <div>
                    <label className={ui.lbl} htmlFor={`q-${line.key}`}>
                      Quantity
                    </label>
                    <NumberInput id={`q-${line.key}`} className={ui.input} value={line.quantity} onCommit={(q) => update((d) => setLineQuantity(d, line.key, q ?? 1))} />
                  </div>
                  <div>
                    <label className={ui.lbl} htmlFor={`p-${line.key}`}>
                      Price
                    </label>
                    <NumberInput id={`p-${line.key}`} className={ui.input} value={line.unitAmount} placeholder="€" onCommit={(v) => update((d) => setLinePrice(d, line, v))} />
                  </div>
                </div>
                <div>
                  <label className={ui.lbl} htmlFor={`k-${line.key}`}>
                    Kind of cost
                  </label>
                  <select
                    id={`k-${line.key}`}
                    className={ui.sel}
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
                  <div>
                    <span className={ui.lbl}>Paid by</span>
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
                <div className={ui.panelFoot}>
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
                </div>
              </>
            )}
          >
            <span>
              <span className={ui.itemName}>{line.description || <span className={ui.placeholder}>New line</span>}</span>
              {line.quantity !== 1 ? <span className={ui.itemDetail}> · {line.quantity} ×</span> : null}
            </span>
            {line.audience === 'participant' ? amountCell(line) : <span className={ui.amountMute}>—</span>}
            {escortCol ? line.audience === 'escort' ? amountCell(line) : <span className={ui.amountMute}>—</span> : null}
          </ClickPanel>
        );
      })}

      {group && on.length === 0 && typed.length === 0 ? <div className={ui.note} style={{ padding: '14px 0' }}>Nothing included yet.</div> : null}
      {!group && typed.length === 0 ? <div className={ui.note} style={{ padding: '14px 0' }}>No lines yet.</div> : null}

      {editable ? <AddMenu off={off} priceList={priceList} update={update} /> : null}
    </section>
  );
}

function PriceField({ label, line, update }: { label: string; line: OfferLine; update: Update }) {
  const changed = line.listUnitAmount != null && line.unitAmount !== line.listUnitAmount;
  const per = line.quantity !== 1 ? ` × ${line.quantity}` : '';
  return (
    <div>
      <span className={ui.lbl}>{label}</span>
      <div className={ui.priceField}>
        <NumberInput ariaLabel={`${label}: ${line.description}`} className={ui.input} value={line.unitAmount} placeholder="€" onCommit={(v) => update((d) => setLinePrice(d, line, v))} />
        <span className={ui.listPrice}>
          €{per}
          {line.listUnitAmount != null ? (changed ? ` · list ${eur(line.listUnitAmount)}` : ' · from the price list') : ' · no list price'}
        </span>
        {changed ? (
          <button type="button" className={ui.link} onClick={() => update((d) => resetLine(d, line))}>
            Use the list price
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AddMenu({ off, priceList, update }: { off: Service[]; priceList: PriceListItem[]; update: Update }) {
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
      <button type="button" className={ui.add} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        + Add
      </button>
      {open ? (
        <div className={ui.menu} role="menu" style={{ left: 0, right: 'auto', width: 300 }}>
          {off.map((s) => (
            <button
              key={s.key}
              type="button"
              role="menuitem"
              className={ui.menuItem}
              onClick={() => {
                s.toggle(true);
                setOpen(false);
              }}
            >
              {s.name}
            </button>
          ))}
          {off.length ? <div className={ui.menuRule} /> : null}
          <div style={{ padding: '4px 4px 6px' }}>
            <select
              aria-label="From the price list"
              className={ui.sel}
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

// --------------------------------------------------------------- totals

function Totals({ draft, totals }: { draft: OfferDraft; totals: OfferTotals }) {
  const group = draft.kind === 'group';
  const pricing = draft.stay.choices.escortPricing;
  if (!group) {
    return (
      <div className={ui.totals}>
        <div className={`${ui.totalRow} ${ui.totalBig}`}>
          <span>Total</span>
          <span>{eur(totals.perParticipant)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={ui.totals}>
      <div className={ui.totalRow}>
        <span>Per person</span>
        <span>{eur(totals.perParticipant)}</span>
      </div>
      {draft.escorts > 0 ? (
        <div className={ui.totalRow}>
          <span>
            Per escort
            <small>{pricing === 'paid' ? 'They pay their own' : pricing === 'free' ? `Free · CASA carries ${eur(totals.carriedByCasa)}` : 'Shared by the group'}</small>
          </span>
          <span>{pricing === 'paid' ? eur(totals.perEscort) : '—'}</span>
        </div>
      ) : null}
      <div className={`${ui.totalRow} ${ui.totalBig}`}>
        <span>
          The group
          <small>
            {draft.participants ? `${draft.participants} × ${eur(totals.perParticipant)}` : 'Participants missing'}
            {pricing === 'paid' && draft.escorts && totals.perEscort != null ? ` + ${draft.escorts} × ${eur(totals.perEscort)}` : ''}
          </small>
        </span>
        <span>{eur(totals.groupTotal)}</span>
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
