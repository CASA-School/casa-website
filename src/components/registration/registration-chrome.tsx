import { Check } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { say } from '@/lib/cms/copy';

type RegistrationTabsProps = {
  current: 'course' | 'exam';
  locale: ContentLocale;
};

/** The switch between the two registration forms, at the top of both. */
export function RegistrationTabs({ current, locale }: RegistrationTabsProps) {
  const tabs = [
    { key: 'course', href: '/registration/course', label: say(locale, 'Kursanmeldung', 'Course registration') },
    { key: 'exam', href: '/registration/exam', label: say(locale, 'Prüfungsanmeldung', 'Exam registration') },
  ] as const;

  return (
    <nav aria-label={say(locale, 'Art der Anmeldung', 'Type of registration')}>
      {/* Full width on a phone, each tab as wide as its label: side by side where both fit (390), and
          „Prüfungsanmeldung" wraps inside its tab where they do not (320), instead of pushing the page sideways. */}
      <ul className="flex w-full rounded-xl bg-[var(--casa-surface-subtle)] p-1 sm:inline-flex sm:w-auto">
        {tabs.map((tab) => {
          const active = tab.key === current;

          return (
            <li key={tab.key} className="min-w-0 flex-auto sm:flex-none">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block h-full rounded-lg px-2.5 py-2 text-center text-sm font-semibold hyphens-auto transition-colors sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
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
                {/* Below 380px a step is ~70px wide: only the current step names itself, the others keep their number. */}
                <p className={cn('truncate text-sm font-semibold', active || complete ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]', !active && 'max-[379px]:sr-only')}>
                  {item.title}
                  {complete ? <span className="sr-only">{say(locale, ' (erledigt)', ' (done)')}</span> : null}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
