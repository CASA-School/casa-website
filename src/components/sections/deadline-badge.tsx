import { cn } from '@/lib/utils';

import type { ContentLocale } from '@/lib/content/types';

type DeadlineBadgeProps = {
  deadlineIso?: string | null;
  locale: ContentLocale;
  className?: string;
};

function daysUntil(deadlineIso: string) {
  const now = new Date();
  const deadline = new Date(deadlineIso);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function DeadlineBadge({ deadlineIso, locale, className }: DeadlineBadgeProps) {
  if (!deadlineIso) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-[color:var(--casa-sand)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--casa-muted)]',
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
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : state === 'urgent'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : state === 'soon'
          ? 'border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)] text-[var(--casa-ink)]'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700';

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
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]',
        classes,
        className
      )}
    >
      {text}
    </span>
  );
}
