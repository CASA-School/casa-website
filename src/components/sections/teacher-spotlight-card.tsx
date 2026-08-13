import Image from 'next/image';
import Link from 'next/link';

import type { TeamSpotlight } from '@/lib/content/types';

type TeacherSpotlightCardProps = {
  teacher: TeamSpotlight;
  ctaLabel: string;
};

export function TeacherSpotlightCard({ teacher, ctaLabel }: TeacherSpotlightCardProps) {
  return (
    <article className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">Teacher spotlight</p>
      <div className="mt-3 grid gap-3 grid-cols-[74px_1fr] items-center">
        <div className="relative h-[74px] w-[74px] overflow-hidden rounded-xl bg-[var(--casa-warm-soft)]/45">
          <Image
            src={teacher.photo.src}
            alt={teacher.photo.alt}
            fill
            sizes="74px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--casa-ink)]">{teacher.name}</p>
          <p className="text-xs text-[var(--casa-muted)]">{teacher.title}</p>
          <p className="mt-1 text-xs text-[var(--casa-muted)]">{teacher.focus}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--casa-muted)]">{teacher.highlight}</p>
      <Link
        href={`/team#${teacher.id}`}
        className="mt-3 inline-flex text-xs font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
