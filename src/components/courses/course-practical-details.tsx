import { HelpCircle } from 'lucide-react';

import { FeeStrip } from '@/components/sections/fee-strip';
import { cn } from '@/lib/utils';

type Fee = {
  label: string;
  amount: string;
  note?: string;
};

/**
 * The fee table and conditions CASA publishes for a course format.
 *
 * casa-bremen.de gives every course a "Kosten" table and a block of prose
 * conditions, and both were missing here entirely: a learner comparing formats
 * saw "Price: from €520" with no indication that a full level is €940, that an
 * extra week is €117.50, or that a first registration adds €50. The fee table is
 * the part of a course page people screenshot.
 *
 * WHY THIS WAS REBUILT — it split by the wrong axis.
 *
 * The section used to be two columns, costs on the left and conditions on the
 * right, divided by a full-height rule. That splits by CATEGORY, and the two
 * categories do not carry comparable volumes. Counted across the seven formats
 * in config/courses/course-practical-facts.ts:
 *
 *   evening-german    1 fee   5 conditions
 *   special-courses   1 fee   3 conditions
 *   bildungszeit      4 fees  4 conditions
 *   medical-german    0 fees  4 conditions
 *   in-company        0 fees  3 conditions
 *   german-for-groups 0 fees  5 conditions
 *
 * One of the seven is balanced. On the Evening Course the left column held a
 * single €476 row against five bullets, so ~40% of the section was empty and the
 * divider drew a line down the middle of the void to prove it. Three formats
 * have no fees at all and needed a whole second branch of markup to avoid the
 * same hole.
 *
 * SO IT SPLITS BY READING ORDER INSTEAD: the figures first, at full width, then
 * the conditions beneath them in two columns. Nothing sits opposite anything, so
 * no ratio of fees to conditions can leave a gap — and the 0-fee case is the
 * same layout with the strip omitted rather than a second implementation.
 *
 * THE FIGURES ARE `FeeStrip`, not markup of our own. /accommodation/flat and
 * /accommodation/host publish the same shape — label, amount, optional note —
 * and had their own `<dl>` written inline in the page, so they kept the small
 * right-aligned amount after this section moved on. One implementation now; see
 * sections/fee-strip for why the amount leads and why the cells carry no rules.
 *
 * Data comes from config/courses/course-practical-facts.ts. Never hardcode a
 * figure in here.
 */
export function CoursePracticalDetails({
  fees,
  feeNote,
  conditions,
  locale,
}: {
  fees?: Fee[];
  feeNote?: string;
  conditions: string[];
  locale: 'en' | 'de';
}) {
  if (!fees?.length && !feeNote && conditions.length === 0) {
    return null;
  }

  const copy = {
    title: locale === 'de' ? 'Kosten und Bedingungen' : 'Costs and conditions',
    fees: locale === 'de' ? 'Kosten' : 'Costs',
    conditions: locale === 'de' ? 'Gut zu wissen' : 'Good to know',
  };

  const feeList = fees ?? [];

  /*
   * With a single fee, its own label ("Course fee per trimester") already says
   * these are costs, and the section eyebrow above it made two stacked lines of
   * uppercase micro-type saying the same thing. The eyebrow earns its place only
   * when it is heading a set.
   */
  const showCostsEyebrow = feeList.length > 1;

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>

      {feeList.length > 0 ? (
        <>
          {/*
            The list draws its own top rule now, so the eyebrow no longer carries
            one — two hairlines 24px apart is the doubling this section keeps
            being cleaned of.
          */}
          {showCostsEyebrow ? (
            <p className="mt-7 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
              {copy.fees}
            </p>
          ) : null}

          <FeeStrip figures={feeList} className={showCostsEyebrow ? 'mt-4' : 'mt-7'} />
        </>
      ) : null}

      {/*
        `feeNote` carries the sentence that stands in for a price on a quote-only
        format ("priced per group, after a briefing"), and on a format WITH fees
        it carries the caveat beside them. One treatment for both: the question
        mark, and the sentence at reading measure.
      */}
      {feeNote ? (
        <p
          className={cn(
            'flex max-w-measure gap-3 text-base leading-relaxed text-[var(--casa-ink)]',
            feeList.length > 0
              ? 'mt-7 text-sm text-[var(--casa-muted)]'
              : 'mt-7 border-t border-[color:var(--casa-sand)] pt-6'
          )}
        >
          <HelpCircle aria-hidden className="mt-1 h-5 w-5 shrink-0 text-[var(--casa-accent-text)]" />
          <span>{feeNote}</span>
        </p>
      ) : null}

      {conditions.length ? (
        <>
          {/*
            The rule is conditional. `FeeStrip` closes itself with a bottom
            hairline, so when a fee list rendered above this the eyebrow's own
            `border-t` put a second rule 30px under the first — the hairline
            doubling this section has been cleaned of twice. With no list (a
            quote-only format) there is nothing above to close, so the rule is
            what separates the conditions from the note.
          */}
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]',
              feeList.length > 0 ? 'mt-9' : 'mt-10 border-t border-[color:var(--casa-sand)] pt-6'
            )}
          >
            {copy.conditions}
          </p>

          {/*
            Two columns at full width, and the list fills them in column order so
            an odd count leaves its gap at the bottom of the second column rather
            than a ragged hole mid-list. `break-inside-avoid` keeps a bullet from
            splitting across the column break.
          */}
          <ul className="mt-5 md:columns-2 md:gap-x-12">
            {conditions.map((condition) => (
              <li
                key={condition}
                className="mb-4 flex break-inside-avoid gap-3 text-base leading-relaxed text-[var(--casa-ink)] last:mb-0"
              >
                <span aria-hidden className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
