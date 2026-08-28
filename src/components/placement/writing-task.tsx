'use client';

import { useMemo } from 'react';
import { FileText, NotebookPen, UserRound } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ClientProductionPrompt } from '@/lib/placement/sanitise';
import { eyebrowClassName, stimulusPanelClassName, type RunnerCopy } from './placement-ui';

/**
 * The writing task — the last step before the result.
 *
 * Two things are stated on the surface rather than buried in a policy page: a
 * person reads this, and no machine grades it. Both are true, both are
 * reassuring, and the second is a v1 policy commitment ("No automatic AI grading
 * of writing or speaking") that a learner has a right to know.
 *
 * Controlled by the runner, and its buttons live in the shell's pinned action
 * bar rather than here. That matters more on this screen than on any other: the
 * textarea grows as the learner writes, so an in-flow submit button would move
 * further away with every line — and on a phone it would sit below the keyboard.
 */

export function WritingTask({
  prompt,
  copy,
  storageAvailable,
  submitting,
  text,
  onTextChange,
}: {
  prompt: ClientProductionPrompt;
  copy: RunnerCopy;
  /** False in fallback mode: there is nowhere to persist the text. */
  storageAvailable: boolean;
  submitting: boolean;
  text: string;
  onTextChange: (text: string) => void;
}) {
  const wordCount = useMemo(() => text.trim().split(/\s+/u).filter(Boolean).length, [text]);

  const range = prompt.suggestedWords;
  const withinRange = range ? wordCount >= range.min && wordCount <= range.max : wordCount > 0;

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <p className={eyebrowClassName}>{copy.writingEyebrow}</p>
        <h1 className="text-xl font-bold tracking-tight text-[var(--casa-ink)] sm:text-2xl">
          {copy.writingTitle}
        </h1>
        <p className="max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
          {copy.writingBody}
        </p>
      </header>

      {/* Reassurance where it is relevant, not in a footer nobody reads. */}
      <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-[var(--casa-ink)]">
        <UserRound
          className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--casa-accent-text)]"
          aria-hidden
        />
        {copy.writingReadBy}
      </p>

      <div className="space-y-3.5 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] p-3.5 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
            <NotebookPen className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="text-[15px] font-bold text-[var(--casa-ink)] sm:text-base">
              {prompt.title}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--casa-ink)]">{prompt.instruction}</p>
          </div>
        </div>

        {/* C1 and some B2 tasks supply source positions to synthesise. Rendered
            on the stimulus ground, like a reading text, because that is what it
            is — not part of the instruction. */}
        {prompt.sourceText ? (
          <figure className={stimulusPanelClassName}>
            <figcaption className="flex items-center gap-2 border-b border-[color:var(--casa-sand)]/70 pb-2.5">
              <FileText className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" aria-hidden />
              <span className={eyebrowClassName}>{copy.writingSourceLabel}</span>
            </figcaption>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--casa-ink)]">
              {prompt.sourceText}
            </div>
          </figure>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-[var(--casa-ink)]">
            {copy.writingInclude}
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {prompt.requiredContent.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-xs leading-relaxed text-[var(--casa-ink)] sm:text-sm"
              >
                <span
                  aria-hidden
                  className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-[var(--casa-amber)]"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          disabled={submitting}
          rows={8}
          maxLength={6000}
          lang="de"
          placeholder={copy.writingPlaceholder}
          aria-label={prompt.title}
          className={cn(
            // 16px text: iOS Safari zooms the page when a focused field is
            // smaller, which on this screen would zoom mid-sentence.
            'min-h-[11rem] rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] p-3',
            'text-base leading-relaxed text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] shadow-none',
            'transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)]',
            'focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none'
          )}
        />

        {/* A count, not a limit. It turns green in range and never blocks
            submission — a learner writing 55 words for a 60–90 task has still
            given a reviewer something to read. */}
        {range ? (
          <p
            className={cn(
              'text-[11px] font-semibold tabular-nums transition-colors duration-200',
              withinRange ? 'text-[var(--casa-success-text)]' : 'text-[var(--casa-muted)]'
            )}
            aria-live="polite"
          >
            {copy.writingWords(wordCount, range.min, range.max)}
          </p>
        ) : null}
      </div>

      {!storageAvailable ? (
        <p className="rounded-lg border border-dashed border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-3 py-2 text-xs text-[var(--casa-muted)]">
          {copy.notPersistentBody}
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-[var(--casa-muted)]">{copy.writingSkipHint}</p>
    </div>
  );
}
