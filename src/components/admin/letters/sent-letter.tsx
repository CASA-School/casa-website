'use client';

import Link from 'next/link';

import { useWsLang } from '@/components/admin/lang';
import { LetterSheet } from '@/components/admin/letters/letter-sheet';
import { PrintCopy, printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import { subjectLine, type Letter } from '@/lib/admin/letters/types';

/**
 * A letter as it went out (docs/LETTERS.md): to print, save as a PDF and email. Just after it was
 * saved, a line says what to do next — the workspace does not send mail itself yet.
 */
export function SentLetter({
  letter,
  email,
  recipientName,
  sentLine,
  back,
  justSent,
}: {
  letter: Letter;
  email: string | null;
  recipientName: string;
  sentLine: string;
  back: { href: string; label: string };
  justSent: boolean;
}) {
  const { t } = useWsLang();
  const subject = subjectLine(letter);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={back.href} className="text-[0.8rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)]">
            ← {back.label}
          </Link>
          <h1 className="mt-1 text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">{subject}</h1>
          <p className="mt-0.5 text-[0.84rem] text-[var(--casa-muted)]">{sentLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {email ? (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}
              className="inline-flex h-9 items-center rounded-lg border border-ws-line bg-white px-3.5 text-sm font-semibold text-[var(--casa-ink)] hover:bg-ws-sunk"
            >
              {t(`E-Mail an ${recipientName}`, `Email ${recipientName}`)}
            </a>
          ) : null}
          <Button type="button" onClick={() => printLetter(`${subject} ${recipientName}`)}>
            {t('Drucken / PDF', 'Print / PDF')}
          </Button>
        </div>
      </div>
      {justSent ? (
        <p role="status" className="mb-4 rounded-2xl bg-[#e9f6ee] px-4 py-3 text-[0.88rem] text-[#14532d] ring-1 ring-[#b7dfc6] ring-inset">
          {t(
            'Gespeichert, so wie er rausgeht. Jetzt als PDF speichern und mit der E-Mail schicken, oder drucken.',
            'Saved as it goes out. Now save it as a PDF and attach it to the email, or print it.'
          )}
        </p>
      ) : null}
      <div className="mx-auto max-w-[860px]">
        <LetterSheet letter={letter} />
      </div>
      <PrintCopy letter={letter} />
    </div>
  );
}
