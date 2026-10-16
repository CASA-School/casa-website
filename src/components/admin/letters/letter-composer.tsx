'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { InlinePanel, InlineText } from '@/components/admin/letters/inline-edit';
import ed from '@/components/admin/letters/letter-edit.module.css';
import { LetterSheet, type LetterSlots } from '@/components/admin/letters/letter-sheet';
import { PrintCopy, printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import {
  bookingConfirmationLetter,
  paymentReceiptLetter,
  STANDARD_SLOTS,
  waitlistLetter,
  type BookingLetterContext,
  type LetterChoices,
  type WaitlistLetterContext,
} from '@/lib/admin/letters/booking-letters';
import { subjectLine, type BookingLetterKind, type LetterLanguage, type LetterPart, type WaitlistLetterKind } from '@/lib/admin/letters/types';
import { cn } from '@/lib/utils';

/**
 * Writing a booking's or a waiting-list entry's letter (docs/LETTERS.md): the letter on its A4
 * sheet, changed where it stands — the opening and the closing are CASA's standard texts until
 * somebody changes them, for this letter or as the new standard; the sentences built from figures
 * (what to pay, a place in the queue, the next start) are changed for this letter only; a note can
 * be added. Beside it: the language, which address, a receipt's payments, and the letters already
 * sent. "Als gesendet speichern" sends the choices — the server builds the letter again from the
 * record and keeps it as it went out.
 */

export type ComposerContext =
  | { type: 'booking'; kind: BookingLetterKind; ctx: BookingLetterContext }
  | { type: 'waitlist'; kind: WaitlistLetterKind; ctx: WaitlistLetterContext };

type Standards = Record<LetterLanguage, Record<string, string>>;

const COMPUTED_SLOTS = ['payment', 'position', 'next'];

export function LetterComposer({
  source,
  standards: initialStandards,
  today,
  version,
  me,
  defaultLanguage,
  canIssue,
  canSetStandard,
  issueAction,
  saveStandardAction,
  hidden,
  kinds,
  sent,
  back,
  title,
  error,
}: {
  source: ComposerContext;
  standards: Standards;
  today: string;
  version: number;
  me: string | null;
  defaultLanguage: LetterLanguage;
  canIssue: boolean;
  canSetStandard: boolean;
  issueAction: (formData: FormData) => void | Promise<void>;
  saveStandardAction: (input: { kind: string; language: LetterLanguage; part: string; body: string }) => Promise<{ ok: boolean }>;
  /** The record and kind, for the form. */
  hidden: Record<string, string>;
  /** The other letters of this record, to switch to. */
  kinds: { label: string; href: string; active: boolean }[];
  sent: { id: string; label: string; detail: string }[];
  back: { href: string; label: string };
  title: string;
  error?: string;
}) {
  const { t } = useWsLang();
  const person = source.ctx.person;
  const [standards, setStandards] = useState(initialStandards);
  const [choices, setChoices] = useState<LetterChoices>({
    language: defaultLanguage,
    address: person.home ? 'home' : person.local ? 'local' : 'none',
    signatureId: me,
    texts: {},
    paymentIds: source.type === 'booking' && source.kind === 'payment_receipt' ? source.ctx.payments.slice(-1).map((p) => p.id) : [],
  });
  const [addingNote, setAddingNote] = useState(false);
  const lang = choices.language;
  const standard = standards[lang];
  const standardSlots = STANDARD_SLOTS[source.kind];

  const letter = useMemo(() => {
    const meta = { today, version };
    if (source.type === 'booking') {
      return source.kind === 'booking_confirmation'
        ? bookingConfirmationLetter(source.ctx, choices, standard, meta)
        : paymentReceiptLetter(source.ctx, choices, standard, meta);
    }
    return waitlistLetter(source.kind, source.ctx, choices, standard, meta);
  }, [source, choices, standard, today, version]);

  const setText = (slot: string, value: string | null) =>
    setChoices((prev) => {
      const texts = { ...prev.texts };
      if (value === null) delete texts[slot];
      else texts[slot] = value;
      return { ...prev, texts };
    });

  const partText = (slot: string) => {
    const part = letter.body.find((p): p is Extract<LetterPart, { type: 'text' }> => p.type === 'text' && p.slot === slot);
    return part?.text ?? '';
  };

  const saveStandard = async (slot: string, body: string) => {
    const result = await saveStandardAction({ kind: source.kind, language: lang, part: slot, body });
    if (!result.ok) return;
    setStandards((prev) => ({ ...prev, [lang]: { ...prev[lang], [slot]: body } }));
    setText(slot, null);
  };

  const slotLabel: Record<string, string> = {
    intro: t('Einleitung', 'Opening'),
    closing: t('Schluss', 'Closing'),
    ps: 'PS',
    payment: t('Zahlung', 'Payment'),
    position: t('Platz in der Warteliste', 'Place in the queue'),
    next: t('Nächster Termin', 'Next start'),
  };

  // A text part, editable where it stands: a standard text, or a sentence built from figures.
  function renderSlot(slot: string) {
    const own = choices.texts[slot] != null;
    if (standardSlots.includes(slot)) {
      return (
        <InlineText
          multiline
          label={slotLabel[slot]}
          value={choices.texts[slot] ?? standard[slot] ?? ''}
          state={own ? 'changed' : 'standard'}
          onChange={(v) => setText(slot, v === standard[slot] ? null : v)}
          onUseStandard={() => setText(slot, null)}
          onSaveStandard={canSetStandard && own ? () => saveStandard(slot, choices.texts[slot]!) : undefined}
        />
      );
    }
    return (
      <InlineText
        multiline
        label={slotLabel[slot]}
        value={partText(slot)}
        state={own ? 'changed' : undefined}
        onChange={(v) => setText(slot, v)}
        onUseStandard={own ? () => setText(slot, null) : undefined}
      />
    );
  }

  const slots: LetterSlots = canIssue
    ? {
        text: {
          ...Object.fromEntries([...standardSlots, ...COMPUTED_SLOTS].map((slot) => [slot, () => renderSlot(slot)])),
          note: (note) =>
            note || addingNote ? (
              <InlineText
                multiline
                startOpen={addingNote}
                label={t('Hinweis', 'Note')}
                value={choices.texts.note ?? ''}
                placeholder={lang === 'de' ? 'Ein Hinweis für diesen Brief' : 'A note for this letter'}
                onChange={(v) => setText('note', v)}
                onClose={() => {
                  setAddingNote(false);
                  if (!choices.texts.note?.trim()) setText('note', null);
                }}
              />
            ) : (
              <button type="button" className={ed.addNote} onClick={() => setAddingNote(true)}>
                + {lang === 'de' ? 'Hinweis' : 'Note'}
              </button>
            ),
        },
        signatureName: (name) => (
          <InlinePanel
            label={t('Unterschrift', 'Signed by')}
            width={280}
            panel={(close) => (
              <span className={ed.choices}>
                {source.ctx.staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`${ed.choice} ${s.id === choices.signatureId ? ed.choiceOn : ''}`}
                    onClick={() => {
                      setChoices((prev) => ({ ...prev, signatureId: s.id }));
                      close();
                    }}
                  >
                    {s.name}
                    {s.id === choices.signatureId ? <span>✓</span> : null}
                  </button>
                ))}
              </span>
            )}
          >
            {name ?? <span className={ed.placeholder}>{lang === 'de' ? 'Unterschrift' : 'Signature'}</span>}
          </InlinePanel>
        ),
      }
    : {};

  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const print = () => printLetter(`${subjectLine(letter)} ${name}`);
  const mail = person.email ? `mailto:${person.email}?subject=${encodeURIComponent(subjectLine(letter))}` : null;
  const addresses = [
    ...(person.home ? [{ key: 'home' as const, label: t('Zuhause', 'Home') }] : []),
    ...(person.local ? [{ key: 'local' as const, label: t('In Bremen', 'In Bremen') }] : []),
    { key: 'none' as const, label: t('Ohne Adresse', 'No address') },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={back.href} className="text-[0.8rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)]">
            ← {back.label}
          </Link>
          <h1 className="mt-1 text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={print}>
            {t('Drucken / PDF', 'Print / PDF')}
          </Button>
          {canIssue ? (
            <form action={issueAction}>
              {Object.entries(hidden).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <input type="hidden" name="language" value={choices.language} />
              <input type="hidden" name="address" value={choices.address} />
              <input type="hidden" name="signatureId" value={choices.signatureId ?? ''} />
              <input type="hidden" name="texts" value={JSON.stringify(choices.texts)} />
              {(choices.paymentIds ?? []).map((id) => (
                <input key={id} type="hidden" name="paymentIds" value={id} />
              ))}
              <Button type="submit" disabled={source.type === 'booking' && source.kind === 'payment_receipt' && !choices.paymentIds?.length}>
                {t('Als gesendet speichern', 'Save as sent')}
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {kinds.length > 1 ? (
        <nav aria-label={t('Briefe', 'Letters')} className="mb-4 inline-flex flex-wrap gap-0.5 rounded-xl border border-ws-line bg-white p-1">
          {kinds.map((k) => (
            <Link
              key={k.href}
              href={k.href}
              aria-current={k.active ? 'page' : undefined}
              className={cn(
                'inline-flex h-[30px] items-center rounded-lg px-3.5 text-[0.8rem] font-bold transition-colors',
                k.active ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
              )}
            >
              {k.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className="min-w-0">
          <LetterSheet letter={letter} slots={slots} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20" aria-label={t('Der Brief', 'The letter')}>
          <section className="rounded-3xl border border-ws-line bg-white">
            <h2 className="border-b border-ws-line px-4 py-3 text-sm font-extrabold text-[var(--casa-ink)]">{t('Einstellungen', 'Settings')}</h2>
            <Choice label={t('Sprache', 'Language')}>
              <Seg
                value={choices.language}
                options={[
                  ['de', 'Deutsch'],
                  ['en', 'English'],
                ]}
                onChange={(v) => setChoices((prev) => ({ ...prev, language: v, texts: {} }))}
              />
            </Choice>
            <Choice label={t('Adresse', 'Address')}>
              <Seg value={choices.address} options={addresses.map((a) => [a.key, a.label] as const)} onChange={(v) => setChoices((prev) => ({ ...prev, address: v }))} />
            </Choice>
            {source.type === 'booking' && source.kind === 'payment_receipt' ? (
              <Choice label={t('Zahlungen', 'Payments')}>
                <div className="space-y-1.5">
                  {source.ctx.payments.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2.5 text-[0.84rem]">
                      <input
                        type="checkbox"
                        checked={choices.paymentIds?.includes(p.id) ?? false}
                        onChange={(e) =>
                          setChoices((prev) => ({
                            ...prev,
                            paymentIds: e.target.checked ? [...(prev.paymentIds ?? []), p.id] : (prev.paymentIds ?? []).filter((x) => x !== p.id),
                          }))
                        }
                        className="size-4 accent-[var(--casa-ink-deep)]"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {new Date(`${p.date}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} · {p.subject}
                      </span>
                      <span className="font-semibold tabular-nums">{p.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </label>
                  ))}
                </div>
              </Choice>
            ) : null}
            {mail ? (
              <Choice label={t('E-Mail', 'Email')}>
                <a href={mail} className="truncate text-[0.84rem] font-semibold text-[var(--casa-accent-text)] hover:underline">
                  {person.email}
                </a>
              </Choice>
            ) : null}
          </section>

          {sent.length ? (
            <section className="rounded-3xl border border-ws-line bg-white">
              <h2 className="border-b border-ws-line px-4 py-3 text-sm font-extrabold text-[var(--casa-ink)]">{t('Schon gesendet', 'Already sent')}</h2>
              <ul className="p-1.5">
                {sent.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/letters/${s.id}`} className="flex flex-col rounded-xl px-3 py-2 text-[0.84rem] hover:bg-ws-sunk">
                      <span className="font-semibold text-[var(--casa-ink)]">{s.label}</span>
                      <span className="text-xs text-[var(--casa-muted)]">{s.detail}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
      <PrintCopy letter={letter} />
    </div>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ws-line-soft px-4 py-3 last:border-b-0">
      <span className="mb-2 block text-xs font-semibold text-[var(--casa-muted)]">{label}</span>
      {children}
    </div>
  );
}

function Seg<V extends string>({ value, options, onChange }: { value: V; options: readonly (readonly [V, string])[]; onChange: (v: V) => void }) {
  return (
    <span className="inline-flex flex-wrap gap-0.5 rounded-xl border border-ws-line bg-white p-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === value}
          onClick={() => onChange(key)}
          className={cn(
            'h-[28px] rounded-lg px-3 text-[0.8rem] font-semibold transition-colors',
            key === value ? 'bg-ws-sunk text-[var(--casa-ink)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
          )}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
