'use client';

import { useRef, useState } from 'react';
import { FileText, MessageCircle, PlayCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ClientStimulus } from '@/lib/placement/types';
import { eyebrowClassName, stimulusPanelClassName, type RunnerCopy } from './placement-ui';

/**
 * The stimulus — the reading text or the listening recording an item is about.
 *
 * Rendered on its own ground, distinct from the answer area, so it is obvious
 * which part is the world and which part is the question. The bank's stimuli are
 * notices, messages, and announcements, so reading texts are set in a mono-ish
 * measure with preserved line breaks: a Praxis opening-hours notice that has
 * been reflowed into a paragraph is no longer the genre the item tests.
 */

export function StimulusPanel({
  stimulus,
  copy,
}: {
  stimulus: ClientStimulus;
  copy: RunnerCopy;
}) {
  if (stimulus.kind === 'reading') {
    return (
      <figure className={stimulusPanelClassName}>
        <figcaption className="flex items-center gap-2 border-b border-[color:var(--casa-sand)]/70 pb-2.5">
          <FileText className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" aria-hidden />
          <span className={eyebrowClassName}>{stimulus.title}</span>
        </figcaption>
        <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--casa-ink)] sm:text-base sm:leading-[1.65]">
          {stimulus.text}
        </div>
      </figure>
    );
  }

  // Keyed on the stimulus id so a new recording remounts the player rather than
  // inheriting the previous one's play count. A reset effect would do the same
  // thing one render later, and one render is long enough to show a learner an
  // exhausted button for a recording they have not played yet.
  return <ListeningStimulus key={stimulus.id} stimulus={stimulus} copy={copy} />;
}

/**
 * Listening player with a hard play cap.
 *
 * The cap is part of the construct: the bank sets `maxPlays` to 2, and an
 * unlimited replay turns a listening item into a transcription exercise. It is
 * enforced here rather than trusted to the learner, and the remaining count is
 * shown up front so nobody spends their second play by accident.
 *
 * The whole surface is currently unreachable in practice — listening items are
 * withheld until CASA records the scripts. It is built now so that flipping
 * `LISTENING_AUDIO_AVAILABLE` is a one-line change and not a new feature.
 */
function ListeningStimulus({
  stimulus,
  copy,
}: {
  stimulus: Extract<ClientStimulus, { kind: 'listening' }>;
  copy: RunnerCopy;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playsUsed, setPlaysUsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const playsLeft = Math.max(0, stimulus.maxPlays - playsUsed);
  const exhausted = playsLeft === 0;

  /**
   * Play only — there is no pause and no seek.
   *
   * A pause control would defeat the play cap: pause halfway, resume, and a
   * two-play limit becomes unlimited listening in fragments. The play is counted
   * on start rather than on completion for the same reason. Every play begins at
   * zero, so a play is always a whole play.
   */
  const play = () => {
    const audio = audioRef.current;
    if (!audio || playing || exhausted) return;

    setPlaysUsed((used) => used + 1);
    audio.currentTime = 0;
    void audio.play().then(
      () => setPlaying(true),
      () => {
        setFailed(true);
        setPlaying(false);
      }
    );
  };

  return (
    <div className={stimulusPanelClassName}>
      <div className="flex items-center gap-2 border-b border-[color:var(--casa-sand)]/70 pb-2.5">
        <MessageCircle className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" aria-hidden />
        <span className={eyebrowClassName}>{stimulus.title}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={play}
          disabled={exhausted || playing}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/25',
            exhausted || playing
              ? 'cursor-not-allowed border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] text-[var(--casa-muted)]'
              : 'bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]'
          )}
        >
          <PlayCircle className={cn('h-4 w-4', playing && 'animate-pulse')} aria-hidden />
          {playsUsed === 0 ? copy.play : copy.playAgain}
        </button>

        <p
          className={cn(
            'text-xs font-semibold sm:text-sm',
            exhausted ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]'
          )}
          aria-live="polite"
        >
          {exhausted ? copy.noPlaysLeft : copy.playsLeft(playsLeft)}
        </p>
      </div>

      {failed ? (
        <p className="mt-3 text-sm text-[var(--casa-danger-text)]">{copy.audioUnavailable}</p>
      ) : null}

      {/* No `controls`: native controls carry a seek bar, and scrubbing defeats
          the play cap the item depends on. */}
      <audio
        ref={audioRef}
        src={stimulus.audioUrl}
        preload="none"
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
