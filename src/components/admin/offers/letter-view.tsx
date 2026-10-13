'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { hasProblems } from '@/lib/admin/offers/checks';
import { buildLetter, type OfferLetter } from '@/lib/admin/offers/document';
import { setLineText } from '@/lib/admin/offers/draft-ops';
import type { EditorOptions, OfferRecord, StandardTexts } from '@/lib/admin/offers/repo';
import { addDays } from '@/lib/admin/offers/stay';
import { OFFER_STATUS_LABELS, overrideKey, type OfferLanguage } from '@/lib/admin/offers/types';

import { saveStandardTextAction } from '@/app/(admin)/admin/(editor)/offers/actions';

import { Seg } from './fields';
import { OfferFrame } from './frame';
import { InlinePanel, InlineText } from './inline-edit';
import { LetterSheet, type LetterSlots } from './letter';
import ui from './letter-view.module.css';
import { OfferToolbarActions } from './offer-actions';
import { RecipientFields } from './offer-page';
import o from './offers.module.css';
import { PrintCopy, printOffer } from './print';
import { saveLabel, useOfferDraft } from './use-offer-draft';

const JOBCENTER_NOTE =
  'Bitte beachte: Der hier genannte Kurs ist heute die nächste Möglichkeit, bei uns einen Intensivkurs zu beginnen. Wir starten jeden Monat einen neuen Kurs (die Termine findest du auf unserer Website). Bei einem späteren Start kann der Unterricht vormittags statt nachmittags stattfinden. Einen festen Platz können wir dir zusagen, sobald uns deine Anmeldung und die Kostenübernahme des Jobcenters vorliegen – oder deine Anmeldung und deine Zahlung.';

/**
 * The letter, on its own screen — the website editor's frame around one page.
 *
 * Everything on the page that is words is changed where it stands: click the
 * opening and type. The opening and closing are CASA's standard texts until
 * somebody changes them for this offer; "Save as standard" makes the change
 * the text every new offer starts with. What is numbers — the lines, the
 * prices, the group — is the builder's, one click back.
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
  notice,
}: {
  record: OfferRecord;
  options: EditorOptions;
  texts: StandardTexts;
  sentLetter: OfferLetter | null;
  shownVersion: number | null;
  today: string;
  canWrite: boolean;
  canDelete: boolean;
  canSetStandard: boolean;
  notice: { ok?: string; error?: string };
}) {
  const { meta } = record;
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

  const live = useMemo(
    () => buildLetter(draft, lines, totals, { number: meta.number, version: meta.version + 1, date: today, countryName, signatureName, standard }),
    [draft, lines, totals, meta.number, meta.version, today, countryName, signatureName, standard]
  );
  const letter = sentLetter ?? live;
  const showsSent = Boolean(sentLetter);

  const saveStandard = async (part: 'intro' | 'closing', body: string) => {
    const result = await saveStandardTextAction({ language: lang, part, body });
    if (!result.ok) return;
    setTexts((t) => ({ ...t, [lang]: { ...t[lang], [part]: body } }));
    update({ [part]: null });
  };

  const slots: LetterSlots = !editable || showsSent
    ? {}
    : {
        recipient: (part) => (
          <InlinePanel label="Recipient" block width={400} panel={() => <div className={`${o.tokens} ${o.panelBody}`}><RecipientFields draft={draft} update={update} countries={options.countries} /></div>}>
            {part}
          </InlinePanel>
        ),
        salutation: (part) => (
          <InlinePanel label="Recipient" width={400} panel={() => <div className={`${o.tokens} ${o.panelBody}`}><RecipientFields draft={draft} update={update} countries={options.countries} /></div>}>
            {part}
          </InlinePanel>
        ),
        title: () => <InlineText label="Title" value={draft.title} placeholder="Title" onChange={(v) => update({ title: v })} />,
        intro: () => (
          <InlineText
            multiline
            label="Opening"
            value={draft.intro ?? standard.intro}
            state={draft.intro == null ? 'standard' : 'changed'}
            onChange={(v) => update({ intro: v === standard.intro ? null : v })}
            onUseStandard={() => update({ intro: null })}
            onSaveStandard={canSetStandard && draft.intro ? () => saveStandard('intro', draft.intro!) : undefined}
          />
        ),
        lineText: (line) => {
          if (!line.ref) return line.text;
          const ref = line.ref;
          const target = lines.find((l) => l.key === ref.key && l.audience === ref.audience);
          if (!target) return line.text;
          const custom = !target.manual && Boolean(draft.stay.overrides[overrideKey(ref.audience, ref.key)]?.description);
          return (
            <InlineText
              label="Line"
              value={target.description}
              state={target.manual ? undefined : custom ? 'changed' : 'standard'}
              onChange={(v) => update((d) => setLineText(d, target, v))}
              onUseStandard={target.manual ? undefined : () => update((d) => setLineText(d, target, ''))}
            />
          );
        },
        validity: () => (
          <InlinePanel
            label="Valid until"
            width={300}
            panel={(close) => (
              <>
                <input
                  aria-label="Valid until"
                  type="date"
                  className={ui.dateIn}
                  value={draft.validUntil ?? ''}
                  onChange={(e) => update({ validUntil: e.target.value || null })}
                />
                <span className={ui.quick}>
                  {[14, 28, 42].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        update({ validUntil: addDays(today, days) });
                        close();
                      }}
                    >
                      {days / 7} weeks
                    </button>
                  ))}
                  {draft.arrival ? (
                    <button
                      type="button"
                      onClick={() => {
                        update({ validUntil: addDays(draft.arrival!, -42) });
                        close();
                      }}
                    >
                      6 weeks before arrival
                    </button>
                  ) : null}
                </span>
              </>
            )}
          >
            {letter.validityParts ? (
              <>
                {letter.validityParts.before}
                <u style={{ textDecorationColor: 'rgba(10,132,198,.5)', textUnderlineOffset: '0.2em' }}>{letter.validityParts.date}</u>
                {letter.validityParts.after}
              </>
            ) : (
              <span className={ui.placeholder}>{lang === 'de' ? 'Gültig bis …' : 'Valid until …'}</span>
            )}
          </InlinePanel>
        ),
        note: (note) =>
          note || addingNote ? (
            <div style={{ margin: '0 0 1.8cqw' }}>
              <InlineText
                multiline
                startOpen={addingNote}
                label="Note"
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
                      <button type="button" className={ui.barBtn} onClick={() => update({ note: JOBCENTER_NOTE })}>
                        Jobcenter text
                      </button>
                    ) : null}
                    {draft.note ? (
                      <button
                        type="button"
                        className={ui.barBtn}
                        onClick={() => {
                          update({ note: null });
                          setAddingNote(false);
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </>
                }
              />
            </div>
          ) : (
            <button type="button" className={ui.addNote} onClick={() => setAddingNote(true)}>
              + {lang === 'de' ? 'Hinweis' : 'Note'}
            </button>
          ),
        closing: () => (
          <InlineText
            multiline
            label="Closing"
            value={draft.closing ?? standard.closing}
            state={draft.closing == null ? 'standard' : 'changed'}
            onChange={(v) => update({ closing: v === standard.closing ? null : v })}
            onUseStandard={() => update({ closing: null })}
            onSaveStandard={canSetStandard && draft.closing ? () => saveStandard('closing', draft.closing!) : undefined}
          />
        ),
        signatureName: (name) => (
          <InlinePanel
            label="Signed by"
            width={280}
            panel={(close) => (
              <span className={ui.choices}>
                {options.staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`${ui.choice} ${s.id === draft.ownerId ? ui.choiceOn : ''}`}
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
            {name ?? <span className={ui.placeholder}>{lang === 'de' ? 'Unterschrift' : 'Signature'}</span>}
          </InlinePanel>
        ),
      };

  const name = draft.groupName || draft.recipientName || meta.number;
  const print = () => printOffer(`${lang === 'de' ? 'Angebot' : 'Offer'} ${meta.number} ${name}`);
  const status = saveLabel(od.saveState, od.saveError, editable);
  const problems = checks.filter((c) => c.level === 'problem').map((c) => c.message);
  const writing = editable && !showsSent;

  return (
    <OfferFrame
      canvas
      back={{ href: '/admin/offers', label: 'Offers', before: od.flush }}
      title={name}
      subtitle={`${meta.number} · ${OFFER_STATUS_LABELS[meta.status]}`}
      tabs={{ id: meta.id, active: 'letter', before: od.flush }}
      right={
        <>
          {status ? <span className={`${o.status} ${od.saveState === 'error' ? o.statusBad : ''}`}>{status}</span> : null}
          {notice.error ? <span className={`${o.status} ${o.statusBad}`}>{notice.error}</span> : null}
          <button type="button" className={o.btn} onClick={print}>
            Print / PDF
          </button>
          <OfferToolbarActions
            id={meta.id}
            status={meta.status}
            canWrite={canWrite}
            canDelete={canDelete}
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
      <div className={ui.canvas}>
        {od.saveState === 'stale' ? (
          <div className={o.banner} style={{ maxWidth: 820, margin: '0 auto 14px' }}>
            A colleague has changed this offer in the meantime. The last change is not saved.
            <span style={{ flex: 1 }} />
            <button type="button" className={`${o.btn} ${o.btnSm}`} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        ) : null}
        {writing ? (
          <div className={ui.tools}>
            <Seg<OfferLanguage>
              label="Language"
              value={lang}
              options={[
                ['de', 'Deutsch'],
                ['en', 'English'],
              ]}
              onChange={(v) => update({ language: v })}
            />
            <Seg
              label="Prices on the letter"
              value={draft.presentation}
              options={[
                ['itemised', 'Every line priced'],
                ['package', 'One price per person'],
              ]}
              onChange={(v) => update({ presentation: v })}
            />
          </div>
        ) : null}
        {showsSent && shownVersion ? (
          <div className={ui.versionNote}>
            <span>
              As sent{meta.version > 1 ? ` · version ${shownVersion} of ${meta.version}` : ''}
            </span>
            {record.versions
              .filter((v) => v.version !== shownVersion)
              .map((v) => (
                <Link key={v.version} href={`/admin/offers/${meta.id}/letter?version=${v.version}`}>
                  Version {v.version}
                </Link>
              ))}
            {meta.status === 'draft' ? <Link href={`/admin/offers/${meta.id}/letter`}>The current draft</Link> : null}
          </div>
        ) : null}
        <div className={ui.paper}>
          <LetterSheet letter={letter} slots={slots} />
        </div>
        {writing ? <div className={ui.hint}>Click any text on the letter to change it</div> : null}
      </div>
      <PrintCopy letter={letter} />
    </OfferFrame>
  );
}
