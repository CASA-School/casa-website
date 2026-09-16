'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { assignmentKey, courseDays, fit, remainingDays, span, type PlanContext } from '@/lib/admin/kursplanung/fit';
import { analysePlan } from '@/lib/admin/kursplanung/rules';
import { SHIFT_INFO, SHIFTS, type Assignment, type CourseGroup, type Level, type Shift, type Teacher } from '@/lib/admin/kursplanung/types';
import { weekSlice } from '@/lib/admin/kursplanung/week';
import { weekdayOf } from '@/lib/admin/kursplanung/weeks';

import { saveWeekAction } from './actions';
import styles from './board.module.css';

/**
 * The board. Read docs/KURSPLANUNG.md first.
 *
 * Pieces are teachers, sockets are course days, colour is level; yellow is a
 * substitute, a red ring is a conflict. Every mutation is computed here with
 * the same pure functions the server holds, applied optimistically, and then
 * the whole shift-week is saved through `saveWeekAction`. Undo replays the
 * previous set.
 */

const LEVEL_COLOURS: Record<Level, [string, string]> = {
  A1: ['#d9e8ff', '#1d4f9e'],
  A2: ['#d2f1e6', '#0e6a50'],
  B1: ['#dff0cc', '#3b6a10'],
  'B1+': ['#e4e0fa', '#4b3a98'],
  B2: ['#fadce3', '#9b2447'],
  C1: ['#e1e7ee', '#2e4358'],
  C1H: ['#edd8ee', '#742e7e'],
};

const DAY_LABEL: Record<string, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag' };

type Drag = { teacherId: string; from: 'tray' } | { teacherId: string; from: 'board'; groupId: string; dates: string[]; weekStart: string };
type Menu =
  | { kind: 'socket'; groupId: string; date: string; x: number; y: number }
  | { kind: 'piece'; groupId: string; dates: string[]; x: number; y: number };
type Preview = { keys: Set<string>; cls: string } | null;

const lvStyle = (level: Level) =>
  ({ '--lt': LEVEL_COLOURS[level][0], '--li': LEVEL_COLOURS[level][1] }) as React.CSSProperties;

const groupLabel = (g: CourseGroup, of: number) => `${g.level}.${g.phase}${of > 1 ? ` · Gruppe ${g.groupIndex}` : ''}`;

const shortDay = (date: string) => weekdayOf(date) ?? '';

export function Board({ plan, month, canWrite }: { plan: PlanContext; month: string; canWrite: boolean }) {
  const [assignments, setAssignments] = useState<Assignment[]>(() => [...plan.assignments]);
  const [shift, setShift] = useState<Shift>(() => (plan.groups.some((g) => g.shift === 'morning') ? 'morning' : 'afternoon'));
  const [weekStart, setWeekStart] = useState(plan.weeks[0]?.start ?? '');
  const [hand, setHand] = useState<string | null>(null);
  const [undo, setUndo] = useState<Assignment[][]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const [marks, setMarks] = useState<Map<string, 'can' | 'maybe' | 'no'>>(new Map());
  const [status, setStatus] = useState<{ text: string; bad?: boolean }>({ text: '' });
  const [showOther, setShowOther] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState('');
  const [, startTransition] = useTransition();
  const router = useRouter();
  const dragRef = useRef<Drag | null>(null);
  const resizeRef = useRef<{ groupId: string; dates: string[]; row: number | null } | null>(null);

  const ctx: PlanContext = useMemo(() => ({ ...plan, assignments }), [plan, assignments]);
  const analysis = useMemo(() => analysePlan(ctx), [ctx]);
  const week = useMemo(() => ctx.weeks.find((w) => w.start === weekStart) ?? ctx.weeks[0], [ctx.weeks, weekStart]);
  const groups = useMemo(() => ctx.groups.filter((g) => g.shift === shift), [ctx.groups, shift]);
  const days = useMemo(() => (week ? courseDays({ shift }, week) : []), [shift, week]);
  const teacher = useCallback((id: string) => ctx.teachers.find((t) => t.id === id), [ctx.teachers]);
  const groupsOfLevel = useCallback((g: CourseGroup) => groups.filter((x) => x.level === g.level && x.phase === g.phase).length, [groups]);

  /* ---------------------------------------------------------------- saving */

  const commit = useCallback(
    (next: Assignment[], touched: readonly { shift: Shift; weekStart: string }[]) => {
      if (!canWrite) return;
      const previous = assignments;
      setUndo((u) => [...u.slice(-39), previous]);
      setAssignments(next);
      setStatus({ text: 'speichert …' });
      startTransition(async () => {
        for (const t of touched) {
          const w = plan.weeks.find((x) => x.start === t.weekStart);
          if (!w) continue;
          const result = await saveWeekAction({
            month,
            shift: t.shift,
            weekStart: t.weekStart,
            assignments: weekSlice(next, plan.groups, t.shift, w),
          });
          if (!result.ok) {
            setAssignments(previous);
            setUndo((u) => u.slice(0, -1));
            setStatus({ text: `Nicht gespeichert: ${result.error}`, bad: true });
            return;
          }
        }
        setStatus({ text: `Gespeichert ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` });
      });
    },
    [assignments, canWrite, month, plan.groups, plan.weeks]
  );

  const touchedWeeks = (a: Assignment[], b: Assignment[]) => {
    const keys = new Map<string, { shift: Shift; weekStart: string }>();
    const note = (x: Assignment) => {
      const g = plan.groups.find((gr) => gr.id === x.groupId);
      const w = plan.weeks.find((wk) => wk.days.includes(x.onDate));
      if (g && w) keys.set(`${g.shift}|${w.start}`, { shift: g.shift, weekStart: w.start });
    };
    const bKeys = new Set(b.map((x) => `${x.groupId}|${x.onDate}|${x.teacherId}|${x.isSubstitute}|${x.isTentative}`));
    const aKeys = new Set(a.map((x) => `${x.groupId}|${x.onDate}|${x.teacherId}|${x.isSubstitute}|${x.isTentative}`));
    a.forEach((x) => { if (!bKeys.has(`${x.groupId}|${x.onDate}|${x.teacherId}|${x.isSubstitute}|${x.isTentative}`)) note(x); });
    b.forEach((x) => { if (!aKeys.has(`${x.groupId}|${x.onDate}|${x.teacherId}|${x.isSubstitute}|${x.isTentative}`)) note(x); });
    return [...keys.values()];
  };

  const apply = (next: Assignment[]) => commit(next, touchedWeeks(assignments, next));

  /* ------------------------------------------------------------- mutations */

  const without = (list: Assignment[], groupId: string, dates: readonly string[]) =>
    list.filter((a) => !(a.groupId === groupId && dates.includes(a.onDate)));

  const place = (teacherId: string, group: CourseGroup, fromDate: string, base: Assignment[] = assignments, limit?: number): Assignment[] | null => {
    const localCtx = { ...ctx, assignments: base };
    const dates = span(localCtx, teacherId, group, fromDate, limit);
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
    apply(next);
    setMenu(null);
    if (hand && remainingDays({ ...ctx, assignments: next }, teacher(hand)!, week.start).rest <= 0) setHand(null);
  };

  const removeRun = (groupId: string, dates: string[]) => { apply(without(assignments, groupId, dates)); setMenu(null); };

  const toggleFlag = (groupId: string, dates: string[], flag: 'isSubstitute' | 'isTentative') => {
    const on = assignments.find((a) => a.groupId === groupId && a.onDate === dates[0])?.[flag] ?? false;
    apply(assignments.map((a) => (a.groupId === groupId && dates.includes(a.onDate) ? { ...a, [flag]: !on } : a)));
    setMenu(null);
  };

  const extendRun = (group: CourseGroup, template: Assignment) => {
    const free = days.filter((d) => !assignments.some((a) => a.groupId === group.id && a.onDate === d) && fit(ctx, template.teacherId, group, d).ok);
    if (!free.length) return;
    apply([...assignments, ...free.map((d) => ({ ...template, onDate: d }))]);
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
    apply(next);
  };

  const resizeRun = (groupId: string, dates: string[], endRow: number) => {
    const group = groups.find((g) => g.id === groupId);
    const current = assignments.find((a) => a.groupId === groupId && a.onDate === dates[0]);
    if (!group || !current) return;
    const start = days.indexOf(dates[0]);
    const end = Math.max(start, endRow - 1);
    const base = without(assignments, groupId, dates);
    const rest = remainingDays({ ...ctx, assignments: base }, teacher(current.teacherId)!, week.start).rest;
    const next = [...base];
    let placed = 0;
    for (let i = start; i <= end && i < days.length; i++) {
      const d = days[i];
      if (next.some((a) => a.groupId === groupId && a.onDate === d)) break;
      if (!fit({ ...ctx, assignments: next }, current.teacherId, group, d).ok) break;
      if (placed >= rest) break;
      next.push({ ...current, onDate: d });
      placed++;
    }
    if (placed === 0) next.push({ ...current });
    apply(next);
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
    commit(next, [{ shift, weekStart: to.start }]);
    setWeekStart(to.start);
    setStatus({ text: `${n} Tage in KW ${to.kw} übernommen` });
  };

  const doUndo = () => {
    const previous = undo[undo.length - 1];
    if (!previous) return;
    const touched = touchedWeeks(assignments, previous);
    setUndo((u) => u.slice(0, -1));
    setAssignments(previous);
    setStatus({ text: 'speichert …' });
    startTransition(async () => {
      for (const t of touched) {
        const w = plan.weeks.find((x) => x.start === t.weekStart);
        if (!w) continue;
        const r = await saveWeekAction({ month, shift: t.shift, weekStart: t.weekStart, assignments: weekSlice(previous, plan.groups, t.shift, w) });
        if (!r.ok) { setStatus({ text: `Nicht gespeichert: ${r.error}`, bad: true }); return; }
      }
      setStatus({ text: 'Rückgängig gemacht' });
    });
  };

  /* --------------------------------------------------- pick-up & drag hints */

  const markFor = useCallback((teacherId: string, base: Assignment[] = assignments) => {
    const local = { ...ctx, assignments: base };
    const t = teacher(teacherId);
    const m = new Map<string, 'can' | 'maybe' | 'no'>();
    for (const g of groups) {
      const any = days.some((d) => !base.some((a) => a.groupId === g.id && a.onDate === d) && fit(local, teacherId, g, d).ok);
      m.set(g.id, !any ? 'no' : t?.levels.includes(g.level) ? 'can' : 'maybe');
    }
    setMarks(m);
  }, [assignments, ctx, days, groups, teacher]);

  useEffect(() => { if (hand) markFor(hand); else setMarks(new Map()); }, [hand, markFor]);

  const liftedBase = (d: Drag | null) =>
    d && d.from === 'board' && d.weekStart === week.start ? without(assignments, d.groupId, d.dates) : assignments;

  const showPreview = (group: CourseGroup, date: string) => {
    const d = dragRef.current;
    const teacherId = d?.teacherId ?? hand;
    if (!teacherId) return;
    const base = liftedBase(d);
    const local = { ...ctx, assignments: base };
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
      if (cell && cell.dataset.group === r.groupId) r.row = Number(cell.dataset.row);
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

  /* ----------------------------------------------------------------- data */

  const weekIssues = analysis.issues.filter((i) => i.weekStart === week.start && i.shift === shift);
  const total = groups.length * days.length;
  const filled = groups.reduce((n, g) => n + days.filter((d) => assignments.some((a) => a.groupId === g.id && a.onDate === d)).length, 0);
  const subs = assignments.filter((a) => a.isSubstitute && groups.some((g) => g.id === a.groupId) && week.days.includes(a.onDate)).length;
  const hard = weekIssues.filter((i) => i.severity === 'hard').length;
  const warn = weekIssues.filter((i) => i.severity === 'warn').length;
  const done = total > 0 && filled === total && hard === 0;

  const tray = useMemo(() => {
    const rows = ctx.teachers.filter((t) => t.isActive).map((t) => ({ t, ...remainingDays(ctx, t, week.start), own: t.shifts.includes(shift) }));
    const byRest = (a: { rest: number; t: Teacher }, b: { rest: number; t: Teacher }) => b.rest - a.rest || a.t.shortName.localeCompare(b.t.shortName, 'de');
    return {
      avail: rows.filter((x) => x.own && x.rest > 0 && !x.awayAll).sort(byRest),
      other: rows.filter((x) => !x.own && x.rest > 0 && !x.awayAll).sort(byRest),
      away: rows.filter((x) => x.own && x.awayAll),
      full: rows.filter((x) => x.own && x.rest <= 0 && !x.awayAll),
    };
  }, [ctx, shift, week.start]);

  const handInfo = useMemo(() => {
    if (!hand) return null;
    const t = teacher(hand);
    if (!t) return null;
    const rest = remainingDays(ctx, t, week.start).rest;
    const fits = groups.filter((g) => days.some((d) => !assignments.some((a) => a.groupId === g.id && a.onDate === d) && fit(ctx, hand, g, d).ok));
    const good = [...new Set(fits.filter((g) => t.levels.includes(g.level)).map((g) => `${g.level}.${g.phase}`))];
    const maybe = [...new Set(fits.filter((g) => !t.levels.includes(g.level)).map((g) => `${g.level}.${g.phase}`))];
    return { t, rest, good, maybe };
  }, [assignments, ctx, days, groups, hand, teacher, week.start]);

  /* -------------------------------------------------------------- render */

  if (!week) return null;

  const runsOf = (g: CourseGroup) => {
    const runs: { dates: string[]; a: Assignment }[] = [];
    let i = 0;
    while (i < days.length) {
      const a = assignments.find((x) => x.groupId === g.id && x.onDate === days[i]);
      if (!a) { i++; continue; }
      let j = i;
      while (j + 1 < days.length) {
        const n = assignments.find((x) => x.groupId === g.id && x.onDate === days[j + 1]);
        if (n && n.teacherId === a.teacherId && n.isSubstitute === a.isSubstitute && n.isTentative === a.isTentative) j++; else break;
      }
      runs.push({ dates: days.slice(i, j + 1), a });
      i = j + 1;
    }
    return runs;
  };

  const socketMenu = (m: Extract<Menu, { kind: 'socket' }>) => {
    const g = groups.find((x) => x.id === m.groupId)!;
    const rows = ctx.teachers.filter((t) => t.isActive).map((t) => ({ t, f: fit(ctx, t.id, g, m.date), r: remainingDays(ctx, t, week.start), pair: g.teacherFirst === t.id || g.teacherSecond === t.id }));
    const q = query.trim().toLowerCase();
    const match = (t: Teacher) => !q || t.shortName.toLowerCase().includes(q) || t.fullName.toLowerCase().includes(q);
    const ok = rows.filter((x) => x.f.ok && !x.f.substitute && match(x.t)).sort((a, b) => Number(b.pair) - Number(a.pair) || Number(a.f.ok && !a.f.levelMatch) - Number(b.f.ok && !b.f.levelMatch) || b.r.rest - a.r.rest || a.t.shortName.localeCompare(b.t.shortName, 'de'));
    const sub = rows.filter((x) => x.f.ok && x.f.substitute && match(x.t)).sort((a, b) => b.r.rest - a.r.rest);
    const no = rows.filter((x) => !x.f.ok && match(x.t));
    const item = (x: (typeof rows)[number], cls?: string) => (
      <button key={x.t.id} type="button" className={`${styles.mi} ${cls ?? ''}`} onClick={() => doPlace(x.t.id, g, m.date)}>
        <span className="nm">{x.t.shortName}</span>
        {x.pair ? <span className={styles.tagp}>{plan.groups.find((gg) => gg.id === g.id)?.phase === '1' ? 'Vorschlag' : 'Stamm'}</span> : x.f.ok && !x.f.levelMatch ? <span className={styles.tagp}>{g.level}?</span> : null}
        <span className="r">{x.r.rest} Tag{x.r.rest === 1 ? '' : 'e'} frei</span>
      </button>
    );
    return (
      <div className={styles.menu} style={{ left: Math.min(m.x, window.innerWidth - 332), top: Math.min(m.y, window.innerHeight - 420) }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mh}><b>{groupLabel(g, groupsOfLevel(g))}</b><div className="s">{DAY_LABEL[shortDay(m.date)]} · KW {week.kw} · legt ab hier so viele Tage wie frei</div></div>
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
    const range = `${shortDay(m.dates[0])}${m.dates.length > 1 ? `–${shortDay(m.dates[m.dates.length - 1])}` : ''}`;
    const free = days.filter((d) => !assignments.some((x) => x.groupId === g.id && x.onDate === d) && fit(ctx, a.teacherId, g, d).ok);
    const pair = g.teacherFirst === a.teacherId || g.teacherSecond === a.teacherId;
    const state = [pair ? (g.phase === '1' ? 'vorgeschlagene Lehrkraft' : 'Stammlehrkraft dieser Gruppe') : '', a.isSubstitute ? 'als Vertretung markiert (gelb)' : 'regulär geplant', a.isTentative ? 'noch unbestätigt (?)' : ''].filter(Boolean).join(' · ');
    const row = (title: string, desc: string, onClick: () => void, cls?: string) => (
      <button key={title} type="button" className={`${styles.mr} ${cls ?? ''}`} onClick={onClick}><b>{title}</b><span>{desc}</span></button>
    );
    return (
      <div className={styles.menu} style={{ left: Math.min(m.x, window.innerWidth - 332), top: Math.min(m.y, window.innerHeight - 380) }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mh}><b>{t?.fullName}</b><div className="s">{groupLabel(g, groupsOfLevel(g))} · {range} · KW {week.kw}</div></div>
        <div className={styles.state}>{state}</div>
        <div className={styles.rows}>
          {a.isSubstitute
            ? row('Vertretung aufheben', 'Teil wird wieder regulär und bekommt die Niveaufarbe.', () => toggleFlag(g.id, m.dates, 'isSubstitute'), styles.mrOn)
            : row('Als Vertretung markieren', `Teil wird gelb: ${t?.shortName} springt hier nur ein.`, () => toggleFlag(g.id, m.dates, 'isSubstitute'))}
          {a.isTentative
            ? row('Bestätigen', 'Das „?“ verschwindet – die Zusage steht.', () => toggleFlag(g.id, m.dates, 'isTentative'))
            : row('Als unbestätigt markieren', 'Name mit „?“, bis die Zusage da ist.', () => toggleFlag(g.id, m.dates, 'isTentative'))}
          {free.length ? row(`Auf ${free.map(shortDay).join(', ')} ausdehnen`, `Legt ${t?.shortName} zusätzlich auf die freien Tage dieser Gruppe.`, () => extendRun(g, a)) : null}
          {row('Lehrkraft-Details', 'Schicht, Tage pro Woche, Wochentage, Niveaus, Abwesenheiten.', () => router.push(`/admin/kursplanung/lehrkraefte?month=${month}&teacher=${a.teacherId}`))}
          {row(`Aus KW ${week.kw} entfernen`, `${range} wird wieder frei; ${t?.shortName} bekommt die Tage im Teile-Bereich zurück.`, () => removeRun(g.id, m.dates), styles.mrDel)}
        </div>
        <div className={styles.tip}>Ziehen verschiebt das Teil in eine andere Gruppe · Griff unten ändert die Tage · in eine andere Woche ziehen kopiert.</div>
      </div>
    );
  };

  const trayPiece = (x: { t: Teacher; rest: number; used: number; max: number; awayAll: boolean; ab?: unknown }, off: boolean) => {
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

  return (
    <div className={`${styles.root} ${hand ? styles.hand : ''}`} onClick={() => { if (menu) setMenu(null); else if (hand) setHand(null); }}>
      <div className={styles.bar}>
        <div className={styles.seg}>{SHIFTS.map((s) => <button key={s} type="button" aria-pressed={s === shift} onClick={(e) => { e.stopPropagation(); setShift(s); setHand(null); }}>{SHIFT_INFO[s].label}</button>)}</div>
        <div className={styles.seg}>
          {plan.weeks.map((w) => {
            const wi = analysis.issues.filter((i) => i.weekStart === w.start && i.shift === shift);
            const cls = wi.some((i) => i.severity === 'hard') ? styles.dotBad : wi.some((i) => i.severity === 'open') ? styles.dotOpen : '';
            return <button key={w.start} type="button" aria-pressed={w.start === week.start} onClick={(e) => { e.stopPropagation(); setWeekStart(w.start); setHand(null); }}><span className={`${styles.dot} ${cls}`} />KW {w.kw}</button>;
          })}
        </div>
        <div className={styles.prog}><span className={styles.progTxt}>{filled} <small>/ {total} Tage</small></span><div className={styles.track}><i className={done ? 'done' : ''} style={{ width: `${total ? Math.round((filled / total) * 100) : 0}%` }} /></div></div>
        <div className={styles.pills}>
          {done ? <span className={`${styles.pill} ${styles.pillOk}`}>✓ KW {week.kw} vollständig</span> : null}
          {hard ? <span className={`${styles.pill} ${styles.pillBad}`}>{hard} Konflikt{hard > 1 ? 'e' : ''}</span> : null}
          {subs ? <span className={`${styles.pill} ${styles.pillSub}`}>{subs} Vertretung{subs > 1 ? 'en' : ''}</span> : null}
          {warn ? <span className={styles.pill}>{warn} Hinweis{warn > 1 ? 'e' : ''}</span> : null}
        </div>
        {canWrite ? <><button type="button" className={styles.ghost} disabled={!undo.length} onClick={(e) => { e.stopPropagation(); doUndo(); }}>↶ Rückgängig</button><button type="button" className={styles.ghost} onClick={(e) => { e.stopPropagation(); copyWeek(); }}>Woche übernehmen →</button></> : null}
        <span className={`${styles.status} ${status.bad ? styles.statusBad : ''}`}>{status.text}</span>
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

          <div className={styles.board}>
            {groups.map((g) => {
              const of = groupsOfLevel(g);
              const mark = marks.get(g.id);
              const pair = [g.teacherFirst, g.teacherSecond].map((id) => (id ? teacher(id)?.shortName : null)).filter(Boolean).join(' / ');
              const runs = runsOf(g);
              return (
                <section key={g.id} className={`${styles.col} ${mark === 'can' ? styles.colCan : mark === 'maybe' ? styles.colMaybe : mark === 'no' ? styles.colNo : ''}`} style={lvStyle(g.level)}>
                  <header className={styles.colHead}>
                    <span className={styles.lv}>{g.level}.{g.phase}</span>
                    <span className={styles.grp} title={`${g.phase === '1' ? 'Vorschlag' : 'Stamm'}: ${pair || '–'}`}>{of > 1 ? `Gruppe ${g.groupIndex} · ` : ''}{g.registrations} TN</span>
                  </header>
                  <div className={styles.sockets} style={{ '--rows': days.length } as React.CSSProperties}>
                    {days.map((d, i) => {
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
                          aria-label={`${groupLabel(g, of)} ${DAY_LABEL[shortDay(d)]} KW ${week.kw} offen`}
                          onClick={(e) => { e.stopPropagation(); if (!canWrite) return; if (hand) doPlace(hand, g, d); else { setQuery(''); setMenu({ kind: 'socket', groupId: g.id, date: d, x: e.clientX, y: e.clientY }); } }}
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
                    {runs.map(({ dates, a }) => {
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
                          style={{ gridRow: `${days.indexOf(dates[0]) + 1} / span ${dates.length}` }}
                          data-row={days.indexOf(dates[0]) + 1}
                          data-group={g.id}
                          title={`${t?.fullName ?? ''}${issues.length ? `\n${issues.map((i) => `• ${i.text}`).join('\n')}` : ''}`}
                          onClick={(e) => { e.stopPropagation(); if ((e.target as HTMLElement).closest(`.${styles.handle}`)) return; setMenu({ kind: 'piece', groupId: g.id, dates, x: e.clientX, y: e.clientY }); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ kind: 'piece', groupId: g.id, dates, x: r.left, y: r.bottom }); } }}
                          onDragStart={(e) => { dragRef.current = { teacherId: a.teacherId, from: 'board', groupId: g.id, dates, weekStart: week.start }; e.dataTransfer.effectAllowed = 'move'; markFor(a.teacherId, without(assignments, g.id, dates)); (e.currentTarget as HTMLElement).classList.add(styles.pieceDrag); }}
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
