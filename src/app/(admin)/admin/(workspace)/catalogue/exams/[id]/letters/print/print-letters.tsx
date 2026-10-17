'use client';

import Link from 'next/link';

import { useWsLang } from '@/components/admin/lang';
import { LetterSheet } from '@/components/admin/letters/letter-sheet';
import { PrintCopies, printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import { subjectLine, type Letter } from '@/lib/admin/letters/types';

/** A sitting's letters on screen, one after another; printed, a page each; one email to all, in BCC. */
export function PrintSittingLetters({ letters, back, title }: { letters: { letter: Letter; email: string | null }[]; back: { href: string; label: string }; title: string }) {
  const { t } = useWsLang();
  const emails = [...new Set(letters.map((l) => l.email).filter((e): e is string => Boolean(e)))];
  const subject = letters[0] ? subjectLine(letters[0].letter) : '';
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
          {emails.length ? (
            <a
              href={`mailto:?bcc=${emails.map(encodeURIComponent).join(',')}&subject=${encodeURIComponent(subject)}`}
              className="inline-flex h-9 items-center rounded-lg border border-ws-line bg-white px-3.5 text-sm font-semibold text-[var(--casa-ink)] hover:bg-ws-sunk"
            >
              {t(`E-Mail an alle (${emails.length})`, `Email all (${emails.length})`)}
            </a>
          ) : null}
          <Button type="button" onClick={() => printLetter(subject)} disabled={letters.length === 0}>
            {t('Alle drucken / PDF', 'Print all / PDF')}
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-[860px] space-y-6">
        {letters.map((l, i) => (
          <LetterSheet key={i} letter={l.letter} />
        ))}
      </div>
      <PrintCopies letters={letters.map((l) => l.letter)} />
    </div>
  );
}
