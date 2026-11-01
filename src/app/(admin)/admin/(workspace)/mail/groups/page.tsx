import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LearnerGroups } from './learner-groups';
import { Icon } from '@/components/admin/icons';
import { Card, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireStaff } from '@/lib/admin/guard';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { teamKey, teamMatches, type TeamAudience } from '@/lib/admin/mail/audience-keys';
import { learnerFacts, learnerReach, teamFacts } from '@/lib/admin/mail/audiences';
import { mailHref } from '@/lib/admin/mail/href';

/** The team's ready-made groups (Rahman: „all active teachers or only the Angestellte"). */
const TEAM: { name: Bilingual; audience: TeamAudience; nested?: boolean }[] = [
  { name: { de: 'Alle', en: 'Everyone' }, audience: { role: null, contract: null } },
  { name: { de: 'Lehrkräfte', en: 'Teachers' }, audience: { role: 'teaching', contract: null } },
  { name: { de: 'Angestellt', en: 'Employed' }, audience: { role: 'teaching', contract: 'employed' }, nested: true },
  { name: { de: 'Honorarkräfte', en: 'Freelance' }, audience: { role: 'teaching', contract: 'freelance' }, nested: true },
  { name: { de: 'Büro', en: 'Office' }, audience: { role: 'office', contract: null } },
  { name: { de: 'Alle Angestellten', en: 'Everyone employed' }, audience: { role: null, contract: 'employed' } },
  { name: { de: 'Alle Honorarkräfte', en: 'Every freelancer' }, audience: { role: null, contract: 'freelance' } },
];

/**
 * „Rundmail" (Rahman, 2026-11-01: „these things are important shortcuts"): a mail to a group at once — the
 * learners of a kind of course, a time of day, two weekdays, those about to start; the teachers, the
 * office, the employed. Every group is counted from today's bookings and the staff register; opening one
 * leads to the mail screen, which reads it again and sends it in Bcc. The learners' groups need the people
 * module, the team's the staff module; the mail screen checks the same.
 */
export default async function GroupMailPage() {
  const [user, { t, lang }] = await Promise.all([requireStaff(), getI18n()]);
  const learners = canAccess(user, 'people');
  const team = canAccess(user, 'staff');
  if (!learners && !team) notFound();

  const [facts, staff] = await Promise.all([learners ? learnerFacts() : Promise.resolve([]), team ? teamFacts() : Promise.resolve([])]);
  const reach = learners ? await learnerReach(facts.map((f) => f.personId)) : {};

  return (
    <>
      <PageHeader title={t('Rundmail', 'Group mail')} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        {learners ? (
          <Card title={t('Teilnehmende', 'Students')} icon={Icon.people}>
            <LearnerGroups facts={facts} reach={reach} />
          </Card>
        ) : null}
        {team ? (
          <Card title={t('Team', 'Team')} icon={Icon.team}>
            <ul className="space-y-0.5">
              {TEAM.map((g) => {
                const members = staff.filter((s) => teamMatches(s, g.audience));
                if (!members.length && g.nested) return null;
                const without = members.filter((m) => !m.email).length;
                return (
                  <li key={teamKey(g.audience)}>
                    <Link
                      href={members.length ? mailHref('team', teamKey(g.audience), { back: '/admin/mail/groups' }) : '#'}
                      aria-disabled={!members.length}
                      className={`group flex items-center justify-between gap-3 rounded-ws-field px-3 py-2 transition-colors hover:bg-[#f3f7fc] ${g.nested ? 'ml-5' : ''} ${members.length ? '' : 'pointer-events-none opacity-55'}`}
                    >
                      <span className="min-w-0">
                        <span className={g.nested ? 'text-[0.88rem] text-[var(--casa-ink)]' : 'text-[0.92rem] font-semibold text-[var(--casa-ink)]'}>{pick(lang, g.name)}</span>
                        {without ? <span className="block text-xs text-[var(--casa-muted)]">{t(`${without} ohne E-Mail`, `${without} without email`)}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="tabular-nums text-[0.88rem] font-semibold text-[var(--casa-muted)]">{members.length}</span>
                        <span aria-hidden="true" className="text-[var(--casa-accent-text)] opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-4">
                          {Icon.chevronRight}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
