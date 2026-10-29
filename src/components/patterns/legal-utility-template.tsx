import { Breadcrumbs, type BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { LegalContents } from '@/components/patterns/legal-contents';
import { Container } from '@/components/ui/container';
import { say } from '@/lib/cms/copy';
import publishedLegal from '@/lib/content/published-legal.json';
import { legalGroups, prepareLegalDocument, statedRevision } from '@/lib/content/legal-document';

type LegalUtilityTemplateProps = {
  document: keyof typeof publishedLegal;
  locale: 'de' | 'en';
  breadcrumbs: BreadcrumbItem[];
};

/*
 * The document's own type: a sheet on the canvas, numbers hung in the margin, one reading
 * measure. Section numbers and clause numbers are muted so the titles and the text lead.
 */
const DOCUMENT_TYPE = [
  // Hyphenated on a phone, where German compounds would otherwise leave ragged gaps; whole words on the wider measure.
  'break-words text-[1.0625rem] leading-[1.75] text-[var(--casa-ink)] hyphens-auto md:hyphens-manual',
  '[&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_h2]:mt-12 [&_h2]:border-t [&_h2]:border-[color:var(--casa-sand)] [&_h2]:pt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-snug md:[&_h2]:text-[1.375rem]',
  '[&_h2:first-child]:mt-0 [&_h2:first-child]:border-0 [&_h2:first-child]:pt-0',
  '[&_.legal-heading]:grid [&_.legal-heading]:grid-cols-[2.25rem_minmax(0,1fr)] md:[&_.legal-heading]:grid-cols-[2.75rem_minmax(0,1fr)]',
  '[&_.legal-num]:font-semibold [&_.legal-num]:tabular-nums [&_.legal-num]:text-[var(--casa-muted)]',
  '[&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-snug',
  '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-2 [&_li]:pl-1 [&_li::marker]:text-[var(--casa-muted)]',
  '[&_.legal-clause]:grid [&_.legal-clause]:grid-cols-[3rem_minmax(0,1fr)] md:[&_.legal-clause]:grid-cols-[3.5rem_minmax(0,1fr)]',
  '[&_.legal-clause-num]:tabular-nums [&_.legal-clause-num]:text-[var(--casa-muted)]',
  '[&_a]:text-[var(--casa-accent-text)] [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 [&_a:hover]:text-[var(--casa-accent-text-hover)]',
].join(' ');

const SHEET =
  'min-w-0 rounded-[var(--casa-radius-card)] bg-white px-5 py-8 shadow-[var(--shadow-soft)] sm:px-8 md:px-12 md:py-12 print:p-0 print:shadow-none';

function longDate(iso: string, locale: 'de' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

export function LegalUtilityTemplate({ document, locale, breadcrumbs }: LegalUtilityTemplateProps) {
  const content = publishedLegal[document][locale];
  const revised = 'revisedAt' in content ? content.revisedAt : statedRevision(content.html);
  const prepared = prepareLegalDocument(content.html);
  const hasContents = prepared.sections.length > 0;
  const frame = hasContents ? 'max-w-[66rem]' : 'max-w-3xl';

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)] print:bg-white">
      {/* Archetype E, the plain utility head (e2e/smoke.spec.ts): a document has no photograph to lead with. */}
      <section data-hero-archetype="E" className="pb-8 pt-8 md:pb-10 md:pt-10 print:py-0">
        <Container>
          <div className={`mx-auto ${frame}`}>
            <Breadcrumbs items={breadcrumbs} className="print:hidden" />
            <h1 className="text-[1.875rem] font-black leading-tight text-[var(--casa-ink)] [overflow-wrap:normal] hyphens-auto sm:text-4xl lg:text-5xl">
              {content.title}
            </h1>
            {revised || hasContents ? (
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--casa-muted)]">
                {revised ? <span>{say(locale, 'Stand: {date}', 'Last updated: {date}', { date: longDate(revised, locale) })}</span> : null}
                {hasContents ? (
                  <span>{say(locale, '{count} Abschnitte', '{count} sections', { count: prepared.sections.length })}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </Container>
      </section>

      <section className="pb-16 md:pb-24 print:pb-0">
        <Container>
          {/* Only the checked-in, allowlisted HTML snapshot is rendered here.
              Never pass form data, CMS HTML, or a runtime fetch to this sink. */}
          {hasContents ? (
            <div className={`mx-auto ${frame} lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14`}>
              <LegalContents
                sections={prepared.sections}
                label={say(locale, 'Inhalt', 'Contents')}
                summary={say(locale, '{count} Abschnitte', '{count} sections', { count: prepared.sections.length })}
              />
              <article
                data-published-legal={document}
                className={`${SHEET} ${DOCUMENT_TYPE}`}
                dangerouslySetInnerHTML={{ __html: prepared.html }}
              />
            </div>
          ) : (
            <article data-published-legal={document} className={`mx-auto ${frame} ${SHEET}`}>
              <div className="grid gap-x-12 gap-y-8 text-[1.0625rem] leading-relaxed md:grid-cols-2">
                {legalGroups(content.html).map((group, index, groups) => (
                  <div
                    key={index}
                    className={
                      index === groups.length - 1 && groups.length > 2
                        ? 'border-t border-[color:var(--casa-sand)] pt-6 text-base text-[var(--casa-muted)] md:col-span-2 [&_p+p]:mt-3'
                        : index === 0
                          ? '[&_p+p]:mt-1.5 [&_p:first-child]:font-semibold'
                          : '[&_p+p]:mt-1.5'
                    }
                    dangerouslySetInnerHTML={{ __html: group }}
                  />
                ))}
              </div>
            </article>
          )}
        </Container>
      </section>
    </main>
  );
}
