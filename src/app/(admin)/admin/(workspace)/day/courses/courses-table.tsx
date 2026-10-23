'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { floorName, groupName, LessonPanel, shortName, type LessonEditing } from '../lesson-panel';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import type { DayLesson } from '@/lib/admin/day-plan';
import { MERGE_REASON_LABELS, SESSION_COLOURS, SESSION_LABELS, SESSIONS, type Session } from '@/lib/admin/day-plan-labels';
import { pick } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/** Each part of the day keeps its colour, here and on the room plan; amber is kept for cover, red for a missing teacher. */
const SESSION_TONE: Record<Session, { band: string; bar: string; dot: string }> = {
  morning: { band: SESSION_COLOURS.morning.band, bar: SESSION_COLOURS.morning.dot, dot: SESSION_COLOURS.morning.dot },
  afternoon: { band: SESSION_COLOURS.afternoon.band, bar: SESSION_COLOURS.afternoon.dot, dot: SESSION_COLOURS.afternoon.dot },
  evening: { band: SESSION_COLOURS.evening.band, bar: SESSION_COLOURS.evening.dot, dot: SESSION_COLOURS.evening.dot },
};

/**
 * The day's courses as a table (2026-10-19, Rahman: their own page, "beautiful navigation, contrast and
 * column and row design … easy to understand"): a band for each part of the day with its hours, then a
 * row per class — when, which course, where, who teaches, how many. A click opens the class at the side.
 * The chips narrow the day to one part; the search finds a learner, a teacher, a room or a course.
 */
export function CoursesTable({ day, lessons, editing, canBooks = false }: { day: string; lessons: DayLesson[]; editing?: Omit<LessonEditing, 'lessons'>; canBooks?: boolean }) {
  const { t, lang } = useWsLang();
  const [session, setSession] = useState<Session | 'all'>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();

  const named = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const l of lessons) {
      if (!needle) {
        out.set(l.id, []);
        continue;
      }
      const own = [l.label, l.typeName, l.number, l.roomName, l.teacherName, l.replacedTeacherName].some((v) => v?.toLowerCase().includes(needle));
      const learners = l.learners.filter((p) => p.name.toLowerCase().includes(needle)).map((p) => p.name);
      if (own || learners.length) out.set(l.id, own ? [] : learners);
    }
    return out;
  }, [lessons, needle]);

  const shown = lessons.filter((l) => named.has(l.id) && (session === 'all' || l.session === session));
  const groups = ([...SESSIONS, null] as (Session | null)[])
    .map((s) => ({ s, rows: shown.filter((l) => l.session === s) }))
    .filter((g) => g.rows.length);
  const count = (s: Session) => lessons.filter((l) => l.session === s).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-3">
        <div role="group" aria-label={t('Teil des Tages', 'Part of the day')} className="flex flex-wrap gap-1.5">
          <Chip on={session === 'all'} onClick={() => setSession('all')}>
            {t('Alle', 'All')} <span className="tabular-nums opacity-70">{lessons.length}</span>
          </Chip>
          {SESSIONS.filter((s) => count(s)).map((s) => (
            <Chip key={s} on={session === s} onClick={() => setSession(s)}>
              <span aria-hidden="true" className={cn('size-2 rounded-full', SESSION_TONE[s].dot)} />
              {pick(lang, SESSION_LABELS[s])} <span className="tabular-nums opacity-70">{count(s)}</span>
            </Chip>
          ))}
        </div>
        <Search value={q} onChange={setQ} placeholder={t('Name, Raum oder Kurs', 'Name, room or course')} label={t('Im Unterricht suchen', 'Search the lessons')} />
      </div>

      {lessons.length === 0 ? (
        <p className="px-5 py-12 text-center text-[0.9rem] text-[var(--casa-muted)]">{t('An diesem Tag ist kein Unterricht.', 'No lessons on this day.')}</p>
      ) : groups.length === 0 ? (
        <p className="px-5 py-12 text-center text-[0.9rem] text-[var(--casa-muted)]">{t(`Nichts passt zu „${q.trim()}“.`, `Nothing matches “${q.trim()}”.`)}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ws-line bg-[var(--ws-head)] text-[0.75rem] font-semibold text-[var(--casa-muted)]">
                <th scope="col" className="w-[7.5rem] py-2.5 pr-3 pl-5 font-semibold">{t('Zeit', 'Time')}</th>
                <th scope="col" className="py-2.5 pr-3 font-semibold">{t('Kurs', 'Course')}</th>
                <th scope="col" className="w-[11rem] py-2.5 pr-3 font-semibold">{t('Raum', 'Room')}</th>
                <th scope="col" className="w-[15rem] py-2.5 pr-3 font-semibold">{t('Lehrkraft', 'Teacher')}</th>
                <th scope="col" className="w-[6rem] py-2.5 pr-5 text-right font-semibold">{t('Teilnehmende', 'Learners')}</th>
              </tr>
            </thead>
            {groups.map(({ s, rows }) => {
              const from = rows.map((l) => l.startsAt).filter(Boolean).sort()[0];
              const to = rows.map((l) => l.endsAt).filter(Boolean).sort().at(-1);
              return (
                <tbody key={s ?? 'other'}>
                  <tr className={cn('border-b border-ws-line', s ? SESSION_TONE[s].band : 'bg-ws-sunk')}>
                    <th scope="colgroup" colSpan={5} className="relative py-2 pr-5 pl-5 text-left">
                      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', s ? SESSION_TONE[s].bar : 'bg-ws-line')} />
                      <span className="text-[0.86rem] font-extrabold text-[var(--casa-ink)]">{s ? pick(lang, SESSION_LABELS[s]) : t('Weitere', 'Other')}</span>
                      {from && to ? <span className="ml-2.5 text-[0.8rem] font-semibold text-[var(--casa-muted)] tabular-nums">{`${from}–${to}`}</span> : null}
                      <span className="float-right text-[0.78rem] font-semibold text-[var(--casa-muted)] tabular-nums">
                        {rows.length === 1 ? t('1 Kurs', '1 course') : t(`${rows.length} Kurse`, `${rows.length} courses`)}
                      </span>
                    </th>
                  </tr>
                  {rows.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setOpenId(l.id)}
                      className={cn('cursor-pointer border-b border-ws-line-soft transition-colors last:border-b-0 hover:bg-[var(--ws-row-hover)]', l.cancelled && 'bg-[repeating-linear-gradient(135deg,#fafbfc_0_8px,#f3f5f8_8px_16px)]')}
                    >
                      <td className="py-3 pr-3 pl-5 align-top text-[0.86rem] font-semibold text-[var(--casa-ink)] tabular-nums">
                        {l.startsAt && l.endsAt ? (
                          <>
                            {l.startsAt}
                            <span className="block text-[0.74rem] font-medium text-[var(--casa-muted)]">{l.endsAt}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(l.id);
                          }}
                          className="group/btn text-left outline-none"
                        >
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className={cn('text-[1rem] font-extrabold text-[var(--casa-ink)] group-hover/btn:underline group-focus-visible/btn:underline', l.cancelled && 'text-[var(--casa-muted)] line-through')}>{l.label}</span>
                            <span className="text-[0.8rem] text-[var(--casa-muted)]">{l.typeName}</span>
                            {l.number ? <span className="rounded-md bg-ws-sunk px-1.5 py-px text-[0.72rem] font-semibold text-[var(--casa-muted)] tabular-nums">#{l.number}</span> : null}
                          </span>
                        </button>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {l.cancelled ? <Tag tone="quiet">{t('Fällt aus', 'Cancelled')}</Tag> : null}
                          {l.joinedBy.length ? (
                            <Tag tone="quiet">{t(`+ ${l.joinedBy.map((g) => (g.number ? `#${g.number}` : g.label)).join(', ')}`, `+ ${l.joinedBy.map((g) => (g.number ? `#${g.number}` : g.label)).join(', ')}`)}</Tag>
                          ) : l.merged ? (
                            <Tag tone="quiet">{t('Zusammengelegt', 'Merged')}</Tag>
                          ) : null}
                          {(named.get(l.id) ?? []).map((name) => (
                            <span key={name} className="rounded-md bg-[#fff3c4] px-1.5 py-0.5 text-[0.76rem] font-semibold text-[#5c4300]">
                              {name}
                            </span>
                          ))}
                        </span>
                      </td>
                      {l.joins.length ? (
                        // A group taught with others that day: where, and by whom, is theirs.
                        <td colSpan={2} className="py-3 pr-3 align-top">
                          <span className="block text-[0.9rem] font-semibold text-[var(--casa-ink)]">
                            {l.joins.length === 1
                              ? t(`bei ${groupName(l.joins[0])} · ${l.joins[0].roomName ?? '—'}`, `with ${groupName(l.joins[0])} · ${l.joins[0].roomName ?? '—'}`)
                              : t(`aufgeteilt: ${l.joins.map((h) => `${groupName(h)} (${h.roomName ?? '—'})`).join(', ')}`, `shared out: ${l.joins.map((h) => `${groupName(h)} (${h.roomName ?? '—'})`).join(', ')}`)}
                          </span>
                          <Tag tone="quiet">
                            {[t('Zusammengelegt', 'Merged'), l.mergeReason ? pick(lang, MERGE_REASON_LABELS[l.mergeReason]) : null, l.joins.map((h) => shortName(h.teacherName)).filter(Boolean).join(', ') || null]
                              .filter(Boolean)
                              .join(' · ')}
                          </Tag>
                        </td>
                      ) : (
                        <>
                      <td className="py-3 pr-3 align-top">
                        {!l.roomId && !l.cancelled && editing?.canRoom ? (
                          // No room yet: the action is where the room would be (Rahman, 2026-10-21).
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(l.id);
                            }}
                            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#fff4d6] px-2.5 text-[0.8rem] font-semibold text-[#6b4a00] ring-1 ring-[#f0d48a] ring-inset transition-colors outline-none hover:bg-[#ffecb8] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-3.5"
                          >
                            {Icon.plus}
                            {t('Raum zuweisen', 'Assign a room')}
                          </button>
                        ) : (
                          <>
                            <span className="block text-[0.9rem] font-semibold text-[var(--casa-ink)]">{l.roomName ?? '—'}</span>
                            {l.floor !== null ? <span className="block text-[0.76rem] text-[var(--casa-muted)]">{floorName(l.floor, t)}</span> : null}
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <span className={cn('block text-[0.9rem] font-semibold', l.teacherAway ? 'text-[#b42318]' : 'text-[var(--casa-ink)]')}>{l.teacherName ?? t('Keine Lehrkraft', 'No teacher')}</span>
                        {l.substitute ? (
                          <Tag tone="sun">{l.replacedTeacherName ? t(`Vertretung für ${l.replacedTeacherName}`, `Cover for ${l.replacedTeacherName}`) : t('Vertretung', 'Cover')}</Tag>
                        ) : l.teacherAway ? (
                          <Tag tone="red">{t(`fehlt · ${l.teacherAway}`, `away · ${l.teacherAway}`)}</Tag>
                        ) : null}
                      </td>
                        </>
                      )}
                      <td className="py-3 pr-5 text-right align-top">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ws-sunk px-2.5 py-1 text-[0.84rem] font-bold text-[var(--casa-ink)] tabular-nums [&_svg]:size-3.5 [&_svg]:text-[var(--casa-muted)]">
                          {Icon.people}
                          {l.learners.length}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
      <LessonPanel lesson={lessons.find((l) => l.id === openId) ?? null} day={day} editing={editing ? { ...editing, lessons } : undefined} canBooks={canBooks} onClose={() => setOpenId(null)} />
    </section>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
        on ? 'bg-[var(--casa-ink-deep)] text-white' : 'bg-white text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset hover:bg-ws-sunk'
      )}
    >
      {children}
    </button>
  );
}

export function Search({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <label className="relative flex items-center">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 text-[var(--casa-muted)] [&_svg]:size-4">
        {Icon.search}
      </span>
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-72 max-w-full rounded-full border border-ws-line bg-white pr-3 pl-9 text-[0.84rem] outline-none placeholder:text-[var(--casa-text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
      />
    </label>
  );
}

function Tag({ tone, children }: { tone: 'sun' | 'red' | 'quiet'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'mt-1 inline-flex h-5 items-center rounded-md px-1.5 text-[0.72rem] font-bold whitespace-nowrap',
        tone === 'sun' && 'bg-[#fff2d6] text-[#6e4700]',
        tone === 'red' && 'bg-[#fdecec] text-[#9b1c1c]',
        tone === 'quiet' && 'bg-ws-sunk text-[var(--casa-muted)]'
      )}
    >
      {children}
    </span>
  );
}
