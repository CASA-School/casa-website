import { HeroEMinimal } from '@/components/heroes';
import { Container } from '@/components/ui/container';
import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import publishedLegal from '@/lib/content/published-legal.json';

type LegalUtilityTemplateProps = {
  document: keyof typeof publishedLegal;
  locale: 'de' | 'en';
  breadcrumbs: BreadcrumbItem[];
};

export function LegalUtilityTemplate({ document, locale, breadcrumbs }: LegalUtilityTemplateProps) {
  const content = publishedLegal[document][locale];

  return (
    <main className="bg-[var(--casa-bg)] text-[var(--casa-ink)] print:bg-white">
      <HeroEMinimal eyebrow="" description="" title={content.title} breadcrumbs={breadcrumbs} />
      <section className="py-10 md:py-12 print:py-4">
        <Container>
          {/* Only the checked-in, allowlisted HTML snapshot is rendered here.
              Never pass form data, CMS HTML, or a runtime fetch to this sink. */}
          <article
            data-published-legal={document}
            className="mx-auto max-w-4xl space-y-5 break-words rounded-2xl bg-white p-6 text-base leading-relaxed shadow-[var(--shadow-soft)] md:p-10 print:p-0 print:shadow-none [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-3 [&_a]:text-[var(--casa-accent-text)] [&_a]:underline [&_a]:underline-offset-4"
            dangerouslySetInnerHTML={{ __html: content.html }}
          />
        </Container>
      </section>
    </main>
  );
}
