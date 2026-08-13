import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { CasaRoundedShape, CasaTriangleShape } from '@/components/ui/logo-shapes';
import { ctaHierarchyByPage, heroGovernanceRules, mediaRules, registrationUxStandards, sectionSpacingRules } from '@/config/brand/usage-rules';
import { brandPrimitives, componentTokenRules, semanticTokens } from '@/config/brand/tokens';
import { toneByContext, voicePrinciples } from '@/config/brand/voice-and-tone';
import { pagePatternMap } from '@/config/page-patterns';
import { createPublicMetadata } from '@/lib/seo';

const baseMetadata = createPublicMetadata({
  title: 'CASA Design System',
  description: 'Governance guidelines for CASA public experience, brand tokens, hero variants, and public registration UX standards.',
  path: '/design-system',
});

export const metadata: Metadata = {
  ...baseMetadata,
  robots: {
    index: false,
    follow: false,
  },
};

const heroThemes = [
  { key: 'home', className: 'hero-theme-home' },
  { key: 'courses', className: 'hero-theme-courses' },
  { key: 'exams', className: 'hero-theme-exams' },
  { key: 'accommodation', className: 'hero-theme-accommodation' },
  { key: 'about', className: 'hero-theme-about' },
  { key: 'default', className: 'hero-theme-default' },
] as const;

const heroArchetypes = [
  { key: 'A', name: 'Illustration Signature', usage: 'Home only' },
  { key: 'B', name: 'Editorial Left / Index Right', usage: 'Courses + Exams indexes' },
  { key: 'C', name: 'Centered Minimal', usage: 'Legal + utility pages' },
  { key: 'D', name: 'Split Media Story', usage: 'Accommodation surfaces' },
  { key: 'E', name: 'Data / Utility Hero', usage: 'Course + Exam detail routes' },
  { key: 'F', name: 'Community / Testimonial', usage: 'About page' },
] as const;

const publicComponentContracts = [
  {
    title: 'Hero Renderer',
    file: 'src/components/patterns/hero/hero-renderer.tsx',
  },
  {
    title: 'Hero Archetypes',
    file: 'src/components/patterns/hero/hero-a.tsx ... hero-f.tsx',
  },
  {
    title: 'Page Pattern Map',
    file: 'src/config/page-patterns.ts',
  },
  {
    title: 'Navbar',
    file: 'src/components/layout/navbar.tsx',
  },
  {
    title: 'Footer',
    file: 'src/components/layout/footer.tsx',
  },
  {
    title: 'Course Registration Wizard',
    file: 'src/components/registration/course-wizard.tsx',
  },
  {
    title: 'Custom Date Picker',
    file: 'src/components/ui/date-picker.tsx',
  },
] as const;

const logoShapeToneSamples = [
  { label: 'Sun', tone: 'sun' },
  { label: 'Blue', tone: 'blue' },
  { label: 'Red', tone: 'red' },
  { label: 'Amber', tone: 'amber' },
  { label: 'Coral', tone: 'coral' },
  { label: 'Ink', tone: 'ink' },
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-[var(--casa-ink)]">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 text-[var(--casa-ink)] sm:py-14">
      <Container className="space-y-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--casa-accent-text)]">Governance</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">CASA Design System v2</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                Source-of-truth guidelines for conversion UX, brand character, and public interface consistency.
              </p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Logo className="h-8 w-auto" />
            </div>
          </div>
          <div className="mt-6">
            <Button asChild className="rounded-lg bg-[var(--casa-ink-deep)] font-bold text-white hover:bg-[var(--casa-ink-deep-hover)]">
              <Link href="/design-system/course-format-variants">Review course format variants</Link>
            </Button>
          </div>
        </header>

        <Section title="Voice and Tone" description="Language style must feel human, professional, and action-oriented.">
          <div className="grid gap-5 md:grid-cols-3">
            {voicePrinciples.map((principle) => (
              <article key={principle.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-[var(--casa-ink)]">{principle.title}</p>
                <p className="mt-2 text-sm text-slate-600">{principle.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(toneByContext).map(([context, guidance]) => (
              <div key={context} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{context}</p>
                <p className="mt-1 text-sm text-slate-700">{guidance}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Brand Token Layers" description="All public pages should consume semantic tokens instead of hardcoded values.">
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Primitives</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(brandPrimitives).map(([name, value]) => (
                  <div key={name} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="h-10 rounded-lg border border-slate-200" style={{ backgroundColor: value }} />
                    <p className="mt-2 text-sm font-semibold capitalize text-slate-800">{name}</p>
                    <p className="text-xs font-mono text-slate-500">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Semantic Tokens</p>
                <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-slate-700">
{JSON.stringify(semanticTokens, null, 2)}
                </pre>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Component Token Rules</p>
                <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-slate-700">
{JSON.stringify(componentTokenRules, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Logo-Inspired Shapes"
          description="Rounded and triangle primitives derived from the CASA mark for decorative accents, media framing, and section rhythm."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Rounded Shape</p>
              <div className="mt-4 flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <CasaRoundedShape tone="sun" className="h-16 w-24" />
                <CasaRoundedShape tone="blue" className="h-12 w-20" />
                <CasaRoundedShape tone="amber" className="h-10 w-16" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Use near hero corners, behind pull quotes, or as soft section separators.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Triangle Shape</p>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <CasaTriangleShape tone="red" className="h-14 w-14" />
                <CasaTriangleShape tone="blue" direction="right" className="h-12 w-12" />
                <CasaTriangleShape tone="coral" direction="down" className="h-10 w-10" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Use as directional accents in cards or CTA clusters. Keep them decorative and avoid functional icon overload.
              </p>
            </article>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {logoShapeToneSamples.map((sample) => (
              <div key={sample.label} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <CasaRoundedShape tone={sample.tone} className="h-9 w-14" />
                  <CasaTriangleShape tone={sample.tone} className="h-8 w-8" />
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{sample.label}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="CTA Priority Matrix" description="Every public route follows one primary intent path, one secondary path, and one tertiary support path.">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Page Key</th>
                  <th className="px-4 py-3">Primary</th>
                  <th className="px-4 py-3">Secondary</th>
                  <th className="px-4 py-3">Tertiary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {Object.entries(ctaHierarchyByPage).map(([pageKey, values]) => (
                  <tr key={pageKey}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{pageKey}</td>
                    <td className="px-4 py-3 text-slate-600">{values.primary}</td>
                    <td className="px-4 py-3 text-slate-600">{values.secondary}</td>
                    <td className="px-4 py-3 text-slate-600">{values.tertiary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Hero Pattern Library" description="One shared hero contract with six archetypes and page-specific usage rules.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {heroArchetypes.map((archetype) => (
              <article key={archetype.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">Hero {archetype.key}</p>
                <p className="mt-2 text-base font-bold text-[var(--casa-ink)]">{archetype.name}</p>
                <p className="mt-1 text-xs text-slate-500">{archetype.usage}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {heroThemes.map((theme) => (
              <article key={theme.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className={`hero-grain ${theme.className} h-24 border-b border-slate-200`} />
                <div className="p-4">
                  <p className="text-sm font-bold capitalize text-slate-800">{theme.key}</p>
                  <p className="mt-1 text-xs text-slate-500">Theme class: {theme.className}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Route Key</th>
                  <th className="px-4 py-3">Hero</th>
                  <th className="px-4 py-3">Primary CTA</th>
                  <th className="px-4 py-3">Signature Modules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {Object.values(pagePatternMap).map((pattern) => (
                  <tr key={pattern.routeKey}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{pattern.routeKey}</td>
                    <td className="px-4 py-3 text-slate-600">{pattern.hero}</td>
                    <td className="px-4 py-3 text-slate-600">{pattern.primaryCta}</td>
                    <td className="px-4 py-3 text-slate-600">{pattern.signatureModules.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            {heroGovernanceRules.map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Registration UX Standards" description="Public registration pages must stay professional, clear, and support-safe.">
          <div className="grid gap-4 sm:grid-cols-2">
            {registrationUxStandards.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="prism">
              <Link href="/registration/course">Review Course Registration</Link>
            </Button>
            <Button asChild variant="prism">
              <Link href="/registration/exam">Review Exam Registration</Link>
            </Button>
          </div>
        </Section>

        <Section title="Button Variant Catalog" description="Standardized button variants consolidated inside the Button primitive component.">
          <div className="flex flex-wrap gap-4 items-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Prism (Default CTA)</span>
              <Button variant="prism">Prism Button</Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Outline Prism</span>
              <Button variant="outline-prism">Outline Prism</Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Marketing Sun</span>
              <Button variant="marketing-sun">Marketing Sun</Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Marketing Dark</span>
              <Button variant="marketing-dark">Marketing Dark</Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Marketing Outline</span>
              <div className="bg-slate-800 p-2 rounded-lg flex items-center justify-center">
                <Button variant="marketing-outline">Marketing Outline</Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Marketing Light</span>
              <Button variant="marketing-light">Marketing Light</Button>
            </div>
          </div>
        </Section>

        <Section title="Section Spacing Standards" description="Public-facing layouts must maintain generous visual rhythm between major page features.">
          <div className="grid gap-4 sm:grid-cols-2">
            {sectionSpacingRules.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Media and Component Contracts" description="Use authentic CASA visuals and keep every guideline tied to production code.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Media Rules</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {mediaRules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--casa-coral)]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Production Contracts</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {publicComponentContracts.map((entry) => (
                  <li key={entry.file}>
                    <p className="font-semibold text-slate-800">{entry.title}</p>
                    <p className="font-mono text-xs text-slate-500">{entry.file}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </Container>
    </main>
  );
}
