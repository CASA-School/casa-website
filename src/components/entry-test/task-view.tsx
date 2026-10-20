'use client';

import type { Answer, ClientTask } from '@/lib/entry-test/types';
import { cn } from '@/lib/utils';

import { fillPrompt } from './gaps';
import { card, optionButton, optionIdle, optionOn, taskLabel } from './ui';

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-5 shrink-0 rounded-full bg-[var(--casa-blue)]">
      <path d="M5 10.5l3.2 3L15 6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Option({ on, onClick, centred, children }: { on: boolean; onClick: () => void; centred?: boolean; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(optionButton, on ? optionOn : optionIdle, centred && 'justify-center')}
    >
      <span>{children}</span>
      {on ? <Check /> : null}
    </button>
  );
}

type TaskViewProps = {
  task: ClientTask;
  answers: Answer[];
  onAnswer: (slot: number, value: Answer) => void;
};

export function TaskView({ task, answers, onAnswer }: TaskViewProps) {
  if (task.type === 'mc') {
    const chosen = answers[task.slot];
    const fill = chosen ? (task.options.find((option) => option.id === chosen)?.text ?? '') : '';
    const lines = fillPrompt(task.prompt, fill);

    return (
      <>
        <div className={card}>
          <div className={taskLabel}>Aufgabe {task.n}</div>
          {lines.map((pieces, i) => (
            <p key={i} className={cn('mb-2 text-[19px]', i > 0 && 'border-l-[3px] border-[color:var(--casa-sand)] pl-3.5')}>
              {pieces.map((piece, j) =>
                'text' in piece ? (
                  <span key={j}>{piece.text}</span>
                ) : piece.gap ? (
                  <span
                    key={j}
                    className="inline-block min-w-[88px] border-b-2 border-[var(--casa-blue)] px-1 text-center font-extrabold leading-[1.2] text-[var(--casa-accent-text)]"
                  >
                    {piece.gap}
                  </span>
                ) : (
                  <span key={j} className="inline-block min-w-[88px] border-b-2 border-[var(--casa-ink)] text-center leading-[1.2]">
                    {' '}
                  </span>
                )
              )}
            </p>
          ))}
        </div>
        <div className="grid gap-2.5">
          {task.options.map((option) => (
            <Option key={option.id} on={chosen === option.id} onClick={() => onAnswer(task.slot, option.id)}>
              {option.text}
            </Option>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={card}>
        <div className={taskLabel}>Aufgabe {task.n} · Lesen</div>
        <h2 className="mb-3 text-[20px] font-bold leading-snug">{task.title}</h2>
        {task.intro ? <p className="mb-2.5 text-[17px] text-[var(--casa-muted)]">{task.intro}</p> : null}
        {task.text.map((paragraph, i) => (
          <p key={i} className="mb-2.5 text-[17px]">
            {paragraph}
          </p>
        ))}
      </div>
      <div className={card}>
        {task.statements.map((statement, i) => {
          const slot = task.slot + i;
          return (
            <div key={slot} className="border-t border-[color:var(--casa-sand)] pb-1 pt-3.5">
              <p className="mb-2.5 text-[18px]">
                {i + 1}. {statement}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {(['richtig', 'falsch'] as const).map((verdict) => (
                  <Option key={verdict} centred on={answers[slot] === verdict} onClick={() => onAnswer(slot, verdict)}>
                    {verdict}
                  </Option>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
