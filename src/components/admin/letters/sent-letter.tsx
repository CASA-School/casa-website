'use client';

import Link from 'next/link';

import { useWsLang } from '@/components/admin/lang';
import { LetterKindIcon } from '@/components/admin/letters/letter-kind';
import { LetterSheet } from '@/components/admin/letters/letter-sheet';
import { PrintCopy, printLetter } from '@/components/admin/letters/print';
import { Icon } from '@/components/admin/icons';
import { Button, ButtonLink } from '@/components/admin/ui';
import { subjectLine, type Letter } from '@/lib/admin/letters/types';

/**
 * A letter as it went out (docs/LETTERS.md): to print, or to send by mail on the workspace's mail screen
 * (the letter as a PDF, directly or from Outlook).
 */
export function SentLetter({
  letter,
  email,
  recipientName,
  sentLine,
  back,
  justSent,
  mailHref,
}: {
  letter: Letter;
  email: string | null;
  recipientName: string;
  sentLine: string;
  back: { href: string; label: string };
  justSent: boolean;
  /** The mail screen for this letter, for whoever may send it (docs/LETTERS.md §Sending). */
  mailHref: string | null;
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
          <div className="mt-2 flex items-center gap-3.5">
            <LetterKindIcon kind={letter.kind} size="lg" />
            <div className="min-w-0">
              <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">{subject}</h1>
              <p className="mt-0.5 text-[0.84rem] text-[var(--casa-muted)]">{sentLine}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={mailHref ? 'secondary' : 'primary'} onClick={() => printLetter(`${subject} ${recipientName}`)}>
            {t('Drucken / PDF', 'Print / PDF')}
          </Button>
          {mailHref ? (
            <ButtonLink href={mailHref} variant="primary">
              {Icon.mail}
              {email ? t(`Per E-Mail an ${recipientName}`, `Email ${recipientName}`) : t('Per E-Mail senden', 'Send by e-mail')}
            </ButtonLink>
          ) : null}
        </div>
      </div>
      {justSent ? (
        <p role="status" className="mb-4 rounded-2xl bg-[#e9f6ee] px-4 py-3 text-[0.88rem] text-[#14532d] ring-1 ring-[#b7dfc6] ring-inset">
          {t('Gespeichert, so wie er rausgeht.', 'Saved as it goes out.')}
        </p>
      ) : null}
      <div className="mx-auto max-w-[860px]">
        <LetterSheet letter={letter} />
      </div>
      <PrintCopy letter={letter} />
    </div>
  );
}
