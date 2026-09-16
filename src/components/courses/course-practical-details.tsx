import { FeeStrip } from '@/components/sections/fee-strip';
import { cn } from '@/lib/utils';

type Fee = {
  label: string;
  amount: string;
  note?: string;
};

/** Published course fees followed by their conditions. The same FeeStrip is
 * used for accommodation; zero, one and several prices retain the same flow. */
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
  if (!fees?.length && !feeNote && conditions.length === 0) return null;

  const feeList = fees ?? [];
  const title = feeList.length
    ? (locale === 'de' ? 'Kursgebühren im Überblick' : 'Course fees at a glance')
    : (locale === 'de' ? 'Ihr Kurs im Überblick' : 'Planning your course');

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>

      <FeeStrip figures={feeList} className="mt-6" />

      {feeNote ? (
        <p className={cn(
          'max-w-measure leading-relaxed text-[var(--casa-muted)]',
          feeList.length > 0 ? 'mt-4 text-sm' : 'mt-4 text-base'
        )}>
          {feeNote}
        </p>
      ) : null}

      {conditions.length ? (
        <>
          <h3 className="mt-8 text-lg font-semibold text-[var(--casa-ink)]">
            {locale === 'de' ? 'Gut zu wissen' : 'Good to know'}
          </h3>
          <ul className="mt-4 md:columns-2 md:gap-x-12">
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
