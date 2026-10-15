import Link from 'next/link';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { MakeOffer } from '@/components/admin/make-offer';
import { PersonPanel } from '@/components/admin/person-panel';
import { OwnerControl, StatusBar, Timeline } from '@/components/admin/record-parts';
import { Icon } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/list';
import { Badge, ButtonLink, Card, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { ORGANISER_BRIEF_LABELS, formatBriefValue } from '@/lib/admin/brief-labels';
import { berlinTime, shortDay } from '@/lib/admin/days';
import { getEnquiry, otherEnquiriesFrom } from '@/lib/admin/enquiries';
import { listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { pick, relativeDays, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { offersFor } from '@/lib/admin/offers/repo';
import { findDuplicateCandidates, getPersonSummary } from '@/lib/admin/people';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { listAssignableStaff } from '@/lib/admin/staff';

/**
 * Where an enquiry came from, when that says something. The contact page is
 * where every enquiry comes from, and a demo seed is plumbing; the interest
 * list (German for Medical's popup) is worth knowing.
 */
const SOURCE_LABEL: Record<string, Bilingual | null> = {
  'contact-page': null,
  'demo-seed': null,
  'interest-list': { de: 'Interessentenliste', en: 'Interest list' },
};

const sourceLabel = (source: string | null | undefined, lang: WsLang) => {
  if (!source) return null;
  if (source in SOURCE_LABEL) {
    const label = SOURCE_LABEL[source];
    return label ? pick(lang, label) : null;
  }
  const words = source.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
};

/** The organiser brief in the order a coordinator reads it; a key the form adds later lands in „Weitere Angaben". */
const BRIEF_SECTIONS: readonly { title: Bilingual; keys: readonly string[] }[] = [
  { title: { de: 'Die Gruppe', en: 'The group' }, keys: ['organisationName', 'groupSize', 'ageBand', 'participantLevels'] },
  { title: { de: 'Der Aufenthalt', en: 'The stay' }, keys: ['preferredDates', 'durationWeeks', 'accommodation', 'meals', 'transport'] },
  { title: { de: 'Der Unterricht', en: 'The lessons' }, keys: ['languageFocus', 'weeklyLessons', 'deliveryMode', 'schedulePreference', 'cultureProgramme'] },
  { title: { de: 'Die Rechnung', en: 'The invoice' }, keys: ['invoicingParty'] },
];

/**
 * One enquiry (2026-10-14: "now improve the enquiry detail page").
 *
 * The head says who wrote and about what, and under it the two things a
 * colleague changes most: where it stands — its states in one row, one click
 * each — and who has it, with „Übernehmen" to take it. Then the message as an
 * email reads, sender, date and subject over the text, with „Antworten" under
 * it; a group's or a company's brief in the order a coordinator reads it. Beside
 * it the person it belongs to, what the same address asked before, and the
 * notes and changes in one line of time, ending with its arrival.
 *
 * „Antworten" is a `mailto:` — the workspace sends no mail (CLAUDE.md, known
 * open items) — opened with the subject and a greeting and sign-off in the
 * language the enquiry was written in, signed by the colleague replying.
 */
export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireModule('enquiries')]);
  const [enquiry, { t, lang }] = await Promise.all([getEnquiry(id), getI18n()]);

  if (!enquiry) {
    notFound();
  }

  const canEdit = canAccess(user, 'enquiries', 'edit');
  const canOffer = canAccess(user, 'offers', 'edit');
  const [notes, activity, staff, flags, person, offers, earlier] = await Promise.all([
    listNotes('enquiry', enquiry.id),
    activityFor('enquiry', enquiry.id),
    listAssignableStaff(),
    listFlags('enquiry', enquiry.id),
    enquiry.personId ? getPersonSummary(enquiry.personId) : null,
    canOffer ? offersFor({ enquiryId: enquiry.id }) : [],
    otherEnquiriesFrom(enquiry.email, enquiry.id),
  ]);
  const candidates = person ? await findDuplicateCandidates({ email: enquiry.email, excludePersonId: person.id }) : [];

  const fullName = [enquiry.firstName, enquiry.lastName].filter(Boolean).join(' ');
  const cameFrom = sourceLabel(enquiry.source, lang);
  const german = enquiry.locale === 'de';
  const brief = Object.fromEntries(
    Object.entries(enquiry.organiserBrief ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== '')
  );
  const known = new Set(BRIEF_SECTIONS.flatMap((section) => section.keys));
  const sections = [
    ...BRIEF_SECTIONS.map((section) => ({ title: pick(lang, section.title), keys: section.keys.filter((key) => key in brief) })),
    { title: t('Weitere Angaben', 'More'), keys: Object.keys(brief).filter((key) => !known.has(key)) },
  ].filter((section) => section.keys.length);
  const organisation = typeof brief.organisationName === 'string' ? brief.organisationName : null;
  const groupSize = brief.groupSize !== undefined ? formatBriefValue(brief.groupSize, lang) : null;

  // The reply opens in the colleague's mail program, in the enquiry's language.
  const replyBody = german
    ? `Hallo ${enquiry.firstName},\n\n\n\nViele Grüße\n${user.name}\nCASA Bremen`
    : `Hello ${enquiry.firstName},\n\n\n\nBest regards\n${user.name}\nCASA Bremen`;
  const reply = `mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.topic}`)}&body=${encodeURIComponent(replyBody)}`;
  const received = `${shortDay(enquiry.submittedAt, lang)}, ${berlinTime(enquiry.submittedAt, lang)}`;

  return (
    <>
      <RecordHeader
        backHref="/admin/enquiries"
        backLabel={t('Anfragen', 'Enquiries')}
        title={fullName || enquiry.email}
        avatar={fullName || enquiry.email}
        status={enquiry.kind !== 'general' ? <Badge tone="neutral">{enquiry.kind === 'group' ? t('Gruppe', 'Group') : t('Firma', 'Company')}</Badge> : null}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">{enquiry.topic}</span>
            <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.84rem] text-[var(--casa-muted)]">
              {organisation ? (
                <MetaItem icon={Icon.people}>
                  <span className="font-semibold text-[var(--casa-ink)]">{organisation}</span>
                  {groupSize ? ` · ${t(`${groupSize} Teilnehmende`, `${groupSize} participants`)}` : ''}
                </MetaItem>
              ) : null}
              <MetaItem icon={Icon.mail}>
                <a href={`mailto:${enquiry.email}`} className="hover:text-[var(--casa-ink)] hover:underline">
                  {enquiry.email}
                </a>
              </MetaItem>
              <MetaItem icon={Icon.globe}>{german ? t('auf Deutsch', 'in German') : t('auf Englisch', 'in English')}</MetaItem>
            </span>
          </>
        }
        actions={canOffer ? <MakeOffer from={{ enquiryId: enquiry.id }} existing={offers} /> : null}
        bar={
          <>
            <StatusBar entity="enquiry" id={enquiry.id} status={enquiry.status} canEdit={canEdit} />
            <OwnerControl entity="enquiry" id={enquiry.id} assignedTo={enquiry.assignedTo} staff={staff} me={user} canEdit={canEdit} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          {/* The message as an email reads: who, when, the subject, then the text in paragraphs at reading size. */}
          <article className="overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ws-line px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={fullName || enquiry.email} />
                <div className="min-w-0 text-[0.84rem]">
                  <p className="truncate">
                    <span className="font-semibold text-[var(--casa-ink)]">{fullName}</span>{' '}
                    <span className="text-[var(--casa-muted)]">&lt;{enquiry.email}&gt;</span>
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-[var(--casa-muted)]">
                    {t('an CASA Bremen', 'to CASA Bremen')}
                    {cameFrom ? ` · ${cameFrom}` : ''}
                  </p>
                </div>
              </div>
              <time dateTime={enquiry.submittedAt.toISOString()} className="text-[0.78rem] text-[var(--casa-muted)] tabular-nums">
                <span className="font-semibold text-[var(--casa-ink)]">{received}</span> · {relativeDays(enquiry.submittedAt, lang)}
              </time>
            </header>
            <div className="px-6 pt-5 pb-6">
              <h2 className="text-[1.05rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">{enquiry.topic}</h2>
              <p className="mt-3 max-w-prose text-base leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{enquiry.message}</p>
            </div>
            <footer className="flex flex-wrap items-center gap-3 border-t border-ws-line bg-[#f4f6f9] px-6 py-3.5">
              <ButtonLink href={reply} variant="primary">
                <span aria-hidden="true" className="[&_svg]:size-4">
                  {Icon.mail}
                </span>
                {t('Antworten', 'Reply')}
              </ButtonLink>
              <span className="text-[0.78rem] text-[var(--casa-muted)]">{german ? t('Anrede auf Deutsch', 'Greeting in German') : t('Anrede auf Englisch', 'Greeting in English')}</span>
            </footer>
          </article>

          {sections.length ? (
            <Card title={enquiry.kind === 'company' ? t('Angaben der Firma', 'Company brief') : t('Angaben der Gruppe', 'Group brief')} icon={Icon.people} tint="sun">
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {sections.map((section) => (
                  <section key={section.title}>
                    <h3 className="mb-2 text-xs font-bold text-[var(--casa-ink)]">{section.title}</h3>
                    <dl className="divide-y divide-ws-line rounded-xl ring-1 ring-ws-line ring-inset">
                      {section.keys.map((key) => (
                        <div key={key} className="flex items-baseline justify-between gap-4 px-3 py-2">
                          <dt className="text-[0.8rem] text-[#3c4657]">{ORGANISER_BRIEF_LABELS[key] ? pick(lang, ORGANISER_BRIEF_LABELS[key]) : key}</dt>
                          <dd className="text-right text-[0.86rem] font-semibold text-[var(--casa-ink)]">{formatBriefValue(brief[key], lang)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <PersonPanel person={person} candidates={candidates} flags={flags} returnTo={`/admin/enquiries/${enquiry.id}`} />

          {earlier.length ? (
            <Card title={t('Frühere Anfragen', 'Earlier enquiries')} icon={Icon.enquiries} tint="blue">
              <ul className="-mx-2 -my-1.5">
                {earlier.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/enquiries/${item.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
                    >
                      <span className="w-[5.5rem] shrink-0 text-xs text-[#3c4657] tabular-nums">{shortDay(item.submittedAt, lang)}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold text-[var(--casa-ink)]">{item.topic}</span>
                      <Badge tone={STATUS_TONES[item.status]}>{pick(lang, STATUS_LABELS[item.status])}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Timeline
            entity="enquiry"
            id={enquiry.id}
            notes={notes}
            activity={activity}
            origin={{ at: enquiry.submittedAt, label: cameFrom ? t(`Eingegangen über ${cameFrom}`, `Received from the ${cameFrom.toLowerCase()}`) : t('Eingegangen', 'Received') }}
          />
        </div>
      </div>
    </>
  );
}

/** One fact under the record's name, with its small icon. */
function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden="true" className="shrink-0 text-[#6b7a90] [&_svg]:size-3.5">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
