'use client';

import { useState } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { Input } from '@/components/admin/ui';
import { PAYMENT_SUBJECTS } from '@/lib/admin/booking-levels';
import { pick, wsLocale } from '@/lib/admin/i18n';

/**
 * A payment's amount and what it is for (2026-10-17). The amount starts empty — a payment is what came
 * in, not what is owed — with the open amount one click away; „Wofür" is the office's few answers, the
 * German word stored, and „Sonstiges" takes the colleague's own words.
 */
export function PaymentAmountField({ id, open }: { id: string; open: number }) {
  const { t, lang } = useWsLang();
  const [value, setValue] = useState('');
  const shown = new Intl.NumberFormat(wsLocale(lang), { style: 'currency', currency: 'EUR' }).format(open);
  return (
    <div className="space-y-1.5">
      <Input id={id} name="amount" inputMode="decimal" required className="text-right" value={value} onChange={(e) => setValue(e.target.value)} />
      {open > 0.005 ? (
        <button
          type="button"
          onClick={() => setValue(open.toFixed(2).replace('.', ','))}
          className="rounded-full border border-ws-line bg-white px-2.5 py-0.5 text-[0.76rem] font-semibold text-[#9a5b00] tabular-nums transition-colors hover:border-[#d9b65c] hover:bg-[#fff8e6] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30 focus-visible:outline-none"
        >
          {t(`Offen: ${shown}`, `Open: ${shown}`)}
        </button>
      ) : null}
    </div>
  );
}

const OTHER = 'other';

export function PaymentSubjectField() {
  const { t, lang } = useWsLang();
  const [choice, setChoice] = useState('');
  const [other, setOther] = useState('');
  const chip =
    'flex cursor-pointer items-center gap-2 rounded-lg border border-ws-line-firm bg-white px-3 py-1.5 text-[0.84rem] font-semibold text-[var(--casa-ink)] transition-colors has-[:checked]:border-[var(--casa-ink)] has-[:checked]:bg-[#edf0f5]';
  return (
    <fieldset>
      <legend className="mb-2 text-[0.8rem] font-semibold text-[var(--casa-ink)]">{t('Wofür', 'For')}</legend>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_SUBJECTS.map((s) => (
          <label key={s.de} className={chip}>
            <input type="radio" name="subjectChoice" value={s.de} required checked={choice === s.de} onChange={() => setChoice(s.de)} className="accent-[var(--casa-ink)]" />
            {pick(lang, s)}
          </label>
        ))}
        <label className={chip}>
          <input type="radio" name="subjectChoice" value={OTHER} required checked={choice === OTHER} onChange={() => setChoice(OTHER)} className="accent-[var(--casa-ink)]" />
          {t('Sonstiges', 'Other')}
        </label>
      </div>
      {choice === OTHER ? (
        <Input
          name="subjectOther"
          aria-label={t('Wofür', 'For')}
          required
          maxLength={160}
          autoFocus
          className="mt-2"
          value={other}
          onChange={(e) => setOther(e.target.value)}
        />
      ) : null}
      <input type="hidden" name="subject" value={choice === OTHER ? other : choice} />
    </fieldset>
  );
}
