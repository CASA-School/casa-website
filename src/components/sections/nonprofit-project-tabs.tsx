'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Tabs } from 'radix-ui';
import type { ContentLocale } from '@/lib/content/types';

type Project = { name: string; logo: string; href: string; label: string; text: string };

export function NonprofitProjectTabs({ projects, locale }: { projects: Project[]; locale: ContentLocale }) {
  const de = locale === 'de';
  const [active, setActive] = useState(projects[0].logo);
  const linkClass = 'rounded-sm text-sm font-semibold text-[var(--casa-accent-text)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]';

  return (
    <Tabs.Root value={active} onValueChange={setActive} className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
      <Tabs.List aria-label={de ? 'Unsere Bildungskooperationen' : 'Our education partnerships'} className="grid grid-cols-3 border-b border-[color:var(--casa-sand)] bg-[var(--casa-bg)] p-2">
        {projects.map(project => (
          <Tabs.Trigger key={project.logo} value={project.logo} className="rounded-lg px-2 py-3 text-xs font-semibold text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--casa-blue)] data-[state=active]:bg-[var(--casa-ink-deep)] data-[state=active]:text-white sm:text-sm">
            {project.logo === 'gfh.svg' ? 'GF-H' : project.name}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {/* All panels share one grid cell. Hidden content preserves the largest
          natural height, so changing tabs never shifts the surrounding page. */}
      <div className="grid">
        {projects.map(project => (
          <Tabs.Content key={project.logo} value={project.logo} forceMount aria-hidden={active !== project.logo} inert={active !== project.logo} style={{ opacity: active === project.logo ? 1 : 0 }} className="col-start-1 row-start-1 flex min-w-0 flex-col p-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--casa-blue)] data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none sm:p-8 motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in motion-safe:duration-300">
            <a href={project.href} target="_blank" rel="noopener noreferrer" aria-label={project.name} className={`mb-7 flex h-24 w-56 max-w-full items-center justify-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)] ${project.logo === 'gfh.svg' ? 'bg-[var(--casa-ink-deep)] px-4' : ''}`}>
              <Image src={`/partners/${project.logo}`} alt={project.name} width={280} height={100} className="h-20 w-full object-contain object-left" />
            </a>
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{project.label}</p>
            <h3 className="mt-3 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{project.name}</h3>
            <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)]">{project.text}</p>
            <div className="mt-auto flex flex-wrap gap-x-6 gap-y-3 pt-6">
              <a href={project.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{de ? 'Zum Projekt' : 'Visit the project'} ↗</a>
              {project.logo === 'gfh.svg' && <a href="https://www.obs-ev.de/akademische-qualifizierung/garantiefonds-hochschule-2022/wie-kann-ich-mich-anmelden" target="_blank" rel="noopener noreferrer" className={linkClass}>Otto Benecke Stiftung ↗</a>}
            </div>
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
