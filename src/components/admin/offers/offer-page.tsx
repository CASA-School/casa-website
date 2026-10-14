'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { GRUPPEN_ACTIVITIES, GRUPPEN_PACKAGES_BY_STACK, activityById, fullBoardBaseTotal, type GruppenActivity } from '@/config/gruppen/packages';
import { useWsLang } from '@/components/admin/lang';
import { LetterSheet } from '@/components/admin/letters/letter-sheet';
import { pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
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
const ESCORT_SHORT: Record<EscortPricing, Bilingual> = {
  paid: { de: 'zahlend', en: 'paying' },
  free: { de: 'kostenfrei', en: 'free' },
  shared: { de: 'geteilt', en: 'shared' },
};
const ACTIVITY_TINT: Record<GruppenActivity['category'], Tint> = { city: 'blue', culture: 'red', science: 'sun', sport: 'ink', daytrip: 'ink' };
const CATEGORY_LABEL: Record<GruppenActivity['category'], Bilingual> = {
  city: { de: 'In der Stadt', en: 'In the city' },
  culture: { de: 'Kultur und Geschichte', en: 'Culture and history' },
  science: { de: 'Wissenschaft und Natur', en: 'Science and nature' },
  sport: { de: 'Sport', en: 'Sport' },
  daytrip: { de: 'Tagesausflüge', en: 'Day trips' },
};
const weeksWord = (t: T, n: number) => (n === 1 ? t('Woche', 'week') : t('Wochen', 'weeks'));
const escortsWord = (t: T, n: number) => (n === 1 ? t('Begleitperson', 'escort') : t('Begleitpersonen', 'escorts'));
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
  // `lang` below is the letter's own language, chosen per offer; `t` and `wsLang` are the workspace's.
  const { t, lang: wsLang } = useWsLang();
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
  const status = saveLabel(od.saveState, od.saveError, editable, t);

  return (
    <OfferFrame
      back={{ href: '/admin/offers', label: t('Angebote', 'Offers'), before: od.flush }}
      title={name}
      subtitle={`${meta.number} · ${pick(wsLang, OFFER_STATUS_LABELS[meta.status])}`}
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
            extra={[{ label: t('Drucken / PDF', 'Print / PDF'), onSelect: print }]}
            send={{
              canSend: !hasProblems(checks) && od.saveState !== 'stale',
              busy: od.saveState === 'dirty' || od.saveState === 'saving',
              problems: problems.map((p) => pick(wsLang, p.message)),
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
            {t(
              'Jemand aus dem Team hat dieses Angebot inzwischen geändert. Die letzte Änderung ist nicht gespeichert.',
              'A colleague has changed this offer in the meantime. The last change is not saved.'
            )}
            <span style={{ flex: 1 }} />
            <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => window.location.reload()}>
              {t('Neu laden', 'Reload')}
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

          <aside className={ui.aside} aria-label={t('Zusammenfassung', 'Summary')}>
            <PriceCard draft={draft} totals={totals} />
            {meta.status === 'draft' ? <ChecksCard checks={checks} /> : null}
            <section className={ui.card} aria-label={t('Brief', 'Letter')}>
              <a
                href={`/admin/offers/${meta.id}/letter`}
                className={ui.thumb}
                aria-label={t('Brief öffnen', 'Open the letter')}
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
                  {lang === 'de' ? 'Deutsch' : 'English'} ·{' '}
                  {draft.presentation === 'package' ? t('ein Preis pro Person', 'one price per person') : t('jede Zeile mit Preis', 'every line priced')}
                </span>
                <button type="button" className={ui.link} onClick={() => void openLetter()}>
                  {t('Brief öffnen →', 'Open the letter →')}
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
  const { t, lang } = useWsLang();
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
              aria-label={t('Name des Angebots', 'Name of the offer')}
              className={ui.titleInput}
              value={draft.groupName}
              placeholder={draft.recipientName || t('Gib dem Angebot einen Namen', 'Name this offer')}
              onChange={(e) => update({ groupName: e.target.value })}
            />
          ) : (
            <h1 className={ui.pageTitle}>{draft.groupName || draft.recipientName}</h1>
          )}
          <div className={ui.subtitle}>
            <ClickPanel
              label={t('Empfänger', 'Recipient')}
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
        <span className={`${ui.pill} ${ui[`pill_${status}`]}`}>{pick(lang, OFFER_STATUS_LABELS[status])}</span>
      </div>

      <div className={`${ui.specs} ${group ? '' : ui.specs3}`}>
        {group ? (
          <ClickPanel
            {...panel}
            label={t('Daten', 'Dates')}
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
                    <span>{t('Wochen, bis es Daten gibt', 'Weeks, until there are dates')}</span>
                    <Stepper label={t('Wochen', 'Weeks')} value={c.weeks} min={1} max={c.package === 'esel' ? 4 : 52} onChange={(v) => update((d) => setChoices(d, { weeks: v ?? 1 }))} />
                  </div>
                ) : null}
              </>
            )}
          >
            <Spec
              tint="blue"
              icon={ICONS.calendar}
              label={t('Daten', 'Dates')}
              value={fromDates && draft.arrival && draft.departure ? formatDateRange(draft.arrival, draft.departure, lang) : `${weeks} ${weeksWord(t, weeks)}`}
              sub={
                fromDates
                  ? `${t(`${nights} ${nights === 1 ? 'Nacht' : 'Nächte'}`, `${nights} nights`)} · ${weeks} ${weeksWord(t, weeks)}`
                  : t('Noch keine Daten', 'No dates yet')
              }
            />
          </ClickPanel>
        ) : null}

        {group ? (
          <ClickPanel
            {...panel}
            label={t('Die Gruppe', 'The group')}
            icon={<Chip tint="red" icon={ICONS.people} big />}
            triggerId={FIX.participants}
            wide
            body={() => (
              <>
                <div className={ui.row2}>
                  <div className={ui.fld}>
                    <span>{t('Teilnehmende', 'Participants')}</span>
                    <Stepper label={t('Teilnehmende', 'Participants')} value={draft.participants} min={1} max={500} onChange={(v) => update({ participants: v })} />
                  </div>
                  <div className={ui.fld}>
                    <span>{t('Begleitpersonen', 'Escorts')}</span>
                    <Stepper label={t('Begleitpersonen', 'Escorts')} value={draft.escorts} min={0} max={50} onChange={(v) => update({ escorts: v ?? 0 })} />
                  </div>
                </div>
                {draft.escorts > 0 ? (
                  <div className={ui.fld}>
                    <span>{t('Die Begleitpersonen', 'The escorts')}</span>
                    <div className={ui.choiceGrid}>
                      {(['paid', 'free', 'shared'] as const).map((k: EscortPricing) => (
                        <button
                          key={k}
                          type="button"
                          className={`${ui.choiceCard} ${c.escortPricing === k ? ui.choiceOn : ''}`}
                          aria-pressed={c.escortPricing === k}
                          onClick={() => update((d) => setChoices(d, { escortPricing: k }))}
                        >
                          <b>{pick(lang, ESCORT_PRICING_LABELS[k])}</b>
                          <span>
                            {k === 'paid'
                              ? t('Ihr eigener Preis', 'Their own price')
                              : k === 'free'
                                ? t('CASA trägt sie', 'CASA carries them')
                                : t('Im Preis pro Person', 'In the price per person')}
                          </span>
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
              label={t('Die Gruppe', 'The group')}
              warn={!draft.participants}
              value={draft.participants ? t(`${draft.participants} Teilnehmende`, `${draft.participants} participants`) : t('Teilnehmende?', 'Participants?')}
              sub={
                draft.escorts
                  ? `${draft.escorts} ${escortsWord(t, draft.escorts)}, ${pick(lang, ESCORT_SHORT[c.escortPricing])}`
                  : t('Keine Begleitpersonen', 'No escorts')
              }
            />
          </ClickPanel>
        ) : null}

        <ClickPanel
          {...panel}
          label={t('Sprache', 'Language')}
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
          <Spec tint="sun" icon={ICONS.language} label={t('Sprache', 'Language')} value={draft.language === 'de' ? 'Deutsch' : 'English'} sub={null} />
        </ClickPanel>

        <ClickPanel
          {...panel}
          label={t('Gültig bis', 'Valid until')}
          icon={<Chip tint="ink" icon={ICONS.hourglass} big />}
          triggerId={FIX.validity}
          body={() => (
            <InlineDatePicker
              ariaLabel={t('Gültig bis', 'Valid until')}
              value={draft.validUntil}
              today={today}
              min={today}
              onChange={(v) => update({ validUntil: v })}
              quick={[
                ...[14, 28, 42].map((days) => ({ label: t(`${days / 7} Wochen`, `${days / 7} weeks`), value: addDays(today, days) })),
                ...(draft.arrival && addDays(draft.arrival, -42) > today
                  ? [{ label: t('6 Wochen vor der Anreise', '6 weeks before arrival'), value: addDays(draft.arrival, -42) }]
                  : []),
              ]}
            />
          )}
        >
          <Spec
            tint="ink"
            icon={ICONS.hourglass}
            label={t('Gültig bis', 'Valid until')}
            warn={validIn == null || validIn < 0}
            value={draft.validUntil ? formatLetterDate(draft.validUntil, lang) : t('Kein Datum', 'No date')}
            sub={
              validIn == null
                ? t('Der Brief nennt keins', 'The letter gives none')
                : validIn < 0
                  ? t('Vorbei', 'Passed')
                  : validIn === 0
                    ? t('Heute', 'Today')
                    : t(`In ${validIn} ${validIn === 1 ? 'Tag' : 'Tagen'}`, `In ${validIn} ${validIn === 1 ? 'day' : 'days'}`)
            }
          />
        </ClickPanel>

        <ClickPanel
          {...panel}
          label={t('Unterschrieben von', 'Signed by')}
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
          <Spec tint="ink" icon={ICONS.pen} label={t('Unterschrieben von', 'Signed by')} warn={!owner} value={owner ?? t('Niemand', 'Nobody')} sub={null} />
        </ClickPanel>
      </div>
    </section>
  );
}

function RecipientSummary({ draft, countries }: { draft: OfferDraft; countries: Countries }) {
  const { t, lang } = useWsLang();
  const contact = [draft.contactFirstName, draft.contactLastName].filter(Boolean).join(' ');
  const town = draft.address.split('\n').filter(Boolean).pop();
  const country = countries.find((c) => c.code === draft.countryCode)?.[lang];
  const parts = [draft.recipientName, contact === draft.recipientName ? '' : contact, draft.contactEmail, [town, country].filter(Boolean).join(', ')].filter(Boolean);
  return (
    <span>
      {parts.join(' · ') || <span className={ui.placeholder}>{t('Für wen ist es?', 'Who is it for?')}</span>}
      {!draft.contactEmail ? (
        <span className={ui.missing}>
          {parts.length ? ' · ' : ''}
          {t('Kontakt und E-Mail ergänzen', 'Add contact and email')}
        </span>
      ) : null}
    </span>
  );
}

export function RecipientFields({ draft, update, countries }: { draft: OfferDraft; update: Update; countries: Countries }) {
  const { t, lang } = useWsLang();
  return (
    <>
      <div className={ui.fld}>
        <label htmlFor="r-name">{draft.kind === 'group' || draft.organisationId ? t('Organisation', 'Organisation') : t('Name', 'Name')}</label>
        <input id="r-name" className={ui.fi} value={draft.recipientName} onChange={(e) => update({ recipientName: e.target.value })} />
      </div>
      <div className={ui.fld}>
        <span>{t('Kontakt', 'Contact')}</span>
        <Seg
          label={t('Anrede', 'Salutation')}
          value={draft.contactSalutation}
          options={[
            ['ms', t('Frau', 'Ms')],
            ['mr', t('Herr', 'Mr')],
            ['none', t('Keine', 'None')],
          ]}
          onChange={(v) => update({ contactSalutation: v })}
        />
      </div>
      <div className={ui.row2}>
        <div className={ui.fld}>
          <label htmlFor="r-first">{t('Vorname', 'First name')}</label>
          <input id="r-first" className={ui.fi} value={draft.contactFirstName} onChange={(e) => update({ contactFirstName: e.target.value })} />
        </div>
        <div className={ui.fld}>
          <label htmlFor="r-last">{t('Nachname', 'Last name')}</label>
          <input id="r-last" className={ui.fi} value={draft.contactLastName} onChange={(e) => update({ contactLastName: e.target.value })} />
        </div>
      </div>
      <div className={ui.fld}>
        <label htmlFor="r-email">{t('E-Mail', 'Email')}</label>
        <input id="r-email" type="email" className={ui.fi} value={draft.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} />
      </div>
      <div className={ui.fld}>
        <label htmlFor="r-address">{t('Adresse', 'Address')}</label>
        <textarea
          id="r-address"
          rows={2}
          className={ui.fi}
          value={draft.address}
          placeholder={t('Straße und Hausnummer\nPLZ und Ort', 'Street and number\nPostcode and town')}
          onChange={(e) => update({ address: e.target.value })}
        />
      </div>
      <div className={ui.fld}>
        <label htmlFor="r-country">{t('Land', 'Country')}</label>
        <select id="r-country" className={ui.fi} value={draft.countryCode ?? ''} onChange={(e) => update({ countryCode: e.target.value || null })}>
          <option value="">—</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c[lang]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

// ------------------------------------------------------------- packages

const OWN = {
  name: { de: 'Eigenes Angebot', en: 'Own offer' },
  desc: { de: 'Kein Paket: nur das, was du draufsetzt', en: 'No package: only what you put on it' },
} satisfies Record<string, Bilingual>;

function Packages({ draft, update, editable }: { draft: OfferDraft; update: Update; editable: boolean }) {
  const { t, lang } = useWsLang();
  const current = draft.stay.choices.package;
  const choose = (choice: PackageChoice) => update((d) => (choice === 'esel' ? asEsel(d) : setChoices(d, { package: choice })));
  const tiles: { choice: PackageChoice; name: string; desc: string; price: ReactNode }[] = [
    ...GRUPPEN_PACKAGES_BY_STACK.map((p) => ({
      choice: p.slug as PackageChoice,
      name: p.animal[lang],
      desc: p.descriptor[lang],
      price:
        p.priceFrom != null ? (
          <>
            {eur(p.priceFrom)} <small>{t('pro Person', 'per person')}</small>
          </>
        ) : (
          <>
            <small>{t('ab', 'from')}</small> {eur(fullBoardBaseTotal(1))} <small>{t('· 1–4 Wochen', '· 1–4 weeks')}</small>
          </>
        ),
    })),
    { choice: 'own', name: pick(lang, OWN.name), desc: pick(lang, OWN.desc), price: <small>{t('Zeilen nach Wahl', 'Lines of your choice')}</small> },
  ];

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>
          <Chip tint={PACKAGE_TINT[current]} icon={ICONS.package} />
          {t('Grundlage', 'Built on')}
        </h2>
        <span>{t('Die Pakete der Gruppenseite oder keins', 'The packages of the groups page, or none')}</span>
      </div>
      <div className={ui.cardBody}>
        <div className={ui.pkgs} role="radiogroup" aria-label={t('Paket', 'Package')}>
          {tiles.map((tile) => {
            const on = current === tile.choice;
            const [colour, tint] = PACKAGE_COLOUR[tile.choice];
            return (
              <button
                key={tile.choice}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!editable}
                className={`${ui.pkg} ${on ? ui.pkgOn : ''} ${tile.choice === 'own' ? ui.pkgOwn : ''}`}
                style={{ ['--pkg' as string]: colour, ['--pkg-tint' as string]: tint }}
                onClick={() => choose(tile.choice)}
              >
                {on ? <span className={ui.pkgCheck}>✓</span> : null}
                <span className={ui.pkgName}>{tile.name}</span>
                <span className={ui.pkgDesc}>{tile.desc}</span>
                <span className={ui.pkgPrice}>{tile.price}</span>
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
function courseRowName(l: OfferLine, course: CourseChoice, t: T, lang: WsLang): { name: string; tint: Tint; icon: ReactNode } {
  if (l.key.startsWith('course:')) {
    const step = course.steps[Number(l.key.slice(7))];
    return { name: `${course.name[lang]}${step?.level ? ` ${levelLabel(step, lang)}` : ''}`, tint: 'red', icon: ICONS.book };
  }
  if (l.key.startsWith('book:')) return { name: t('Lehrbuch', 'Textbook'), tint: 'red', icon: ICONS.layers };
  if (l.key === 'enrolment') return { name: t('Anmeldegebühr', 'Enrolment fee'), tint: 'ink', icon: ICONS.people };
  if (l.key === 'accommodation') {
    return { name: course.accommodation?.kind === 'shared_flat' ? t('CASA-WG', 'CASA shared flat') : t('Gastfamilie', 'Host family'), tint: 'blue', icon: ICONS.house };
  }
  if (l.key === 'placement') return { name: t('Vermittlungsgebühr', 'Placement fee'), tint: 'blue', icon: ICONS.house };
  if (l.key === 'deposit') return { name: t('Kaution', 'Deposit'), tint: 'blue', icon: ICONS.house };
  return { name: course.exam?.name ?? t('Prüfung', 'Exam'), tint: 'sun', icon: ICONS.star };
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
  const { t, lang } = useWsLang();
  const course = draft.stay.choices.course;
  const rows = course ? lines.filter((l) => !l.manual && l.audience === 'participant') : [];
  const span = course ? courseSpan(course) : null;
  const change = (
    <ClickPanel
      wide
      label={course ? t('Kurs ändern', 'Change the course') : t('Kurs wählen', 'Choose the course')}
      icon={<Chip tint="red" icon={ICONS.book} big />}
      className={`${ui.btn} ${ui.btnSm}`}
      triggerId={FIX.course}
      disabled={!editable}
      body={() => (
        <CoursePicker catalogue={catalogue} value={course} onChange={(next) => update((d) => setChoices(d, { course: next }))} history={history} />
      )}
    >
      {course ? t('Ändern', 'Change') : t('Kurs wählen', 'Choose a course')}
    </ClickPanel>
  );

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>
          <Chip tint="red" icon={ICONS.book} />
          {course ? courseTitle(course, lang) : t('Kurs', 'Course')}
        </h2>
        {course ? null : <span>{t('Welcher Kurs, ab wann, auf welchem Niveau', 'Which course, from when, at which level')}</span>}
        {editable ? change : null}
      </div>
      {course && span ? (
        <div className={ui.courseFacts}>
          {course.slot ? (
            <span>
              {ICONS.clock}
              {slotLabel(course.slot, lang).split(', ')[0]}
            </span>
          ) : null}
          <span>
            {ICONS.calendar}
            {span.start && span.end ? formatDateRange(span.start, span.end, lang) : t('Termine nach Absprache', 'Dates by arrangement')}
          </span>
        </div>
      ) : null}
      {rows.length ? <ColumnHead group={false} escorts={false} /> : null}
      <div className={ui.rows}>
        {course ? (
          rows.map((l) => {
            const look = courseRowName(l, course, t, lang);
            return (
              <ClickPanel
                key={l.key}
                block
                label={look.name}
                icon={<Chip tint={look.tint} icon={look.icon} big />}
                className={ui.inc}
                openClassName={ui.incOpen}
                disabled={!editable}
                body={() => <MoneyField label={t('Preis', 'Price')} line={l} update={update} />}
              >
                <span className={ui.incMain}>
                  <Chip tint={look.tint} icon={look.icon} big />
                  <span className={ui.incText}>
                    <span className={ui.incName}>{look.name}</span>
                    <span className={ui.incDetail}>{l.description}</span>
                  </span>
                </span>
                {amountCell(t, l)}
              </ClickPanel>
            );
          })
        ) : (
          <div className={ui.empty}>{t('Kein Kurs auf diesem Angebot – wähle einen oder füge unten Zeilen hinzu', 'No course on this offer — choose one, or put lines on below')}</div>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------- included

type ServiceKey = ModuleKey | 'programme';
type Service = { key: ServiceKey; name: Bilingual; tint: Tint; icon: ReactNode };
const SERVICES: Service[] = [
  { key: 'course', name: { de: 'Intensivkurs Deutsch', en: 'Intensive German course' }, tint: 'red', icon: ICONS.book },
  { key: 'materials', name: { de: 'Kursmaterial', en: 'Course materials' }, tint: 'red', icon: ICONS.layers },
  { key: 'accommodation', name: { de: 'Gastfamilie', en: 'Host family' }, tint: 'blue', icon: ICONS.house },
  { key: 'lunch', name: { de: 'Mittagessen in der Mensa', en: 'Lunch at the canteen' }, tint: 'blue', icon: ICONS.cup },
  { key: 'transport', name: { de: 'Öffentlicher Nahverkehr', en: 'Public transport' }, tint: 'ink', icon: ICONS.tram },
  { key: 'programme', name: { de: 'Kulturprogramm', en: 'Culture programme' }, tint: 'sun', icon: ICONS.star },
];
const NO_ESCORT: ServiceKey[] = ['course', 'materials'];

type AmountCell = (t: T, l: OfferLine | null, on?: boolean) => ReactNode;

const amountCell: AmountCell = (t, l, on = true) =>
  !on ? (
    <span className={ui.incOffTag}>{t('Nicht enthalten', 'Not included')}</span>
  ) : !l ? (
    <span className={ui.incNone}>—</span>
  ) : l.included ? (
    <span className={ui.incIncl}>{t('Enthalten', 'Included')}</span>
  ) : l.amount == null ? (
    <span className={ui.amountMissing}>{t('Kein Preis', 'No price')}</span>
  ) : (
    <span className={`${ui.incAmt} ${l.amount < 0 ? ui.incCredit : ''}`}>
      {l.listUnitAmount != null && l.unitAmount !== l.listUnitAmount ? (
        <i className={ui.changed} title={t('Weicht von der Preisliste ab', 'Changed from the price list')} />
      ) : null}
      {l.amount < 0 ? `− ${eur(-l.amount)}` : eur(l.amount)}
    </span>
  );

function ColumnHead({ group, escorts }: { group: boolean; escorts: boolean }) {
  const { t } = useWsLang();
  return (
    <div className={`${ui.incHead} ${escorts ? ui.two : ''}`}>
      <span />
      <span>{group ? t('Pro Person', 'Per participant') : t('Betrag', 'Amount')}</span>
      {escorts ? <span>{t('Pro Begleitperson', 'Per escort')}</span> : null}
    </div>
  );
}

function Included({ draft, update, editable, lines }: { draft: OfferDraft; update: Update; editable: boolean; lines: OfferLine[] }) {
  const { t, lang } = useWsLang();
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
    course: t(`${weeks * 20} UE · Mo–Fr 09:00–12:30`, `${weeks * 20} lessons · Mon–Fri 09:00–12:30`),
    materials: t('Arbeitsbuch und Kopien, die sie behalten', 'Workbook and copies, theirs to keep'),
    accommodation: t(`Doppelzimmer · Frühstück und Abendessen · ${nights} Nächte`, `Double room · breakfast and dinner · ${nights} nights`),
    lunch: t('Warmes Mittagessen an Schultagen', 'Hot lunch on school days'),
    transport: t('Straßenbahn und Bus für den ganzen Aufenthalt', 'Trams and buses for the whole stay'),
    programme: activities.length
      ? activities.length === 1
        ? t('1 Nachmittag', '1 afternoon')
        : t(`${activities.length} Nachmittage`, `${activities.length} afternoons`)
      : t('Keine Aktivitäten gewählt', 'No activities chosen'),
  };
  const animal = pkg?.animal[lang];
  const toEsel = () => (
    <button type="button" className={ui.link} onClick={() => update(asEsel)}>
      {t('Etwas weglassen: aus Bausteinen zusammenstellen (Esel)', 'Leave something out: build it from blocks (Esel)')}
    </button>
  );

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>
          <Chip tint="blue" icon={ICONS.house} />
          {t('Enthalten', 'Included')}
        </h2>
        <span>
          {fixed
            ? t(`Alles, was ${animal ?? 'das Paket'} enthält`, `Everything ${animal ?? 'the package'} includes`)
            : t('Die Bausteine, die die Gruppe nimmt', 'The blocks the group takes')}
        </span>
      </div>
      <ColumnHead group escorts={escortCol} />
      <div className={ui.rows}>
        {fixed && pkgLine ? (
          <ClickPanel
            block
            label={animal ? t(`Paket ${animal}`, `${animal} package`) : pkgLine.description}
            icon={<Chip tint={PACKAGE_TINT[c.package]} icon={ICONS.package} big />}
            className={`${ui.inc} ${two}`}
            openClassName={ui.incOpen}
            disabled={!editable}
            body={() => (
              <>
                <MoneyField label={t('Preis pro Person', 'Price per participant')} line={pkgLine} update={update} />
                <div className={ui.fieldNote}>
                  {t('Ein mit der Gruppe vereinbarter Preis ersetzt im Brief den Paketpreis.', 'A price agreed with the group replaces the package price on the letter.')}
                </div>
              </>
            )}
            foot={toEsel}
          >
            <span className={ui.incMain}>
              <Chip tint={PACKAGE_TINT[c.package]} icon={ICONS.package} big />
              <span className={ui.incText}>
                <span className={ui.incName}>{pkg ? `${pkg.animal[lang]} · ${pkg.descriptor[lang]}` : pkgLine.description}</span>
                <span className={ui.incDetail}>
                  {t(
                    `Der Paketpreis · alles darunter, für ${weeks} ${weeksWord(t, weeks)}`,
                    `The package price · everything below, for ${weeks} ${weeksWord(t, weeks)}`
                  )}
                </span>
              </span>
            </span>
            {amountCell(t, pkgLine)}
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
              label={pick(lang, s.name)}
              subtitle={
                fixed
                  ? animal
                    ? t(`Teil von ${animal}`, `Part of ${animal}`)
                    : t('Teil des Pakets', 'Part of the package')
                  : on
                    ? detail[s.key]
                    : t('Nicht in diesem Angebot', 'Not in this offer')
              }
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
                  <span className={ui.incName}>{pick(lang, s.name)}</span>
                  <span className={ui.incDetail}>{detail[s.key]}</span>
                  {s.key === 'programme' && activities.length ? <ActivityChips ids={activities} /> : null}
                </span>
              </span>
              {s.key === 'programme' && !activities.length ? <span className={ui.incOffTag}>{t('Wählen', 'Choose')}</span> : amountCell(t, p, on)}
              {escortCol ? amountCell(t, e, on) : null}
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
  const { t, lang } = useWsLang();
  const on = new Set(chosen);
  const off = new Set(taken);
  return (
    <>
      <div className={ui.fieldNote}>{note}</div>
      {(['city', 'culture', 'science', 'sport', 'daytrip'] as const).map((cat) => (
        <div key={cat} className={ui.actGroup}>
          <span>{pick(lang, CATEGORY_LABEL[cat])}</span>
          <div className={ui.acts}>
            {GRUPPEN_ACTIVITIES.filter((a) => a.category === cat).map((a) => {
              const isOn = on.has(a.id) || off.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={isOn}
                  disabled={off.has(a.id)}
                  title={off.has(a.id) ? t('Schon im Paket', 'In the package already') : undefined}
                  className={`${ui.act} ${isOn ? `${ui.actOn} ${ui[`tint_${ACTIVITY_TINT[a.category]}`]}` : ''}`}
                  onClick={() => onToggle(a.id)}
                >
                  {a.name} <small>{off.has(a.id) ? t('enthalten', 'included') : eur(a.price)}</small>
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
  const { t } = useWsLang();
  const c = draft.stay.choices;
  const weeks = pricedWeeks(draft);
  const perEscort = t('Preis pro Begleitperson', 'Price per escort');
  if (service.key === 'programme') {
    if (fixed) {
      return (
        <>
          <ActivityChips ids={activitiesOf(c)} />
          <div className={ui.fieldNote}>{t('Weitere Nachmittage kommen unter Extras, zusätzlich zum Paket.', 'More afternoons go under Extras, on top of the package.')}</div>
          {escortLine ? <MoneyField label={perEscort} line={escortLine} update={update} /> : null}
        </>
      );
    }
    const chosen = activitiesOf(c);
    return (
      <>
        <ActivityPicker
          chosen={chosen}
          onToggle={(id) => update((d) => setChoices(d, { activities: toggleIn(d.stay.choices.activities, id) }))}
          note={t(
            `${chosen.length} gewählt · bis zu ${activityAllowance(weeks)} für ${weeks} ${weeksWord(t, weeks)}`,
            `${chosen.length} chosen · up to ${activityAllowance(weeks)} for ${weeks} ${weeksWord(t, weeks)}`
          )}
        />
        {escortLine ? <MoneyField label={perEscort} line={escortLine} update={update} /> : null}
      </>
    );
  }

  const key = service.key;
  return (
    <>
      {!fixed ? (
        <div className={ui.fld}>
          <span>{t('In diesem Angebot', 'In this offer')}</span>
          <div className={ui.choiceGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={on === v}
                className={`${ui.choiceCard} ${on === v ? ui.choiceOn : ''}`}
                onClick={() => update((d) => setChoices(d, { modules: { ...d.stay.choices.modules, [key]: v } }))}
              >
                <b>{v ? t('Enthalten', 'Included') : t('Nicht enthalten', 'Not included')}</b>
                <span>
                  {v
                    ? t('Für den Aufenthalt berechnet', 'Priced for the stay')
                    : key === 'course'
                      ? t('Ein Aufenthalt ohne Unterricht', 'A stay without lessons')
                      : t('Die Gruppe organisiert das selbst', 'The group arranges it')}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={ui.fieldNote}>{t('Im Paketpreis enthalten.', 'Included in the package price.')}</div>
      )}
      {participantLine && on ? <MoneyField label={t('Preis pro Person', 'Price per participant')} line={participantLine} update={update} /> : null}
      {escortLine && on ? <MoneyField label={perEscort} line={escortLine} update={update} /> : null}
    </>
  );
}

function MoneyField({ label, line, update }: { label: string; line: OfferLine; update: Update }) {
  const { t } = useWsLang();
  const changed = line.listUnitAmount != null && line.unitAmount !== line.listUnitAmount;
  return (
    <div className={ui.fld}>
      <span>{label}</span>
      <div className={ui.inline} style={{ flexWrap: 'nowrap' }}>
        <span className={ui.money} style={{ width: 140 }}>
          <NumberInput ariaLabel={`${label}: ${line.description}`} className={ui.fi} value={line.unitAmount} placeholder="0" onCommit={(v) => update((d) => setLinePrice(d, line, v))} />
        </span>
        <span className={ui.fieldNote}>
          {line.listUnitAmount == null
            ? t('Kein Listenpreis', 'No list price')
            : changed
              ? t(`Listenpreis ${eur(line.listUnitAmount)}`, `List price ${eur(line.listUnitAmount)}`)
              : t('Der Listenpreis', 'The list price')}
          {changed ? (
            <button type="button" className={ui.link} onClick={() => update((d) => resetLine(d, line))}>
              {t('Übernehmen', 'Use it')}
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
  const { t } = useWsLang();
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

  const onOffer = t('Auf dem Angebot', 'On the offer');
  const title = !group ? (c.course ? t('Außerdem auf dem Angebot', 'Also on the offer') : onOffer) : own ? onOffer : t('Extras', 'Extras');
  const sub = !group
    ? t('Aus der Preisliste oder selbst eingegeben – ein Transfer, eine Ermäßigung', 'From the price list, or typed — a transfer, a reduction')
    : own
      ? t('Alles, woraus dieses Angebot besteht', 'Everything this offer is made of')
      : c.package === 'esel'
        ? t('Zusätzlich zu den Bausteinen', 'On top of the blocks')
        : t('Zusätzlich zum Paket', 'On top of the package');
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
            label={t('Weitere Nachmittage', 'More afternoons')}
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
                    note={
                      extras.length
                        ? t(`${extras.length} gewählt, pro Person berechnet`, `${extras.length} chosen, priced per person`)
                        : t('Pro Person berechnet, wie auf der Gruppenseite', 'Priced per person, as on the groups page')
                    }
                  />
                  {extraLine ? <MoneyField label={t('Preis pro Begleitperson', 'Price per escort')} line={extraLine} update={update} /> : null}
                </>
              );
            }}
          >
            <span className={ui.incMain}>
              <Chip tint="sun" icon={ICONS.star} big />
              <span className={ui.incText}>
                <span className={ui.incName}>{t('Weitere Nachmittage', 'More afternoons')}</span>
                <span className={ui.incDetail}>
                  {extras.length
                    ? t(`${extras.length} zusätzlich`, `${extras.length} on top`)
                    : t('Ein Ausflug, ein Tagesausflug, ein Besuch, den das Paket nicht hat', 'An excursion, a day trip, a visit the package does not have')}
                </span>
                {extras.length ? <ActivityChips ids={extras} /> : null}
              </span>
            </span>
            {extras.length ? amountCell(t, find('extras')) : <span className={ui.incOffTag}>{t('Hinzufügen', 'Add')}</span>}
            {escortCol ? (extras.length ? amountCell(t, find('extras', 'escort')) : <span className={ui.incNone}>—</span>) : null}
          </ClickPanel>
        ) : null}

        {typed.map((l) => (
          <TypedRow key={l.key} line={l} update={update} editable={editable} two={two} escortCol={escortCol} chargeTypes={chargeTypes} />
        ))}

        {share ? (
          <ClickPanel
            block
            label={t('Anteil der Begleitpersonen', 'Share of the escorts')}
            subtitle={t(`Ihre Kosten auf ${draft.participants} Teilnehmende verteilt, aufgerundet`, `Their costs over ${draft.participants} participants, rounded up`)}
            icon={<Chip tint="ink" icon={ICONS.share} big />}
            className={`${ui.inc} ${two}`}
            openClassName={ui.incOpen}
            disabled={!editable}
            body={() => <MoneyField label={t('Pro Person', 'Per participant')} line={share} update={update} />}
          >
            <span className={ui.incMain}>
              <Chip tint="ink" icon={ICONS.share} big />
              <span className={ui.incText}>
                <span className={ui.incName}>{t('Anteil der Begleitpersonen', 'Share of the escorts')}</span>
                <span className={ui.incDetail}>
                  {t(
                    `${draft.escorts} ${escortsWord(t, draft.escorts)} auf ${draft.participants} Teilnehmende`,
                    `${draft.escorts} ${escortsWord(t, draft.escorts)} over ${draft.participants} participants`
                  )}
                </span>
              </span>
            </span>
            {amountCell(t, share)}
            {escortCol ? <span className={ui.incNone}>—</span> : null}
          </ClickPanel>
        ) : null}

        {nothing ? <div className={ui.empty}>{own ? t('Noch nichts auf diesem Angebot', 'Nothing on this offer yet') : t('Noch keine Zeilen', 'No lines yet')}</div> : null}
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
  const { t, lang } = useWsLang();
  const credit = isCredit(line.chargeType);
  const setPrice = (v: number | null) => update((d) => setLinePrice(d, line, v == null ? null : credit ? -Math.abs(v) : v));
  const shown = line.unitAmount == null ? null : credit ? Math.abs(line.unitAmount) : line.unitAmount;
  const icon = credit ? ICONS.minus : ICONS.plus;
  const tint: Tint = credit ? 'green' : 'ink';
  return (
    <ClickPanel
      block
      label={line.description || t('Neue Zeile', 'New line')}
      icon={<Chip tint={tint} icon={icon} big />}
      className={`${ui.inc} ${two}`}
      openClassName={ui.incOpen}
      disabled={!editable}
      body={() => (
        <>
          <div className={ui.fld}>
            <label htmlFor={`t-${line.key}`}>{t('Text auf dem Angebot', 'Text on the offer')}</label>
            <input id={`t-${line.key}`} className={ui.fi} value={line.description} autoFocus={!line.description} onChange={(e) => update((d) => setLineText(d, line, e.target.value))} />
          </div>
          <div className={ui.row2}>
            <div className={ui.fld}>
              <label htmlFor={`q-${line.key}`}>{t('Menge', 'Quantity')}</label>
              <NumberInput id={`q-${line.key}`} className={ui.fi} value={line.quantity} onCommit={(q) => update((d) => setLineQuantity(d, line.key, q ?? 1))} />
            </div>
            <div className={ui.fld}>
              <label htmlFor={`p-${line.key}`}>{credit ? t('Abzug pro Person', 'Taken off, per person') : t('Preis', 'Price')}</label>
              <span className={ui.money}>
                <NumberInput id={`p-${line.key}`} className={ui.fi} value={shown} placeholder="0" onCommit={setPrice} />
              </span>
            </div>
          </div>
          <div className={ui.fld}>
            <label htmlFor={`k-${line.key}`}>{t('Kostenart', 'Kind of cost')}</label>
            <select
              id={`k-${line.key}`}
              className={ui.fi}
              value={line.chargeType}
              onChange={(e) => update((d) => ({ ...d, stay: { ...d.stay, manual: d.stay.manual.map((m) => (m.key === line.key ? { ...m, chargeType: e.target.value } : m)) } }))}
            >
              {chargeTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type[lang]}
                </option>
              ))}
            </select>
          </div>
          {escortCol ? (
            <div className={ui.fld}>
              <span>{t('Bezahlt von', 'Paid by')}</span>
              <Seg<Audience>
                label={t('Bezahlt von', 'Paid by')}
                value={line.audience}
                options={[
                  ['participant', t('Teilnehmende', 'Participants')],
                  ['escort', t('Begleitpersonen', 'Escorts')],
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
          {t('Zeile entfernen', 'Remove the line')}
        </button>
      )}
    >
      <span className={ui.incMain}>
        <Chip tint={tint} icon={icon} big />
        <span className={ui.incText}>
          <span className={ui.incName}>{line.description || <span className={ui.placeholder}>{t('Neue Zeile', 'New line')}</span>}</span>
          <span className={ui.incDetail}>
            {line.quantity !== 1
              ? `${line.quantity} × ${eur(shown)}`
              : credit
                ? t('Ermäßigung', 'Reduction')
                : line.unitAmount == null
                  ? t('Preis eingeben', 'Type the price')
                  : t('Eigene Zeile', 'Own line')}
          </span>
        </span>
      </span>
      {line.audience === 'participant' ? amountCell(t, line) : <span className={ui.incNone}>—</span>}
      {escortCol ? line.audience === 'escort' ? amountCell(t, line) : <span className={ui.incNone}>—</span> : null}
    </ClickPanel>
  );
}

function AddMenu({ priceList, update, group }: { priceList: PriceListItem[]; update: Update; group: boolean }) {
  const { t, lang } = useWsLang();
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
        {group ? t('+ Extra hinzufügen', '+ Add an extra') : t('+ Zeile hinzufügen', '+ Add a line')}
      </button>
      {open ? (
        <div className={ui.menu} role="menu" style={{ left: 0, right: 'auto', top: 'auto', bottom: 'calc(100% + 6px)', width: 330 }}>
          {group ? (
            <>
              <div className={ui.menuHead}>{t('Oft gefragt', 'Often asked for')}</div>
              {GROUP_EXTRAS.map((p) => (
                <button key={p.label.en} type="button" role="menuitem" className={ui.menuItem} onClick={() => addPreset(p)}>
                  {pick(lang, p.label)}
                </button>
              ))}
              <div className={ui.menuRule} />
            </>
          ) : null}
          <div style={{ padding: '4px 4px 6px' }}>
            <select
              aria-label={t('Aus der Preisliste', 'From the price list')}
              className={ui.fi}
              value=""
              onChange={(e) => {
                const item = priceList[Number(e.target.value)];
                if (!item) return;
                update((d) => addLine(d, { audience: 'participant', chargeType: item.chargeType, description: d.language === 'de' ? item.de : item.en, quantity: 1, unitAmount: item.unitAmount }));
                setOpen(false);
              }}
            >
              <option value="">{t('Aus der Preisliste …', 'From the price list …')}</option>
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
            {t('Eine Ermäßigung', 'A reduction')}
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
            {t('Eine eigene Zeile', 'A line of your own')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- aside

function PriceCard({ draft, totals }: { draft: OfferDraft; totals: OfferTotals }) {
  const { t } = useWsLang();
  const pricing = draft.stay.choices.escortPricing;
  if (draft.kind !== 'group') {
    return (
      <section className={ui.price} aria-label={t('Preis', 'Price')}>
        <div className={ui.priceKey}>{t('Gesamt', 'Total')}</div>
        <div className={ui.priceBig}>{eur(totals.perParticipant)}</div>
      </section>
    );
  }
  return (
    <section className={ui.price} aria-label={t('Preis', 'Price')}>
      <div className={ui.priceKey}>{t('Pro Person', 'Per participant')}</div>
      <div className={ui.priceBig}>{eur(totals.perParticipant)}</div>
      {totals.escortShare != null ? (
        <div className={ui.priceSub}>{t(`inkl. ${eur(totals.escortShare)} für die Begleitpersonen`, `incl. ${eur(totals.escortShare)} for the escorts`)}</div>
      ) : null}
      <div className={ui.priceRows}>
        <div className={ui.priceRow}>
          <span>
            {t('Pro Begleitperson', 'Per escort')}
            <small>
              {draft.escorts === 0
                ? t('Keine Begleitpersonen', 'No escorts')
                : pricing === 'free'
                  ? t(`Kostenfrei · CASA trägt ${eur(totals.carriedByCasa)}`, `Free · CASA carries ${eur(totals.carriedByCasa)}`)
                  : pricing === 'shared'
                    ? t('Trägt die Gruppe', 'Shared by the group')
                    : `${draft.escorts} ${escortsWord(t, draft.escorts)}`}
            </small>
          </span>
          <b>{draft.escorts === 0 ? '—' : eur(totals.perEscort)}</b>
        </div>
        <div className={ui.priceRow}>
          <span>
            {t('Die Gruppe', 'The group')}
            <small>
              {draft.participants ? `${draft.participants} × ${eur(totals.perParticipant)}` : t('Teilnehmende fehlen', 'Participants missing')}
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
  const { t, lang } = useWsLang();
  const problems = checks.filter((c) => c.level === 'problem');
  const hints = checks.filter((c) => c.level === 'hint');
  return (
    <section className={ui.card} aria-label={t('Prüfpunkte', 'Checks')}>
      {problems.length ? (
        <div className={`${ui.cardHead} ${ui.cardHeadWarn}`}>
          <h2>
            <span className={`${ui.checkMark} ${ui.tint_sun}`}>!</span>
            {t('Bevor es rausgehen kann', 'Before it can go')}
          </h2>
          <span className={ui.count}>{problems.length}</span>
        </div>
      ) : (
        <div className={`${ui.checksOk} ${hints.length ? ui.checksOkRule : ''}`}>
          <span className={`${ui.checkMark} ${ui.tint_green}`}>✓</span>
          {t('Bereit zum Senden', 'Ready to send')}
        </div>
      )}
      {problems.length || hints.length ? (
        <div className={ui.checkList}>
          {[...problems, ...hints].map((c, i) => {
            const fix = FIX[c.field];
            const body = (
              <>
                <i className={c.level === 'problem' ? ui.dotProblem : ui.dotHint} />
                <span>{pick(lang, c.message)}</span>
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
  const { t, lang } = useWsLang();
  const { meta } = record;
  const statusWord = (status: OfferRecord['meta']['status']) => {
    const word = pick(lang, OFFER_STATUS_LABELS[status]);
    return lang === 'en' ? word.toLowerCase() : word;
  };
  return (
    <section className={ui.card} aria-label={t('Verlauf', 'History')}>
      <div className={ui.cardHead}>
        <h2>{t('Verlauf', 'History')}</h2>
      </div>
      <div className={ui.timeline}>
        {meta.decidedAt ? (
          <div className={`${ui.event} ${meta.status === 'accepted' ? ui.eventGood : ''}`}>
            <i />
            <div>
              <b>{pick(lang, OFFER_STATUS_LABELS[meta.status])}</b>
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
              <Link href={`/admin/offers/${meta.id}/letter?version=${l.version}`}>{t(`Fassung ${l.version} gesendet`, `Version ${l.version} sent`)}</Link>
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
            <b>{t('Angelegt', 'Created')}</b>
            <span>
              {day(meta.createdAt)}
              {meta.createdByName ? ` · ${meta.createdByName}` : ''}
            </span>
            {meta.enquiryId ? (
              <span>
                {t('Aus', 'From')} <Link href={`/admin/enquiries/${meta.enquiryId}`}>{t('einer Anfrage', 'an enquiry')}</Link>
              </span>
            ) : null}
            {meta.personId ? (
              <span>
                {t('Für', 'For')} <Link href={`/admin/people/${meta.personId}`}>{t('eine lernende Person', 'a learner')}</Link>
              </span>
            ) : null}
            {meta.copiedFrom ? (
              <span>
                {t('Wiederholt', 'Repeats')} <Link href={`/admin/offers/${meta.copiedFrom}`}>{t('ein früheres Angebot', 'an earlier offer')}</Link>
              </span>
            ) : null}
          </div>
        </div>
        {record.related.length ? (
          <div className={ui.event}>
            <i />
            <div>
              <b>{t(`Frühere Angebote an ${record.draft.recipientName}`, `Earlier offers to ${record.draft.recipientName}`)}</b>
              {record.related.map((r) => (
                <span key={r.id}>
                  <Link href={`/admin/offers/${r.id}`}>{r.number}</Link> · {statusWord(r.status)}
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
