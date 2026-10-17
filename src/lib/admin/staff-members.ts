import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import { normalizeEmail, normalizePhone } from './normalize';
import type { Bilingual } from './i18n';
import { ABSENCE_REASONS, LEVELS, SHIFTS, WEEKDAYS, type AbsenceReason, type Level, type Shift, type Weekday } from './kursplanung/types';
import type { ContractKind, StaffView } from './staff-labels';

/**
 * The staff register (2026-10-17, migration 0039; docs/ADMIN_WORKSPACE.md §Staff): everyone who works
 * at CASA. A colleague is one person (`people`: name, contact, address, HR numbers, bank) with one
 * staff row (`staff_members`: the name on the board, the teaching rules Kursplanung reads, the
 * workspace account, active or left), roles as rows, contracts as dated periods. Who teaches which
 * group on which day is Kursplanung's; this module reads it and never writes it.
 *
 * Rights: the register is `staff` (management); contracts, HR numbers and bank details `staff_private`.
 */

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export type StaffRole = { code: string; name: Bilingual };

export async function staffRoles(): Promise<StaffRole[]> {
  const rows = await query<{ code: string; name_de: string; name_en: string }>(`SELECT code, name_de, name_en FROM staff_roles ORDER BY position`);
  return rows.map((r) => ({ code: r.code, name: { de: r.name_de, en: r.name_en } }));
}

export type StaffListItem = {
  id: string;
  personId: string;
  name: string;
  shortName: string;
  roles: string[];
  /** The contract that runs today, if any. */
  contractKind: ContractKind | null;
  isActive: boolean;
  email: string | null;
  hasAccount: boolean;
};

type ListRow = {
  id: string;
  person_id: string;
  name: string;
  short_name: string;
  roles: string[] | null;
  contract_kind: ContractKind | null;
  is_active: boolean;
  email: string | null;
  has_account: boolean;
};

/** The contract that runs on a day: begun (or begun at an unknown date) and not ended. The latest wins. */
const CURRENT_CONTRACT = (alias: string, day = 'current_date') => `(
  SELECT c.kind FROM staff_contracts c
   WHERE c.staff_member_id = ${alias}.id AND (c.valid_from IS NULL OR c.valid_from <= ${day}) AND (c.valid_to IS NULL OR c.valid_to >= ${day})
   ORDER BY c.valid_from DESC NULLS LAST LIMIT 1)`;

const LIST = `
  SELECT s.id, s.person_id, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS name, s.short_name,
         (SELECT array_agg(r.role_code ORDER BY sr.position) FROM staff_member_roles r JOIN staff_roles sr ON sr.code = r.role_code
           WHERE r.staff_member_id = s.id) AS roles,
         ${CURRENT_CONTRACT('s')} AS contract_kind,
         s.is_active,
         (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
         s.staff_user_id IS NOT NULL AS has_account
    FROM staff_members s
    JOIN people p ON p.id = s.person_id`;

const toItem = (r: ListRow): StaffListItem => ({
  id: r.id,
  personId: r.person_id,
  name: r.name,
  shortName: r.short_name,
  roles: r.roles ?? [],
  contractKind: r.contract_kind,
  isActive: r.is_active,
  email: r.email,
  hasAccount: r.has_account,
});

const TEACHES = `EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = s.id AND r.role_code = 'teaching')`;
const VIEWS: Record<StaffView, string> = {
  active: 's.is_active',
  teaching: `s.is_active AND ${TEACHES}`,
  office: `s.is_active AND NOT ${TEACHES}`,
  former: 'NOT s.is_active',
};

export async function listStaffMembers(view: StaffView, search?: string): Promise<StaffListItem[]> {
  const params: unknown[] = [];
  let where = `WHERE ${VIEWS[view]}`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR s.short_name ILIKE $1)`;
  }
  const rows = await query<ListRow>(`${LIST} ${where} ORDER BY p.last_name NULLS LAST, p.first_name`, params);
  return rows.map(toItem);
}

export async function staffCounts(): Promise<Record<StaffView, number>> {
  const row = await queryFirst<Record<StaffView, string>>(
    `SELECT count(*) FILTER (WHERE ${VIEWS.active}) AS active, count(*) FILTER (WHERE ${VIEWS.teaching}) AS teaching,
            count(*) FILTER (WHERE ${VIEWS.office}) AS office, count(*) FILTER (WHERE ${VIEWS.former}) AS former
       FROM staff_members s`
  );
  return { active: Number(row?.active ?? 0), teaching: Number(row?.teaching ?? 0), office: Number(row?.office ?? 0), former: Number(row?.former ?? 0) };
}

// --------------------------------------------------------------- one colleague

export type StaffContract = {
  id: string;
  kind: ContractKind;
  validFrom: string | null;
  validTo: string | null;
  weeklyHours: number | null;
  weeklyUnits: number | null;
  note: string | null;
  /** Running today. */
  current: boolean;
};

export type StaffDetail = StaffListItem & {
  filemakerStaffId: string | null;
  createdAt: Date;
  teaching: { shifts: Shift[]; daysPerWeek: number; weekdays: Weekday[]; levels: Level[]; note: string | null };
  account: { id: string; name: string; email: string; role: string; lastSeenAt: Date | null } | null;
};

export async function getStaffMember(id: string): Promise<StaffDetail | null> {
  const row = await queryFirst<
    ListRow & {
      filemaker_staff_id: string | null;
      created_at: Date;
      shifts: string[];
      days_per_week: number;
      weekdays: string[];
      levels: string[];
      note: string | null;
      account_id: string | null;
      account_name: string | null;
      account_email: string | null;
      account_role: string | null;
      account_seen: Date | null;
    }
  >(
    `${LIST.replace(
      'FROM staff_members s',
      `, s.filemaker_staff_id, s.created_at, s.shifts, s.days_per_week, s.weekdays, s.levels, s.note,
         u.id AS account_id, u.name AS account_name, u.email AS account_email, u.role::text AS account_role, u.last_seen_at AS account_seen
    FROM staff_members s
    LEFT JOIN staff_users u ON u.id = s.staff_user_id`
    )} WHERE s.id = $1`,
    [id]
  );
  if (!row) return null;
  return {
    ...toItem(row),
    filemakerStaffId: row.filemaker_staff_id,
    createdAt: row.created_at,
    teaching: {
      shifts: SHIFTS.filter((x) => row.shifts.includes(x)),
      daysPerWeek: row.days_per_week,
      weekdays: WEEKDAYS.filter((x) => row.weekdays.includes(x)),
      levels: LEVELS.filter((x) => row.levels.includes(x)),
      note: row.note,
    },
    account: row.account_id
      ? { id: row.account_id, name: row.account_name ?? '', email: row.account_email ?? '', role: row.account_role ?? '', lastSeenAt: row.account_seen }
      : null,
  };
}

/** The staff row a person belongs to, if they work at CASA: their page is the staff page. */
export async function staffIdForPerson(personId: string): Promise<string | null> {
  const row = await queryFirst<{ id: string }>(`SELECT id FROM staff_members WHERE person_id = canonical_person_id($1)`, [personId]);
  return row?.id ?? null;
}

export async function staffContracts(id: string): Promise<StaffContract[]> {
  const rows = await query<{
    id: string;
    kind: ContractKind;
    valid_from: string | null;
    valid_to: string | null;
    weekly_hours: string | null;
    weekly_units: string | null;
    note: string | null;
    current: boolean;
  }>(
    `SELECT id, kind, to_char(valid_from, 'YYYY-MM-DD') AS valid_from, to_char(valid_to, 'YYYY-MM-DD') AS valid_to,
            weekly_hours, weekly_units, note,
            (valid_from IS NULL OR valid_from <= current_date) AND (valid_to IS NULL OR valid_to >= current_date) AS current
       FROM staff_contracts WHERE staff_member_id = $1
      ORDER BY valid_from DESC NULLS LAST, created_at DESC`,
    [id]
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    weeklyHours: r.weekly_hours === null ? null : Number(r.weekly_hours),
    weeklyUnits: r.weekly_units === null ? null : Number(r.weekly_units),
    note: r.note,
    current: r.current,
  }));
}

export type StaffHrNumbers = { taxId: string | null; pensionNumber: string | null; healthNumber: string | null };

export async function staffHrNumbers(personId: string): Promise<StaffHrNumbers> {
  const row = await queryFirst<{ tax_id: string | null; pension_insurance_number: string | null; health_insurance_number: string | null }>(
    `SELECT tax_id, pension_insurance_number, health_insurance_number FROM person_private WHERE person_id = $1`,
    [personId]
  );
  return { taxId: row?.tax_id ?? null, pensionNumber: row?.pension_insurance_number ?? null, healthNumber: row?.health_insurance_number ?? null };
}

/**
 * The lesson days they teach (0045), from today for four weeks: the day, the course — a board group's
 * level and half, or another course's name — the time of day, a substitution, a tentative day.
 */
export type TeachingDay = {
  date: string;
  shift: Shift | 'evening' | null;
  /** „B1.1", „B1.2 · Gruppe 2", or a module's name. */
  label: string;
  courseId: string | null;
  groupIndex: number;
  substitute: boolean;
  tentative: boolean;
};

export async function upcomingTeaching(id: string, days = 28): Promise<TeachingDay[]> {
  const rows = await query<{
    on_date: string;
    shift: string | null;
    level: string | null;
    phase: '1' | '2' | null;
    course_label: string | null;
    course_id: string | null;
    group_index: number;
    is_substitute: boolean;
    is_tentative: boolean;
  }>(
    `SELECT to_char(d.on_date, 'YYYY-MM-DD') AS on_date, coalesce(g.shift, c.session, i.session) AS shift, g.level, g.phase,
            coalesce(c.title, c.level_code) AS course_label, d.course_id, d.group_index, d.is_substitute, d.is_tentative
       FROM course_days d
       LEFT JOIN course_groups g ON g.id = d.group_id
       LEFT JOIN courses c ON c.id = d.course_id
       LEFT JOIN course_instances i ON i.id = c.course_instance_id
      WHERE d.teacher_id = $1 AND NOT d.cancelled AND d.on_date >= current_date AND d.on_date < current_date + $2::int
      ORDER BY d.on_date, d.starts_at NULLS FIRST, g.shift`,
    [id, days]
  );
  return rows.map((r) => ({
    date: r.on_date,
    shift: r.shift === 'morning' || r.shift === 'afternoon' || r.shift === 'evening' ? r.shift : null,
    label: r.level && r.phase ? `${r.level}.${r.phase}` : (r.course_label ?? '—'),
    courseId: r.course_id,
    groupIndex: r.group_index,
    substitute: r.is_substitute,
    tentative: r.is_tentative,
  }));
}

/** Days away from today on, consecutive days with the same reason as one stretch. */
export type AbsenceStretch = { from: string; to: string; reason: AbsenceReason; days: number; fromFileMaker: boolean };

export async function upcomingAbsences(id: string): Promise<AbsenceStretch[]> {
  const rows = await query<{ on_date: string; reason: AbsenceReason; filemaker_ref: string | null }>(
    `SELECT to_char(on_date, 'YYYY-MM-DD') AS on_date, reason, filemaker_ref FROM staff_absences
      WHERE staff_member_id = $1 AND on_date >= current_date - 7 ORDER BY on_date`,
    [id]
  );
  const out: AbsenceStretch[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    // Monday after Friday still continues a stretch: the weekend is no school day.
    const gap = last ? (new Date(`${r.on_date}T12:00:00Z`).getTime() - new Date(`${last.to}T12:00:00Z`).getTime()) / 86_400_000 : 99;
    if (last && last.reason === r.reason && gap <= 3) {
      last.to = r.on_date;
      last.days += 1;
    } else out.push({ from: r.on_date, to: r.on_date, reason: r.reason, days: 1, fromFileMaker: Boolean(r.filemaker_ref) });
  }
  return out;
}

/** Workspace accounts nobody on the register uses yet: what a colleague's sign-in can be linked to. */
export async function unlinkedAccounts(): Promise<{ id: string; name: string; email: string }[]> {
  return query<{ id: string; name: string; email: string }>(
    `SELECT u.id, u.name, u.email FROM staff_users u
      WHERE u.is_active AND NOT EXISTS (SELECT 1 FROM staff_members s WHERE s.staff_user_id = u.id)
      ORDER BY u.name`
  );
}

// ------------------------------------------------------------------ mutations

export type NewStaffMember = {
  salutation: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  shortName: string;
  roles: string[];
  contract: { kind: ContractKind; validFrom: string | null } | null;
};

/** A new colleague: their person, their staff row, their roles and, when given, their first contract. */
export async function createStaffMember(input: NewStaffMember, actor: StaffUser): Promise<Result> {
  const taken = await queryFirst<{ id: string }>(`SELECT id FROM staff_members WHERE lower(short_name) = lower($1)`, [input.shortName]);
  if (taken) return refuse('Dieses Kürzel gibt es schon.', 'That short name is taken.');
  const id = await withTransaction(async (client) => {
    const person = await client.query<{ id: string }>(
      `INSERT INTO people (salutation, first_name, last_name, created_by) VALUES ($1::salutation, $2, $3, $4) RETURNING id`,
      [input.salutation, input.firstName, input.lastName, `staff:${actor.id}`]
    );
    const personId = person.rows[0].id;
    if (input.email) {
      await client.query(`INSERT INTO emails (person_id, address, normalized, is_primary) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING`, [
        personId,
        input.email,
        normalizeEmail(input.email),
      ]);
    }
    if (input.phone) {
      await client.query(`INSERT INTO phones (person_id, number, normalized, is_primary) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING`, [
        personId,
        input.phone,
        normalizePhone(input.phone),
      ]);
    }
    const staff = await client.query<{ id: string }>(`INSERT INTO staff_members (person_id, short_name, created_by) VALUES ($1, $2, $3) RETURNING id`, [
      personId,
      input.shortName,
      actor.id,
    ]);
    const staffId = staff.rows[0].id;
    for (const role of input.roles) {
      await client.query(`INSERT INTO staff_member_roles (staff_member_id, role_code) SELECT $1, code FROM staff_roles WHERE code = $2`, [staffId, role]);
    }
    if (input.contract) {
      await client.query(`INSERT INTO staff_contracts (staff_member_id, kind, valid_from, created_by) VALUES ($1, $2, $3::date, $4)`, [
        staffId,
        input.contract.kind,
        input.contract.validFrom,
        actor.id,
      ]);
    }
    return staffId;
  });
  await logActivity({ actor, entity: 'staff_member', entityId: id, action: 'staff_created', detail: { roles: input.roles } });
  return { ok: true, id };
}

export async function setStaffRoles(id: string, roles: readonly string[], actor: StaffUser): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM staff_member_roles WHERE staff_member_id = $1`, [id]);
    for (const role of roles) {
      await client.query(`INSERT INTO staff_member_roles (staff_member_id, role_code) SELECT $1, code FROM staff_roles WHERE code = $2`, [id, role]);
    }
  });
  await logActivity({ actor, entity: 'staff_member', entityId: id, action: 'staff_roles_set', detail: { roles } });
}

/** The board's rules: the short name, the shifts, days a week, weekdays and levels Kursplanung fits a piece by. */
export async function setTeachingRules(
  id: string,
  rules: { shortName: string; shifts: Shift[]; daysPerWeek: number; weekdays: Weekday[]; levels: Level[]; note: string | null },
  actor: StaffUser
): Promise<Result> {
  const taken = await queryFirst<{ id: string }>(`SELECT id FROM staff_members WHERE lower(short_name) = lower($1) AND id <> $2`, [rules.shortName, id]);
  if (taken) return refuse('Dieses Kürzel gibt es schon.', 'That short name is taken.');
  await query(
    `UPDATE staff_members SET short_name = $2, shifts = $3, days_per_week = $4, weekdays = $5, levels = $6, note = $7, updated_at = timezone('utc', now())
      WHERE id = $1`,
    [id, rules.shortName, rules.shifts, rules.daysPerWeek, rules.weekdays, rules.levels, rules.note]
  );
  await logActivity({ actor, entity: 'staff_member', entityId: id, action: 'staff_teaching_set' });
  return { ok: true };
}

/** Left CASA, or back: SchoolMan moved the row to `Hades` and back; here it is one flag, nothing moves. */
export async function setStaffActive(id: string, active: boolean, actor: StaffUser): Promise<void> {
  await query(`UPDATE staff_members SET is_active = $2, updated_at = timezone('utc', now()) WHERE id = $1`, [id, active]);
  await logActivity({ actor, entity: 'staff_member', entityId: id, action: active ? 'staff_reactivated' : 'staff_left' });
}

/** The workspace account they sign in with — or none. One account belongs to one colleague. */
export async function linkAccount(id: string, staffUserId: string | null, actor: StaffUser): Promise<Result> {
  if (staffUserId) {
    const used = await queryFirst<{ id: string }>(`SELECT id FROM staff_members WHERE staff_user_id = $1 AND id <> $2`, [staffUserId, id]);
    if (used) return refuse('Dieses Konto gehört schon zu jemand anderem.', 'That account already belongs to someone else.');
  }
  await query(`UPDATE staff_members SET staff_user_id = $2, updated_at = timezone('utc', now()) WHERE id = $1`, [id, staffUserId]);
  await logActivity({ actor, entity: 'staff_member', entityId: id, action: staffUserId ? 'staff_account_linked' : 'staff_account_unlinked' });
  return { ok: true };
}

export type ContractInput = { kind: ContractKind; validFrom: string | null; validTo: string | null; weeklyHours: number | null; weeklyUnits: number | null; note: string | null };

export async function saveContract(staffId: string, contractId: string | null, input: ContractInput, actor: StaffUser): Promise<Result> {
  if (input.validFrom && input.validTo && input.validTo < input.validFrom) return refuse('Das Ende liegt vor dem Beginn.', 'The end is before the start.');
  if (contractId) {
    await query(
      `UPDATE staff_contracts SET kind = $3, valid_from = $4::date, valid_to = $5::date, weekly_hours = $6, weekly_units = $7, note = $8
        WHERE id = $1 AND staff_member_id = $2`,
      [contractId, staffId, input.kind, input.validFrom, input.validTo, input.weeklyHours, input.weeklyUnits, input.note]
    );
  } else {
    await query(
      `INSERT INTO staff_contracts (staff_member_id, kind, valid_from, valid_to, weekly_hours, weekly_units, note, created_by)
       VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8)`,
      [staffId, input.kind, input.validFrom, input.validTo, input.weeklyHours, input.weeklyUnits, input.note, actor.id]
    );
  }
  // The history says that a contract changed, never its hours.
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: contractId ? 'staff_contract_updated' : 'staff_contract_added', detail: { kind: input.kind } });
  return { ok: true };
}

export async function removeContract(staffId: string, contractId: string, actor: StaffUser): Promise<void> {
  await query(`DELETE FROM staff_contracts WHERE id = $1 AND staff_member_id = $2`, [contractId, staffId]);
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: 'staff_contract_removed' });
}

/** The tax, pension and health-insurance numbers; the history says they changed, never what to. */
export async function saveHrNumbers(staffId: string, personId: string, input: StaffHrNumbers, actor: StaffUser): Promise<void> {
  await query(
    `INSERT INTO person_private (person_id, tax_id, pension_insurance_number, health_insurance_number, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, timezone('utc', now()))
     ON CONFLICT (person_id) DO UPDATE
       SET tax_id = EXCLUDED.tax_id, pension_insurance_number = EXCLUDED.pension_insurance_number,
           health_insurance_number = EXCLUDED.health_insurance_number, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`,
    [personId, input.taxId, input.pensionNumber, input.healthNumber, actor.id]
  );
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: 'staff_hr_updated' });
}

/** Days away, Monday to Friday between two dates, with one reason: what Kursplanung's rules read. */
export async function addAbsence(staffId: string, from: string, to: string, reason: AbsenceReason, actor: StaffUser): Promise<Result> {
  if (to < from) return refuse('Das Ende liegt vor dem Beginn.', 'The end is before the start.');
  if (!(ABSENCE_REASONS as readonly string[]).includes(reason)) return refuse('Unbekannter Grund.', 'Unknown reason.');
  const { length } = await query<{ on_date: string }>(
    `INSERT INTO staff_absences (staff_member_id, on_date, reason, created_by)
     SELECT $1, d::date, $4, $5 FROM generate_series($2::date, $3::date, interval '1 day') d
      WHERE extract(isodow FROM d) BETWEEN 1 AND 5 AND d::date - $2::date <= 366
     ON CONFLICT (staff_member_id, on_date) DO UPDATE SET reason = EXCLUDED.reason
     RETURNING to_char(on_date, 'YYYY-MM-DD') AS on_date`,
    [staffId, from, to, reason, actor.id]
  );
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: 'staff_absence_added', detail: { from, to, reason, days: length } });
  return { ok: true };
}

/** A stretch taken back — those that came from FileMaker are the bridge's, and stay. */
export async function removeAbsence(staffId: string, from: string, to: string, actor: StaffUser): Promise<void> {
  await query(`DELETE FROM staff_absences WHERE staff_member_id = $1 AND on_date BETWEEN $2::date AND $3::date AND filemaker_ref IS NULL`, [staffId, from, to]);
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: 'staff_absence_removed', detail: { from, to } });
}

/**
 * Gone, for a colleague entered by mistake: only while Kursplanung, an exam and the history of
 * teaching name them nowhere. Someone who worked here leaves (`setStaffActive`) instead.
 */
export async function deleteStaffMember(id: string, actor: StaffUser): Promise<Result> {
  const used = await queryFirst<{ used: boolean; person_id: string }>(
    `SELECT s.person_id,
            EXISTS (SELECT 1 FROM course_days d WHERE d.teacher_id = s.id OR d.replaced_teacher_id = s.id)
              OR EXISTS (SELECT 1 FROM course_week_plans w WHERE w.teacher_id = s.id)
              OR EXISTS (SELECT 1 FROM course_groups g WHERE g.teacher_first = s.id OR g.teacher_second = s.id)
              OR EXISTS (SELECT 1 FROM exam_session_examiners x WHERE x.staff_member_id = s.id) AS used
       FROM staff_members s WHERE s.id = $1`,
    [id]
  );
  if (!used) return refuse('Diese Person gibt es nicht mehr.', 'That person no longer exists.');
  if (used.used) return refuse('Kursplanung oder eine Prüfung nennt diese Person — sie scheidet aus statt gelöscht zu werden.', 'Kursplanung or an exam names this person — they leave instead of being deleted.');
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM staff_members WHERE id = $1`, [id]);
    // Their person goes with them unless something else still holds it — then the person stays.
    await client.query('SAVEPOINT person');
    try {
      await client.query(`DELETE FROM people WHERE id = $1`, [used.person_id]);
      await client.query('RELEASE SAVEPOINT person');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT person');
    }
  });
  await logActivity({ actor, entity: 'staff_member', entityId: id, action: 'staff_deleted' });
  return { ok: true };
}
