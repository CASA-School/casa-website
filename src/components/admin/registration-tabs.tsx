import Link from 'next/link';

import { translator, type WsLang } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/**
 * Course or exam: the product switch beside the Registrations title.
 *
 * A switch rather than two sidebar areas: they are one job ("someone
 * registered for something") split by product. It is not a status, so it sits
 * apart from the views in the list's own bar — a quiet segmented control, not
 * a second row of pills. The count is what is open in each; zero shows none.
 */
export function RegistrationTabs({
  active,
  counts,
  lang,
}: {
  active: 'course' | 'exam';
  counts: { course: number; exam: number };
  lang: WsLang;
}) {
  const t = translator(lang);
  const tabs = [
    { key: 'course' as const, label: t('Kurs', 'Course'), href: '/admin/registrations/course' },
    { key: 'exam' as const, label: t('Prüfung', 'Exam'), href: '/admin/registrations/exam' },
  ];

  return (
    <nav aria-label={t('Anmeldungen', 'Registrations')} className="inline-flex gap-0.5 rounded-xl border border-ws-line bg-white p-0.5">
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-[26px] items-center gap-1.5 rounded-[0.55rem] px-3 text-[0.8rem] font-semibold transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
              isActive
                ? 'bg-ws-sunk text-[var(--casa-ink)]'
                : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
            )}
          >
            {tab.label}
            {counts[tab.key] ? (
              <span className="text-xs font-semibold text-[var(--casa-text-subtle)] tabular-nums">{counts[tab.key]}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
