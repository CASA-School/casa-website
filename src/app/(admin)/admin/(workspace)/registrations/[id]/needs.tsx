import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import type { BookedStay } from '@/lib/admin/registration-needs';
import { cn } from '@/lib/utils';

/**
 * A room and a visa, each its own section in its own colour (2026-10-31, Rahman: „unterkunft should have an
 * identifying color and even on its own section and visum as well so it is more prominent"): the stay's
 * blue and the visa's berry, the same in the head of the Anmeldung and on the list. Each says what was
 * asked, and how far it has come — booked, placed; the letter for the embassy sent.
 */

const day = (iso: string, lang: WsLang) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const weeksBetween = (from: string, to: string) => Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / (7 * 86_400_000)));

/**
 * The two colours, solid (2026-10-31, Rahman: the pale bands were „too similar to each other with the
 * blueish background"): a head in its colour with white type cannot be taken for the page, for a row, or
 * for the other section. The visa is berry, not violet: violet is Abend's (SESSION_COLOURS). Every other
 * section head is navy (`.ws-head-band`). The same two colours mark the head of the Anmeldung, the list and
 * the booking (badge tones `stay`, `visa`).
 */
const COLOUR = { stay: '#0b78b4', visa: '#9b2c6f' } as const;

/** One section: a solid head in its colour, its title and where it stands; white rows under it. */
function Section({ kind, icon, title, status, children }: { kind: keyof typeof COLOUR; icon: ReactNode; title: string; status: { text: string; state: 'open' | 'part' | 'done' }; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-white" style={{ backgroundColor: COLOUR[kind] }}>
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/20 [&_svg]:size-4">
            {icon}
          </span>
          <h2 className="text-[0.95rem] leading-tight font-extrabold tracking-[-0.01em]">{title}</h2>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[0.72rem] font-bold whitespace-nowrap" style={{ color: COLOUR[kind] }}>
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', status.state === 'done' ? 'bg-[#2f9e5b]' : status.state === 'part' ? 'bg-[#3a9fd0]' : 'bg-[#d99a00]')} />
          {status.text}
        </span>
      </header>
      <div className="px-4 py-2">{children}</div>
    </section>
  );
}

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
    <Section
      kind="stay"
      icon={Icon.home}
      title={t('Unterkunft', 'Accommodation')}
      status={
        placed
          ? { text: t('Zugeteilt', 'Placed'), state: 'done' }
          : booked
            ? { text: t('Gebucht · noch nicht zugeteilt', 'Booked · not placed yet'), state: 'part' }
            : { text: t('Noch nicht gebucht', 'Not booked yet'), state: 'open' }
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
    </Section>
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
    <Section
      kind="visa"
      icon={Icon.globe}
      title={t('Visumshilfe', 'Visa support')}
      status={
        done === steps.length
          ? { text: t('Brief für die Botschaft verschickt', 'Embassy letter sent'), state: 'done' }
          : { text: t(`${done} von ${steps.length} erledigt`, `${done} of ${steps.length} done`), state: done ? 'part' : 'open' }
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
                step.done ? 'bg-[#9b2c6f] text-white' : 'bg-white text-[#9b2c6f] ring-[1.5px] ring-[#e3b5cf] ring-inset'
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
        <div className="flex justify-end border-t border-ws-line pt-3 pb-2">
          <Link
            href={action.href}
            className="inline-flex h-9 items-center rounded-lg border border-[#e3b5cf] bg-white px-4 text-sm font-semibold text-[#9b2c6f] transition-colors hover:border-[#9b2c6f] hover:bg-[#fcf2f7]"
          >
            {action.label}
          </Link>
        </div>
      ) : null}
    </Section>
  );
}
