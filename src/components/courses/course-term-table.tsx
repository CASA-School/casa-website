'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { choiceLook } from '@/components/registration/choice-controls';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { dateTileParts, formatDay, termRange } from '@/lib/registration/term-format';
import { cn } from '@/lib/utils';

export type CourseTermGroup = {
  key: string;
  /** The part of the day, "Vormittags"; empty when the schedule has no time. */
  daytime: string;
  /** "Mo–Fr · 09:00–12:30". */
  schedule: string;
  /** "Mo–Fr" and "09:00–12:30", for a slot named by its days. */
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
 * KURSTERMINE AS A CHOICE, NOT A TABLE (Rahman, 2026-10-20: „rows and columns of excel … can we sell
 * courses like this?").
 *
 * It was the term list in two columns, every term a row, past and running ones included, and a
 * reader had to work out from the column head which week they were choosing and from the row what
 * they would be booking. Now it asks the two questions the registration form asks, in its look
 * (choiceLook, the date tiles), and says what is being booked before anyone clicks:
 *
 *   1. Wann möchtest du lernen? — the slots as cards, „Vormittags · Mo–Fr · 09:00–12:30";
 *   2. Wann möchtest du starten? — that slot's starts as tiles, the next one named;
 *   then „Deine Auswahl": the course, the slot, the dates, and one button that opens the form with
 *   all of it chosen (`?courseId=`, getCourseRegistrationCatalog). The level is the form's one
 *   question left, said under the button with the free placement test beside it.
 *
 * Only bookable terms: a running or past term is not something to sell, and the facts rail already
 * names the next start. A format with one slot skips the first question.
 */
export function CourseTermTable({
  groups,
  locale,
  courseName,
  note,
}: {
  groups: CourseTermGroup[];
  locale: ContentLocale;
  courseName: string;
  note?: string;
}) {
  const { say } = useSiteCopy();
  const open = groups.filter((group) => group.terms.length > 0);
  const [slotKey, setSlotKey] = useState(open[0]?.key ?? '');
  const slot = open.find((group) => group.key === slotKey) ?? open[0];
  const [termId, setTermId] = useState(slot?.terms[0]?.id ?? '');

  if (!slot) {
    return null;
  }

  const term = slot.terms.find((candidate) => candidate.id === termId) ?? slot.terms[0];
  const chooseSlot = (key: string) => {
    setSlotKey(key);
    setTermId(open.find((group) => group.key === key)?.terms[0]?.id ?? '');
  };
  const askSlot = open.length > 1;
  // Slots named by the part of the day, unless that does not tell them apart (two evening slots): then by their days.
  const byDays = new Set(open.map((group) => group.daytime)).size < open.length;
  const slotTitle = (group: CourseTermGroup) => (byDays ? group.days : group.daytime) || group.schedule;
  const slotDetail = (group: CourseTermGroup) => (byDays ? [group.daytime, group.time] : [group.schedule]).filter(Boolean).join(' · ');

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{say(locale, 'Kurstermine', 'Course dates')}</h2>

      <div className="mt-7 rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] sm:p-7 lg:p-8">
        {askSlot ? (
          <fieldset>
            <legend className="flex items-center gap-2.5 text-base font-semibold text-[var(--casa-ink)]">
              <StepNumber>1</StepNumber>
              {say(locale, 'Wann möchtest du lernen?', 'When would you like to learn?')}
            </legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {open.map((group) => {
                const checked = group.key === slot.key;
                return (
                  <label
                    key={group.key}
                    className={cn(
                      'relative flex cursor-pointer flex-col rounded-xl border px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-150',
                      choiceLook.focus,
                      checked ? choiceLook.checked : choiceLook.idle
                    )}
                  >
                    <input type="radio" name="term-slot" value={group.key} checked={checked} onChange={() => chooseSlot(group.key)} className="sr-only" />
                    <span className="pr-6 text-base font-semibold text-[var(--casa-ink)]">{slotTitle(group)}</span>
                    {slotDetail(group) !== slotTitle(group) ? (
                      <span className="mt-0.5 text-sm tabular-nums text-[var(--casa-muted)]">{slotDetail(group)}</span>
                    ) : null}
                    {checked ? <Check aria-hidden className="absolute right-3.5 top-3.5 h-4 w-4 text-[var(--casa-accent-text)]" /> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset className={askSlot ? 'mt-8' : undefined}>
          <legend className="flex items-center gap-2.5 text-base font-semibold text-[var(--casa-ink)]">
            {askSlot ? <StepNumber>2</StepNumber> : null}
            {say(locale, 'Wann möchtest du starten?', 'When would you like to start?')}
          </legend>
          {!askSlot ? (
            <p className="mt-1 text-sm tabular-nums text-[var(--casa-muted)]">{[slot.daytime, slot.schedule].filter(Boolean).join(' · ')}</p>
          ) : null}
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2.5">
            {slot.terms.map((candidate, index) => {
              const parts = dateTileParts(candidate.start, locale);
              const checked = candidate.id === term.id;
              const tag = candidate.joinable
                ? say(locale, 'Einstieg möglich', 'Join now')
                : index === 0
                  ? say(locale, 'Nächster Start', 'Next start')
                  : null;
              return (
                <label
                  key={candidate.id}
                  className={cn(
                    'flex cursor-pointer flex-col items-center rounded-xl border px-2 pb-3 pt-2.5 text-center transition-[border-color,background-color,box-shadow] duration-150',
                    choiceLook.focus,
                    checked ? choiceLook.checked : choiceLook.idle
                  )}
                >
                  <input type="radio" name="term-start" value={candidate.id} checked={checked} onChange={() => setTermId(candidate.id)} className="sr-only" />
                  <span className="sr-only">{tag ? `${parts.full}, ${tag}` : parts.full}</span>
                  <span aria-hidden className={cn('text-3xl font-bold leading-tight tabular-nums', checked ? 'text-[var(--casa-accent-text)]' : 'text-[var(--casa-ink)]')}>
                    {parts.day}
                  </span>
                  <span aria-hidden className="text-sm font-medium text-[var(--casa-ink)]">{parts.monthYear}</span>
                  <span aria-hidden className="mt-1 text-xs text-[var(--casa-muted)]">
                    {say(locale, 'bis {date}', 'to {date}', { date: formatDay(candidate.end, locale) })}
                  </span>
                  {tag ? (
                    <span aria-hidden className="mt-2 whitespace-nowrap rounded-full bg-[var(--casa-blue-tint)] px-2 py-0.5 text-[0.6875rem] font-semibold leading-tight text-[var(--casa-accent-text)]">
                      {tag}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col gap-5 border-t border-[color:var(--casa-sand)] pt-6 md:flex-row md:items-center md:justify-between">
          <div aria-live="polite">
            <p className="text-sm text-[var(--casa-muted)]">{say(locale, 'Deine Auswahl', 'Your choice')}</p>
            <p className="mt-1 text-lg font-semibold leading-snug text-[var(--casa-ink)]">
              {courseName}
              {slot.daytime ? <span className="font-normal text-[var(--casa-muted)]"> · {slot.daytime}</span> : null}
            </p>
            <p className="mt-0.5 text-base tabular-nums text-[var(--casa-ink)]">{termRange(term.start, term.end, locale)}</p>
            <p className="text-sm tabular-nums text-[var(--casa-muted)]">{slot.schedule}</p>
          </div>
          <Button asChild variant="prism" size="lg" className="shrink-0">
            <Link href={term.href}>
              {say(locale, 'Weiter zur Anmeldung', 'Continue to registration')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--casa-muted)]">
          {say(locale, 'Dein Niveau wählst du in der Anmeldung. Du bist unsicher?', 'You choose your level when you register. Not sure?')}{' '}
          <Link href="/placement-test" className="font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline">
            {say(locale, 'Kostenloser Einstufungstest', 'Free placement test')}
          </Link>
        </p>
      </div>

      {note ? <p className="mt-6 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">{note}</p> : null}
    </section>
  );
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--casa-ink-deep)] text-xs font-bold text-white">
      {children}
    </span>
  );
}
