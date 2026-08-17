import Link from 'next/link';
import Image from 'next/image';

import { accreditationLogos } from '@/config/accreditations';
import { getProofMetrics } from '@/lib/content/repository';
import { toProofStripItems } from './proof-strip';
import { shouldShowDraftClaims } from '@/lib/content/locale';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

export type ProofStat = {
  value: string;
  label: string;
};

type ProofBandProps = {
  locale: ContentLocale;
  title?: string;
  credibilityLine?: string;
  className?: string;
};

export function ProofBand({ locale, title, credibilityLine, className }: ProofBandProps) {
  const showDraftClaims = shouldShowDraftClaims();
  const proofMetrics = getProofMetrics(locale);

  // Default to standard homepage copy if not explicitly overridden
  const defaultTitle = locale === 'de' ? 'Nachweise und Anerkennung' : 'Proof and credibility';
  const defaultCredibilityLine = locale === 'de'
    ? 'Anerkennung, langjährige Schulgeschichte und verlässliche Sprachpartner.'
    : 'Accreditations, long-standing school history, and trusted language partners.';

  const displayTitle = title ?? defaultTitle;
  const displayCredibilityLine = credibilityLine ?? defaultCredibilityLine;

  // Filter out internal metrics and format standard proof strip items (same as homepage)
  const stats = toProofStripItems(
    proofMetrics.filter((metric) => metric.sourceType !== 'internal'),
    showDraftClaims,
    4
  ).map((item) => ({
    value: item.value,
    label: item.label,
  }));

  return (
    /*
      The measure lives HERE, not at the call site.

      Every page used to clamp this itself, and they disagreed: the homepage
      wrapped it in `max-w-[85rem]` while /courses let it span the full 1680px
      site frame, so the same component was visibly two different widths on two
      pages. ProofBand is a painted ink slab whose widest child is a ~800px logo
      row — at full frame width more than half the panel is empty dark fill.

      Owning the clamp means a page renders <ProofBand /> and gets the agreed
      treatment, and changing it once changes it everywhere. `className` still
      composes for anything genuinely page-specific.
    */
    <section data-reveal="true" className={cn('mx-auto max-w-[85rem] rounded-3xl bg-[var(--casa-ink-deep)] px-6 py-7 text-white md:px-8 md:py-8', className)}>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-amber)]">{displayTitle}</p>
      <p className="mt-2 max-w-measure text-sm text-white/80 md:text-sm">{displayCredibilityLine}</p>

      {/*
        The column count follows the number of stats that actually survive the
        `sourceType !== 'internal'` filter above. In English only "Since 1983"
        clears it, so a fixed `lg:grid-cols-4` stranded one stat beside three
        empty columns on every page using this band. See
        docs/PREMIUM_UI_REVIEW_2026-08-16.md §1.6.
      */}
      <ul
        className={cn(
          'mt-6 grid gap-5',
          stats.length >= 4 && 'sm:grid-cols-2 lg:grid-cols-4',
          stats.length === 3 && 'sm:grid-cols-3',
          stats.length === 2 && 'sm:grid-cols-2',
          stats.length === 1 && 'max-w-md'
        )}
      >
        {stats.slice(0, 4).map((item) => (
          <li key={`${item.value}-${item.label}`} className="border-l border-white/25 pl-3">
            <p className="text-2xl font-black tracking-tight text-white md:text-3xl">{item.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-eyebrow text-white/70">{item.label}</p>
          </li>
        ))}
      </ul>

      {/*
        Accreditation marks, enlarged 2026-08-16.

        These are the band's actual proof — telc, partner bodies — and they were
        the smallest thing on it: a 136x56 plate holding a 40px-tall logo, set at
        95% opacity on a dark field. Small marks read as disclaimers rather than
        as credentials.

        Now 164x64 with a 48px cap FROM md, on solid white. Solid, not /95: a
        translucent plate lets ink-deep bleed through and greys the logos, which
        is the one thing an accreditation mark cannot afford. The plate grows
        more than the logo does, so the extra size is breathing room around the
        mark rather than upscaling of source art that may not have the
        resolution for it.

        The size is responsive, and that is not cosmetic. Measured at 375: the
        panel interior is 287px, so a 164px plate fits only ONE per row and the
        five marks became a five-row stack. Holding 136px below md keeps two per
        row (2x136 + 10px gap = 282), so the strip stays three rows on a phone
        while desktop gets the larger marks.
      */}
      <ul className="mt-7 flex flex-wrap items-center gap-2.5 md:gap-3" aria-label="Accreditations and partners">
        {accreditationLogos.slice(0, 5).map((logo) => (
          <li key={logo.id}>
            <Link
              href={logo.href || '#'}
              target={logo.href ? '_blank' : undefined}
              rel={logo.href ? 'noreferrer' : undefined}
              className="flex h-14 w-[136px] items-center justify-center rounded-xl bg-white px-2 transition-transform duration-300 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-amber)] md:h-16 md:w-[164px] md:px-3"
              aria-label={logo.name}
            >
              <Image src={logo.imageSrc} alt={logo.name} width={logo.imageWidth} height={logo.imageHeight} className="h-auto w-auto max-h-10 object-contain md:max-h-12" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
