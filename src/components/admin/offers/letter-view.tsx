'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { InlinePanel, InlineText } from '@/components/admin/letters/inline-edit';
import ed from '@/components/admin/letters/letter-edit.module.css';
import { LetterSheet, type LetterSlots } from '@/components/admin/letters/letter-sheet';
import { PrintCopy, printLetter } from '@/components/admin/letters/print';
import { pick } from '@/lib/admin/i18n';
import type { Letter } from '@/lib/admin/letters/types';
import { hasProblems } from '@/lib/admin/offers/checks';
import { lineRef, offerLetter, validityParts } from '@/lib/admin/offers/document';
import { setLineText } from '@/lib/admin/offers/draft-ops';
import type { EditorOptions, OfferRecord, StandardTexts } from '@/lib/admin/offers/repo';
import { addDays } from '@/lib/admin/offers/stay';
import { OFFER_STATUS_LABELS, overrideKey, type OfferLanguage } from '@/lib/admin/offers/types';

import { saveStandardTextAction } from '@/app/(admin)/admin/(workspace)/offers/actions';

import { InlineDatePicker } from '@/components/admin/date-picker';
import { Seg } from './fields';
import { OfferFrame } from './frame';
import ui from './letter-view.module.css';
import { OfferToolbarActions } from './offer-actions';
import { RecipientFields } from './offer-page';
import o from './offers.module.css';
import { saveLabel, useOfferDraft } from './use-offer-draft';

const JOBCENTER_NOTE =
  'Bitte beachte: Der hier genannte Kurs ist heute die nächste Möglichkeit, bei uns einen Intensivkurs zu beginnen. Wir starten jeden Monat einen neuen Kurs (die Termine findest du auf unserer Website). Bei einem späteren Start kann der Unterricht vormittags statt nachmittags stattfinden. Einen festen Platz können wir dir zusagen, sobald uns deine Anmeldung und die Kostenübernahme des Jobcenters vorliegen – oder deine Anmeldung und deine Zahlung.';

const day = (d: Date | string) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * The letter, on its own screen — the website editor's frame around one page,
 * with what the letter is beside it.
 *
 * Everything on the page that is words is changed where it stands: click the
 * opening and type. The opening and closing are CASA's standard texts until
 * somebody changes them for this offer; "Save as standard" makes the change
 * the text every new offer starts with. What is numbers — the lines, the
 * prices, the group — is the offer's, one tab back.
 */
export function LetterView({
  record,
  options,
  texts: initialTexts,
  sentLetter,
  shownVersion,
  today,
  canWrite,
  canDelete,
  canSetStandard,
  bookHref,
  notice,
}: {
  record: OfferRecord;
  options: EditorOptions;
  texts: StandardTexts;
  sentLetter: Letter | null;
  shownVersion: number | null;
  today: string;
  canWrite: boolean;
  canDelete: boolean;
  canSetStandard: boolean;
  /** An accepted offer to a learner: their booking wizard, at the offer's course. */
  bookHref?: string | null;
  notice: { ok?: string; error?: string };
}) {
  const { meta } = record;
  // `lang` below is the letter's own language, chosen per offer; `t` and `wsLang` are the workspace's.
  const { t, lang: wsLang } = useWsLang();
  const [texts, setTexts] = useState(initialTexts);
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
  const standard = texts[lang];
  const [addingNote, setAddingNote] = useState(false);

  const countryName = useMemo(() => {
    const c = options.countries.find((x) => x.code === draft.countryCode);
    return c ? (lang === 'de' ? c.de : c.en) : null;
  }, [options.countries, draft.countryCode, lang]);
  const signatureName = options.staff.find((s) => s.id === draft.ownerId)?.name ?? null;

  // A draft's letter is the next version; an offer that has gone out is the version it went out as.
  const version = meta.status === 'draft' ? meta.version + 1 : meta.version;
  const live = useMemo(
    () => offerLetter(draft, lines, totals, { number: meta.number, version, date: today, countryName, signatureName, standard }),
    [draft, lines, totals, meta.number, version, today, countryName, signatureName, standard]
  );
  const letter = sentLetter ?? live;
  const showsSent = Boolean(sentLetter);
  const writing = editable && !showsSent;

  const saveStandard = async (part: 'intro' | 'closing', body: string) => {
    const result = await saveStandardTextAction({ language: lang, part, body });
    if (!result.ok) return;
    setTexts((prev) => ({ ...prev, [lang]: { ...prev[lang], [part]: body } }));
    update({ [part]: null });
  };

  const recipientPanel = () => (
    <div className={o.tokens} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <RecipientFields draft={draft} update={update} countries={options.countries} />
    </div>
  );
  const validity = validityParts(lang, draft.validUntil);

  const slots: LetterSlots = !writing
    ? {}
    : {
        recipient: (part) => (
          <InlinePanel label={t('Empfänger', 'Recipient')} block width={400} panel={recipientPanel}>
            {part}
          </InlinePanel>
        ),
        salutation: (part) => (
          <InlinePanel label={t('Empfänger', 'Recipient')} width={400} panel={recipientPanel}>
            {part}
          </InlinePanel>
        ),
        title: () => <InlineText label={t('Titel', 'Title')} value={draft.title} placeholder={t('Titel', 'Title')} onChange={(v) => update({ title: v })} />,
        row: (row) => {
          const target = row.ref ? lines.find((l) => lineRef(l) === row.ref) : undefined;
          if (!target) return row.text;
          const custom = !target.manual && Boolean(draft.stay.overrides[overrideKey(target.audience, target.key)]?.description);
          return (
            <InlineText
              label={t('Zeile', 'Line')}
              value={target.description}
              state={target.manual ? undefined : custom ? 'changed' : 'standard'}
              onChange={(v) => update((d) => setLineText(d, target, v))}
              onUseStandard={target.manual ? undefined : () => update((d) => setLineText(d, target, ''))}
            />
          );
        },
        text: {
          intro: () => (
            <InlineText
              multiline
              label={t('Einleitung', 'Opening')}
              value={draft.intro ?? standard.intro}
              state={draft.intro == null ? 'standard' : 'changed'}
              onChange={(v) => update({ intro: v === standard.intro ? null : v })}
              onUseStandard={() => update({ intro: null })}
              onSaveStandard={canSetStandard && draft.intro ? () => saveStandard('intro', draft.intro!) : undefined}
            />
          ),
          validity: () => (
            <InlinePanel
              label={t('Gültig bis', 'Valid until')}
              width={316}
              panel={() => (
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
              {validity ? (
                <>
                  {validity.before}
                  <u style={{ textDecorationColor: 'rgba(10,132,198,.5)', textUnderlineOffset: '0.2em' }}>{validity.date}</u>
                  {validity.after}
                </>
              ) : (
                <span className={ed.placeholder}>{lang === 'de' ? 'Gültig bis …' : 'Valid until …'}</span>
              )}
            </InlinePanel>
          ),
          note: (note) =>
            note || addingNote ? (
              <InlineText
                multiline
                startOpen={addingNote}
                label={t('Hinweis', 'Note')}
                value={draft.note ?? ''}
                placeholder={lang === 'de' ? 'Ein Hinweis zum Angebot' : 'A note about the offer'}
                onChange={(v) => update({ note: v })}
                onClose={() => {
                  setAddingNote(false);
                  if (!draft.note?.trim()) update({ note: null });
                }}
                tools={
                  <>
                    {lang === 'de' && !draft.note ? (
                      <button type="button" className={ed.barBtn} onClick={() => update({ note: JOBCENTER_NOTE })}>
                        {t('Jobcenter-Text', 'Jobcenter text')}
                      </button>
                    ) : null}
                    {draft.note ? (
                      <button
                        type="button"
                        className={ed.barBtn}
                        onClick={() => {
                          update({ note: null });
                          setAddingNote(false);
                        }}
                      >
                        {t('Entfernen', 'Remove')}
                      </button>
                    ) : null}
                  </>
                }
              />
            ) : (
              <button type="button" className={ed.addNote} onClick={() => setAddingNote(true)}>
                + {lang === 'de' ? 'Hinweis' : 'Note'}
              </button>
            ),
          closing: () => (
            <InlineText
              multiline
              label={t('Schluss', 'Closing')}
              value={draft.closing ?? standard.closing}
              state={draft.closing == null ? 'standard' : 'changed'}
              onChange={(v) => update({ closing: v === standard.closing ? null : v })}
              onUseStandard={() => update({ closing: null })}
              onSaveStandard={canSetStandard && draft.closing ? () => saveStandard('closing', draft.closing!) : undefined}
            />
          ),
        },
        signatureName: (name) => (
          <InlinePanel
            label={t('Unterschrift', 'Signed by')}
            width={280}
            panel={(close) => (
              <span className={ed.choices}>
                {options.staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`${ed.choice} ${s.id === draft.ownerId ? ed.choiceOn : ''}`}
                    onClick={() => {
                      update({ ownerId: s.id });
                      close();
                    }}
                  >
                    {s.name}
                    {s.id === draft.ownerId ? <span>✓</span> : null}
                  </button>
                ))}
              </span>
            )}
          >
            {name ?? <span className={ed.placeholder}>{lang === 'de' ? 'Unterschrift' : 'Signature'}</span>}
          </InlinePanel>
        ),
      };

  const name = draft.groupName || draft.recipientName || meta.number;
  const print = () => printLetter(`${lang === 'de' ? 'Angebot' : 'Offer'} ${meta.number} ${name}`);
  const status = saveLabel(od.saveState, od.saveError, editable, t);
  const problems = checks.filter((c) => c.level === 'problem').map((c) => pick(wsLang, c.message));
  const missingCopy = shownVersion != null && !sentLetter;

  return (
    <OfferFrame
      back={{ href: '/admin/offers', label: t('Angebote', 'Offers'), before: od.flush }}
      title={name}
      subtitle={`${meta.number} · ${pick(wsLang, OFFER_STATUS_LABELS[meta.status])}`}
      tabs={{ id: meta.id, active: 'letter', before: od.flush }}
      right={
        <>
          {status ? <span className={`${o.status} ${od.saveState === 'error' ? o.statusBad : ''}`}>{status}</span> : null}
          {notice.error ? <span className={`${o.status} ${o.statusBad}`}>{notice.error}</span> : null}
          <button type="button" className={o.btn} onClick={print}>
            {t('Drucken / PDF', 'Print / PDF')}
          </button>
          <OfferToolbarActions
            id={meta.id}
            status={meta.status}
            canWrite={canWrite}
            canDelete={canDelete}
            bookHref={bookHref}
            send={
              writing
                ? {
                    canSend: !hasProblems(checks) && od.saveState !== 'stale',
                    busy: od.saveState === 'dirty' || od.saveState === 'saving',
                    problems,
                    email: draft.contactEmail,
                    letter: live,
                    onPrint: print,
                    onBeforeSend: od.flush,
                  }
                : null
            }
          />
        </>
      }
    >
      <div className={`${ui.canvas} ${writing || record.letters.length ? '' : ui.canvasSolo}`}>
        <div className={ui.paper}>
          {od.saveState === 'stale' ? (
            <div className={o.banner} style={{ marginBottom: 12 }}>
              {t(
                'Jemand aus dem Team hat dieses Angebot inzwischen geändert. Die letzte Änderung ist nicht gespeichert.',
                'A colleague has changed this offer in the meantime. The last change is not saved.'
              )}
              <span style={{ flex: 1 }} />
              <button type="button" className={`${o.btn} ${o.btnSm}`} onClick={() => window.location.reload()}>
                {t('Neu laden', 'Reload')}
              </button>
            </div>
          ) : null}
          {showsSent && shownVersion ? (
            <div className={ui.notice}>
              {t('Wie gesendet', 'As sent')}
              {meta.version > 1 ? t(` · Fassung ${shownVersion} von ${meta.version}`, ` · version ${shownVersion} of ${meta.version}`) : ''}
              {record.letters.find((l) => l.version === shownVersion) ? ` · ${day(record.letters.find((l) => l.version === shownVersion)!.sentAt)}` : ''}
            </div>
          ) : null}
          {missingCopy ? (
            <div className={`${ui.notice} ${ui.noticeWarn}`}>
              {t(
                'Die Kopie dieser Fassung ist nicht verfügbar. Das ist das Angebot, wie es jetzt ist.',
                'The copy of this version is not available. This is the offer as it stands.'
              )}
            </div>
          ) : null}
          <LetterSheet letter={letter} slots={slots} />
        </div>

        {writing || record.letters.length ? (
          <aside className={ui.side} aria-label={t('Der Brief', 'The letter')}>
            {writing ? (
              <section className={o.card}>
                <div className={o.cardHead}>
                  <h2>{t('Einstellungen', 'Settings')}</h2>
                </div>
                <div className={ui.group}>
                  <span>{t('Sprache', 'Language')}</span>
                  <Seg<OfferLanguage>
                    label={t('Sprache', 'Language')}
                    value={lang}
                    options={[
                      ['de', 'Deutsch'],
                      ['en', 'English'],
                    ]}
                    onChange={(v) => update({ language: v })}
                  />
                </div>
                <div className={ui.group}>
                  <span>{t('Preise', 'Prices')}</span>
                  <Seg
                    label={t('Preise im Brief', 'Prices on the letter')}
                    value={draft.presentation}
                    options={[
                      ['itemised', t('Jede Zeile', 'Every line')],
                      ['package', t('Ein Preis pro Person', 'One price per person')],
                    ]}
                    onChange={(v) => update({ presentation: v })}
                  />
                </div>
                <div className={ui.group}>
                  <span>{t('Texte', 'Texts')}</span>
                  {(['intro', 'closing'] as const).map((part) => {
                    const own = draft[part] != null;
                    return (
                      <div key={part} className={ui.textRow}>
                        {part === 'intro' ? t('Einleitung', 'Opening') : t('Schluss', 'Closing')}
                        {own ? (
                          <span className={ui.textState}>
                            <span className={`${ui.state} ${ui.stateChanged}`}>{t('Nur dieser Brief', 'Only this letter')}</span>
                            <button type="button" className={ui.reset} onClick={() => update({ [part]: null })} title={t('Standardtext verwenden', 'Use the standard text')}>
                              {t('Zurücksetzen', 'Reset')}
                            </button>
                          </span>
                        ) : (
                          <span className={`${ui.state} ${ui.stateStandard}`}>{t('Standardtext', 'Standard text')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {record.letters.length ? (
              <section className={o.card}>
                <div className={o.cardHead}>
                  <h2>{t('Gesendet', 'Sent')}</h2>
                  <span className={o.count}>{record.letters.length}</span>
                </div>
                <div className={ui.versions}>
                  {meta.status === 'draft' ? (
                    <Link href={`/admin/offers/${meta.id}/letter`} className={`${ui.version} ${!showsSent ? ui.versionOn : ''}`}>
                      {t('Der aktuelle Entwurf', 'The current draft')}
                    </Link>
                  ) : null}
                  {record.letters.map((l) => (
                    <Link key={l.id} href={`/admin/offers/${meta.id}/letter?version=${l.version}`} className={`${ui.version} ${shownVersion === l.version ? ui.versionOn : ''}`}>
                      {t(`Fassung ${l.version}`, `Version ${l.version}`)}
                      <span>
                        {day(l.sentAt)}
                        {l.sentByName ? ` · ${l.sentByName}` : ''}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>
      <PrintCopy letter={letter} />
    </OfferFrame>
  );
}
