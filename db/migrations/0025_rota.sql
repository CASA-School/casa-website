-- 0025 — the rota: who is in the office when, and who is away.
--
-- FileMaker's home calendar (`SingleDayCalendar_Overview`) carries, per day,
-- "Shift | Reception" — each colleague's hours at the desk with a note
-- ("14–16:30 Seminar", "telc mündlich Prüfung") — and the administration's
-- absences with a code (TU, kr, AÜ, uU). The workspace kept neither, so Today
-- could not say who is at reception or who is away. Teachers' absences are
-- Kursplanung's (`teacher_absences`, 0014); these are the office team's.
--
-- A shift belongs to a workspace account: the office team signs in, and an
-- account is who a task, an enquiry or an offer is assigned to — which is
-- what lets Today mark the work of someone who is away.
--
-- An absence is a span (from–to), as the team records it ("12.10.–16.10.
-- Urlaub"), not a row per day. Its reason is personal data — `sick` above all
-- — so the screens show it only to a colleague who holds the rota at `edit`;
-- everyone else sees "Away" (docs/ADMIN_WORKSPACE.md §Rota).

CREATE TABLE IF NOT EXISTS staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL REFERENCES staff_users (id) ON DELETE CASCADE,
  on_date date NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  -- What the day holds besides the desk: "14–16:30 Seminar".
  note text CONSTRAINT staff_shifts_note_check CHECK (note IS NULL OR char_length(note) <= 200),
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT staff_shifts_order_check CHECK (starts_at < ends_at),
  -- One shift a person a day: a split day is one shift with a note.
  UNIQUE (staff_user_id, on_date)
);

CREATE INDEX IF NOT EXISTS staff_shifts_date_idx ON staff_shifts (on_date);

CREATE TABLE IF NOT EXISTS staff_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL REFERENCES staff_users (id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  -- FileMaker's codes: TU leave, kr sick, AÜ time off in lieu, uU unpaid.
  reason text NOT NULL DEFAULT 'leave'
    CONSTRAINT staff_absences_reason_check CHECK (
      reason IN ('leave', 'sick', 'time_off', 'training', 'unpaid', 'other')
    ),
  note text CONSTRAINT staff_absences_note_check CHECK (note IS NULL OR char_length(note) <= 200),
  created_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT staff_absences_order_check CHECK (from_date <= to_date)
);

CREATE INDEX IF NOT EXISTS staff_absences_span_idx ON staff_absences (from_date, to_date);
CREATE INDEX IF NOT EXISTS staff_absences_person_idx ON staff_absences (staff_user_id, from_date);
