import Link from 'next/link';

/**
 * What CASA says about its teachers, in the course-page rail.
 *
 * This replaces `TeacherSpotlightCard`, which rendered a named individual with a
 * portrait, a job title, a "focus" area and a personal endorsement — all of it
 * invented, and all of it on every course detail page. The person was Anna
 * Keller, "Senior German Teacher"; she does not work at CASA, because she does
 * not exist.
 *
 * There is no honest named replacement. casa-bremen.de names its leadership,
 * coordinators and office staff, and deliberately does not name individual
 * classroom teachers — so any face in this slot would be either fabricated or
 * published without the teacher's consent.
 *
 * What CASA does claim, collectively, is worth the space on its own: teachers
 * are native speakers with university degrees, most have lived abroad, and they
 * know from the inside what learning a language costs you. No photograph needed.
 */
export function TeachingStaffCard({
  title,
  body,
  ctaLabel,
  ctaHref = '/team',
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
}) {
  return (
    <article className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{body}</p>
      <Link
        href={ctaHref}
        className="mt-3 inline-flex text-xs font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
