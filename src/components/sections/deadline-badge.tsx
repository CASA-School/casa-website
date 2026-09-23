import { cn } from '@/lib/utils';

import { bremenToday } from '@/lib/content/bookability';
import type { ContentLocale } from '@/lib/content/types';

type DeadlineBadgeProps = {
  deadlineIso?: string | null;
  locale: ContentLocale;
  className?: string;
};

/**
 * Whole calendar days from today in Bremen to the deadline day, which counts as
 * open. Measured against the clock instead, the deadline day read as "1 Tag"
 * just after midnight and a passed deadline as "heute" until 02:00.
 */
function daysUntil(deadlineIso: string) {
  const deadline = Date.parse(`${deadlineIso.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${bremenToday()}T00:00:00Z`);
  return Math.round((deadline - today) / (1000 * 60 * 60 * 24));
}

export function DeadlineBadge({ deadlineIso, locale, className }: DeadlineBadgeProps) {
  if (!deadlineIso) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-[color:var(--casa-sand)] bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-eyebrow text-[var(--casa-muted)]',
          className
        )}
      >
        {locale === 'de' ? 'Laufende Anmeldung' : 'Rolling registration'}
      </span>
    );
  }

  const days = daysUntil(deadlineIso);
  const state = days < 0 ? 'closed' : days <= 7 ? 'urgent' : days <= 21 ? 'soon' : 'open';

  const classes =
    state === 'closed'
      ? 'border-[color:var(--casa-danger-surface)]/30 bg-[var(--casa-danger-surface)]/5 text-[var(--casa-danger-text)]'
      : state === 'urgent'
        ? 'border-[color:var(--casa-gold-deep)]/30 bg-[var(--casa-gold-deep)]/8 text-[var(--casa-warning-text)]'
        : state === 'soon'
          ? 'border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)] text-[var(--casa-ink)]'
          : 'border-[color:var(--casa-success-surface)]/30 bg-[var(--casa-success-surface)]/8 text-[var(--casa-success-text)]';

  const text =
    state === 'closed'
      ? locale === 'de'
        ? 'Anmeldung geschlossen'
        : 'Registration closed'
      : days === 0
        ? locale === 'de'
          ? 'Anmeldung endet heute'
          : 'Registration closes today'
        : days === 1
          ? locale === 'de'
            ? 'Anmeldung endet in 1 Tag'
            : 'Registration closes in 1 day'
          : locale === 'de'
            ? `Anmeldung endet in ${days} Tagen`
            : `Registration closes in ${days} days`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-eyebrow',
        classes,
        className
      )}
    >
      {text}
    </span>
  );
}
