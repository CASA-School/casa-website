import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { InfoRailSelect, type InfoRailSelectOption } from '@/components/sections/info-rail-select';
import { cn } from '@/lib/utils';

export type StickyInfoItem = {
  label: string;
  value: string;
  selector?: {
    selectedValue: string;
    options: InfoRailSelectOption[];
  };
};

type StickyInfoCardProps = {
  title: string;
  items: StickyInfoItem[];
  notes?: string;
  ctas?: Array<{
    label: string;
    href: string;
    kind: 'primary' | 'secondary';
  }>;
  className?: string;
  /**
   * Drops the card's own surface so it can be a SECTION of a larger card.
   *
   * The body rail on course, exam and accommodation detail pages composes this
   * with two more blocks; giving each its own shell produced three stacked boxes
   * at three radii. With `unstyled` the rail owns one surface and separates its
   * parts with rules. The hero mount keeps the shell.
   */
  unstyled?: boolean;
};

export function StickyInfoCard({ title, items, notes, ctas = [], className, unstyled = false }: StickyInfoCardProps) {
  return (
    <aside
      className={cn(
        unstyled
          ? 'px-6 pb-5 pt-6'
          : 'rounded-xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 lg:sticky lg:top-24',
        className
      )}
    >
      <h2 className="text-xl font-bold text-[var(--casa-ink)]">{title}</h2>

      <dl className="mt-5 divide-y divide-[color:var(--casa-sand)]">
        {items.map((item) => (
          <div key={item.label} className="py-2.5">
            <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{item.label}</dt>
            <dd className="mt-1 text-base font-semibold text-[var(--casa-ink)]">
              {item.selector && item.selector.options.length > 0 ? (
                <InfoRailSelect
                  label={item.label}
                  selectedValue={item.selector.selectedValue}
                  options={item.selector.options}
                />
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {notes ? <p className="mt-4 text-sm leading-relaxed text-[var(--casa-muted)]">{notes}</p> : null}

      {ctas.length > 0 ? (
        <div className="mt-5 space-y-2">
          {ctas.map((cta) => (
            <Button
              key={`${cta.href}-${cta.label}`}
              asChild
              variant={cta.kind === 'primary' ? 'default' : 'outline'}
              className={cn(
                'w-full justify-center',
                cta.kind === 'primary'
                  ? 'casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]'
                  : 'casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]'
              )}
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
