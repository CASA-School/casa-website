import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { Badge, Card } from '@/components/admin/ui';
import { pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import type { BookedStay } from '@/lib/admin/registration-needs';
import { cn } from '@/lib/utils';

/**
 * A room and a visa, each its own section in its own colour (2026-10-31, Rahman: „unterkunft should have an
 * identifying color and even on its own section and visum as well so it is more prominent"): the stay's
 * blue and the visa's orange (that of „Unter Beobachtung"), the same in the head of the Anmeldung and on the list. Each says what was
 * asked, and how far it has come — booked, placed; the letter for the embassy sent.
 */

const day = (iso: string, lang: WsLang) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const weeksBetween = (from: string, to: string) => Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / (7 * 86_400_000)));

/**
 * Each section is the workspace's own card with its colour as a fine line along the top (Rahman,
 * 2026-10-31, after solid heads: „to the one before that like an elegant top border").
 */
const EDGE = {
  stay: 'relative before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-[3px] before:bg-[#3a9fd0]',
  visa: 'relative before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-[3px] before:bg-[#d99a00]',
} as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 py-2.5">
      <dt className="w-28 shrink-0 text-xs font-medium text-[var(--casa-muted)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[0.88rem] text-[var(--casa-ink)]">{children}</dd>
    </div>
  );
}

export function StayCard({
  wish,
  from,
  to,
  allergies,
  stays,
  canPlace,
  t,
  lang,
}: {
  /** What they asked for: „Gastfamilie", „WG". */
  wish: Bilingual | null;
  /** The stay around the courses asked for: the day before the first, the Saturday after the last. */
  from: string | null;
  to: string | null;
  allergies: string | null;
  /** What was booked from the registration, and where it was placed. */
  stays: readonly BookedStay[];
  canPlace: boolean;
  t: T;
  lang: WsLang;
}) {
  const placed = stays.find((s) => s.place);
  const booked = stays[0] ?? null;
  return (
    <Card
      title={t('Unterkunft', 'Accommodation')}
      icon={Icon.home}
      tint="blue"
      className={EDGE.stay}
      actions={
        placed ? (
          <Badge tone="positive">{t('Zugeteilt', 'Placed')}</Badge>
        ) : booked ? (
          <Badge tone="accent">{t('Gebucht · noch nicht zugeteilt', 'Booked · not placed yet')}</Badge>
        ) : (
          <Badge tone="warning">{t('Noch nicht gebucht', 'Not booked yet')}</Badge>
        )
      }
    >
      <dl className="divide-y divide-ws-line">
        <Row label={t('Gewünscht', 'Asked for')}>{wish ? pick(lang, wish) : t('Ohne Angabe', 'Not given')}</Row>
        {from && to ? (
          <Row label={t('Zeitraum', 'Dates')}>
            {day(from, lang)} – {day(to, lang)}
            <span className="text-[var(--casa-muted)]"> · {t(`${weeksBetween(from, to)} Wochen`, `${weeksBetween(from, to)} weeks`)}</span>
          </Row>
        ) : null}
        {allergies ? (
          <Row label={t('Allergien', 'Allergies')}>
            <span className="font-semibold text-[#8a5a00]">{allergies}</span>
          </Row>
        ) : null}
        {stays.map((s) => (
          <Row key={s.bookingId} label={t('Gebucht', 'Booked')}>
            <Link href={`/admin/bookings/${s.bookingId}`} className="font-semibold hover:underline">
              {s.number}
            </Link>
            {s.type ? ` · ${pick(lang, s.type)}` : ''}
            {s.from && s.to ? <span className="text-[var(--casa-muted)]"> · {day(s.from, lang)} – {day(s.to, lang)}</span> : null}
            <span className="mt-0.5 block text-[0.8rem]">
              {s.place ? (
                <>
                  <span className="text-[var(--casa-muted)]">{t('bei ', 'at ')}</span>
                  <span className="font-semibold">{s.place}</span>
                </>
              ) : canPlace ? (
                <Link href="/admin/accommodation/stays" className="font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
                  {t('Unterkunft zuteilen', 'Place the stay')}
                </Link>
              ) : (
                <span className="text-[var(--casa-muted)]">{t('noch nicht zugeteilt', 'not placed yet')}</span>
              )}
            </span>
          </Row>
        ))}
      </dl>
    </Card>
  );
}

type Step = { label: string; done: boolean; detail: ReactNode };

export function VisaCard({
  nationality,
  steps,
  action,
  t,
}: {
  nationality: string | null;
  /** The way to the embassy, in order: the payment asked for, the booking, the letter for the embassy. */
  steps: readonly Step[];
  action: { href: string; label: string } | null;
  t: T;
}) {
  const done = steps.filter((s) => s.done).length;
  return (
    <Card
      title={t('Visumshilfe', 'Visa support')}
      icon={Icon.globe}
      tint="orange"
      className={EDGE.visa}
      actions={
        done === steps.length ? (
          <Badge tone="positive">{t('Brief für die Botschaft verschickt', 'Embassy letter sent')}</Badge>
        ) : (
          <Badge tone="visa">
            {t(`${done} von ${steps.length} erledigt`, `${done} of ${steps.length} done`)}
          </Badge>
        )
      }
    >
      <dl className="divide-y divide-ws-line border-b border-ws-line">
        <Row label={t('Nationalität', 'Nationality')}>{nationality ?? t('Ohne Angabe', 'Not given')}</Row>
      </dl>
      <ol className="divide-y divide-ws-line">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3 py-2.5">
            <span
              aria-hidden="true"
              className={cn(
                'mt-px grid size-5 shrink-0 place-items-center rounded-full text-[0.66rem] font-extrabold [&_svg]:size-3',
                step.done ? 'bg-[#d99a00] text-white' : 'bg-white text-[#8a5a00] ring-[1.5px] ring-[#ebd298] ring-inset'
              )}
            >
              {step.done ? Icon.check : i + 1}
            </span>
            <span className="min-w-0 text-[0.86rem]">
              <span className={cn('font-semibold', step.done ? 'text-[var(--casa-ink)]' : 'text-[#2b3546]')}>{step.label}</span>
              <span className="block text-[0.78rem] text-[var(--casa-muted)]">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      {action ? (
        <div className="mt-1 flex justify-end border-t border-ws-line pt-3">
          <Link
            href={action.href}
            className="inline-flex h-9 items-center rounded-lg border border-[#ebd298] bg-white px-4 text-sm font-semibold text-[#6e4700] transition-colors hover:border-[#d99a00] hover:bg-[#fff8e8]"
          >
            {action.label}
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
