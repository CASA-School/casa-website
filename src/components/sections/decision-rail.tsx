import type { ContentLocale } from '@/lib/content/types';

import { PersonMonogram } from '@/components/ui/person-monogram';

import { StickyInfoCard, type StickyInfoItem } from './sticky-info-card';
import { DeadlineBadge } from './deadline-badge';

type DecisionRailProps = {
  locale: ContentLocale;
  infoTitle: string;
  infoItems: StickyInfoItem[];
  notes?: string;
  deadlineIso?: string | null;
  /**
   * Defaults to true. Set false on archetypes where nobody registers — a
   * quote-only page rendering "Registration window: Rolling registration"
   * contradicts its own copy. This component also serves /exams/[code] and
   * /accommodation/[type], so the default must stay true.
   */
  showDeadline?: boolean;
  /**
   * The one named person who answers about this thing.
   *
   * Comes from config/content/contacts.ts, which assigns a colleague to each
   * surface and reads the spelling off the verified roster. A named contact is a
   * commitment that a real person replies, so it is never written at a call
   * site. `email` is a published inbox — CASA prints names and roles but only
   * one individual mailbox, so the role address is the honest route.
   */
  contact?: { name: string; role: string; booking: boolean } | null;
};

export function DecisionRail({
  locale,
  infoTitle,
  infoItems,
  notes,
  deadlineIso,
  showDeadline = true,
  contact,
}: DecisionRailProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      {/*
        No `ctas` here — deliberately.

        StickyInfoCard is mounted twice on /courses/[slug], /exams/[code] and
        /accommodation/[type]: once by HeroCUtilityRail in the hero and again by
        this rail in the body. Both were passed the same `ctas` array, so the
        identical primary and secondary buttons rendered two and sometimes three
        times per page — the single largest source of the site's button count.

        The hero mount keeps them, because that is where the decision is offered.
        This mount is a reference card the reader scrolls back to for dates and
        prices; it does not need to re-ask. `ctas` stays in the props so the
        prop shape is unchanged for any future non-hero consumer.
      */}
      {/*
        ONE card, divided — not three stacked ones.

        The rail rendered three separate elevated boxes (facts, registration
        window, teaching staff) at three different radii and two different
        shadows, and then several hundred pixels of empty gutter beneath them,
        because the body column is much taller. Three small boxes in a column
        read as three unrelated widgets; they are one reference card the reader
        scrolls back to. Divided rows hold the same structure with one edge
        instead of three.
      */}
      <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70">
        <StickyInfoCard title={infoTitle} items={infoItems} notes={notes} unstyled />

        {showDeadline ? (
          <div className="border-t border-[color:var(--casa-sand)] px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Anmeldefrist' : 'Registration window'}
            </p>
            <div className="mt-2">
              <DeadlineBadge deadlineIso={deadlineIso} locale={locale} />
            </div>
          </div>
        ) : null}

        {/*
          THE PERSON, AND NOTHING ELSE — the card's last row.

          What used to follow this row was `teachingStaff`: "Our teachers are
          native speakers with university degrees..." — 44 words of collective
          statement, identical on every course, exam and accommodation card, plus
          a "Meet the team" link. It is a fine claim and it belongs on /about and
          /team, where it is still rendered. In a reference card that a reader
          scrolls back to for a price and a date it was the longest thing on the
          card and answered nothing they had come back for.

          So the card now ends on a face, a name, a role and an address. The
          avatar is initials rather than a photograph, and stays that way until
          real portraits exist with consent — see ui/person-monogram.
        */}
        {contact ? (
          <div className="border-t border-[color:var(--casa-sand)] px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Ansprechperson' : 'Your contact'}
            </p>
            {/*
              `min-w-0` on the text column and `break-words` on the name.

              The card is 280px wide inside a 320px phone, and the avatar takes
              48 of it. Without `min-w-0` a flex child refuses to shrink past its
              content, so "Meike Große Hundrup" would have pushed the row wider
              than the card — the same min-content trap the card's buttons hit.
              With it the name wraps instead, which is what should happen.
            */}
            <div className="mt-3 flex items-center gap-3">
              <PersonMonogram name={contact.name} size="sm" />
              <div className="min-w-0">
                <p className="break-words text-sm font-bold leading-snug text-[var(--casa-ink)]">{contact.name}</p>
                <p className="mt-0.5 break-words text-xs leading-snug text-[var(--casa-muted)]">{contact.role}</p>
              </div>
            </div>
            {/*
              BOOK A CALL — rendered only where the person offers one, and
              INERT until CASA has a scheduling destination.

              `disabled` rather than a link to `#` or to /contact. A control that
              looks live and does nothing on click is worse than a visibly
              unavailable one, and pointing it at the contact form would make it
              a second, differently-labelled route to a page the nav already
              reaches — the duplicate-CTA problem this card was cleaned up to
              remove. Give it an `href` and it becomes a real button; nothing
              else here changes.

              This replaced the printed mailto address. See the `email` note in
              config/content/contacts.ts: the addresses are still recorded, just
              not set as the last line of a card meant to hold a few facts.
            */}
            {contact.booking ? (
              <button
                type="button"
                /*
                  `aria-disabled`, not `disabled`. Full visual weight, because
                  this is the control CASA will approve on sight and a greyed-out
                  primary in a finished card reads as breakage — but a screen
                  reader is told it is unavailable rather than promised an action
                  that has no destination yet.

                  IT DOES NOTHING WHEN CLICKED, and that is the open item: give
                  this an `href` (a scheduling URL, or /contact?topic=group-booking
                  as an interim) and it becomes a real control with no other
                  change here.
                */
                aria-disabled="true"
                className="casa-button-prism mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[var(--casa-ink-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
              >
                {locale === 'de' ? 'Termin buchen' : 'Book a call'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
