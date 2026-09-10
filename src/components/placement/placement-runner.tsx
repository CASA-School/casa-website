'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { localizeHref } from '@/i18n/pathnames';
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';
import type { ClientProductionPrompt } from '@/lib/placement/sanitise';
import type {
  ClientAttemptState,
  ClientItem,
  PlacementResponseValue,
} from '@/lib/placement/types';
import { IntakeForm, type IntakeAnswers } from './intake-form';
import { PhaseRail } from './phase-rail';
import { ResponseField, isResponseComplete } from './response-fields';
import { StimulusPanel } from './stimulus-panel';
import { TestShell } from './test-shell';
import { WritingTask } from './writing-task';
import { runnerCopy, type RunnerCopy } from './placement-ui';

/**
 * The attempt runner.
 *
 * One item on screen at a time, forward only. The server owns which item comes
 * next — this component never computes routing, it only renders what it is
 * handed and posts back what the learner did. That keeps the adaptive logic on
 * one side of the wire and means a tampered client cannot skip ahead.
 *
 * PROGRESSIVE DISCLOSURE, concretely:
 *  - the learner is never asked to name their own level; that is the output
 *  - no overall item count is shown, because it is not knowable up front
 *  - the fine-tuning phase appears in the rail only once it exists
 *  - cost, schedule, and registration never appear here; they belong to the
 *    result, which is the first point at which they are answerable
 *
 * LAYOUT: every screen goes through `TestShell`, a fixed-viewport app shell
 * rather than a page — see that file for the measurements that forced it. The
 * consequence to keep in mind when editing: the primary action lives in the
 * shell's pinned bar, NOT in the scrolling content, so it is reachable without a
 * scroll on every item no matter how long the stimulus is.
 */

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

type RunnerState =
  | { kind: 'intake' }
  | { kind: 'item'; attempt: ClientAttemptState }
  | { kind: 'writing'; attempt: ClientAttemptState; prompt: ClientProductionPrompt }
  /**
   * A real screen, not a placeholder. Without it the learner sits looking at the
   * question they just answered, greyed out, while the next thing loads — which
   * on a slow connection is indistinguishable from the test having broken.
   */
  | { kind: 'busy'; message: string };

export function PlacementRunner({
  locale,
  resumeToken,
}: {
  locale: ContentLocale;
  resumeToken?: string;
}) {
  const copy = runnerCopy[locale];
  const router = useRouter();

  const [state, setState] = useState<RunnerState>(
    resumeToken ? { kind: 'busy', message: copy.resuming } : { kind: 'intake' }
  );
  const [draft, setDraft] = useState<PlacementResponseValue | null>(null);
  const [intakeAnswers, setIntakeAnswers] = useState<Partial<IntakeAnswers>>({});
  const [writingText, setWritingText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Whether this attempt is actually being stored.
   *
   * Reported by the server from whether the insert landed, not from whether a
   * database is configured — those differ when a migration has not been applied.
   * It gates two things: what the learner is told about leaving the page, and
   * whether the writing task can be offered at all, since writing has nowhere to
   * go and no reviewer to reach if the attempt itself was not stored.
   *
   * Starts true so the reassurance does not flash a warning before the first
   * response arrives.
   */
  const [persistent, setPersistent] = useState(true);
  /** Set when the client could not deliver an item; carried into finalisation. */
  const technicalProblem = useRef(false);
  const resumeStarted = useRef(false);

  /** Focus target for each new item, so a keyboard user is not stranded. */
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  /** The shell's scroll region, reset to the top on every new item. */
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const currentItemId = state.kind === 'item' ? (state.attempt.item?.id ?? null) : null;

  useEffect(() => {
    if (currentItemId === null) return;
    // A new question must start at its own top. Without this, item 4 opens
    // scrolled to wherever item 3's options ended — which after a long reading
    // stimulus means opening halfway down the next text.
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [currentItemId]);

  const post = useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const envelope = (await response.json()) as ApiEnvelope<T>;

      if (!response.ok || envelope.error || envelope.data === null) {
        throw new Error(envelope.error?.message ?? copy.errorGeneric);
      }

      return envelope.data;
    },
    [copy.errorGeneric]
  );

  // ---- transitions ------------------------------------------------------

  const goToResult = useCallback(
    (token: string) => {
      setState({ kind: 'busy', message: copy.finishing });
      router.push(`/placement-test/result/${token}`);
    },
    [copy.finishing, router]
  );

  const finish = useCallback(
    async (token: string, options: { productionIncomplete?: boolean } = {}) => {
      setBusy(true);
      setError(null);
      setState({ kind: 'busy', message: copy.finishing });

      try {
        await post<{ token: string }>('/api/placement/submit', {
          token,
          technicalProblem: technicalProblem.current || undefined,
          productionIncomplete: options.productionIncomplete,
        });
        goToResult(token);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.errorGeneric);
        setBusy(false);
      }
    },
    [copy.errorGeneric, copy.finishing, goToResult, post]
  );

  const advance = useCallback(
    async (attempt: ClientAttemptState) => {
      // The objective part is done: fetch the writing prompt, or finish if there
      // is none for this band.
      if (attempt.item === null) {
        setState({ kind: 'busy', message: copy.preparingWriting });

        try {
          const prompt = await post<{ prompt: ClientProductionPrompt | null }>(
            '/api/placement/writing/prompt',
            { token: attempt.token }
          );

          if (prompt.prompt) {
            setState({ kind: 'writing', attempt, prompt: prompt.prompt });
            return;
          }
        } catch {
          // A missing prompt must not trap the learner in a finished test:
          // finalise on the evidence there is and flag it for review.
          technicalProblem.current = true;
        }

        await finish(attempt.token, { productionIncomplete: true });
        return;
      }

      setState({ kind: 'item', attempt });
      setDraft(null);
    },
    [copy.preparingWriting, finish, post]
  );

  useEffect(() => {
    if (!resumeToken || resumeStarted.current) return;
    resumeStarted.current = true;

    const restore = async () => {
      setBusy(true);
      setError(null);

      try {
        const attempt = await post<ClientAttemptState & { persistent: boolean }>(
          '/api/placement/resume',
          { token: resumeToken }
        );
        setPersistent(attempt.persistent);

        if (attempt.status === 'submitted') {
          goToResult(attempt.token);
          return;
        }

        await advance(attempt);
      } catch (cause) {
        // A stale private link should recover to a fresh test instead of
        // leaving the learner on an error-only screen.
        // The address bar must carry the public URL of this language, or a
        // reload lands on the German root form and the result follows it.
        window.history.replaceState(null, '', localizeHref('/placement-test/test', locale));
        setState({ kind: 'intake' });
        setError(cause instanceof Error ? cause.message : copy.errorGeneric);
      } finally {
        setBusy(false);
      }
    };

    void restore();
  }, [advance, copy.errorGeneric, goToResult, locale, post, resumeToken]);

  const startAttempt = async (answers: IntakeAnswers) => {
    setBusy(true);
    setError(null);

    try {
      const attempt = await post<ClientAttemptState & { persistent: boolean }>(
        '/api/placement/attempt',
        { locale, intake: answers }
      );

      setPersistent(attempt.persistent);
      window.history.replaceState(
        null,
        '',
        localizeHref(`/placement-test/test?attempt=${encodeURIComponent(attempt.token)}`, locale)
      );

      // A true beginner is already placed; there is no item to show.
      if (attempt.status === 'submitted') {
        goToResult(attempt.token);
        return;
      }

      await advance(attempt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async (attempt: ClientAttemptState, item: ClientItem) => {
    if (draft === null) return;

    setBusy(true);
    setError(null);

    try {
      const next = await post<ClientAttemptState>('/api/placement/response', {
        token: attempt.token,
        itemId: item.id,
        value: draft,
      });

      await advance(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const submitWriting = async (attempt: ClientAttemptState, promptId: string) => {
    setBusy(true);
    setError(null);

    try {
      await post('/api/placement/writing', { token: attempt.token, promptId, text: writingText });
      await finish(attempt.token);
    } catch (cause) {
      // The writing is a bonus for the reviewer, not a gate on the placement.
      // Failing to store it must not cost the learner their result.
      setError(cause instanceof Error ? cause.message : copy.errorGeneric);
      await finish(attempt.token, { productionIncomplete: true });
    }
  };

  // ---- render -----------------------------------------------------------

  if (state.kind === 'busy') {
    return (
      <TestShell locale={locale} scrollRef={scrollRef}>
        <div
          className="flex min-h-[45svh] flex-col items-center justify-center gap-3 text-center"
          data-casa-placement="busy"
        >
          <Loader2 className="h-5 w-5 animate-spin text-[var(--casa-accent-text)]" aria-hidden />
          <p className="text-sm font-semibold text-[var(--casa-ink)]" role="status">
            {state.message}
          </p>
        </div>
      </TestShell>
    );
  }

  if (state.kind === 'intake') {
    const intakeComplete = Boolean(
      intakeAnswers.priorLearning && intakeAnswers.goal && intakeAnswers.lastContact
    );
    const beginner = intakeAnswers.priorLearning === 'none';

    return (
      <TestShell
        locale={locale}
        scrollRef={scrollRef}
        wide
        action={
          /*
            Stacked below `sm`. Measured at 320px: a primary button sharing one
            row with a secondary control clipped its own label (210px of text in
            a 200px box). The primary gets the full width and the secondary sits
            under it, which is also the ordinary mobile pattern.
          */
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:justify-end">
            <Button
              type="button"
              disabled={!intakeComplete || busy}
              onClick={() => intakeComplete && startAttempt(intakeAnswers as IntakeAnswers)}
              className="h-11 w-full rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 text-sm font-bold text-white hover:bg-[var(--casa-ink-deep-hover)] sm:h-12 sm:w-auto sm:min-w-48"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {copy.intakeStarting}
                </>
              ) : (
                <>
                  {beginner ? copy.intakeSubmitBeginner : copy.intakeSubmit}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>

            {!intakeComplete ? (
              <p className="min-w-0 text-center text-xs leading-snug text-[var(--casa-muted)] sm:text-left">
                {copy.intakeIncomplete}
              </p>
            ) : null}
          </div>
        }
      >
        <IntakeForm
          locale={locale}
          copy={copy}
          submitting={busy}
          answers={intakeAnswers}
          onChange={setIntakeAnswers}
        />
        <ErrorNotice message={error} copy={copy} />
      </TestShell>
    );
  }

  if (state.kind === 'writing') {
    return (
      <TestShell
        locale={locale}
        scrollRef={scrollRef}
        header={
          <PhaseRail
            phase="writing"
            positionInPhase={0}
            itemsInPhase={0}
            boundaryActive={false}
            copy={copy}
          />
        }
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="button"
              disabled={busy || !persistent || writingText.trim().length === 0}
              onClick={() => void submitWriting(state.attempt, state.prompt.id)}
              className="h-11 w-full rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-4 text-sm font-bold text-white hover:bg-[var(--casa-ink-deep-hover)] sm:h-12 sm:w-auto sm:min-w-56"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {copy.finishing}
                </>
              ) : (
                <>
                  {copy.writingSubmit}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void finish(state.attempt.token, { productionIncomplete: true })}
              className="casa-cta-link shrink-0 px-1 py-1 text-xs font-semibold text-[var(--casa-muted)] underline underline-offset-4 decoration-[color:var(--casa-sand)] transition-colors hover:text-[var(--casa-ink)] hover:decoration-current sm:text-sm"
            >
              {copy.writingSkip}
            </button>
          </div>
        }
      >
        <WritingTask
          prompt={state.prompt}
          copy={copy}
          storageAvailable={persistent}
          submitting={busy}
          text={writingText}
          onTextChange={setWritingText}
        />
        <ErrorNotice message={error} copy={copy} />
      </TestShell>
    );
  }

  const { attempt } = state;
  const item = attempt.item;
  if (!item) return null;

  const complete = isResponseComplete(item, draft);
  const phaseHint =
    attempt.phase === 'router'
      ? copy.phaseRouterHint
      : attempt.phase === 'level'
        ? copy.phaseLevelHint
        : attempt.phase === 'boundary'
          ? copy.phaseBoundaryHint
          : null;

  return (
    <TestShell
      locale={locale}
      scrollRef={scrollRef}
      header={
        <PhaseRail
          phase={attempt.phase}
          positionInPhase={attempt.positionInPhase}
          itemsInPhase={attempt.itemsInPhase}
          boundaryActive={attempt.phase === 'boundary'}
          copy={copy}
        />
      }
      /* No "skip" control beside Next. An unanswered item is recorded when a
         learner leaves, not offered as a shortcut — offering it makes skipping
         the path of least resistance and hollows out the evidence. */
      action={
        <Button
          type="button"
          disabled={!complete || busy}
          onClick={() => void submitAnswer(attempt, item)}
          className="h-11 w-full rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 text-sm font-bold text-white hover:bg-[var(--casa-ink-deep-hover)] sm:h-12 sm:w-auto sm:min-w-40"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {copy.saving}
            </>
          ) : (
            <>
              {copy.next}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* The phase hint appears once per phase, at its first item, and then
            gets out of the way. Repeating it on every item would train the
            learner to stop reading the top of the screen. */}
        {phaseHint && attempt.positionInPhase === 1 ? (
          <p className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/40 px-3 py-2 text-xs leading-relaxed text-[var(--casa-ink)] sm:text-sm">
            {phaseHint}
          </p>
        ) : null}

        <PersistenceNotice
          persistent={persistent}
          firstItem={attempt.phase === 'router' && attempt.positionInPhase === 1}
          copy={copy}
        />

        <article
          data-casa-placement="item"
          data-casa-item-type={item.responseType}
          className="space-y-4"
        >
          {item.stimulus ? <StimulusPanel stimulus={item.stimulus} copy={copy} /> : null}

          {/*
            The prompt is the heading of the screen and the focus target, but it
            is rendered as a visually-hidden <h2> plus a visible <p> rather than
            as one visible heading. Two reasons, both load-bearing:

            1. globals.css binds the display face (Playfair, a high-contrast
               Didone) to h1/h2/h3 as ELEMENTS. That is right for editorial type
               and wrong here: this is a German test sentence containing `___`
               gaps that a learner parses character by character, and Playfair's
               hairlines break up below ~20px — which is exactly where a phone
               sets it. A class-based override loses the fight cleanly enough,
               but a paragraph never enters it.
            2. For an inline cloze the sentence and its blanks are one object and
               the visible text lives inside the field, so the heading has to be
               hidden anyway. Doing it the same way for every item type keeps one
               code path instead of two.

            The hidden heading keeps the document outline and the focus target;
            the `{{b1}}` placeholders become a speakable word.
          */}
          <h2 ref={headingRef} tabIndex={-1} lang="de" className="sr-only">
            {item.prompt.replace(/\{\{[^}]+\}\}/g, copy.spokenBlank)}
          </h2>

          {item.responseType === 'inline_cloze' ? null : (
            <p
              aria-hidden
              lang="de"
              className="max-w-measure text-base font-bold leading-snug text-[var(--casa-ink)] sm:text-lg md:text-xl"
            >
              {item.prompt}
            </p>
          )}

          <ResponseField
            item={item}
            value={draft}
            onChange={setDraft}
            copy={copy}
            disabled={busy}
          />
        </article>

        <ErrorNotice message={error} copy={copy} />
      </div>
    </TestShell>
  );
}

function ErrorNotice({ message, copy }: { message: string | null; copy: RunnerCopy }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-[color:var(--casa-danger-surface)]/40 bg-[var(--casa-danger-surface)]/5 p-3"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-danger-text)]"
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-bold text-[var(--casa-danger-text)] sm:text-sm">
          {copy.errorTitle}
        </p>
        <p className="text-xs leading-relaxed text-[var(--casa-ink)] sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

/**
 * Says whether progress is being saved.
 *
 * Asymmetric on purpose. The reassurance is shown once, on the first item — a
 * learner needs to know they can close the tab, and then they need the screen
 * back. The *warning* is shown on every item, because a standing limitation that
 * scrolls away is one the learner will not remember when it matters.
 */
function PersistenceNotice({
  persistent,
  firstItem,
  copy,
}: {
  persistent: boolean;
  firstItem: boolean;
  copy: RunnerCopy;
}) {
  if (persistent && !firstItem) return null;

  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg text-xs leading-relaxed',
        persistent
          ? 'text-[var(--casa-muted)]'
          : 'border border-[color:var(--casa-gold-deep)]/30 bg-[var(--casa-gold-deep)]/8 px-3 py-2 text-[var(--casa-warning-text)]'
      )}
    >
      {persistent ? (
        copy.resumeSaved
      ) : (
        <>
          <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-bold">{copy.notPersistentTitle}.</span> {copy.notPersistentBody}
          </span>
        </>
      )}
    </p>
  );
}
