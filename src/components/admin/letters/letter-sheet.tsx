import type { ReactNode } from 'react';

import { Logo } from '@/components/ui/logo';
import type { Letter, LetterRow } from '@/lib/admin/letters/types';

import s from './letter-sheet.module.css';

/**
 * A CASA letter as the recipient sees it — any kind, on CASA's A4 letterhead.
 * One component for the letter view, the letters that were sent, the printed
 * PDF and the small preview beside an offer; the words and numbers are the
 * `Letter`'s, nothing here decides one.
 *
 * `slots` is how a letter view makes the page editable where it stands: each
 * slot receives the part as it would print and returns what to show in its
 * place. A text part is found by its `slot` name. Print and the sent letters
 * pass none.
 */
export type LetterSlots = {
  recipient?: (part: ReactNode) => ReactNode;
  salutation?: (part: ReactNode) => ReactNode;
  title?: (part: ReactNode) => ReactNode;
  signatureName?: (part: ReactNode) => ReactNode;
  text?: Record<string, (part: ReactNode) => ReactNode>;
  row?: (row: LetterRow) => ReactNode;
};

const as = (slot: ((part: ReactNode) => ReactNode) | undefined, part: ReactNode) => (slot ? slot(part) : part);

export function LetterSheet({
  letter,
  variant = 'screen',
  slots = {},
}: {
  letter: Letter;
  variant?: 'screen' | 'print' | 'thumb';
  slots?: LetterSlots;
}) {
  const [name, ...rest] = letter.signature.length > 1 ? letter.signature : [null, ...letter.signature];
  return (
    <div className={s.frame}>
      <article className={`${s.sheet} ${variant === 'screen' ? s.screen : ''}`} lang={letter.language} aria-hidden={variant === 'thumb' || undefined}>
        <div className={`${s.stripe} casa-logo-stripe`} aria-hidden />
        <header className={s.head}>
          <div className={s.address}>
            <div className={s.returnAddress}>{letter.returnAddress}</div>
            {as(
              slots.recipient,
              <div className={s.recipient}>
                {letter.recipient.length ? letter.recipient.map((line, i) => <div key={i}>{line}</div>) : <div className={s.empty}>—</div>}
              </div>
            )}
          </div>
          <Logo className={s.logo} />
        </header>

        <div className={s.date}>{letter.placeDate}</div>
        <p className={s.subject} role="heading" aria-level={2}>
          {letter.subject.lead}
          {letter.subject.title || slots.title ? ' · ' : null}
          {as(slots.title, letter.subject.title)}
          {letter.subject.tail ? ` · ${letter.subject.tail}` : null}
        </p>

        <div className={s.para}>{as(slots.salutation, letter.salutation)}</div>

        {letter.body.map((part, i) => {
          if (part.type === 'text') {
            const slot = part.slot ? slots.text?.[part.slot] : undefined;
            if (slot) return <div key={i} className={`${s.para} ${part.strong ? s.strong : ''}`}>{slot(part.text)}</div>;
            return part.text ? (
              <p key={i} className={`${s.para} ${part.strong ? s.strong : ''}`}>
                {part.text}
              </p>
            ) : null;
          }
          if (part.type === 'heading') {
            return (
              <div key={i}>
                <div className={s.heading}>{part.text}</div>
                {part.detail ? <div className={s.facts}>{part.detail}</div> : null}
              </div>
            );
          }
          if (part.type === 'sum') {
            return (
              <div key={i} className={s.group}>
                <span>{part.label}</span>
                <span>{part.amount}</span>
              </div>
            );
          }
          return (
            <section key={i} className={s.block}>
              {part.heading ? <div className={s.blockHead}>{part.heading}</div> : null}
              <div className={s.rows}>
                {part.rows.length ? (
                  part.rows.map((row, j) => (
                    <div key={j} className={s.row}>
                      <span className={s.rowText}>{slots.row ? slots.row(row) : row.text || <span className={s.empty}>—</span>}</span>
                      {row.amount != null ? <span>{row.amount}</span> : null}
                    </div>
                  ))
                ) : (
                  <div className={`${s.row} ${s.empty}`}>—</div>
                )}
              </div>
              {part.total ? (
                <div className={s.total}>
                  <span>{part.total.label}</span>
                  <span>{part.total.amount ?? '—'}</span>
                </div>
              ) : null}
            </section>
          );
        })}

        <div className={s.signature}>
          <div>{letter.signOff}</div>
          {slots.signatureName ? <div>{slots.signatureName(name)}</div> : name ? <div>{name}</div> : null}
          {rest.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <div className={s.spacer} />
        <footer className={s.footer}>
          {letter.footer.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </footer>
      </article>
    </div>
  );
}

export const printRootClass = s.printRoot;
