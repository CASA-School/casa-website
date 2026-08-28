'use client';

import { cn } from '@/lib/utils';
import type { PlacementPhase } from '@/lib/placement/types';
import type { RunnerCopy } from './placement-ui';

/**
 * Progress, named by phase rather than counted in items.
 *
 * WHY THERE IS NO OVERALL COUNT
 *
 * The attempt is adaptive: how many items a learner sees depends on where the
 * router lands and whether a boundary probe is needed. Any total shown at the
 * start would be a guess presented as a fact, and a progress bar that jumps from
 * 80% to 60% when a boundary module opens is worse than no bar at all.
 *
 * So the rail shows *which part you are in* and how far through that part you
 * are — both known, both true. The fine-tuning phase appears only once it
 * actually exists, which is the point: a learner who never triggers a boundary
 * probe is never told they skipped a step.
 *
 * WHY IT IS A SEGMENTED BAR
 *
 * The first version listed the phase names in a row with separators. On a 375px
 * phone that wrapped to two lines, and with the counter underneath it cost about
 * 150px of a 667px viewport before the question even started. One segment per
 * phase carries the same information — where you are, what is behind you, what is
 * left — in a single 4px row, and reads faster.
 */

const ORDER: readonly PlacementPhase[] = ['router', 'level', 'boundary', 'writing'];

export function PhaseRail({
  phase,
  positionInPhase,
  itemsInPhase,
  boundaryActive,
  copy,
}: {
  phase: PlacementPhase;
  positionInPhase: number;
  itemsInPhase: number;
  /** Whether a boundary module is part of this attempt at all. */
  boundaryActive: boolean;
  copy: RunnerCopy;
}) {
  const labels: Record<PlacementPhase, string> = {
    intake: copy.intakeTitle,
    router: copy.phaseRouter,
    level: copy.phaseLevel,
    boundary: copy.phaseBoundary,
    writing: copy.phaseWriting,
    complete: copy.phaseWriting,
  };

  const steps = ORDER.filter((step) => step !== 'boundary' || boundaryActive);
  const currentIndex = steps.indexOf(phase);
  const withinPhase = itemsInPhase > 0 ? (positionInPhase - 1) / itemsInPhase : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {labels[phase]}
        </p>
        {itemsInPhase > 0 ? (
          <p
            className="shrink-0 text-xs font-semibold tabular-nums text-[var(--casa-muted)]"
            aria-live="polite"
          >
            {copy.questionOf(positionInPhase, itemsInPhase)}
          </p>
        ) : null}
      </div>

      <div
        className="flex items-center gap-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={itemsInPhase}
        aria-valuenow={Math.max(0, positionInPhase - 1)}
        aria-label={labels[phase]}
      >
        {steps.map((step, index) => {
          const done = currentIndex > index;
          const active = currentIndex === index;
          // Each phase gets equal width. They are not equal in item count, but
          // the bar is answering "which part am I in", not "what fraction of the
          // total is done" — a total that is not knowable yet.
          const fill = done ? 1 : active ? Math.max(0.04, withinPhase) : 0;

          return (
            <div
              key={step}
              className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--casa-surface-subtle)]"
              title={labels[step]}
            >
              <span
                className={cn(
                  'block h-full rounded-full transition-[width] duration-500 ease-out',
                  done ? 'bg-[var(--casa-blue)]/55' : 'bg-[var(--casa-blue)]'
                )}
                style={{ width: `${fill * 100}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
