'use client';

import { useMemo } from 'react';
import { ArrowUp, Check, HelpCircle, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ClientItem, PlacementResponseValue } from '@/lib/placement/types';
import {
  inlineSelectTriggerClassName,
  optionCardBase,
  optionCardIdle,
  optionCardSelected,
  optionMarker,
  optionMarkerBase,
  optionMarkerIdle,
  optionMarkerSelected,
  optionInputClassName,
  fieldClassName,
  selectTriggerClassName,
  type RunnerCopy,
} from './placement-ui';

/**
 * The six answer interactions.
 *
 * Design rules applied throughout:
 *
 *  - **No drag and drop.** Token ordering and matching are the two places a
 *    drag interface is the obvious choice and the wrong one: it is awkward on a
 *    phone, and it is close to unusable with a keyboard or a screen reader.
 *    Both are tap/select instead, which costs nothing in clarity.
 *  - **Selection is never colour alone.** Every selected state carries a
 *    border, a tint, and a glyph.
 *  - **One shared option-card shape**, so a learner never has to re-learn the
 *    control between question types.
 *  - **The response value is owned by the parent.** These fields are controlled,
 *    so autosave and the Next button read one source of truth.
 */

/**
 * Short, stable, non-revealing token for a DOM id or form-group name.
 *
 * FNV-1a in base36. Not a security boundary — it just keeps item ids, which
 * encode level and stage, out of the rendered markup.
 */
function hashToken(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

type FieldProps = {
  item: ClientItem;
  value: PlacementResponseValue | null;
  onChange: (value: PlacementResponseValue | null) => void;
  copy: RunnerCopy;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// single choice
// ---------------------------------------------------------------------------

function SingleChoiceField({ item, value, onChange, disabled }: FieldProps) {
  const selected = value?.type === 'single_choice' ? value.optionKey : null;

  /**
   * A shared `name` is what makes the browser treat these as one radio group,
   * which is where arrow-key navigation and roving focus come from. It only has
   * to be unique on the page, so it is a short hash rather than the item id:
   * `A1-RD-STRETCH-003` in the DOM would tell anyone reading it which band the
   * router landed on, mid-test. Not an answer key, but free to avoid.
   */
  const groupName = `placement-choice-${hashToken(item.id)}`;

  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="sr-only">{item.prompt}</legend>
      {item.options?.map((option, index) => {
        const isSelected = selected === option.key;

        return (
          <label
            key={option.key}
            data-casa-placement="option"
            data-casa-option-key={option.key}
            className={cn(optionCardBase, isSelected ? optionCardSelected : optionCardIdle)}
          >
            <input
              type="radio"
              name={groupName}
              value={option.key}
              checked={isSelected}
              disabled={disabled}
              onChange={() => onChange({ type: 'single_choice', optionKey: option.key })}
              className={optionInputClassName}
            />
            <span
              aria-hidden
              className={cn(
                optionMarkerBase,
                isSelected ? optionMarkerSelected : optionMarkerIdle
              )}
            >
              {isSelected ? <Check className="h-3 w-3" /> : optionMarker(index)}
            </span>
            <span className="text-sm leading-snug sm:text-[15px]">{option.text}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// multiple choice
// ---------------------------------------------------------------------------

function MultipleChoiceField({ item, value, onChange, copy, disabled }: FieldProps) {
  const selected = value?.type === 'multiple_choice' ? value.optionKeys : [];

  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter((candidate) => candidate !== key)
      : [...selected, key];
    onChange(next.length === 0 ? null : { type: 'multiple_choice', optionKeys: next });
  };

  return (
    <div className="space-y-3">
      {/* Stated, not implied. The bank's multi-select items ask for exactly two,
          and a learner who ticks one and moves on loses half the credit for a
          rule nobody told them. */}
      <p className="text-xs font-semibold text-[var(--casa-accent-text)] sm:text-sm">{copy.selectTwo}</p>

      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="sr-only">{item.prompt}</legend>
        {item.options?.map((option, index) => {
          const isSelected = selected.includes(option.key);

          return (
            <label
              key={option.key}
              data-casa-placement="option"
              data-casa-option-key={option.key}
              className={cn(optionCardBase, isSelected ? optionCardSelected : optionCardIdle)}
            >
              <input
                type="checkbox"
                value={option.key}
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(option.key)}
                className={optionInputClassName}
              />
              <span
                aria-hidden
                className={cn(
                  optionMarkerBase,
                  'rounded-sm',
                  isSelected ? optionMarkerSelected : optionMarkerIdle
                )}
              >
                {isSelected ? <Check className="h-3 w-3" /> : optionMarker(index)}
              </span>
              <span className="text-sm leading-snug sm:text-[15px]">{option.text}</span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------------------
// typed recall
// ---------------------------------------------------------------------------

function ShortTextField({ item, value, onChange, copy, disabled }: FieldProps) {
  const text = value?.type === 'short_text' ? value.text : '';
  const notKnown = value?.type === 'not_known';
  const inputId = `placement-answer-${hashToken(item.id)}`;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-eyebrow text-[var(--casa-ink)]">
          {copy.typeAnswer}
        </Label>
        <Input
          id={inputId}
          type="text"
          data-casa-placement="typed-answer"
          value={notKnown ? '' : text}
          disabled={disabled || notKnown}
          maxLength={item.inputConstraints?.maxLength ?? 40}
          inputMode="text"
          // Autocomplete and spellcheck would answer a German morphology item
          // for the learner. The bank sets spellcheck false for this reason.
          spellCheck={item.inputConstraints?.spellcheck ?? false}
          autoComplete="off"
          autoCapitalize="off"
          onChange={(event) => {
            const next = event.target.value;
            onChange(next.trim().length === 0 ? null : { type: 'short_text', text: next });
          }}
          className={cn(fieldClassName, 'max-w-xs sm:max-w-sm')}
          placeholder="…"
        />
      </div>

      {/* An explicit escape. Without it, typed recall collects guesses, and a
          guess is worse evidence than a clean "I don't know". */}
      {item.inputConstraints?.allowNotKnown ? (
        <button
          type="button"
          disabled={disabled}
          aria-pressed={notKnown}
          onClick={() => onChange(notKnown ? null : { type: 'not_known' })}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/20',
            notKnown
              ? 'border-[var(--casa-blue)] bg-[color-mix(in_srgb,var(--casa-blue)_10%,var(--casa-bg))] text-[var(--casa-ink)]'
              : 'border-[color:var(--casa-sand)] bg-white text-[var(--casa-muted)] hover:border-[color:var(--casa-muted)] hover:text-[var(--casa-ink)]'
          )}
        >
          {notKnown ? <Check className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
          {copy.notKnown}
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// inline cloze
// ---------------------------------------------------------------------------

/**
 * Renders the prompt with its `{{b1}}` placeholders replaced by inline selects.
 *
 * The sentence stays readable as a sentence — the whole construct is "does this
 * word fit *here*", so pulling the blanks out into a list underneath would
 * change what the item measures.
 */
function InlineClozeField({ item, value, onChange, copy, disabled }: FieldProps) {
  const chosen = useMemo(() => {
    if (value?.type !== 'inline_cloze') return new Map<string, string>();
    return new Map(value.blanks.map((blank) => [blank.blankId, blank.optionKey]));
  }, [value]);

  const setBlank = (blankId: string, optionKey: string) => {
    const next = new Map(chosen);
    next.set(blankId, optionKey);
    onChange({
      type: 'inline_cloze',
      blanks: [...next.entries()].map(([id, key]) => ({ blankId: id, optionKey: key })),
    });
  };

  // Split on the placeholder tokens, keeping them so they can be swapped for a
  // control. `{{b1}}` is the bank's own notation.
  const segments = item.prompt.split(/(\{\{[^}]+\}\})/g).filter((segment) => segment.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-base leading-loose text-[var(--casa-ink)] sm:gap-x-2 sm:text-lg">
      {segments.map((segment, index) => {
        const match = /^\{\{([^}]+)\}\}$/.exec(segment);

        if (!match) {
          return (
            <span key={`text-${index}`} className="whitespace-pre-wrap">
              {segment}
            </span>
          );
        }

        const blankId = match[1];
        const blank = item.blanks?.find((candidate) => candidate.id === blankId);
        if (!blank) return null;

        // "Choose word 2 of 2", not "Choose b2". `b2` is an internal id and
        // means nothing to the person hearing it read out.
        const position = (item.blanks?.findIndex((candidate) => candidate.id === blankId) ?? 0) + 1;
        const total = item.blanks?.length ?? 1;

        return (
          <Select
            key={blankId}
            value={chosen.get(blankId) ?? ''}
            disabled={disabled}
            onValueChange={(next) => setBlank(blankId, next)}
          >
            <SelectTrigger
              className={inlineSelectTriggerClassName}
              aria-label={copy.blankLabel(position, total)}
            >
              <SelectValue placeholder={copy.chooseBlank} />
            </SelectTrigger>
            <SelectContent>
              {blank.options.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// token order
// ---------------------------------------------------------------------------

/**
 * Sentence building by tapping, not dragging.
 *
 * Placed chunks read as a sentence in a tray at the top; the pool below holds
 * what is left. Tapping a placed chunk returns it — so there is no separate
 * reset, undo, or drag affordance to learn.
 */
function OrderTokensField({ item, value, onChange, copy, disabled }: FieldProps) {
  const placed = value?.type === 'order_tokens' ? value.order : [];
  const tokens = item.tokens ?? [];
  const textFor = (id: string) => tokens.find((token) => token.id === id)?.text ?? id;
  const remaining = tokens.filter((token) => !placed.includes(token.id));

  const place = (id: string) => onChange({ type: 'order_tokens', order: [...placed, id] });
  const remove = (id: string) => {
    const next = placed.filter((candidate) => candidate !== id);
    onChange(next.length === 0 ? null : { type: 'order_tokens', order: next });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--casa-muted)] sm:text-sm">{copy.orderInstruction}</p>

      {/* The tray. Keeps a fixed minimum height so placing the first chunk does
          not shift the pool underneath it. */}
      <div
        data-casa-placement="token-tray"
        className={cn(
          'flex min-h-[3.75rem] flex-wrap items-center gap-1.5 rounded-lg border-2 border-dashed p-2.5 transition-colors duration-200',
          placed.length > 0
            ? 'border-[var(--casa-blue)]/40 bg-[color-mix(in_srgb,var(--casa-blue)_6%,var(--casa-bg))]'
            : 'border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)]'
        )}
        aria-live="polite"
      >
        {placed.length === 0 ? (
          <span className="px-1 text-xs text-[var(--casa-muted)]">{copy.orderCleared}</span>
        ) : (
          placed.map((id, index) => (
            <button
              key={`${id}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => remove(id)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--casa-blue)] bg-white px-2.5 py-1.5 text-left',
                'whitespace-normal text-sm font-semibold text-[var(--casa-ink)] shadow-xs transition-all duration-200',
                'hover:border-[var(--casa-coral)] hover:text-[var(--casa-coral-text)]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/20'
              )}
            >
              {textFor(id)}
              <X className="h-3.5 w-3.5 opacity-50" aria-hidden />
            </button>
          ))
        )}
      </div>

      <div data-casa-placement="token-pool" className="flex flex-wrap gap-1.5">
        {remaining.map((token) => (
          <button
            key={token.id}
            type="button"
            data-casa-placement="token"
            disabled={disabled}
            onClick={() => place(token.id)}
            className={cn(
              'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-2.5 py-1.5 text-left',
              'whitespace-normal text-sm text-[var(--casa-ink)] transition-all duration-200',
              'hover:border-[color:var(--casa-muted)] hover:bg-[var(--casa-canvas)]',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/20'
            )}
          >
            {token.text}
            <ArrowUp className="h-3.5 w-3.5 opacity-40" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// matching
// ---------------------------------------------------------------------------

/**
 * One select per left-hand row.
 *
 * A 2x2 match is small enough that a select per row is clearer than any
 * connection interface, and it is keyboard-operable for free.
 */
function MatchingField({ item, value, onChange, copy, disabled }: FieldProps) {
  const pairs = value?.type === 'matching' ? value.pairs : [];
  const rightFor = (leftId: string) =>
    pairs.find((pair) => pair.leftId === leftId)?.rightId ?? '';

  const setPair = (leftId: string, rightId: string) => {
    const next = pairs.filter((pair) => pair.leftId !== leftId);
    next.push({ leftId, rightId });
    onChange({ type: 'matching', pairs: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--casa-muted)] sm:text-sm">{copy.matchInstruction}</p>

      <div className="grid gap-2">
        {item.matching?.left.map((left) => {
          const selectId = `placement-match-${hashToken(item.id)}-${left.id}`;

          return (
            <div
              key={left.id}
              className="grid items-center gap-2 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] p-3 sm:grid-cols-[minmax(6rem,0.5fr)_1fr] sm:gap-4"
            >
              <Label htmlFor={selectId} className="text-sm font-bold text-[var(--casa-ink)] sm:text-base">
                {left.text}
              </Label>
              <Select
                value={rightFor(left.id)}
                disabled={disabled}
                onValueChange={(next) => setPair(left.id, next)}
              >
                <SelectTrigger id={selectId} className={cn(selectTriggerClassName, 'bg-white')}>
                  <SelectValue placeholder={copy.chooseBlank} />
                </SelectTrigger>
                <SelectContent>
                  {item.matching?.right.map((right) => (
                    <SelectItem key={right.id} value={right.id}>
                      {right.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

/**
 * Dispatches to the right field for the item's response type.
 *
 * Holds no state of its own. The draft answer lives in the runner, which clears
 * it when it advances, so there is nothing here that could bleed from one
 * question into the next.
 */
export function ResponseField(props: FieldProps) {
  switch (props.item.responseType) {
    case 'single_choice':
      return <SingleChoiceField {...props} />;
    case 'multiple_choice':
      return <MultipleChoiceField {...props} />;
    case 'short_text':
      return <ShortTextField {...props} />;
    case 'inline_cloze':
      return <InlineClozeField {...props} />;
    case 'order_tokens':
      return <OrderTokensField {...props} />;
    case 'matching':
      return <MatchingField {...props} />;
  }
}

/**
 * Whether a draft answer is complete enough to submit.
 *
 * Compound items must be fully answered — a half-filled cloze or a partial
 * sentence is not a considered answer, and accepting it would record a guess as
 * a decision. Single choice is complete the moment it exists.
 */
export function isResponseComplete(item: ClientItem, value: PlacementResponseValue | null): boolean {
  if (value === null) return false;
  if (value.type === 'not_known') return true;

  switch (value.type) {
    case 'single_choice':
      return value.optionKey.length > 0;
    case 'multiple_choice':
      // The bank's multi-select items key exactly two options.
      return value.optionKeys.length === 2;
    case 'short_text':
      return value.text.trim().length > 0;
    case 'inline_cloze':
      return value.blanks.length === (item.blanks?.length ?? 0);
    case 'order_tokens':
      return value.order.length === (item.tokens?.length ?? 0);
    case 'matching':
      return value.pairs.length === (item.matching?.left.length ?? 0);
    default:
      return false;
  }
}
