import { CareerApplicationForm } from '@/components/forms/career-application-form';
import { Link } from '@/i18n/navigation';
import type { CareerPositionViewItem, ContentLocale } from '@/lib/content/types';

type ApplySectionProps = {
  locale: ContentLocale;
  position: Pick<CareerPositionViewItem, 'id' | 'slug' | 'title' | 'applyEmail'>;
  /**
   * Whether an uploaded CV can be stored. The upload goes into the database, so
   * without one the form could only fail after the applicant had filled it in;
   * the page passes `isDatabaseConfigured()`, and the address is offered instead.
   */
  acceptsUploads: boolean;
};

export function ApplySection({ locale, position, acceptsUploads }: ApplySectionProps) {
  if (acceptsUploads) {
    return (
      <CareerApplicationForm
        locale={locale}
        positionId={position.id}
        positionSlug={position.slug}
        positionTitle={position.title}
      />
    );
  }

  const copy =
    locale === 'de'
      ? {
          title: 'Jetzt bewerben',
          byEmail: 'Bitte senden Sie Ihre Bewerbung mit Lebenslauf und Motivationsschreiben per E-Mail an',
          byContact: 'Bitte schreiben Sie uns über das Kontaktformular, wir melden uns mit den nächsten Schritten.',
          contactCta: 'Zum Kontaktformular',
          subject: 'Bewerbung',
        }
      : {
          title: 'Apply now',
          byEmail: 'Please email your application, with your CV and a cover letter, to',
          byContact: 'Please write to us through the contact form and we will reply with the next steps.',
          contactCta: 'Go to the contact form',
          subject: 'Application',
        };

  return (
    <aside className="rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] p-6 shadow-[var(--shadow-card)] sm:p-7">
      <h2 className="text-3xl font-bold text-[var(--casa-ink)]">{copy.title}</h2>
      {position.applyEmail ? (
        <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)]">
          {copy.byEmail}{' '}
          <a
            href={`mailto:${position.applyEmail}?subject=${encodeURIComponent(`${copy.subject}: ${position.title}`)}`}
            className="font-semibold text-[var(--casa-accent-text)] underline underline-offset-4 hover:text-[var(--casa-accent-text-hover)]"
          >
            {position.applyEmail}
          </a>
          .
        </p>
      ) : (
        <>
          <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)]">{copy.byContact}</p>
          <Link
            href="/contact?topic=careers"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--casa-accent-text)] underline underline-offset-4 hover:text-[var(--casa-accent-text-hover)]"
          >
            {copy.contactCta}
          </Link>
        </>
      )}
    </aside>
  );
}
