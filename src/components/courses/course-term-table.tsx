'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { formControlClassName } from '@/components/forms/form-styles';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
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
  /** Only terms a learner can still book, soonest first. */
  terms: {
    id: string;
    start: string;
    end: string;
    /** The registration form with this term chosen; the course page for a format not registered online. */
    href: string;
    /** Begun and still open to join (an evening term). */
    joinable: boolean;
  }[];
};

/**
 * KURSTERMINE AS OFFERS (Rahman, 2026-10-20). It was the term list in two columns, every term a row
 * („rows and columns of excel … can we sell courses like this?"), then a chooser of boxed date
 * tiles („awful"). Now each weekly slot is one card, a thing to book: its name („Vormittags", or the
 * days where two slots share a part of the day), its hours, the start as a dropdown like the
 * registration form's (the next one chosen), and „Anmelden", which opens the form with the course,
 * the slot and the start chosen (`?courseId=`). Only terms a learner can still book.
 */
export function CourseTermTable({
  groups,
  locale,
  note,
}: {
  groups: CourseTermGroup[];
  locale: ContentLocale;
  note?: string;
}) {
  const { say } = useSiteCopy();
  const open = groups.filter((group) => group.terms.length > 0);
  if (open.length === 0) {
    return null;
  }

  // Named by the part of the day, unless that does not tell the slots apart (two evening slots).
  const byDays = new Set(open.map((group) => group.daytime)).size < open.length;

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{say(locale, 'Kurstermine', 'Course dates')}</h2>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {open.map((group) => (
          <TermOffer
            key={group.key}
            group={group}
            title={(byDays ? group.days : group.daytime) || group.schedule}
            detail={(byDays ? [group.daytime, group.time] : [group.schedule]).filter(Boolean).join(' · ')}
            locale={locale}
          />
        ))}
      </div>
      {note ? <p className="mt-6 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">{note}</p> : null}
    </section>
  );
}

function TermOffer({ group, title, detail, locale }: { group: CourseTermGroup; title: string; detail: string; locale: ContentLocale }) {
  const { say } = useSiteCopy();
  const [termId, setTermId] = useState(group.terms[0].id);
  const term = group.terms.find((candidate) => candidate.id === termId) ?? group.terms[0];
  const fieldId = `term-${group.key.replace(/[^a-z0-9]+/gi, '-')}`;

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
          {group.terms.map((candidate, index) => (
            <SelectItem key={candidate.id} value={candidate.id}>
              <span className="tabular-nums">{termRange(candidate.start, candidate.end, locale)}</span>
              {candidate.joinable ? (
                <span className="text-[var(--casa-muted)]"> · {say(locale, 'Einstieg möglich', 'Join now')}</span>
              ) : index === 0 ? (
                <span className="text-[var(--casa-muted)]"> · {say(locale, 'Nächster Start', 'Next start')}</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button asChild variant="prism" size="lg" className="mt-5 w-full">
        <Link href={term.href}>
          {say(locale, 'Anmelden', 'Register')}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}
