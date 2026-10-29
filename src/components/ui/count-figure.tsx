import { countParts } from '@/lib/count-figure';

/**
 * A figure whose number counts up once as its group comes into view (scroll-effects.tsx; it must
 * sit inside a `data-stagger` group). The server writes the whole value, so crawlers, screen
 * readers and a visitor without script read the real figure; only the number is marked, and a
 * year or a figure without a number renders as it is.
 */
export function CountFigure({ value }: { value: string }) {
  const parts = countParts(value);
  if (!parts) {
    return <>{value}</>;
  }

  return (
    <>
      {parts.before}
      <span data-count-to={parts.to} data-count-group={parts.group || undefined}>
        {parts.digits}
      </span>
      {parts.after}
    </>
  );
}
