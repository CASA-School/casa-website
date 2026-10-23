'use client';

import { useState } from 'react';

import { addChargeAction } from './actions';
import { DialogFooter } from '@/components/admin/dialogs';
import { useWsLang } from '@/components/admin/lang';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import type { ChargeSuggestion } from '@/lib/admin/booking-offer';
import { cn } from '@/lib/utils';

const euro = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * A cost line added to a booking (Rahman, 2026-10-23: „the system is not so intelligent that it asks me to
 * do the costs and description manually"): choose the kind, and the price list offers what CASA charges for
 * it — every book with its price, the booking's own level first; the fees; the exams. A click fills the
 * words and the amount, both still open to change; a line of one's own is typed as before.
 */
export function ChargeFormFields({
  bookingId,
  kinds,
  suggestions,
  charged,
}: {
  bookingId: string;
  kinds: { value: string; label: string }[];
  suggestions: ChargeSuggestion[];
  /** The lines already on the booking, by their words: marked, and never chosen for the colleague. */
  charged: string[];
}) {
  const { t } = useWsLang();
  const onBooking = (s: ChargeSuggestion) => charged.includes(s.description.toLocaleLowerCase('de'));
  // The obvious line, chosen already: the one book of the booking's level not yet charged, or a kind's only fee.
  const obvious = (k: string) => {
    const list = suggestions.filter((s) => s.kind === k && !onBooking(s));
    const own = list.filter((s) => s.ownLevel);
    return own.length === 1 ? own[0] : list.length === 1 && suggestions.filter((s) => s.kind === k).length === 1 ? list[0] : null;
  };
  const first = obvious('books');
  const [kind, setKind] = useState('books');
  const [description, setDescription] = useState(first?.description ?? '');
  const [amount, setAmount] = useState(first ? euro(first.amount) : '');
  const [picked, setPicked] = useState<ChargeSuggestion | null>(first);
  const [query, setQuery] = useState('');

  const forKind = suggestions.filter((s) => s.kind === kind);
  const q = query.trim().toLocaleLowerCase('de');
  const shown = q ? forKind.filter((s) => s.description.toLocaleLowerCase('de').includes(q)) : forKind;
  // Not yet on the booking first; the booking's level before the rest.
  const ordered = [...shown].sort((a, b) => Number(onBooking(a)) - Number(onBooking(b)));
  const own = ordered.filter((s) => s.ownLevel);
  const rest = ordered.filter((s) => !s.ownLevel);

  const pick = (s: ChargeSuggestion) => {
    setPicked(s);
    setDescription(s.description);
    setAmount(euro(s.amount));
  };

  const row = (s: ChargeSuggestion) => (
    <li key={s.key}>
      <button
        type="button"
        onClick={() => pick(s)}
        aria-pressed={picked?.key === s.key}
        className={cn(
          'flex w-full items-center gap-3 px-3.5 py-2 text-left text-[0.86rem] transition-colors outline-none focus-visible:bg-[var(--ws-row-hover)]',
          picked?.key === s.key ? 'bg-[#eef3fb] font-semibold text-[var(--casa-ink)]' : 'text-[var(--casa-ink)] hover:bg-[var(--ws-row-hover)]'
        )}
      >
        <span className="min-w-0 flex-1 truncate">{s.description}</span>
        {onBooking(s) ? <span className="shrink-0 text-[0.74rem] font-medium text-[var(--casa-muted)]">{t('auf der Buchung', 'on the booking')}</span> : null}
        <span className="shrink-0 tabular-nums">{euro(s.amount)} €</span>
      </button>
    </li>
  );

  return (
    <form action={addChargeAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="kind" value={kind} />
      {picked && picked.description === description && euro(picked.amount) === amount ? (
        <>
          <input type="hidden" name="chargeTypeCode" value={picked.chargeTypeCode ?? ''} />
          <input type="hidden" name="rateId" value={picked.rateId ?? ''} />
        </>
      ) : null}

      <Field label={t('Art', 'Kind')} htmlFor="charge-kind">
        <Select
          id="charge-kind"
          value={kind}
          onChange={(e) => {
            const next = obvious(e.target.value);
            setKind(e.target.value);
            setPicked(next);
            setDescription(next?.description ?? '');
            setAmount(next ? euro(next.amount) : '');
            setQuery('');
          }}
        >
          {kinds.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>

      {forKind.length ? (
        <div className="overflow-hidden rounded-xl border border-ws-line">
          {forKind.length > 6 ? (
            <div className="border-b border-ws-line-soft p-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Suchen …', 'Search …')} aria-label={t('In der Preisliste suchen', 'Search the price list')} className="h-9" />
            </div>
          ) : null}
          <div className="max-h-[15rem] overflow-y-auto">
            {own.length ? (
              <>
                <p className="bg-[#f6f8fb] px-3.5 py-1.5 text-[0.74rem] font-semibold text-[var(--casa-muted)]">{t('Zum Niveau der Buchung', 'For the booking’s level')}</p>
                <ul className="divide-y divide-ws-line-soft">{own.map(row)}</ul>
                {rest.length ? <p className="bg-[#f6f8fb] px-3.5 py-1.5 text-[0.74rem] font-semibold text-[var(--casa-muted)]">{t('Weitere', 'More')}</p> : null}
              </>
            ) : null}
            <ul className="divide-y divide-ws-line-soft">{rest.map(row)}</ul>
            {!shown.length ? <p className="px-3.5 py-2.5 text-[0.84rem] text-[var(--casa-muted)]">{t('Nichts gefunden', 'Nothing found')}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_9rem] gap-3">
        <Field label={t('Beschreibung', 'Description')} htmlFor="charge-desc">
          <Input id="charge-desc" name="description" required maxLength={160} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={t('Betrag', 'Amount')} htmlFor="charge-amount">
          <Input id="charge-amount" name="amount" inputMode="decimal" required className="text-right" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
      <p className="text-[0.76rem] text-[var(--casa-muted)]">{t('Negativ für eine Erstattung oder Stornierung', 'Negative for a refund or cancellation')}</p>
      <DialogFooter>
        <Button type="submit">{t('Posten hinzufügen', 'Add line')}</Button>
      </DialogFooter>
    </form>
  );
}
