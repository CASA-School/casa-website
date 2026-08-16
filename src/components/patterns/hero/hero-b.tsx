import Link from 'next/link';
import { ArrowRight, ListFilter } from 'lucide-react';

import { CTAStack } from '@/components/patterns/cta-stack';
import { ProofStrip } from '@/components/patterns/proof-strip';

import { HeroShell, type HeroPatternProps } from './shared';

export function HeroB({ spec, showDraftClaims = false, quickLinks, className, dataTestId }: HeroPatternProps) {
  const isDe = spec.locale === 'de';
  const links = quickLinks ?? spec.ctas.map((cta) => ({ label: cta.label, href: cta.href }));

  return (
    <HeroShell spec={spec} className={className} dataTestId={dataTestId}>
      <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{spec.eyebrow}</p>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-[var(--casa-ink)] sm:text-5xl">
            {spec.headline}
          </h1>
          <p className="mt-5 max-w-measure text-lg leading-relaxed text-[var(--casa-muted)]">{spec.subheadline}</p>
          <CTAStack items={spec.ctas} className="mt-7" />
        </div>

        <aside className="rounded-3xl border border-[color:var(--casa-sand)]/80 bg-white/95 p-6 shadow-[var(--shadow-soft)]">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
            <ListFilter className="h-3.5 w-3.5" />
            {isDe ? 'Nächste Schritte' : 'Next steps'}
          </p>

          <ul className="mt-4 space-y-2">
            {links.slice(0, 4).map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex items-center justify-between rounded-xl border border-[color:var(--casa-sand)]/80 bg-[var(--casa-surface-wash)]/75 px-3 py-2.5 text-sm font-semibold text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/35 hover:text-[var(--casa-accent-text)]"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--casa-text-subtle)] group-hover:text-[var(--casa-accent-text)]" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(spec.chips?.slice(0, 4) ?? []).map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[color:var(--casa-sand)] bg-white px-2.5 py-1 text-center text-xs font-semibold text-[var(--casa-muted)]"
              >
                {chip}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <ProofStrip
        metrics={spec.proofMetrics}
        showDraftClaims={showDraftClaims}
        compact
        className="mt-6"
        dataTestId="hero-proof-strip"
      />
    </HeroShell>
  );
}
