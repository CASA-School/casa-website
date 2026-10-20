/**
 * The class strings the test's screens share. Sizes are the old page's, tuned on a phone (17px base,
 * 19px prompt lines, 560px column, big tap targets); colours, type and radii are the site's own.
 */

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]';

export const primaryButton =
  'w-full cursor-pointer rounded-lg border-0 bg-[var(--casa-ink-deep)] p-4 text-[18px] font-extrabold text-white ' +
  'transition-colors duration-150 hover:bg-[var(--casa-ink-deep-hover)] disabled:cursor-default disabled:opacity-45 ' +
  'motion-reduce:transition-none ' +
  focusRing;

export const ghostButton =
  'cursor-pointer rounded-lg border-[1.5px] border-[color:var(--casa-sand)] bg-white p-[15px] font-bold text-[var(--casa-ink)] ' +
  'disabled:cursor-default disabled:opacity-40 ' +
  focusRing;

export const optionButton =
  'flex cursor-pointer items-center justify-between gap-2.5 rounded-lg border-[1.5px] px-4 py-[15px] text-left text-[18px] ' +
  'text-[var(--casa-ink)] ' +
  focusRing;

export const optionIdle = 'border-[color:var(--casa-sand)] bg-white';
export const optionOn = 'border-[var(--casa-blue)] bg-[var(--casa-blue-tint)] font-bold';

export const card = 'mt-1.5 mb-3.5 rounded-xl bg-white px-[18px] py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

export const taskLabel = 'mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-[var(--casa-muted)]';

export const column = 'mx-auto w-full max-w-[560px] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]';

export const errorLine = 'mt-2.5 min-h-[22px] text-[15px] font-bold text-[var(--casa-danger-text)]';
