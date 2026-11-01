import Link from 'next/link';
import { SessionMark } from '@/components/admin/session-mark';
import { adjustBookingContext, BOOKING_CATEGORIES, contextFacets, type BookingDemand, type BookingFacet } from '@/lib/admin/booking-context';
import { SESSIONS, SESSION_LABELS, type Session } from '@/lib/admin/day-plan-labels';
import { monthHeading } from '@/lib/admin/days';
import { pick, type WsLang } from '@/lib/admin/i18n';

/** A compact reading of demand, counted across the entire result, with cancelled places excluded. */
export function BookingOverview({ values, facets, demand, today, lang }: {
  values: Record<string, string>; facets: readonly BookingFacet[]; demand: readonly BookingDemand[]; today: string; lang: WsLang;
}) {
  const t = (de: string, en: string) => lang === 'de' ? de : en;
  const students = (n: number) => t(`${n} ${n === 1 ? 'Person' : 'Teilnehmende'}`, `${n} ${n === 1 ? 'student' : 'students'}`);
  const bookings = (n: number) => t(`${n} ${n === 1 ? 'Buchung' : 'Buchungen'}`, `${n} ${n === 1 ? 'booking' : 'bookings'}`);
  const category = BOOKING_CATEGORIES.find(c => c === values.category) ?? 'all';
  const context = { category, session: values.session as Session | undefined, level: values.level };
  const months = [...new Set(contextFacets(facets, context, values.type).flatMap(f => f.start ? [f.start.slice(0, 7)] : []))].sort();
  const upcoming = months.filter(m => m >= today.slice(0, 7));
  const shown = values.month ? [values.month] : (upcoming.length ? upcoming.slice(0, 3) : months.slice(-3).reverse());
  const href = (month: string) => {
    const next = adjustBookingContext(values, { month: values.month === month ? '' : month }, facets);
    return `/admin/bookings?${new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)))}`;
  };
  const total = demand.find(d => d.scope === 'total');
  return <section aria-label={t('Kursbelegung', 'Course demand')} className="border-b border-ws-line-soft px-3 py-2.5 sm:px-5">
    <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
      <span className="font-semibold text-[var(--casa-ink)]">{t('Belegung', 'Demand')}</span>
      <span className="text-[var(--casa-muted)]">{values.month ? monthHeading(values.month, lang) : t('Nächste Startmonate', 'Next start months')} · {t('ohne Stornierungen', 'excluding cancellations')}</span>
      {values.month ? <span className="ml-auto font-semibold tabular-nums">{students(total?.students ?? 0)} · {t(`${total?.reserved ?? 0} reserviert`, `${total?.reserved ?? 0} reserved`)}</span> : null}
    </div>
    {values.month ? <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--casa-muted)]">
      {demand.filter(d => d.scope === 'session').sort((a, b) => (a.session ? SESSIONS.indexOf(a.session) : 3) - (b.session ? SESSIONS.indexOf(b.session) : 3)).map(row => <span key={`${row.category}-${row.session}`} className="inline-flex items-center gap-1.5 tabular-nums">
        {row.session ? <SessionMark session={row.session} lang={lang} /> : null}
        {row.session ? pick(lang, SESSION_LABELS[row.session]) : category === 'exam' ? t('Prüfungen', 'Exams') : t('Ohne Tageszeit', 'Time unassigned')}
        <strong className="font-semibold text-[var(--casa-ink)]">{row.students}</strong>
        <span>· {`${bookings(row.bookings)}, ${row.reserved} ${t('reserviert', 'reserved')}`}</span>
      </span>)}
    </div> : <div className="flex gap-3 overflow-x-auto [scrollbar-width:none]">
      {shown.map(month => {
        const row = demand.find(d => d.scope === 'month' && d.month === month);
        return <Link key={month} href={href(month)} className="flex min-w-52 flex-1 flex-wrap items-baseline gap-x-2 rounded-md py-1 text-xs outline-none sm:min-w-0 hover:text-[var(--casa-accent-text)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40">
          <span className="font-semibold">{monthHeading(month, lang)}</span>
          <span className="text-[var(--casa-muted)] tabular-nums">{students(row?.students ?? 0)} · {bookings(row?.bookings ?? 0)} · {row?.reserved ?? 0} {t('reserviert', 'reserved')}</span>
        </Link>;
      })}
    </div>}
  </section>;
}
