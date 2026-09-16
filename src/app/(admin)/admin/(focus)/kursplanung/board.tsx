'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';

import { levelStyle as lvStyle } from '@/lib/admin/kursplanung/colours';
import { absenceOn, assignmentKey, courseDays, fit, remainingDays, span, type PlanContext } from '@/lib/admin/kursplanung/fit';
import { analysePlan } from '@/lib/admin/kursplanung/rules';
import { SHIFT_INFO, SHIFTS, type Assignment, type CourseGroup, type Shift, type Teacher } from '@/lib/admin/kursplanung/types';
import { weekSlice } from '@/lib/admin/kursplanung/week';
import { weekdayOf, type PlanningWeek } from '@/lib/admin/kursplanung/weeks';

import { saveWeekAction, type SaveWeekResult } from './actions';
import styles from './board.module.css';
import ui from './ui.module.css';

/**
 * The board. Read docs/KURSPLANUNG.md first.
 *
 * Pieces are teachers, sockets are course days, colour is level; yellow is a
 * substitute, a red ring is a conflict. Every mutation is computed here with
 * the same pure functions the server holds, applied optimistically, and then
 * the whole shift-week is saved through `saveWeekAction` together with the
 * week as this client last saw it — a save that would overwrite a colleague's
 * change comes back as stale and is undone here. Undo replays the previous set.
 */

const DAY_LABEL: Record<string, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag' };

type Drag = { teacherId: string; from: 'tray' } | { teacherId: string; from: 'board'; groupId: string; dates: string[]; weekStart: string };
type Menu =
  | { kind: 'socket'; groupId: string; date: string; x: number; y: number }
  | { kind: 'piece'; groupId: string; dates: string[]; x: number; y: number };
type Preview = { keys: Set<string>; cls: string } | null;
type Touched = { shift: Shift; weekStart: string };

const groupLabel = (g: CourseGroup, of: number) => `${g.level}.${g.phase}${of > 1 ? ` · Gruppe ${g.groupIndex}` : ''}`;
const shortDay = (date: string) => weekdayOf(date) ?? '';
const sig = (a: Assignment) => `${a.groupId}|${a.onDate}|${a.teacherId}|${a.isSubstitute}|${a.isTentative}`;

export function Board({
  plan,
  month,
  canWrite,
  header,
  notice,
}: {
  plan: PlanContext;
  month: string;
  canWrite: boolean;
  /** The module's title, month and tabs — the board lays its own buttons beside them. */
  header: ReactNode;
  notice?: { ok?: string; error?: string };
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>(() => [...plan.assignments]);
  const [shift, setShift] = useState<Shift>(() => (plan.groups.some((g) => g.shift === 'morning') ? 'morning' : 'afternoon'));
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = useState(plan.weeks[0]?.start ?? '');
  const [hand, setHand] = useState<string | null>(null);
  const [undo, setUndo] = useState<Assignment[][]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const [marks, setMarks] = useState<Map<string, 'can' | 'maybe' | 'no'>>(new Map());
  const [status, setStatus] = useState<{ text: string; bad?: boolean }>({ text: '' });
  const [stale, setStale] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState('');
  const [, startTransition] = useTransition();
  const dragRef = useRef<Drag | null>(null);
  const resizeRef = useRef<{ groupId: string; dates: string[]; row: number | null } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  /** The plan as the server last confirmed it — what a save is conditional on. */
  const baseRef = useRef<Assignment[]>([...plan.assignments]);

  // Fresh data from the server (after a save, a refresh, or a colleague's change) replaces the local copy.
  useEffect(() => {
    setAssignments([...plan.assignments]);
    baseRef.current = [...plan.assignments];
    setStale(false);
  }, [plan.assignments]);

  const ctx: PlanContext = useMemo(() => ({ ...plan, assignments }), [plan, assignments]);
  const analysis = useMemo(() => analysePlan(ctx), [ctx]);
  const week = useMemo(() => ctx.weeks.find((w) => w.start === weekStart) ?? ctx.weeks[0], [ctx.weeks, weekStart]);
  const groups = useMemo(() => ctx.groups.filter((g) => g.shift === shift), [ctx.groups, shift]);
  const days = useMemo(() => (week ? courseDays({ shift }, week) : []), [shift, week]);
  const teacher = useCallback((id: string) => ctx.teachers.find((t) => t.id === id), [ctx.teachers]);
  const groupsOfLevel = useCallback((g: CourseGroup) => groups.filter((x) => x.level === g.level && x.phase === g.phase).length, [groups]);
  const weekOf = useCallback((date: string) => plan.weeks.find((w) => w.days.includes(date)) ?? week, [plan.weeks, week]);

  /* ---------------------------------------------------------------- saving */

  const persist = useCallback(
    (next: Assignment[], touched: readonly Touched[], previous: Assignment[], done: string) => {
      startTransition(async () => {
        for (const t of touched) {
          const w = plan.weeks.find((x) => x.start === t.weekStart);
          if (!w) continue;
          const result = await saveWeekAction({
            month,
            shift: t.shift,
            weekStart: t.weekStart,
            assignments: weekSlice(next, plan.groups, t.shift, w),
            base: weekSlice(baseRef.current, plan.groups, t.shift, w),
          }).catch((): SaveWeekResult => ({ ok: false, stale: true, error: 'Speichern fehlgeschlagen.' }));
          if (!result.ok) {
            // Back to the last state the server confirmed. A stale answer — or no
            // answer at all — means the database may differ from this copy, so
            // the bar offers a reload rather than pretending to know.
            setAssignments(previous);
            if (result.stale) setStale(true);
            setStatus({ text: result.error, bad: true });
            return;
          }
        }
        baseRef.current = next;
        setStatus({ text: done });
      });
    },
    [month, plan.groups, plan.weeks]
  );

  const touchedWeeks = useCallback(
    (a: Assignment[], b: Assignment[]): Touched[] => {
      const keys = new Map<string, Touched>();
      const note = (x: Assignment) => {
        const g = plan.groups.find((gr) => gr.id === x.groupId);
        const w = plan.weeks.find((wk) => wk.days.includes(x.onDate));
        if (g && w) keys.set(`${g.shift}|${w.start}`, { shift: g.shift, weekStart: w.start });
      };
      const bs = new Set(b.map(sig)), as = new Set(a.map(sig));
      a.forEach((x) => { if (!bs.has(sig(x))) note(x); });
      b.forEach((x) => { if (!as.has(sig(x))) note(x); });
      return [...keys.values()];
    },
    [plan.groups, plan.weeks]
  );

  const commit = (next: Assignment[], touched?: readonly Touched[], done = '') => {
    if (!canWrite) return;
    const previous = assignments;
    setUndo((u) => [...u.slice(-39), previous]);
    setAssignments(next);
    setStatus({ text: 'speichert …' });
    persist(next, touched ?? touchedWeeks(previous, next), previous, done || `Gespeichert ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`);
  };

  const doUndo = () => {
    const previous = undo[undo.length - 1];
    if (!previous) return;
    const current = assignments;
    setUndo((u) => u.slice(0, -1));
    setAssignments(previous);
    setStatus({ text: 'speichert …' });
    persist(previous, touchedWeeks(current, previous), current, 'Rückgängig gemacht');
  };

  /* ------------------------------------------------------------- mutations */

  const without = (list: Assignment[], groupId: string, dates: readonly string[]) => list.filter((a) => !(a.groupId === groupId && dates.includes(a.onDate)));

  const place = (teacherId: string, group: CourseGroup, fromDate: string, base: Assignment[] = assignments, limit?: number): Assignment[] | null => {
    const local = { ...ctx, assignments: base };
    const dates = span(local, teacherId, group, fromDate, limit);
    if (dates.length === 0) return null;
    const t = teacher(teacherId);
    const substitute = !!t && !t.shifts.includes(group.shift);
    const next = without(base, group.id, dates);
    dates.forEach((d) => next.push({ groupId: group.id, onDate: d, teacherId, isSubstitute: substitute, isTentative: false }));
    return next;
  };

  const doPlace = (teacherId: string, group: CourseGroup, fromDate: string) => {
    const next = place(teacherId, group, fromDate);
    if (!next) { setStatus({ text: 'Passt hier nicht', bad: true }); return; }
    commit(next);
    setMenu(null);
    const w = weekOf(fromDate);
    if (hand && remainingDays({ ...ctx, assignments: next }, teacher(hand)!, w.start).rest <= 0) setHand(null);
  };

  const removeDates = (groupId: string, dates: string[]) => { commit(without(assignments, groupId, dates)); setMenu(null); };

  const toggleFlag = (groupId: string, dates: string[], flag: 'isSubstitute' | 'isTentative') => {
    const on = assignments.find((a) => a.groupId === groupId && a.onDate === dates[0])?.[flag] ?? false;
    commit(assignments.map((a) => (a.groupId === groupId && dates.includes(a.onDate) ? { ...a, [flag]: !on } : a)));
    setMenu(null);
  };

  const extendRun = (group: CourseGroup, template: Assignment, w: PlanningWeek) => {
    const free = courseDays(group, w).filter((d) => !assignments.some((a) => a.groupId === group.id && a.onDate === d) && fit(ctx, template.teacherId, group, d).ok);
    if (!free.length) return;
    commit([...assignments, ...free.map((d) => ({ ...template, onDate: d }))]);
    setMenu(null);
  };

  const moveRun = (drag: Extract<Drag, { from: 'board' }>, group: CourseGroup, toDate: string) => {
    const copy = !plan.weeks.find((w) => w.start === drag.weekStart)?.days.includes(toDate);
    const base = copy ? assignments : without(assignments, drag.groupId, drag.dates);
    const template = assignments.find((a) => a.groupId === drag.groupId && a.onDate === drag.dates[0]);
    const next = place(drag.teacherId, group, toDate, base, drag.dates.length);
    if (!next) { setStatus({ text: 'Passt hier nicht', bad: true }); return; }
    if (template?.isTentative) {
      const laid = new Set(span({ ...ctx, assignments: base }, drag.teacherId, group, toDate, drag.dates.length));
      next.forEach((a) => { if (a.groupId === group.id && laid.has(a.onDate)) a.isTentative = true; });
    }
    commit(next);
  };

  const resizeRun = (groupId: string, dates: string[], endRow: number) => {
    const group = plan.groups.find((g) => g.id === groupId);
    const current = assignments.find((a) => a.groupId === groupId && a.onDate === dates[0]);
    if (!group || !current) return;
    const w = weekOf(dates[0]);
    const cd = courseDays(group, w);
    const start = cd.indexOf(dates[0]);
    const end = Math.max(start, endRow - 1);
    const base = without(assignments, groupId, dates);
    const rest = remainingDays({ ...ctx, assignments: base }, teacher(current.teacherId)!, w.start).rest;
    const next = [...base];
    let placed = 0;
    for (let i = start; i <= end && i < cd.length; i++) {
      const d = cd[i];
      if (next.some((a) => a.groupId === groupId && a.onDate === d)) break;
      if (!fit({ ...ctx, assignments: next }, current.teacherId, group, d).ok) break;
      if (placed >= rest) break;
      next.push({ ...current, onDate: d });
      placed++;
    }
    if (placed === 0) next.push({ ...current });
    commit(next);
  };

  const copyWeek = () => {
    const i = plan.weeks.findIndex((w) => w.start === week.start);
    const to = plan.weeks[i + 1];
    if (!to) { setStatus({ text: 'Letzte Woche', bad: true }); return; }
    const next = [...assignments];
    let n = 0;
    for (const g of groups) {
      const from = courseDays(g, week), target = courseDays(g, to);
      from.forEach((d, k) => {
        const src = assignments.find((a) => a.groupId === g.id && a.onDate === d);
        const dst = target[k];
        if (!src || !dst || next.some((a) => a.groupId === g.id && a.onDate === dst)) return;
        if (!fit({ ...ctx, assignments: next }, src.teacherId, g, dst).ok) return;
        next.push({ ...src, onDate: dst });
        n++;
      });
    }
    commit(next, [{ shift, weekStart: to.start }], `${n} Tage in KW ${to.kw} übernommen`);
    setWeekStart(to.start);
  };

  /* --------------------------------------------------- pick-up & drag hints */

  const markFor = useCallback((teacherId: string, base: Assignment[] = assignments) => {
    const local = { ...ctx, assignments: base };
    const t = teacher(teacherId);
    const m = new Map<string, 'can' | 'maybe' | 'no'>();
    const wks = view === 'month' ? plan.weeks : [week];
    for (const w of wks) {
      for (const g of groups) {
        const cd = courseDays(g, w);
        const any = cd.some((d) => !base.some((a) => a.groupId === g.id && a.onDate === d) && fit(local, teacherId, g, d).ok);
        m.set(`${g.id}|${w.start}`, !any ? 'no' : t?.levels.includes(g.level) ? 'can' : 'maybe');
      }
    }
    setMarks(m);
  }, [assignments, ctx, groups, plan.weeks, teacher, view, week]);

  useEffect(() => { if (hand) markFor(hand); else setMarks(new Map()); }, [hand, markFor]);

  const liftedBase = (d: Drag | null, w: PlanningWeek) => (d && d.from === 'board' && d.weekStart === w.start ? without(assignments, d.groupId, d.dates) : assignments);

  const showPreview = (group: CourseGroup, date: string) => {
    const d = dragRef.current;
    const teacherId = d?.teacherId ?? hand;
    if (!teacherId) return;
    const local = { ...ctx, assignments: liftedBase(d, weekOf(date)) };
    const f = fit(local, teacherId, group, date);
    if (!f.ok) { setPreview({ keys: new Set([assignmentKey(group.id, date)]), cls: styles.sockNo }); return; }
    const limit = d?.from === 'board' ? d.dates.length : undefined;
    const dates = span(local, teacherId, group, date, limit);
    setPreview({ keys: new Set(dates.map((x) => assignmentKey(group.id, x))), cls: f.substitute ? styles.sockSub : f.levelMatch ? styles.sockOk : styles.sockWarn });
  };

  const onDrop = (group: CourseGroup, date: string) => {
    const d = dragRef.current;
    dragRef.current = null;
    setPreview(null);
    setMarks(new Map());
    if (!d) return;
    setWeekStart(weekOf(date).start);
    if (d.from === 'board') moveRun(d, group, date);
    else doPlace(d.teacherId, group, date);
  };

  /* ---------------------------------------------------------- resize handle */

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const cell = el?.closest<HTMLElement>('[data-row]');
      if (cell && cell.dataset.group === r.groupId && cell.dataset.week === weekOf(r.dates[0]).start) r.row = Number(cell.dataset.row);
    };
    const up = () => {
      const r = resizeRef.current;
      resizeRef.current = null;
      if (r?.row) resizeRun(r.groupId, r.dates, r.row);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (menu) setMenu(null); else if (hand) setHand(null); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && canWrite) { e.preventDefault(); doUndo(); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });

  // A menu opens at the pointer and is then pulled back inside the viewport,
  // measured — a menu that hangs off the bottom of the window is unreadable.
  // Scrolling the page closes it: it is anchored to a piece, and the piece moves.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!menu || !el) return;
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(menu.y + 6, window.innerHeight - r.height - 8))}px`;
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      setMenu(null);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  /* ----------------------------------------------------------------- data */

  const statsFor = (wks: readonly PlanningWeek[]) => {
    let total = 0, filled = 0, subs = 0;
    const issues = analysis.issues.filter((i) => i.shift === shift && wks.some((w) => w.start === i.weekStart));
    for (const w of wks) for (const g of groups) for (const d of courseDays(g, w)) {
      total++;
      const a = assignments.find((x) => x.groupId === g.id && x.onDate === d);
      if (a) { filled++; if (a.isSubstitute) subs++; }
    }
    const hard = issues.filter((i) => i.severity === 'hard').length;
    const warn = issues.filter((i) => i.severity === 'warn').length;
    return { total, filled, subs, hard, warn, done: total > 0 && filled === total && hard === 0 };
  };
  const shown = view === 'month' ? plan.weeks : week ? [week] : [];
  const st = statsFor(shown);

  const tray = useMemo(() => {
    if (!week) return { avail: [], other: [], away: [], full: [] };
    const rows = ctx.teachers.filter((t) => t.isActive).map((t) => ({ t, ...remainingDays(ctx, t, week.start), own: t.shifts.includes(shift) }));
    const byRest = (a: { rest: number; t: Teacher }, b: { rest: number; t: Teacher }) => b.rest - a.rest || a.t.shortName.localeCompare(b.t.shortName, 'de');
    return {
      avail: rows.filter((x) => x.own && x.rest > 0 && !x.awayAll).sort(byRest),
      other: rows.filter((x) => !x.own && x.rest > 0 && !x.awayAll).sort(byRest),
      away: rows.filter((x) => x.own && x.awayAll),
      full: rows.filter((x) => x.own && x.rest <= 0 && !x.awayAll),
    };
  }, [ctx, shift, week]);

  const handInfo = useMemo(() => {
    if (!hand || !week) return null;
    const t = teacher(hand);
    if (!t) return null;
    const rest = remainingDays(ctx, t, week.start).rest;
    const fits = groups.filter((g) => days.some((d) => !assignments.some((a) => a.groupId === g.id && a.onDate === d) && fit(ctx, hand, g, d).ok));
    const good = [...new Set(fits.filter((g) => t.levels.includes(g.level)).map((g) => `${g.level}.${g.phase}`))];
    const maybe = [...new Set(fits.filter((g) => !t.levels.includes(g.level)).map((g) => `${g.level}.${g.phase}`))];
    return { t, rest, good, maybe };
  }, [assignments, ctx, days, groups, hand, teacher, week]);

  /* -------------------------------------------------------------- render */

  if (!week) return null;

  const runsOf = (g: CourseGroup, cd: readonly string[]) => {
    const runs: { dates: string[]; a: Assignment }[] = [];
    let i = 0;
    while (i < cd.length) {
      const a = assignments.find((x) => x.groupId === g.id && x.onDate === cd[i]);
      if (!a) { i++; continue; }
      let j = i;
      while (j + 1 < cd.length) {
        const n = assignments.find((x) => x.groupId === g.id && x.onDate === cd[j + 1]);
        if (n && n.teacherId === a.teacherId && n.isSubstitute === a.isSubstitute && n.isTentative === a.isTentative) j++; else break;
      }
      runs.push({ dates: cd.slice(i, j + 1), a });
      i = j + 1;
    }
    return runs;
  };

  const socketMenu = (m: Extract<Menu, { kind: 'socket' }>) => {
    const g = groups.find((x) => x.id === m.groupId)!;
    const wk = weekOf(m.date);
    const rows = ctx.teachers.filter((t) => t.isActive).map((t) => ({ t, f: fit(ctx, t.id, g, m.date), r: remainingDays(ctx, t, wk.start), pair: g.teacherFirst === t.id || g.teacherSecond === t.id }));
    const q = query.trim().toLowerCase();
    const match = (t: Teacher) => !q || t.shortName.toLowerCase().includes(q) || t.fullName.toLowerCase().includes(q);
    const ok = rows.filter((x) => x.f.ok && !x.f.substitute && match(x.t)).sort((a, b) => Number(b.pair) - Number(a.pair) || Number(a.f.ok && !a.f.levelMatch) - Number(b.f.ok && !b.f.levelMatch) || b.r.rest - a.r.rest || a.t.shortName.localeCompare(b.t.shortName, 'de'));
    const sub = rows.filter((x) => x.f.ok && x.f.substitute && match(x.t)).sort((a, b) => b.r.rest - a.r.rest);
    const no = rows.filter((x) => !x.f.ok && match(x.t));
    const item = (x: (typeof rows)[number], cls?: string) => (
      <button key={x.t.id} type="button" className={`${styles.mi} ${cls ?? ''}`} onClick={() => doPlace(x.t.id, g, m.date)}>
        <span className="nm">{x.t.shortName}</span>
        {x.pair ? <span className={styles.tagp}>{g.phase === '1' ? 'Vorschlag' : 'Stamm'}</span> : x.f.ok && !x.f.levelMatch ? <span className={styles.tagp}>{g.level}?</span> : null}
        <span className="r">{x.r.rest} Tag{x.r.rest === 1 ? '' : 'e'} frei</span>
      </button>
    );
    return (
      <div ref={menuRef} className={styles.menu} style={{ left: m.x, top: m.y + 6 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mh}><b>{groupLabel(g, groupsOfLevel(g))}</b><div className="s">{DAY_LABEL[shortDay(m.date)]} · KW {wk.kw} · legt ab hier so viele Tage wie frei</div></div>
        <input type="search" placeholder="Lehrkraft suchen" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus aria-label="Lehrkraft suchen" />
        <div className={styles.list}>
          {ok.map((x) => item(x))}
          {sub.length ? <><div className={styles.sect}><span className={styles.lbl}>Andere Schicht · Vertretung</span></div>{sub.map((x) => item(x, styles.miSub))}</> : null}
          {no.length && q ? no.map((x) => <div key={x.t.id} className={`${styles.mi} ${styles.miDis}`}><span className="nm">{x.t.shortName}</span><span className="r">{x.f.ok ? '' : x.f.reason}</span></div>) : null}
          {no.length && !q ? <div className={styles.fold}>{no.length} nicht verfügbar — Suche zeigt sie mit Grund</div> : null}
        </div>
      </div>
    );
  };

  const pieceMenu = (m: Extract<Menu, { kind: 'piece' }>) => {
    const g = groups.find((x) => x.id === m.groupId)!;
    const a = assignments.find((x) => x.groupId === g.id && x.onDate === m.dates[0]);
    if (!a) return null;
    const t = teacher(a.teacherId);
    const wk = weekOf(m.dates[0]);
    const range = `${shortDay(m.dates[0])}${m.dates.length > 1 ? `–${shortDay(m.dates[m.dates.length - 1])}` : ''}`;
    const free = courseDays(g, wk).filter((d) => !assignments.some((x) => x.groupId === g.id && x.onDate === d) && fit(ctx, a.teacherId, g, d).ok);
    const absent = m.dates.filter((d) => absenceOn(ctx, a.teacherId, d) || (t && !t.weekdays.includes(weekdayOf(d)!)));
    const row = (title: string, onClick: () => void, cls?: string) => (
      <button key={title} type="button" className={`${styles.mr} ${cls ?? ''}`} onClick={onClick}>{title}</button>
    );
    return (
      <div ref={menuRef} className={styles.menu} style={{ left: m.x, top: m.y + 6 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mh}><b>{t?.fullName}</b><div className="s">{groupLabel(g, groupsOfLevel(g))} · {range} · KW {wk.kw}{a.isSubstitute ? ' · Vertretung' : ''}{a.isTentative ? ' · unbestätigt' : ''}</div></div>
        <div className={styles.rows}>
          {absent.length ? row(`Ersatz finden für ${absent.map(shortDay).join(', ')}`, () => { commit(without(assignments, g.id, absent)); setMenu({ kind: 'socket', groupId: g.id, date: absent[0], x: m.x, y: m.y }); }, styles.mrOn) : null}
          {a.isSubstitute
            ? row('Vertretung aufheben', () => toggleFlag(g.id, m.dates, 'isSubstitute'), styles.mrOn)
            : row('Als Vertretung markieren', () => toggleFlag(g.id, m.dates, 'isSubstitute'))}
          {a.isTentative
            ? row('Bestätigen', () => toggleFlag(g.id, m.dates, 'isTentative'))
            : row('Als unbestätigt markieren', () => toggleFlag(g.id, m.dates, 'isTentative'))}
          {free.length ? row(`Auf ${free.map(shortDay).join(', ')} ausdehnen`, () => extendRun(g, a, wk)) : null}
          {row('Lehrkraft-Details', () => router.push(`/admin/kursplanung/lehrkraefte?month=${month}&teacher=${a.teacherId}`))}
          {row(`Aus KW ${wk.kw} entfernen`, () => removeDates(g.id, m.dates), styles.mrDel)}
        </div>
      </div>
    );
  };

  const trayPiece = (x: { t: Teacher; rest: number; used: number; max: number; awayAll: boolean }, off: boolean) => {
    const flex = x.t.shifts.length > 1, hon = x.t.contract === 'freelance', inHand = hand === x.t.id;
    const pick = () => setHand(inHand ? null : x.t.id);
    return (
      <div
        key={x.t.id}
        role={off ? undefined : 'button'}
        tabIndex={off ? undefined : 0}
        aria-pressed={off ? undefined : inHand}
        onClick={off ? undefined : pick}
        onKeyDown={off ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
        draggable={!off}
        onDragStart={off ? undefined : (e) => { dragRef.current = { teacherId: x.t.id, from: 'tray' }; e.dataTransfer.effectAllowed = 'move'; markFor(x.t.id); }}
        onDragEnd={off ? undefined : () => { dragRef.current = null; setPreview(null); if (!hand) setMarks(new Map()); }}
        className={`${styles.tp} ${off ? styles.tpOff : ''} ${inHand ? styles.tpHand : ''}`}
        title={`${x.t.fullName}${off ? '' : ' – anklicken oder ziehen'}`}
      >
        <span className={styles.tpName}>{x.t.shortName}</span>
        <span>{inHand ? <span className={styles.handlbl}>in der Hand</span> : null} {flex ? <span className={styles.sh}>V+N</span> : null} {hon ? <span className={styles.sh}>HON</span> : null} <Link href={`/admin/kursplanung/lehrkraefte?month=${month}&teacher=${x.t.id}`} className={styles.more} title="Details: Schicht, Tage, Niveaus, Abwesenheiten" aria-label={`Details zu ${x.t.shortName}`} onClick={(e) => e.stopPropagation()} draggable={false}>···</Link></span>
        <span className={styles.bl}>
          <span className={styles.blocks} aria-hidden="true">{Array.from({ length: x.max }, (_, i) => <i key={i} className={i < x.max - x.rest ? 'u' : ''} />)}</span>
          <span className={styles.cnt}>{x.awayAll ? 'abwesend' : x.rest > 0 ? `${x.rest} von ${x.max} Tagen frei` : `alle ${x.max} Tage verplant`}</span>
        </span>
        <span className={styles.lvs}>{x.t.levels.map((L) => <i key={L} className={styles.lvChip} style={lvStyle(L)}>{L}</i>)}</span>
      </div>
    );
  };

  const block = (w: PlanningWeek, compact: boolean) => {
    const cd = (g: CourseGroup) => courseDays(g, w);
    const wst = statsFor([w]);
    return (
      <section key={w.start} className={`${styles.wkblock} ${w.start === week.start ? styles.wkActive : ''}`} data-week={w.start}>
        {compact ? (
          <button type="button" className={styles.wkh} onClick={(e) => { e.stopPropagation(); setWeekStart(w.start); }}>
            <h2>KW {w.kw} <span style={{ color: 'var(--pz-mute)', fontWeight: 600 }}>· {w.label}</span></h2>
            <span className="txt"><b>{wst.filled}</b> / {wst.total}</span>
            <span className={styles.pills}>
              {wst.done ? <span className={`${styles.pill} ${styles.pillOk}`}>✓ vollständig</span> : null}
              {wst.hard ? <span className={`${styles.pill} ${styles.pillBad}`}>{wst.hard} Konflikt{wst.hard > 1 ? 'e' : ''}</span> : null}
              {wst.subs ? <span className={`${styles.pill} ${styles.pillSub}`}>{wst.subs} Vertretung{wst.subs > 1 ? 'en' : ''}</span> : null}
            </span>
          </button>
        ) : null}
        <div className={`${styles.board} ${compact ? styles.compact : ''}`}>
          {groups.map((g) => {
            const of = groupsOfLevel(g);
            const mark = marks.get(`${g.id}|${w.start}`);
            const pair = [g.teacherFirst, g.teacherSecond].map((id) => (id ? teacher(id)?.shortName : null)).filter(Boolean).join(' / ');
            const gd = cd(g);
            return (
              <section key={g.id} className={`${styles.col} ${mark === 'can' ? styles.colCan : mark === 'maybe' ? styles.colMaybe : mark === 'no' ? styles.colNo : ''}`} style={lvStyle(g.level)}>
                <header className={styles.colHead}>
                  <span className={styles.lv}>{g.level}.{g.phase}</span>
                  <span className={styles.grp} title={`${g.phase === '1' ? 'Vorschlag' : 'Stamm'}: ${pair || '–'}`}>{of > 1 ? `Gruppe ${g.groupIndex} · ` : ''}{g.registrations} TN</span>
                </header>
                <div className={styles.sockets} style={{ '--rows': gd.length } as React.CSSProperties}>
                  {gd.map((d, i) => {
                    if (assignments.some((a) => a.groupId === g.id && a.onDate === d)) return null;
                    const key = assignmentKey(g.id, d);
                    const pv = preview?.keys.has(key) ? preview.cls : '';
                    return (
                      <button
                        key={d}
                        type="button"
                        className={`${styles.socket} ${pv}`}
                        style={{ gridRow: i + 1 }}
                        data-row={i + 1}
                        data-group={g.id}
                        data-week={w.start}
                        data-date={d}
                        aria-label={`${groupLabel(g, of)} ${DAY_LABEL[shortDay(d)]} KW ${w.kw} offen`}
                        onClick={(e) => { e.stopPropagation(); if (!canWrite) return; setWeekStart(w.start); if (hand) doPlace(hand, g, d); else { setQuery(''); setMenu({ kind: 'socket', groupId: g.id, date: d, x: e.clientX, y: e.clientY }); } }}
                        onMouseEnter={() => { if (hand) showPreview(g, d); }}
                        onMouseLeave={() => { if (hand) setPreview(null); }}
                        onDragOver={(e) => { if (!dragRef.current) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; showPreview(g, d); }}
                        onDragLeave={() => setPreview(null)}
                        onDrop={(e) => { e.preventDefault(); onDrop(g, d); }}
                      >
                        {shortDay(d)}
                      </button>
                    );
                  })}
                  {runsOf(g, gd).map(({ dates, a }) => {
                    const t = teacher(a.teacherId);
                    const issues = dates.flatMap((d) => analysis.byKey.get(assignmentKey(g.id, d)) ?? []).filter((i) => i.severity !== 'open');
                    const hardIss = issues.filter((i) => i.severity === 'hard');
                    const warnIss = !hardIss.length && issues.some((i) => i.severity === 'warn');
                    const cap = dates.length > 1 ? `${shortDay(dates[0])}–${shortDay(dates[dates.length - 1])}` : shortDay(dates[0]);
                    return (
                      <div
                        key={dates[0]}
                        role="button"
                        tabIndex={0}
                        draggable={canWrite}
                        className={`${styles.piece} ${a.isSubstitute ? styles.pieceSub : ''} ${a.isTentative ? styles.pieceTent : ''} ${hardIss.length ? styles.pieceBad : warnIss ? styles.pieceWarn : ''}`}
                        style={{ gridRow: `${gd.indexOf(dates[0]) + 1} / span ${dates.length}` }}
                        data-row={gd.indexOf(dates[0]) + 1}
                        data-group={g.id}
                        data-week={w.start}
                        title={`${t?.fullName ?? ''}${issues.length ? `\n${issues.map((i) => `• ${i.text}`).join('\n')}` : ''}`}
                        onClick={(e) => { e.stopPropagation(); if ((e.target as HTMLElement).closest(`.${styles.handle}`)) return; setWeekStart(w.start); setMenu({ kind: 'piece', groupId: g.id, dates, x: e.clientX, y: e.clientY }); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setWeekStart(w.start); setMenu({ kind: 'piece', groupId: g.id, dates, x: r.left, y: r.bottom }); } }}
                        onDragStart={(e) => { dragRef.current = { teacherId: a.teacherId, from: 'board', groupId: g.id, dates, weekStart: w.start }; e.dataTransfer.effectAllowed = 'move'; markFor(a.teacherId, without(assignments, g.id, dates)); (e.currentTarget as HTMLElement).classList.add(styles.pieceDrag); }}
                        onDragEnd={(e) => { dragRef.current = null; setPreview(null); setMarks(new Map()); (e.currentTarget as HTMLElement).classList.remove(styles.pieceDrag); }}
                      >
                        <span className={styles.pieceName}>{t?.shortName}{a.isTentative ? '?' : ''}</span>
                        <span className={styles.pieceCap}>{cap}</span>
                        {hardIss.length ? <span className={styles.tag}>{hardIss[0].text}</span> : a.isSubstitute ? <span className={styles.tag}>Vertretung</span> : warnIss ? <span className={styles.tag}>{issues[0].text}</span> : null}
                        {canWrite ? <span className={styles.handle} title="Ziehen, um Tage zu ändern" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); resizeRef.current = { groupId: g.id, dates, row: null }; }} /> : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className={`${styles.root} ${ui.module} ${hand ? styles.hand : ''}`} onClick={() => { if (menu) setMenu(null); else if (hand) setHand(null); }}>
      <div className={ui.top}>
        {header}
        <span className={ui.spacer} />
        {canWrite ? <><button type="button" className={ui.ghost} disabled={!undo.length} onClick={(e) => { e.stopPropagation(); doUndo(); }}>↶ Rückgängig</button><button type="button" className={ui.ghost} onClick={(e) => { e.stopPropagation(); copyWeek(); }}>Woche übernehmen →</button></> : null}
        {stale ? <button type="button" className={ui.reload} onClick={(e) => { e.stopPropagation(); router.refresh(); }}>Neu laden</button> : null}
        <span className={`${ui.status} ${status.bad ? ui.statusBad : ''}`}>{status.text}</span>
        {notice?.error ? <span className={`${ui.status} ${ui.statusBad}`}>{notice.error}</span> : notice?.ok ? <span className={`${ui.status} ${ui.statusOk}`}>{notice.ok}</span> : null}
      </div>
      <div className={styles.bar}>
        <div className={styles.seg}>{SHIFTS.map((s) => <button key={s} type="button" aria-pressed={s === shift} onClick={(e) => { e.stopPropagation(); setShift(s); setHand(null); }}>{SHIFT_INFO[s].label}</button>)}</div>
        <div className={`${styles.seg} ${styles.segSoft}`}>
          <button type="button" aria-pressed={view === 'week'} onClick={(e) => { e.stopPropagation(); setView('week'); }}>Woche</button>
          <button type="button" aria-pressed={view === 'month'} onClick={(e) => { e.stopPropagation(); setView('month'); }}>Monat</button>
        </div>
        {view === 'week' ? (
          <div className={styles.seg}>
            {plan.weeks.map((w) => {
              const wi = analysis.issues.filter((i) => i.weekStart === w.start && i.shift === shift);
              const cls = wi.some((i) => i.severity === 'hard') ? styles.dotBad : wi.some((i) => i.severity === 'open') ? styles.dotOpen : '';
              return <button key={w.start} type="button" aria-pressed={w.start === week.start} onClick={(e) => { e.stopPropagation(); setWeekStart(w.start); setHand(null); }}><span className={`${styles.dot} ${cls}`} />KW {w.kw}</button>;
            })}
          </div>
        ) : null}
        <div className={styles.prog}><span className={styles.progTxt}>{st.filled} <small>/ {st.total} Tage{view === 'month' ? ' im Monat' : ''}</small></span><div className={styles.track}><i className={st.done ? 'done' : ''} style={{ width: `${st.total ? Math.round((st.filled / st.total) * 100) : 0}%` }} /></div></div>
        <div className={styles.pills}>
          {st.done ? <span className={`${styles.pill} ${styles.pillOk}`}>✓ {view === 'month' ? 'Monat' : `KW ${week.kw}`} vollständig</span> : null}
          {st.hard ? <span className={`${styles.pill} ${styles.pillBad}`}>{st.hard} Konflikt{st.hard > 1 ? 'e' : ''}</span> : null}
          {st.subs ? <span className={`${styles.pill} ${styles.pillSub}`}>{st.subs} Vertretung{st.subs > 1 ? 'en' : ''}</span> : null}
          {st.warn ? <span className={styles.pill}>{st.warn} Hinweis{st.warn > 1 ? 'e' : ''}</span> : null}
        </div>
      </div>

      <div className={styles.wrap}>
        <div>
          {handInfo ? (
            <div className={styles.handbar}>
              <span><b>{handInfo.t.shortName}</b> in der Hand · noch {handInfo.rest} {handInfo.rest === 1 ? 'Tag' : 'Tage'} in KW {week.kw}</span>
              <span className="m">{handInfo.good.length ? `passt in ${handInfo.good.join(', ')}` : 'kein passendes Niveau frei'}{handInfo.maybe.length ? ` · möglich, aber anderes Niveau: ${handInfo.maybe.join(', ')}` : ''} · Fach anklicken zum Ablegen</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setHand(null); }}>Loslassen</button>
            </div>
          ) : null}
          {shown.map((w) => block(w, view === 'month'))}
        </div>

        <aside className={styles.tray} onClick={(e) => e.stopPropagation()}>
          <section className={styles.card}>
            <div className={styles.cardHead}><h2>Teile</h2><span className="sub">wer in KW {week.kw} noch Tage frei hat</span><button type="button" className={styles.qm} aria-pressed={help} aria-label="Erklärung" onClick={() => setHelp(!help)}>?</button></div>
            {help ? <div className={styles.help}>Jede Lehrkraft ist ein Teil. Die Blöcke sind ihre freien Tage in dieser Woche, die Chips die Niveaus, in denen sie unterrichtet.<br />Teil auf ein Fach ziehen – oder Teil antippen (es ist dann „in der Hand“) und ein Fach antippen. Es legt ab dort so viele Tage, wie es frei hat.<br />Spalten mit passendem Niveau leuchten auf, unpassende werden blass. Nochmal antippen oder Esc lässt das Teil wieder los.</div> : null}
            {tray.avail.length ? tray.avail.map((x) => trayPiece(x, !canWrite)) : <div className={styles.fold}>Niemand aus dieser Schicht hat in KW {week.kw} noch freie Tage.</div>}
            {tray.other.length ? <><div className={styles.sect}><span className={styles.lbl}>Andere Schicht · als Vertretung</span><span className={styles.n}>{tray.other.length}</span></div>{showOther ? <>{tray.other.map((x) => trayPiece(x, !canWrite))}<button type="button" className={styles.fold} onClick={() => setShowOther(false)}>einklappen</button></> : <button type="button" className={styles.fold} onClick={() => setShowOther(true)}>{tray.other.map((x) => `${x.t.shortName} ${x.rest}`).join(' · ')}</button>}</> : null}
            {tray.away.length ? <><div className={styles.sect}><span className={styles.lbl}>Abwesend</span></div>{tray.away.map((x) => trayPiece(x, true))}</> : null}
            {tray.full.length ? <><div className={styles.sect}><span className={styles.lbl}>Verplant</span><span className={styles.n}>{tray.full.length}</span></div>{showFull ? <>{tray.full.map((x) => trayPiece(x, true))}<button type="button" className={styles.fold} onClick={() => setShowFull(false)}>einklappen</button></> : <button type="button" className={styles.fold} onClick={() => setShowFull(true)}>{tray.full.map((x) => x.t.shortName).join(', ')}</button>}</> : null}
            <div className={styles.legend}><span>Farbe = Niveau</span><span><i style={{ background: 'var(--pz-yellow)' }} />Vertretung</span><span><i style={{ boxShadow: 'inset 0 0 0 2px var(--pz-red)', background: '#fff' }} />Konflikt</span><span><i style={{ border: '1.5px dashed #c5cad3', background: '#fafbfc' }} />offen</span></div>
          </section>
        </aside>
      </div>

      {menu?.kind === 'socket' ? socketMenu(menu) : null}
      {menu?.kind === 'piece' ? pieceMenu(menu) : null}
    </div>
  );
}
