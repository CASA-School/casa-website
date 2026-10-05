import { Check } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

type RegistrationTabsProps = {
  current: 'course' | 'exam';
  locale: ContentLocale;
};

/** The switch between the two registration forms, at the top of both. */
export function RegistrationTabs({ current, locale }: RegistrationTabsProps) {
  const de = locale === 'de';
  const tabs = [
    { key: 'course', href: '/registration/course', label: de ? 'Kursanmeldung' : 'Course registration' },
    { key: 'exam', href: '/registration/exam', label: de ? 'Prüfungsanmeldung' : 'Exam registration' },
  ] as const;

  return (
    <nav aria-label={de ? 'Art der Anmeldung' : 'Type of registration'}>
      <ul className="inline-flex max-w-full rounded-xl bg-[var(--casa-surface-subtle)] p-1">
        {tabs.map((tab) => {
          const active = tab.key === current;

          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
                  active
                    ? 'bg-white text-[var(--casa-ink)] shadow-[var(--shadow-soft)]'
                    : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type RegistrationStepperProps = {
  steps: readonly { title: string }[];
  /** 1-based. */
  step: number;
  locale: ContentLocale;
};

/** Three segments that fill as the learner moves through the wizard. */
export function RegistrationStepper({ steps, step, locale }: RegistrationStepperProps) {
  return (
    <ol className="grid grid-cols-3 gap-3 sm:gap-5">
      {steps.map((item, index) => {
        const number = index + 1;
        const complete = number < step;
        const active = number === step;

        return (
          <li key={item.title} aria-current={active ? 'step' : undefined} className="min-w-0">
            <div
              aria-hidden="true"
              className={cn(
                'h-1 rounded-full transition-colors duration-300',
                complete || active ? 'bg-[var(--casa-blue)]' : 'bg-[var(--casa-surface-subtle)]'
              )}
            />
            <div className="mt-3 flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300',
                  complete
                    ? 'bg-[var(--casa-accent-surface)] text-white'
                    : active
                      ? 'border-2 border-[var(--casa-blue)] text-[var(--casa-accent-text)]'
                      : 'border border-[color:var(--casa-field-edge-hover)] text-[var(--casa-muted)]'
                )}
              >
                {complete ? <Check className="size-3.5" aria-hidden /> : number}
              </span>
              <div className="min-w-0">
                <p className={cn('truncate text-sm font-semibold', active || complete ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>
                  {item.title}
                  {complete ? <span className="sr-only">{locale === 'de' ? ' (erledigt)' : ' (done)'}</span> : null}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
