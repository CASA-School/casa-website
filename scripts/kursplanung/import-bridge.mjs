/**
 * Loads the course-planning tables from the files the analytics bridge
 * publishes (casa-google-business-audit/dashboard/public/course-planner/):
 *
 *   DATABASE_URL=... node scripts/kursplanung/import-bridge.mjs \
 *     --teachers=/path/active_teachers.json \
 *     --schedule=/path/2026_08_schedule.json \
 *     [--month=2026-10]
 *
 * NOT a seed and not run by `npm run db:reset`: it writes real people into
 * `teachers`, so it runs by hand against a chosen database. Idempotent on the
 * FileMaker ids — re-running updates names and counts and never duplicates.
 *
 * WHAT IT DOES NOT TAKE FROM FILEMAKER: shifts, days per week, weekdays and
 * levels. The export's `sessions`/`levels` fields contradict the planners'
 * sheet and are unconfirmed (docs/FILEMAKER_BRIDGE.md); those rules are
 * maintained in the workspace. On insert a teacher gets the defaults; on
 * update the rules are left as the planners set them.
 */
import fs from 'node:fs/promises';

import { connect } from '../db/client.mjs';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const teachersPath = arg('teachers');
const schedulePath = arg('schedule');
if (!teachersPath && !schedulePath) {
  console.error('Pass --teachers=<active_teachers.json> and/or --schedule=<schedule.json>.');
  process.exit(1);
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const REASONS = new Set(['Urlaub', 'Krank', 'Fortbildung', 'Freistellung', 'Elternzeit', 'Sonstiges']);

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (isoDate, n) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return iso(new Date(Date.UTC(y, m - 1, d + n)));
};

/** The Monday a planning month starts on — the same rule as src/lib/admin/kursplanung/weeks.ts. */
function monthStart(month) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const dow = first.getUTCDay();
  const shift = dow === 0 ? 1 : dow === 6 ? 2 : -(dow - 1);
  return iso(new Date(first.getTime() + shift * 86_400_000));
}
const nextMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

/** `01.06.-05.06.` plus the month it belongs to → the Monday as `yyyy-mm-dd`. */
function weekMonday(label, monthId) {
  const m = /^(\d{2})\.(\d{2})\./.exec(label);
  if (!m) return null;
  let year = Number(monthId.slice(0, 4));
  const monthNo = Number(m[2]);
  const planMonth = Number(monthId.slice(5, 7));
  if (planMonth === 1 && monthNo === 12) year -= 1;
  if (planMonth === 12 && monthNo === 1) year += 1;
  return `${year}-${m[2]}-${m[1]}`;
}

const client = await connect();
const counts = { teachers: 0, groups: 0, assignments: 0, absences: 0, skipped: 0 };

try {
  await client.query('BEGIN');
  const byStaffId = new Map();

  const existing = await client.query('SELECT id, filemaker_staff_id FROM teachers WHERE filemaker_staff_id IS NOT NULL');
  for (const r of existing.rows) byStaffId.set(r.filemaker_staff_id, r.id);

  if (teachersPath) {
    const data = await readJson(teachersPath);
    for (const t of data.teachers ?? []) {
      if (!t.staffId || !t.name) continue;
      const short = (t.nickname || t.name.split(' ')[0]).replace(/\.$/, '').trim();
      const contract = /honorar/i.test(t.employment ?? '') ? 'freelance' : 'employed';
      const row = await client.query(
        `INSERT INTO teachers (short_name, full_name, contract, filemaker_staff_id, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (filemaker_staff_id) DO UPDATE
           SET full_name = EXCLUDED.full_name, contract = EXCLUDED.contract,
               is_active = EXCLUDED.is_active, updated_at = timezone('utc', now())
         RETURNING id`,
        [short, t.name, contract, String(t.staffId), t.activeStaff !== false]
      );
      byStaffId.set(String(t.staffId), row.rows[0].id);
      counts.teachers++;
    }
  }

  if (schedulePath) {
    const data = await readJson(schedulePath);
    const month = arg('month') ?? data.month?.id;
    if (!month) throw new Error('No --month and the schedule carries no month id.');
    const from = monthStart(month);
    const to = monthStart(nextMonth(month));
    const indexByLevel = new Map();

    for (const c of data.courses ?? []) {
      if (!c.startDate || !c.endDate || c.startDate >= to || c.endDate < from) continue;
      if (!['morning', 'afternoon'].includes(c.session)) continue;
      const level = c.level === 'CH' ? 'C1H' : c.level;
      if (!['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H'].includes(level)) { counts.skipped++; continue; }
      const phase = c.startDate.slice(0, 7) === month ? '1' : '2';
      const key = `${c.session}|${level}|${phase}`;
      const index = (indexByLevel.get(key) ?? 0) + 1;
      indexByLevel.set(key, index);
      const [first, second] = (c.courseTeacherIds ?? []).map((id) => byStaffId.get(String(id)) ?? null);

      const g = await client.query(
        `INSERT INTO course_groups (month, shift, level, phase, group_index, registrations, teacher_first, teacher_second, filemaker_course_id)
         VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (filemaker_course_id) DO UPDATE
           SET registrations = EXCLUDED.registrations, updated_at = timezone('utc', now())
         RETURNING id`,
        [`${month}-01`, c.session, level, phase, index, c.bookingCount ?? 0, first ?? null, second ?? null, String(c.fileMakerCourseId ?? c.courseId)]
      );
      counts.groups++;
      const groupId = g.rows[0].id;

      for (const w of c.weeks ?? []) {
        const monday = weekMonday(w.weekLabel ?? '', data.month?.id ?? month);
        if (!monday) continue;
        for (const ta of w.teacherAssignments ?? []) {
          const teacherId = byStaffId.get(String(ta.staffId ?? ''));
          if (!teacherId) continue;
          for (const day of ta.days ?? []) {
            const i = WEEKDAYS.indexOf(day);
            if (i < 0) continue;
            const date = addDays(monday, i);
            if (date < from || date >= to) continue;
            await client.query(
              `INSERT INTO plan_assignments (group_id, on_date, teacher_id)
               VALUES ($1, $2::date, $3)
               ON CONFLICT (group_id, on_date) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, updated_at = timezone('utc', now())`,
              [groupId, date, teacherId]
            );
            counts.assignments++;
          }
        }
      }
    }

    // Absences arrive keyed by teacher or as a list; each entry names a week
    // and its days. Best effort — the shape is the bridge's, not ours.
    const raw = data.teacherAbsences ?? {};
    const entries = Array.isArray(raw) ? raw : Object.entries(raw).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => ({ staffId: k, ...x })) : []));
    for (const a of entries) {
      const teacherId = byStaffId.get(String(a.staffId ?? a.teacherId ?? '').replace(/^teacher:fm:/, ''));
      const monday = a.weekLabel ? weekMonday(a.weekLabel, month) : a.weekStart ?? null;
      if (!teacherId || !monday) { counts.skipped++; continue; }
      const reason = REASONS.has(a.reason) ? a.reason : 'Sonstiges';
      for (const day of a.days ?? []) {
        const i = WEEKDAYS.indexOf(day);
        if (i < 0) continue;
        const date = addDays(monday, i);
        if (date < from || date >= to) continue;
        await client.query(
          `INSERT INTO teacher_absences (teacher_id, on_date, reason, filemaker_ref)
           VALUES ($1, $2::date, $3, $4)
           ON CONFLICT (teacher_id, on_date) DO NOTHING`,
          [teacherId, date, reason, a.id ?? null]
        );
        counts.absences++;
      }
    }
  }

  await client.query('COMMIT');
  console.log('Imported:', counts);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
