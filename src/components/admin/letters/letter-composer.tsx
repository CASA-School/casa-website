'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { InlinePanel, InlineText } from '@/components/admin/letters/inline-edit';
import ed from '@/components/admin/letters/letter-edit.module.css';
import { LetterSheet, type LetterSlots } from '@/components/admin/letters/letter-sheet';
import { LETTER_KIND_LOOK, LetterKindIcon, LOCK } from '@/components/admin/letters/letter-kind';
import { PrintCopy, printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import {
  buildBookingLetter,
  learnerConfirmationLetter,
  learnerLetterBlock,
  MISSING_ITEM_LABELS,
  MISSING_ITEMS,
  registrationLetter,
  STANDARD_SLOTS,
  waitlistLetter,
  type BookingLetterContext,
  type LearnerLetterContext,
  type LetterChoices,
  type RegistrationLetterContext,
  type WaitlistLetterContext,
} from '@/lib/admin/letters/booking-letters';
import {
  subjectLine,
  type BookingLetterKind,
  type LetterKind,
  type LetterLanguage,
  type LetterPart,
  type RegistrationLetterKind,
  type WaitlistLetterKind,
} from '@/lib/admin/letters/types';
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
  | { type: 'waitlist'; kind: WaitlistLetterKind; ctx: WaitlistLetterContext }
  | { type: 'learner'; kind: 'learner_confirmation'; ctx: LearnerLetterContext }
  | { type: 'registration'; kind: RegistrationLetterKind; ctx: RegistrationLetterContext };

type Standards = Record<LetterLanguage, Record<string, string>>;

/** One kind of letter in the switcher, with where it stands for this record. */
export type LetterKindItem = {
  kind: LetterKind;
  label: string;
  href: string;
  active: boolean;
  /** The day it last went out ("12. Okt."), and how often it did. */
  sentOn: string | null;
  count: number;
  /** Why it cannot go out now; it still opens, to read and print. */
  blocked: string | null;
  /** Due now, from what the record is and what was sent (`letters/suggest.ts`); `rank` 0 the most urgent. */
  suggested: boolean;
  rank?: number;
};

const COMPUTED_SLOTS = ['payment', 'position', 'next', 'open', 'enrolled', 'lessons', 'request', 'start', 'certify', 'money', 'test', 'deposit', 'place', 'arrive', 'ready'];

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
  kindGroups,
  sent,
  history,
  blocked,
  initialAddress,
  initialItems,
  initialBookingIds,
  back,
  title,
  subtitle,
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
  /** The record's kinds of letter, by stage, each with where it stands: the switcher beside the page. */
  kindGroups?: { label: string; items: LetterKindItem[] }[];
  sent: { id: string; label: string; detail: string }[];
  /** The record's letters already sent, by kind and day: what the rules and some sentences read. */
  history?: { kind: string; date: string }[];
  /** Why this letter cannot go out now; the preview stays. */
  blocked?: string | null;
  initialAddress?: 'home' | 'local' | 'none';
  initialItems?: string[];
  /** The confirmation of several bookings: which are ticked when it opens. */
  initialBookingIds?: string[];
  back: { href: string; label: string };
  /** The kind's name, and whom and what it is for ("Kenji Sato · B-2026-0003"). */
  title: string;
  subtitle?: string;
  error?: string;
}) {
  const { t } = useWsLang();
  const person = source.ctx.person;
  const [standards, setStandards] = useState(initialStandards);
  const [choices, setChoices] = useState<LetterChoices>({
    language: defaultLanguage,
    address: initialAddress ?? (person.home ? 'home' : person.local ? 'local' : 'none'),
    signatureId: me,
    texts: {},
    paymentIds: source.type === 'booking' && source.kind === 'payment_receipt' ? source.ctx.payments.slice(-1).map((p) => p.id) : [],
    items: initialItems ?? [],
    bookingIds: initialBookingIds ?? [],
  });
  const [addingNote, setAddingNote] = useState(false);
  const lang = choices.language;
  const standard = standards[lang];
  const standardSlots = STANDARD_SLOTS[source.kind];

  const letter = useMemo(() => {
    const meta = { today, version, sent: history };
    if (source.type === 'booking') return buildBookingLetter(source.kind, source.ctx, choices, standard, meta);
    if (source.type === 'learner') return learnerConfirmationLetter(source.ctx, choices, standard, meta);
    if (source.type === 'registration') return registrationLetter(source.kind, source.ctx, choices, standard, meta);
    return waitlistLetter(source.kind, source.ctx, choices, standard, meta);
  }, [source, choices, standard, today, version, history]);

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

  const labels: Record<string, string> = {
    intro: t('Einleitung', 'Opening'),
    closing: t('Schluss', 'Closing'),
    ps: 'PS',
    payment: t('Zahlung', 'Payment'),
    position: t('Platz in der Warteliste', 'Place in the queue'),
    next: t('Nächster Termin', 'Next start'),
    open: t('Offener Betrag', 'Amount outstanding'),
    ways: t('Wie zahlen', 'How to pay'),
    enrolled: t('Anmeldung', 'Enrolment'),
    lessons: t('Unterricht', 'Lessons'),
    programme: t('Programm', 'Programme'),
    contract: t('Vertrag', 'Contract'),
    request: t('Bitte', 'Request'),
    postpone: t('Verschiebung', 'Postponement'),
    start: t('Kursbeginn', 'Course start'),
    practical: t('Praktisches', 'Practical'),
    certify: t('Bestätigung', 'Confirmation'),
    money: t('Betrag', 'Amount'),
    test: t('Einstufungstest', 'Placement test'),
    deposit: t('Anzahlung', 'Down payment'),
    reference: t('Verwendungszweck', 'Payment reference'),
    visa: t('Visum', 'Visa'),
    place: t('Ort', 'Place'),
    id: t('Name und Ausweis', 'Name and ID'),
    rules: t('Regeln', 'Rules'),
    arrive: t('Ankunft', 'Arrival'),
    bring: t('Mitbringen', 'What to bring'),
    oral: t('Mündlicher Teil', 'Oral part'),
    part: t('Ein Teil', 'One part'),
    ready: t('Ergebnis', 'Result'),
    collect: t('Abholen', 'Collecting'),
    proxy: t('Vollmacht', 'Authorisation'),
  };
  // Every editable part has a name on its bar; one without its own is simply "Text".
  const slotLabel = new Proxy(labels, { get: (target, key: string) => target[key] ?? t('Text', 'Text') });

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
  const addresses = [
    ...(person.home ? [{ key: 'home' as const, label: t('Zuhause', 'Home') }] : []),
    ...(person.local ? [{ key: 'local' as const, label: t('In Bremen', 'In Bremen') }] : []),
    { key: 'none' as const, label: t('Ohne Adresse', 'No address') },
  ];

  // Where the letter shown stands: sent before, and when, or not yet.
  const current = kindGroups?.flatMap((g) => g.items).find((k) => k.active) ?? null;
  const all = kindGroups?.flatMap((g) => g.items) ?? [];
  const next = all.filter((k) => k.suggested && !k.active).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0] ?? null;
  // The chip row on a phone opens with the letter shown in view, without moving the page.
  const chips = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = chips.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && active) row.scrollLeft = active.offsetLeft - row.clientWidth / 2 + active.clientWidth / 2;
  }, [source.kind]);

  return (
    <div>
      <Link href={back.href} className="text-[0.8rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)]">
        ← {back.label}
      </Link>
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <LetterKindIcon kind={source.kind} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">{title}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.86rem] text-[var(--casa-muted)]">
              {subtitle ? <span>{subtitle}</span> : null}
              {subtitle ? <span aria-hidden="true">·</span> : null}
              {current?.sentOn ? (
                <span className="font-semibold text-[#17693a]">
                  {current.count > 1 ? t(`${current.count}× gesendet, zuletzt am ${current.sentOn}`, `sent ${current.count}×, last on ${current.sentOn}`) : t(`Gesendet am ${current.sentOn}`, `Sent on ${current.sentOn}`)}
                </span>
              ) : (
                <span>{t('Noch nicht gesendet', 'Not sent yet')}</span>
              )}
            </p>
          </div>
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
              {(choices.items ?? []).map((item) => (
                <input key={item} type="hidden" name="items" value={item} />
              ))}
              {(choices.bookingIds ?? []).map((id) => (
                <input key={id} type="hidden" name="bookingIds" value={id} />
              ))}
              <Button
                type="submit"
                disabled={
                  Boolean(blocked) ||
                  (source.type === 'learner' && Boolean(learnerLetterBlock(source.ctx, choices))) ||
                  (source.type === 'booking' && source.kind === 'payment_receipt' && !choices.paymentIds?.length) ||
                  (source.type === 'booking' && source.kind === 'missing_items' && !choices.items?.length)
                }
              >
                {t('Als gesendet speichern', 'Save as sent')}
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {blocked ? (
        <p role="status" className="mb-4 flex items-center gap-2.5 rounded-2xl bg-[#fff8e6] px-4 py-3 text-[0.88rem] text-[#5c3d00] ring-1 ring-[#efdca4] ring-inset">
          <span className="shrink-0 text-[#9a6b00]">{LOCK}</span>
          {blocked}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      {/* A phone or a tablet: the kinds as chips above the letter; a wide screen: beside it, above the settings. */}
      {kindGroups && all.length > 1 ? (
        <nav ref={chips} aria-label={t('Briefe', 'Letters')} className="-mx-4 mb-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] xl:hidden [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-1.5">
            {all.map((k) => (
              <li key={k.href}>
                <Link
                  href={k.href}
                  aria-current={k.active ? 'page' : undefined}
                  title={k.blocked ?? undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-[0.82rem] font-semibold whitespace-nowrap transition-colors',
                    k.active ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white' : 'border-ws-line bg-white text-[var(--casa-ink)]',
                    k.blocked && !k.active && 'text-[var(--casa-muted)]'
                  )}
                >
                  <LetterKindIcon kind={k.kind} className={cn('rounded-full', k.blocked && !k.active && 'opacity-55 grayscale')} />
                  {k.label}
                  {k.suggested ? <span className={cn('size-2 rounded-full', k.active ? 'bg-white' : 'bg-[#0b7fc0]')} aria-label={t('Vorschlag', 'Due')} /> : k.sentOn ? <span className={k.active ? 'text-white/75' : 'text-[#17693a]'}>✓</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0">
          <LetterSheet letter={letter} slots={slots} />
        </div>

        <aside className="space-y-4" aria-label={t('Der Brief', 'The letter')}>
          {kindGroups && all.length > 1 ? (
            <nav aria-label={t('Briefe', 'Letters')} className="hidden rounded-3xl border border-ws-line bg-white xl:block">
              <h2 className="border-b border-ws-line px-4 py-3 text-sm font-extrabold text-[var(--casa-ink)]">{t('Briefe', 'Letters')}</h2>
              {next ? (
                // What is due now, when it is not the letter open.
                <Link
                  href={next.href}
                  className="mx-2 mt-2 flex items-center gap-3 rounded-2xl bg-[#eef6fd] px-3 py-2.5 ring-1 ring-[#cfe5f7] transition-colors ring-inset hover:bg-[#e3f0fb]"
                >
                  <LetterKindIcon kind={next.kind} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.72rem] font-semibold text-[#065f8c]">{t('Als Nächstes', 'Next')}</span>
                    <span className="block truncate text-[0.88rem] font-bold text-[var(--casa-ink)]">{next.label}</span>
                  </span>
                  <span className="text-[#065f8c]">{Icon.chevronRight}</span>
                </Link>
              ) : null}
              <div className="space-y-2.5 p-2">
                {kindGroups.map((group) => (
                  <div key={group.label}>
                    <span className="block px-2 pt-1 pb-1 text-[0.72rem] font-semibold text-[var(--casa-muted)]">{group.label}</span>
                    <ul className="space-y-0.5">
                      {group.items.map((k) => (
                        <li key={k.href}>
                          <KindRow item={k} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          ) : null}
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
            {source.type === 'learner' ? (
              <Choice label={t('Buchungen', 'Bookings')}>
                <div className="space-y-1.5">
                  {source.ctx.bookings.map((b) => (
                    <label key={b.id} className={cn('flex cursor-pointer items-start gap-2.5 text-[0.84rem]', b.status === 'cancelled' && 'opacity-50')}>
                      <input
                        type="checkbox"
                        disabled={b.status === 'cancelled'}
                        checked={choices.bookingIds?.includes(b.id) ?? false}
                        onChange={(e) =>
                          setChoices((prev) => ({
                            ...prev,
                            bookingIds: e.target.checked ? [...(prev.bookingIds ?? []), b.id] : (prev.bookingIds ?? []).filter((x) => x !== b.id),
                          }))
                        }
                        className="mt-0.5 size-4 accent-[var(--casa-ink-deep)]"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold">{b.course ? [b.course.name[lang], b.course.level].filter(Boolean).join(' ') : (b.exam?.name ?? b.number)}</span>
                        <span className="block text-xs text-[var(--casa-muted)]">
                          {b.number}
                          {b.course || b.exam
                            ? ` · ${new Date(`${b.course?.startDate ?? b.exam?.day}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
                            : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </Choice>
            ) : null}
            {source.type === 'booking' && source.kind === 'missing_items' ? (
              <Choice label={t('Was fehlt', 'What is missing')}>
                <div className="space-y-1.5">
                  {MISSING_ITEMS.map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-2.5 text-[0.84rem]">
                      <input
                        type="checkbox"
                        checked={choices.items?.includes(item) ?? false}
                        onChange={(e) =>
                          setChoices((prev) => ({
                            ...prev,
                            items: e.target.checked ? [...(prev.items ?? []), item] : (prev.items ?? []).filter((x) => x !== item),
                          }))
                        }
                        className="size-4 accent-[var(--casa-ink-deep)]"
                      />
                      {MISSING_ITEM_LABELS[item][lang]}
                    </label>
                  ))}
                </div>
              </Choice>
            ) : null}
            {person.email ? (
              <Choice label={t('E-Mail', 'Email')}>
                <span className="truncate text-[0.84rem] font-semibold text-[var(--casa-ink)]">{person.email}</span>
              </Choice>
            ) : null}
          </section>

          {sent.length ? (
            <section className="rounded-3xl border border-ws-line bg-white">
              <h2 className="border-b border-ws-line px-4 py-3 text-sm font-extrabold text-[var(--casa-ink)]">{t('Verlauf', 'History')}</h2>
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


/** A kind of letter in the switcher: its mark and name, and where it stands — due now, sent, or not yet possible. */
function KindRow({ item }: { item: LetterKindItem }) {
  const { t } = useWsLang();
  const look = LETTER_KIND_LOOK[item.kind];
  return (
    <Link
      href={item.href}
      aria-current={item.active ? 'page' : undefined}
      title={item.blocked ?? undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[0.84rem] font-semibold transition-colors',
        item.active ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-ink)] hover:bg-ws-sunk',
        item.blocked && !item.active && 'text-[var(--casa-muted)]'
      )}
    >
      <LetterKindIcon kind={item.kind} className={cn(item.blocked && !item.active && 'opacity-55 grayscale', item.active && look.tint === 'ink' && 'ring-1 ring-white/30')} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.suggested ? (
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-bold', item.active ? 'bg-white/15 text-white' : 'bg-[#e3f4fc] text-[#065f8c]')}>
          {t('Vorschlag', 'Due')}
        </span>
      ) : item.sentOn ? (
        <span className={cn('shrink-0 text-[0.72rem] font-semibold tabular-nums', item.active ? 'text-white/75' : 'text-[#17693a]')}>
          ✓ {item.sentOn}
        </span>
      ) : item.blocked ? (
        <span className={cn('shrink-0', item.active ? 'text-white/60' : 'text-[var(--casa-text-subtle)]')} aria-label={item.blocked}>
          {LOCK}
        </span>
      ) : null}
    </Link>
  );
}
