'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { Icon } from '@/components/admin/icons';
import { ButtonLink, Field, Select } from '@/components/admin/ui';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import {
  COURSE_KIND_NAMES,
  COURSE_KINDS,
  DAY_PAIR_NAMES,
  DAY_PAIRS,
  learnerKey,
  learnersIn,
  SOON_DAYS,
  type AudienceSession,
  type CourseKind,
  type DayPair,
  type LearnerAudience,
  type LearnerFact,
  type When,
} from '@/lib/admin/mail/audience-keys';
import { mailHref } from '@/lib/admin/mail/href';

type Reach = 'own' | 'agency' | 'none';

/** A ready-made group: its name, and narrower ones under it. */
type Preset = { name: Bilingual; audience: Partial<LearnerAudience>; under?: Preset[] };

const PRESETS: Preset[] = [
  { name: { de: 'Alle im Kurs', en: 'Everyone in a course' }, audience: {} },
  {
    name: COURSE_KIND_NAMES.intensive,
    audience: { kind: 'intensive' },
    under: [
      { name: { de: 'Vormittag', en: 'Morning' }, audience: { kind: 'intensive', session: 'morning' } },
      { name: { de: 'Nachmittag', en: 'Afternoon' }, audience: { kind: 'intensive', session: 'afternoon' } },
    ],
  },
  {
    name: COURSE_KIND_NAMES.evening,
    audience: { kind: 'evening' },
    under: DAY_PAIRS.map((days) => ({ name: DAY_PAIR_NAMES[days], audience: { kind: 'evening', days } })),
  },
  {
    name: COURSE_KIND_NAMES.special,
    audience: { kind: 'special' },
    under: DAY_PAIRS.map((days) => ({ name: DAY_PAIR_NAMES[days], audience: { kind: 'special', days } })),
  },
  { name: COURSE_KIND_NAMES.other, audience: { kind: 'other' } },
  { name: { de: 'Montag + Mittwoch, alle Kurse', en: 'Monday + Wednesday, every course' }, audience: { days: 'mon-wed' } },
  { name: { de: 'Dienstag + Donnerstag, alle Kurse', en: 'Tuesday + Thursday, every course' }, audience: { days: 'tue-thu' } },
  { name: { de: `Beginnen in den nächsten ${SOON_DAYS} Tagen`, en: `Starting in the next ${SOON_DAYS} days` }, audience: { when: 'soon' } },
];

const full = (a: Partial<LearnerAudience>): LearnerAudience => ({ kind: null, session: null, days: null, when: 'now', ...a });

/**
 * The learners' groups on „Rundmail" (2026-11-01): the ready-made ones with how many are in each today, and
 * any combination of course, time of day, weekdays and start, counted as it is chosen. Each opens the mail
 * screen, which reads the group again.
 */
export function LearnerGroups({ facts, reach }: { facts: LearnerFact[]; reach: Record<string, Reach> }) {
  const { t, lang } = useWsLang();
  const [kind, setKind] = useState<CourseKind | ''>('');
  const [session, setSession] = useState<AudienceSession | ''>('');
  const [days, setDays] = useState<DayPair | ''>('');
  const [when, setWhen] = useState<When>('now');

  // A few hundred booked periods: counted afresh for each group, as fast as the choice is made.
  const count = (a: LearnerAudience) => learnersIn(facts, a);

  const chosen = full({ kind: kind || null, session: session || null, days: days || null, when });
  const people = count(chosen);
  const without = people.filter((id) => reach[id] === 'none').length;
  const agency = people.filter((id) => reach[id] === 'agency').length;

  const reachLine = (ids: string[]) => {
    const none = ids.filter((id) => reach[id] === 'none').length;
    const via = ids.filter((id) => reach[id] === 'agency').length;
    return [none ? t(`${none} ohne E-Mail`, `${none} without email`) : null, via ? t(`${via} nur über Agentur`, `${via} through an agency only`) : null]
      .filter(Boolean)
      .join(' · ');
  };

  const row = (p: Preset, nested: boolean) => {
    const a = full(p.audience);
    const ids = count(a);
    if (!ids.length && nested) return null;
    const extra = reachLine(ids);
    return (
      <li key={learnerKey(a)}>
        <Link
          href={ids.length ? mailHref('learners', learnerKey(a), { back: '/admin/mail/groups' }) : '#'}
          aria-disabled={!ids.length}
          className={`group flex items-center justify-between gap-3 rounded-ws-field px-3 py-2 transition-colors hover:bg-[#f3f7fc] ${nested ? 'ml-5' : ''} ${ids.length ? '' : 'pointer-events-none opacity-55'}`}
        >
          <span className="min-w-0">
            <span className={nested ? 'text-[0.88rem] text-[var(--casa-ink)]' : 'text-[0.92rem] font-semibold text-[var(--casa-ink)]'}>{pick(lang, p.name)}</span>
            {extra ? <span className="block text-xs text-[var(--casa-muted)]">{extra}</span> : null}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="tabular-nums text-[0.88rem] font-semibold text-[var(--casa-muted)]">{ids.length}</span>
            <span aria-hidden="true" className="text-[var(--casa-accent-text)] opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-4">
              {Icon.chevronRight}
            </span>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-ws-inner border border-ws-line-soft bg-[#f7f9fc] p-4">
        <p className="mb-3 text-xs font-bold text-[var(--casa-muted)]">{t('Eigene Auswahl', 'Your own selection')}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label={t('Kurs', 'Course')} htmlFor="group-kind">
            <Select id="group-kind" value={kind} onChange={(e) => setKind(e.target.value as CourseKind | '')}>
              <option value="">{t('Alle Kurse', 'Every course')}</option>
              {COURSE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {pick(lang, COURSE_KIND_NAMES[k])}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Tageszeit', 'Time of day')} htmlFor="group-session">
            <Select id="group-session" value={session} onChange={(e) => setSession(e.target.value as AudienceSession | '')}>
              <option value="">{t('Jede', 'Any')}</option>
              <option value="morning">{t('Vormittag', 'Morning')}</option>
              <option value="afternoon">{t('Nachmittag', 'Afternoon')}</option>
              <option value="evening">{t('Abend', 'Evening')}</option>
            </Select>
          </Field>
          <Field label={t('Tage', 'Days')} htmlFor="group-days">
            <Select id="group-days" value={days} onChange={(e) => setDays(e.target.value as DayPair | '')}>
              <option value="">{t('Alle Tage', 'Any days')}</option>
              {DAY_PAIRS.map((d) => (
                <option key={d} value={d}>
                  {pick(lang, DAY_PAIR_NAMES[d])}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Wer', 'Who')} htmlFor="group-when">
            <Select id="group-when" value={when} onChange={(e) => setWhen(e.target.value as When)}>
              <option value="now">{t('Jetzt im Kurs', 'In a course now')}</option>
              <option value="soon">{t(`Beginnen in ${SOON_DAYS} Tagen`, `Starting within ${SOON_DAYS} days`)}</option>
              <option value="both">{t('Beides', 'Both')}</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" aria-live="polite">
            <span className="font-bold text-[var(--casa-ink)] tabular-nums">{people.length}</span>{' '}
            <span className="text-[var(--casa-muted)]">
              {t(people.length === 1 ? 'Teilnehmende/r' : 'Teilnehmende', people.length === 1 ? 'student' : 'students')}
              {without || agency ? ` · ${reachLine(people)}` : ''}
            </span>
          </p>
          {people.length ? (
            <ButtonLink href={mailHref('learners', learnerKey(chosen), { back: '/admin/mail/groups' })} variant="primary" size="sm">
              {t('E-Mail schreiben', 'Write the email')}
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <ul className="space-y-0.5">
        {PRESETS.map((p) => (
          <li key={pick('de', p.name)}>
            <ul>
              {row(p, false)}
              {p.under?.map((u) => row(u, true))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
