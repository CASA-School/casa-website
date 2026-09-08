import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, EyeOff, FileText, Globe, Key, Sparkles } from 'lucide-react';

import { Container } from '@/components/ui/container';
import { createPublicMetadata } from '@/lib/seo';

const baseMetadata = createPublicMetadata({
  title: 'Design Alternatives',
  description:
    'Internal CASA review catalog for alternative page and section designs.',
  path: '/design-alternatives',
});

export const metadata: Metadata = {
  ...baseMetadata,
  robots: {
    index: false,
    follow: false,
  },
};

const fullPageAlternatives = [
  {
    title: 'Recommendation-first landing page',
    route: '/landing-page-alt',
    status: 'Experimental',
    description:
      'A new homepage concept built directly around the recommended visitor journey: goal, course, exam, support, enrollment, proof, action.',
    notes: ['Fresh layout', 'Path cards as anchors', 'Noindex direct URL'],
  },
  {
    title: 'Reorganized existing homepage',
    route: '/homepage-reorganized',
    status: 'Experimental',
    description:
      'A version that keeps the existing homepage vocabulary and source data while sequencing the page around the same visitor journey.',
    notes: ['Existing content sources', 'Grouped course cards', 'Noindex direct URL'],
  },
] as const;

const sectionAlternatives = [
  {
    title: 'Homepage accommodation + enrollment',
    route: '/#enrollment-steps',
    status: 'Adopted on homepage',
    description:
      'Image-led accommodation support followed by four practical enrollment steps. This came from the recommendation-first landing page.',
  },
  {
    title: 'Grouped course formats',
    route: '/homepage-reorganized#courses',
    status: 'Candidate',
    description:
      'Course formats grouped by everyday German, focused practice, and work German to reduce equal-weight card overload.',
  },
  {
    title: 'Pathway decision gateway',
    route: '/landing-page-alt#path',
    status: 'Candidate',
    description:
      'Four entry points that move visitors toward courses, work German, exam preparation, or accommodation support.',
  },
] as const;

function StatusPill({ children }: { children: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-[color:var(--casa-warm-soft)] px-3 text-xs font-black uppercase tracking-[0.1em] text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)]">
      {children}
    </span>
  );
}

export default function DesignAlternativesPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 text-[var(--casa-ink)] sm:py-14">
      <Container className="space-y-8">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.65)] md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--casa-accent-text)]">
                <Globe className="h-4 w-4" aria-hidden />
                Internal review catalog
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-[var(--casa-ink)] md:text-5xl">
                Design alternatives for CASA pages and sections
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                A single place to collect page-level experiments and section variants before they are moved behind an admin wall.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                <div>
                  <p className="text-sm font-black text-[var(--casa-ink)]">Noindex, not private</p>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed text-[var(--casa-muted)]">
                    This page is not linked from navigation and asks crawlers not to index it. It still needs real admin protection before launch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--casa-accent-text)]">Full page alternatives</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--casa-ink)] md:text-3xl">
                Homepage-level experiments
              </h2>
            </div>
            <div className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-4 text-sm font-bold text-white">
              <Key className="h-4 w-4" aria-hidden />
              Admin gate pending
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {fullPageAlternatives.map((item) => (
              <article
                key={item.route}
                className="flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--casa-blue)]/35 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <FileText className="h-6 w-6 text-[var(--casa-accent-text)]" aria-hidden />
                  <StatusPill>{item.status}</StatusPill>
                </div>
                <h3 className="mt-5 text-2xl font-black leading-tight text-[var(--casa-ink)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{item.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.notes.map((note) => (
                    <span
                      key={note}
                      className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--casa-muted)] ring-1 ring-slate-200"
                    >
                      {note}
                    </span>
                  ))}
                </div>
                <Link
                  href={item.route}
                  className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-[var(--casa-ink)] transition-colors hover:text-[var(--casa-accent-text)]"
                >
                  Open variant
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--casa-accent-text)]">Section alternatives</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--casa-ink)] md:text-3xl">
              Reusable section candidates
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--casa-muted)]">
              This list can grow into a CMS/admin design library for comparing section variants before publishing them.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {sectionAlternatives.map((item) => (
              <Link
                key={item.title}
                href={item.route}
                className="group grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--casa-blue)]/35 hover:bg-white md:grid-cols-[1fr_auto] md:items-center"
              >
                <span>
                  <span className="flex flex-wrap items-center gap-3">
                    <Sparkles className="h-5 w-5 text-[var(--casa-accent-text)]" aria-hidden />
                    <span className="text-xl font-black text-[var(--casa-ink)]">{item.title}</span>
                    <StatusPill>{item.status}</StatusPill>
                  </span>
                  <span className="mt-3 block max-w-3xl text-sm leading-relaxed text-[var(--casa-muted)]">
                    {item.description}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-black text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
                  Review
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--casa-accent-text)]">Before go-live</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--casa-ink)] md:text-3xl">
            Required admin/CMS follow-up
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              'Move this catalog under an admin route or protect it with role-based access.',
              'Decide which experimental pages stay as CMS-editable variants and which are deleted.',
              'Keep noindex on every preview/design route until real access control is live.',
            ].map((item) => (
              <div key={item} className="rounded-lg bg-[color:var(--casa-warm-soft)]/35 p-4 text-sm font-bold leading-relaxed text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)]">
                {item}
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
