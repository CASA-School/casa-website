'use client';

import { Fragment, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { formControlClassName } from '@/components/forms/form-styles';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { isSecondHalf } from '@/lib/registration/halves';
import type { LevelChoiceGroup } from '@/lib/registration/levels';
import { termRange } from '@/lib/registration/term-format';

export type CourseTermGroup = {
  key: string;
  /** The part of the day, "Vormittags"; empty when the schedule has no time. */
  daytime: string;
  /** "Mo–Fr · 09:00–12:30". */
  schedule: string;
  /** "Montag und Mittwoch" or "Mo–Fr", for a slot named by its days. */
  days: string;
  time: string;
  /** Terms a learner can still book, soonest first. */
  terms: {
    id: string;
    start: string;
    end: string;
    /** The registration form with this term chosen; the course page for a format not registered online. */
    href: string;
    /** Begun and still open to join (an evening term). */
    joinable: boolean;
    /** An intensive term's second half: its first day, null where the term does not say (lib/registration/halves). */
    secondHalfStart: string | null;
    /** Begun, and open only at its second half. */
    secondHalfOnly: boolean;
  }[];
};

/**
 * KURSTERMINE AS OFFERS (Rahman, 2026-10-20). It was the term list in two columns, every term a row
 * („rows and columns of excel … can we sell courses like this?"), then a chooser of boxed date
 * tiles („awful"). Now each weekly slot is one card, a thing to book: its name („Vormittags", or the
 * days where two slots share a part of the day), its hours, the start as a dropdown like the
 * registration form's, and „Anmelden", which opens the form with all of it chosen.
 *
 * THE LEVEL, AND A START AT THE SECOND HALF (Rahman: „you didn't add the course levels … and what if
 * someone wants to start from the second half"). One „Niveau" field above the cards asks what the form
 * asks (lib/registration/levels: „A2 komplett", A2.1, A2.2). At a second half the starts are the second
 * halves' first days, a term already under way among them while its second half is ahead, or „ab der
 * 5. Kurswoche" where the term does not say the date (lib/registration/halves). „Anmelden" carries the
 * level (`?courseId=…&level=…`), so the form opens with the course, the slot, the start and the level.
 */
export function CourseTermTable({
  groups,
  levels,
  locale,
  note,
}: {
  groups: CourseTermGroup[];
  levels: LevelChoiceGroup[];
  locale: ContentLocale;
  note?: string;
}) {
  const { say } = useSiteCopy();
  const [level, setLevel] = useState('');
  const half = isSecondHalf(level);
  const open = groups
    .map((group) => ({ ...group, terms: group.terms.filter((term) => half || !term.secondHalfOnly) }))
    .filter((group) => group.terms.length > 0);
  if (open.length === 0) {
    return null;
  }

  // Named by the part of the day, unless that does not tell the slots apart (two evening slots).
  const byDays = new Set(open.map((group) => group.daytime)).size < open.length;

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{say(locale, 'Kurstermine', 'Course dates')}</h2>

      {levels.length > 0 ? (
        <div className="mt-7 max-w-md">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <label htmlFor="term-level" className="text-sm font-semibold text-[var(--casa-ink)]">
              {say(locale, 'Niveau', 'Level')}
            </label>
            <Link href="/placement-test" className="text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline">
              {say(locale, 'Kostenloser Einstufungstest', 'Free placement test')}
            </Link>
          </div>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger id="term-level" className={`${formControlClassName} mt-2 min-w-0`}>
              <SelectValue placeholder={say(locale, 'Niveau auswählen…', 'Choose a level…')} />
            </SelectTrigger>
            <SelectContent>
              {levels.map((group, index) => (
                <Fragment key={group.level}>
                  {index > 0 ? <SelectSeparator /> : null}
                  <SelectGroup>
                    {group.choices.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {open.map((group) => (
          <TermOffer
            // A new level starts the card at its next start.
            key={`${group.key}|${level}`}
            group={group}
            title={(byDays ? group.days : group.daytime) || group.schedule}
            detail={(byDays ? [group.daytime, group.time] : [group.schedule]).filter(Boolean).join(' · ')}
            level={level}
            locale={locale}
          />
        ))}
      </div>
      {note ? <p className="mt-6 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">{note}</p> : null}
    </section>
  );
}

function TermOffer({ group, title, detail, level, locale }: { group: CourseTermGroup; title: string; detail: string; level: string; locale: ContentLocale }) {
  const { say } = useSiteCopy();
  const half = isSecondHalf(level);
  // At a second half a term is its second half: from its first day to the term's end.
  const starts = group.terms
    .map((term) => ({ ...term, from: half ? term.secondHalfStart ?? term.start : term.start, dated: !half || Boolean(term.secondHalfStart) }))
    .sort((a, b) => a.from.localeCompare(b.from));
  const [termId, setTermId] = useState(starts[0].id);
  const term = starts.find((candidate) => candidate.id === termId) ?? starts[0];
  const fieldId = `term-${group.key.replace(/[^a-z0-9]+/gi, '-')}`;
  const href = level ? `${term.href}${term.href.includes('?') ? '&' : '?'}level=${encodeURIComponent(level)}` : term.href;

  return (
    <article className="flex min-w-0 flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] sm:p-7">
      <h3 className="text-2xl font-bold leading-tight text-[var(--casa-ink)]">{title}</h3>
      {detail && detail !== title ? <p className="mt-1.5 text-base tabular-nums text-[var(--casa-muted)]">{detail}</p> : null}

      <label htmlFor={fieldId} className="mt-6 block text-sm font-semibold text-[var(--casa-ink)]">
        {say(locale, 'Starttermin', 'Start date')}
      </label>
      <Select value={term.id} onValueChange={setTermId}>
        <SelectTrigger id={fieldId} className={`${formControlClassName} mt-2 min-w-0`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {starts.map((candidate, index) => {
            const tag = !candidate.dated
              ? say(locale, 'ab der 5. Kurswoche', 'from the fifth week')
              : candidate.joinable
                ? say(locale, 'Einstieg möglich', 'Join now')
                : index === 0
                  ? say(locale, 'Nächster Start', 'Next start')
                  : null;
            return (
              <SelectItem key={candidate.id} value={candidate.id}>
                <span className="tabular-nums">{termRange(candidate.from, candidate.end, locale)}</span>
                {tag ? <span className="text-[var(--casa-muted)]"> · {tag}</span> : null}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Button asChild variant="prism" size="lg" className="mt-5 w-full">
        <Link href={href}>
          {say(locale, 'Anmelden', 'Register')}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}
