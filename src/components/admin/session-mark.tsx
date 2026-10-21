import { SESSION_COLOURS, SESSION_LABELS, type Session } from '@/lib/admin/day-plan-labels';
import { pick, type WsLang } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/**
 * A course's part of the day as its colour (2026-10-21): green Vormittag, blue Nachmittag, purple Abend
 * (`SESSION_COLOURS`). A short upright stroke before the course's name — the edge the Tagesplan and the
 * Raumplan give a session, not a dot: a dot in a list is a state (the booking's colour, a task's). Its
 * word on hover and for a screen reader.
 */
export function SessionMark({ session, lang, className }: { session: Session; lang: WsLang; className?: string }) {
  const label = pick(lang, SESSION_LABELS[session]);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn('inline-block h-[0.85em] w-[3px] shrink-0 rounded-full align-[-0.08em]', SESSION_COLOURS[session].dot, className)}
    />
  );
}
