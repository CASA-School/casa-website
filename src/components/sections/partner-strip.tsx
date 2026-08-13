import Image from 'next/image';
import Link from 'next/link';

import type { Accreditation } from '@/config/accreditations';
import { cn } from '@/lib/utils';

type PartnerStripProps = {
  items: Accreditation[];
  title: string;
  description?: string;
  className?: string;
};

export function PartnerStrip({ items, title, description, className }: PartnerStripProps) {
  return (
    <section className={cn('rounded-3xl bg-white px-6 py-7 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:px-8', className)}>
      <div className="text-center">
        <h2 className="text-lg font-bold text-[var(--casa-ink)] md:text-xl">{title}</h2>
        {description ? <p className="mt-2 text-sm text-[var(--casa-muted)]">{description}</p> : null}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => {
          const logo = (
            <div className="flex h-20 items-center justify-center rounded-xl bg-[var(--casa-bg)]/80 px-3 py-2 ring-1 ring-[color:var(--casa-sand)]/70">
              <Image
                src={item.imageSrc}
                alt={item.name}
                width={item.imageWidth}
                height={item.imageHeight}
                className="h-auto w-auto max-h-10 object-contain"
              />
            </div>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]"
                  aria-label={item.name}
                >
                  {logo}
                </Link>
              ) : (
                logo
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
