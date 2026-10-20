'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

import { EntryTestController, INITIAL_SNAPSHOT, answeredCount, formatClock, slotsOf, type EntryTestSnapshot } from './controller';
import { ConfirmSheet, DoneScreen, InfoScreen, LockScreen, OverviewSheet, StartScreen } from './screens';
import { TaskView } from './task-view';
import { column, ghostButton, primaryButton } from './ui';

/**
 * The day-one placement test on the learner's phone, at casa-bremen.de/test: one task per page,
 * the clock from the server, paused when the page is left, released with the teacher's code.
 * The rules live in `controller.ts`; this draws them. German only, and in „Sie", like the booklet.
 */
export function EntryTestRunner() {
  const [controller] = useState(() => new EntryTestController());
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => INITIAL_SNAPSHOT);

  useEffect(() => {
    controller.mount();
    return controller.unmount;
  }, [controller]);

  return (
    <div
      className={cn(
        'min-h-dvh bg-[var(--casa-ground)] text-[17px] leading-[1.45] text-[var(--casa-ink)] [-webkit-tap-highlight-color:transparent]',
        state.view === 'exam' && 'select-none [-webkit-touch-callout:none]'
      )}
    >
      {state.view === 'start' ? (
        <StartScreen
          sittings={state.sittings}
          infoLoaded={state.infoLoaded}
          sittingId={state.sittingId}
          starting={state.starting}
          error={state.startError}
          onChooseSitting={controller.chooseSitting}
          onStart={controller.start}
        />
      ) : null}

      {state.view === 'exam' ? <ExamScreen state={state} controller={controller} /> : null}

      {state.view === 'exam' && state.sheet ? (
        <OverviewSheet
          pages={state.tasks.map((task) => {
            const slots = slotsOf(task);
            return { got: slots.filter((slot) => state.answers[slot]).length, of: slots.length };
          })}
          current={state.page}
          answered={answeredCount(state.answers)}
          total={state.answers.length}
          onPick={controller.goTo}
          onClose={controller.closeSheet}
          onSubmit={controller.askSubmit}
        />
      ) : null}

      {state.view === 'exam' && state.confirm ? (
        <ConfirmSheet text={state.confirmText} submitting={state.submitting} onBack={controller.cancelSubmit} onConfirm={controller.confirmSubmit} />
      ) : null}

      {state.view === 'exam' && state.locked ? (
        <LockScreen
          left={state.left}
          code={state.code}
          unlocking={state.unlocking}
          error={state.lockError}
          onCode={controller.setCode}
          onUnlock={controller.tryUnlock}
        />
      ) : null}

      {state.view === 'done' ? <DoneScreen timeUp={state.timeUp} /> : null}

      {state.info ? <InfoScreen title={state.info.title} text={state.info.text} onRetry={controller.retryInfo} /> : null}
    </div>
  );
}

const SAVE_DOT = {
  ok: { className: 'bg-[var(--casa-blue)]', label: 'gespeichert' },
  busy: { className: 'bg-[var(--casa-amber)]', label: 'wird gespeichert' },
  off: { className: 'bg-[var(--casa-red)]', label: 'keine Verbindung' },
} as const;

function ExamScreen({ state, controller }: { state: EntryTestSnapshot; controller: EntryTestController }) {
  const { tasks, answers, page, drawn, left, save } = state;
  const task = tasks[page];
  const progress = answers.length ? (answeredCount(answers) / answers.length) * 100 : 0;
  const dot = SAVE_DOT[save];

  // Every page starts at its top; an answer keeps the page where it is.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [drawn]);

  return (
    <section className={cn(column, 'pb-[110px]')}>
      <div className="sticky top-0 z-[5] bg-[var(--casa-ground)] pt-[calc(10px+env(safe-area-inset-top))]">
        <div className="h-1 overflow-hidden rounded-[2px] bg-[var(--casa-sand)]">
          <i
            className="block h-full bg-[var(--casa-blue)] transition-[width] duration-[250ms] motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between pb-2 pt-2.5">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={controller.openSheet}
            className="cursor-pointer rounded-full border-0 bg-white px-3.5 py-1.5 font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]"
          >
            {page + 1} <small className="font-bold text-[var(--casa-muted)]">/ {tasks.length}</small>
          </button>
          <div className={cn('flex items-center gap-2 font-extrabold tabular-nums', left < 5 * 60_000 && 'text-[var(--casa-coral-text)]')}>
            <span role="img" aria-label={dot.label} title={dot.label} className={cn('size-2 rounded-full', dot.className)} />
            <span>{formatClock(left)}</span>
          </div>
        </div>
      </div>

      {task ? <TaskView task={task} answers={answers} onAnswer={controller.answer} /> : null}

      <div
        className={cn(
          column,
          'fixed inset-x-0 bottom-0 z-[6] grid grid-cols-[1fr_2fr] gap-2.5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[22px]',
          'bg-[linear-gradient(transparent,var(--casa-ground)_28%)]'
        )}
      >
        <button type="button" onClick={controller.previous} disabled={page === 0} className={ghostButton}>
          Zurück
        </button>
        <button type="button" onClick={controller.next} className={primaryButton}>
          {page === tasks.length - 1 ? 'Übersicht' : 'Weiter'}
        </button>
      </div>
    </section>
  );
}
