import type { ReactNode } from 'react';

import { Logo } from '@/components/ui/logo';
import type { LetterLine, OfferLetter } from '@/lib/admin/offers/document';

import s from './letter.module.css';

/**
 * The offer as the recipient sees it. One component for the letter view, the
 * versions that were sent and the printed PDF — the words and numbers are
 * `buildLetter()`'s; nothing here decides one.
 *
 * `slots` is how the letter view makes the page editable where it stands:
 * each slot receives the part as it would print and returns what to show in
 * its place. Print and the sent versions pass none.
 */
export type LetterSlots = {
  recipient?: (part: ReactNode) => ReactNode;
  salutation?: (part: ReactNode) => ReactNode;
  title?: (part: ReactNode) => ReactNode;
  intro?: (part: ReactNode) => ReactNode;
  lineText?: (line: LetterLine, part: ReactNode) => ReactNode;
  note?: (part: ReactNode) => ReactNode;
  validity?: (part: ReactNode) => ReactNode;
  closing?: (part: ReactNode) => ReactNode;
  signatureName?: (part: ReactNode) => ReactNode;
};

const as = (slot: ((part: ReactNode) => ReactNode) | undefined, part: ReactNode) => (slot ? slot(part) : part);

export function LetterSheet({
  letter,
  variant = 'screen',
  slots = {},
}: {
  letter: OfferLetter;
  variant?: 'screen' | 'print';
  slots?: LetterSlots;
}) {
  const [name, ...rest] = letter.signature.length > 1 ? letter.signature : [null, ...letter.signature];
  return (
    <div className={s.frame}>
      <article className={`${s.sheet} ${variant === 'screen' ? s.screen : ''}`} lang={letter.language}>
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
          {letter.subjectParts.lead}
          {' · '}
          {as(slots.title, letter.subjectParts.title)}
          {letter.subjectParts.version ? ` · ${letter.subjectParts.version}` : null}
        </p>

        <div className={s.para}>{as(slots.salutation, letter.salutation)}</div>
        <div className={s.para}>{as(slots.intro, letter.intro)}</div>

        {letter.heading ? <div className={s.heading}>{letter.heading}</div> : null}
        {letter.facts ? <div className={s.facts}>{letter.facts}</div> : null}

        {letter.blocks.map((block, i) => (
          <section key={i} className={s.block}>
            {block.heading ? <div className={s.blockHead}>{block.heading}</div> : null}
            <div className={s.rows}>
              {block.lines.length ? (
                block.lines.map((line, j) => (
                  <div key={j} className={s.row}>
                    <span className={s.rowText}>
                      {slots.lineText ? slots.lineText(line, line.text) : line.text || <span className={s.empty}>—</span>}
                    </span>
                    {line.amount != null ? <span>{line.amount}</span> : null}
                  </div>
                ))
              ) : (
                <div className={`${s.row} ${s.empty}`}>—</div>
              )}
            </div>
            <div className={s.total}>
              <span>{block.totalLabel}</span>
              <span>{block.total ?? '—'}</span>
            </div>
          </section>
        ))}

        {letter.escortSentence ? <p className={s.para}>{letter.escortSentence}</p> : null}
        {letter.groupTotal ? (
          <div className={s.group}>
            <span>{letter.groupTotal.label}</span>
            <span>{letter.groupTotal.amount}</span>
          </div>
        ) : null}

        {slots.validity ? (
          <div className={`${s.para} ${s.validity}`}>{slots.validity(letter.validity)}</div>
        ) : letter.validity ? (
          <p className={`${s.para} ${s.validity}`}>{letter.validity}</p>
        ) : null}
        {slots.note ? slots.note(letter.note) : letter.note ? <p className={s.para}>{letter.note}</p> : null}
        <div className={s.para}>{as(slots.closing, letter.closing)}</div>

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
