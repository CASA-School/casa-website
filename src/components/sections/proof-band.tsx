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
    <section data-reveal="true" className={cn('rounded-3xl bg-[var(--casa-ink-deep)] px-6 py-7 text-white md:px-8 md:py-8', className)}>
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

      <ul className="mt-6 flex flex-wrap items-center gap-2.5" aria-label="Accreditations and partners">
        {accreditationLogos.slice(0, 5).map((logo) => (
          <li key={logo.id}>
            <Link
              href={logo.href || '#'}
              target={logo.href ? '_blank' : undefined}
              rel={logo.href ? 'noreferrer' : undefined}
              className="flex h-14 w-[136px] items-center justify-center rounded-xl bg-white/95 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-amber)]"
              aria-label={logo.name}
            >
              <Image src={logo.imageSrc} alt={logo.name} width={logo.imageWidth} height={logo.imageHeight} className="h-auto w-auto max-h-10 object-contain" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
