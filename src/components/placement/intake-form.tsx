'use client';

import { Check, CheckCircle2 } from 'lucide-react';

import { INTAKE_QUESTIONS, NO_PRIOR_GERMAN } from '@/config/placement/intake';
import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';
import {
  eyebrowClassName,
  optionCardBase,
  optionCardIdle,
  optionCardSelected,
  optionInputClassName,
  optionMarkerBase,
  optionMarkerIdle,
  optionMarkerSelected,
  type RunnerCopy,
} from './placement-ui';

/**
 * Intake — three unscored questions, one screen.
 *
 * ONE SCREEN, NOT THREE. Progressive disclosure is about deferring what a
 * learner does not need yet, not about rationing what they do. Three short
 * questions across three screens is three chances to abandon and no less
 * information; on one screen the learner sees the whole cost of the step before
 * starting it, which is what actually reduces drop-off here.
 *
 * The consequence of the first answer *is* disclosed progressively: choosing
 * "no German at all" reveals inline that the test will be skipped, so nobody
 * discovers that after committing.
 *
 * Controlled by the runner. The submit control lives in the shell's pinned
 * action bar, which is a sibling of this form rather than a child, so the answers
 * have to be owned above both.
 */

export type IntakeAnswers = {
  priorLearning: string;
  goal: string;
  lastContact: string;
};

export function IntakeForm({
  locale,
  copy,
  submitting,
  answers,
  onChange,
}: {
  locale: ContentLocale;
  copy: RunnerCopy;
  submitting: boolean;
  answers: Partial<IntakeAnswers>;
  onChange: (next: Partial<IntakeAnswers>) => void;
}) {
  const directBeginner = answers.priorLearning === NO_PRIOR_GERMAN;

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <p className={eyebrowClassName}>{copy.intakeEyebrow}</p>
        <h1 className="text-xl font-bold tracking-tight text-[var(--casa-ink)] sm:text-2xl">
          {copy.intakeTitle}
        </h1>
        <p className="max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
          {copy.intakeBody}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        {INTAKE_QUESTIONS.map((question, questionIndex) => {
          const selected = answers[question.id];

          return (
            <fieldset
              key={question.id}
              className="space-y-3 lg:rounded-xl lg:border lg:border-[color:var(--casa-sand)] lg:bg-white/65 lg:p-5 lg:shadow-xs"
              disabled={submitting}
            >
              <legend className="space-y-0.5">
                <span className="flex items-baseline gap-2 text-[15px] font-bold leading-snug text-[var(--casa-ink)] sm:text-base">
                  <span
                    aria-hidden
                    className="text-xs font-bold tabular-nums text-[var(--casa-text-subtle)]"
                  >
                    {questionIndex + 1}
                  </span>
                  {question.label[locale]}
                </span>
                {question.help ? (
                  <span className="block max-w-measure text-xs leading-relaxed text-[var(--casa-muted)]">
                    {question.help[locale]}
                  </span>
                ) : null}
              </legend>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {question.options.map((option) => {
                  const isSelected = selected === option.value;

                  return (
                    <label
                      key={option.value}
                      data-casa-placement="intake-option"
                      data-casa-intake-question={question.id}
                      data-casa-option-key={option.value}
                      className={cn(
                        optionCardBase,
                        'items-center',
                        isSelected ? optionCardSelected : optionCardIdle
                      )}
                    >
                      <input
                        type="radio"
                        name={`placement-intake-${question.id}`}
                        value={option.value}
                        checked={isSelected}
                        disabled={submitting}
                        onChange={() => onChange({ ...answers, [question.id]: option.value })}
                        className={optionInputClassName}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          optionMarkerBase,
                          'mt-0 rounded-full',
                          isSelected ? optionMarkerSelected : optionMarkerIdle
                        )}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : ''}
                      </span>
                      <span className="text-sm font-semibold leading-snug sm:text-[15px]">
                        {option.label[locale]}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* The selected option's consequence, once under the group rather
                  than inside the card — a card whose accessible name grows when
                  you select it is disorienting to hear read back. */}
              {(() => {
                const chosen = question.options.find((option) => option.value === selected);
                if (!chosen?.hint) return null;
                return (
                  <p className="text-xs leading-relaxed text-[var(--casa-muted)]">
                    {chosen.hint[locale]}
                  </p>
                );
              })()}
            </fieldset>
          );
        })}
      </div>

      {/* The direct-beginner consequence, stated before the button is pressed. */}
      {directBeginner ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/40 p-3">
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-accent-text)]"
            aria-hidden
          />
          <p className="text-xs leading-relaxed text-[var(--casa-ink)] sm:text-sm">
            {locale === 'de'
              ? 'Wir überspringen den Test: Ohne Vorkenntnisse beginnen Sie bei A1.1. Sie sehen Ihr Ergebnis direkt.'
              : 'We will skip the test. With no previous German you start at A1.1, and you will see your result straight away.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
