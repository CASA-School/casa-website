'use client';

import { wsLocale } from '@/lib/admin/i18n';
import { toDateInputValue } from '@/lib/dates';

import { useWsLang } from './lang';

/**
 * A dated line in the workspace's language: "07 Sept 2026" / "07. Sept. 2026".
 * `<time>` so the value is machine-readable, and tabular numerals pick it up.
 *
 * `compact` drops the year when it is this one, and every list uses it: a
 * six-column queue on a laptop cannot spend 40px a row on a year that is the
 * current one for all but a handful of rows. The year comes back on a record's
 * own screen, and a row from another year keeps its year either way.
 */
export function DateText({
  value,
  withTime = false,
  compact = false,
}: {
  value: Date | string | null | undefined;
  withTime?: boolean;
  compact?: boolean;
}) {
  const { lang } = useWsLang();
  if (!value) return <span className="text-[var(--casa-text-subtle)]">—</span>;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-[var(--casa-text-subtle)]">—</span>;

  const sameYear = date.getFullYear() === new Date().getFullYear();
  const locale = wsLocale(lang);

  return (
    <time dateTime={date.toISOString()} className="whitespace-nowrap">
      {date.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        ...(compact && sameYear ? {} : { year: 'numeric' }),
      })}
      {withTime ? `, ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : ''}
    </time>
  );
}

/**
 * A date of birth.
 *
 * Every queue row carries two columns since 0007: `birth_date` (a real `date`,
 * when the submitted text parsed as one) and `birth_date_raw` (the text,
 * verbatim). Pass the typed value first and the raw as fallback. A `Date` or an
 * ISO string is formatted; anything else is printed exactly as it arrived — a
 * date checked against a passport must not be reformatted on a maybe.
 */
export function BirthDate({ value }: { value: Date | string | null | undefined }) {
  const { lang } = useWsLang();
  if (!value) return <span className="text-[var(--casa-text-subtle)]">—</span>;

  // From LOCAL components: `toISOString()` rendered every stored date a day
  // early for any positive UTC offset — 1998-03-14 showed as 13 March.
  const iso =
    value instanceof Date ? toDateInputValue(value) || null : (/^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())?.[0] ?? null);
  if (!iso) return <span>{String(value)}</span>;

  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return <span>{String(value)}</span>;

  return (
    <time dateTime={iso}>
      {date.toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
    </time>
  );
}
