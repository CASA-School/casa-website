/**
 * The SchoolMan bridge's steps, in the order they must run (2026-10-19; docs/FILEMAKER_BRIDGE.md §8).
 * Each is a reader on the office Mac (`read_<name>.py`, read-only through FileMaker Pro) and its
 * importer (`import-<name>.mjs`). Later steps rely on earlier ones: the lesson days on the staff and
 * the courses, the learners on the courses and their counts, the money on the learners, the
 * organisations and the accommodation, the attendance on the learners and the lesson days.
 */
export const BRIDGE_STEPS = [
  { name: 'staff', reader: 'read_staff.py', importer: 'import-staff.mjs' },
  { name: 'courses', reader: 'read_courses.py', importer: 'import-courses.mjs' },
  { name: 'course-learners', reader: 'read_course_learners.py', importer: 'import-course-learners.mjs' },
  { name: 'lesson-days', reader: 'read_lesson_days.py', importer: 'import-lesson-days.mjs' },
  { name: 'absences', reader: 'read_absences.py', importer: 'import-absences.mjs' },
  { name: 'time', reader: 'read_time.py', importer: 'import-time.mjs' },
  { name: 'learners', reader: 'read_learners.py', importer: 'import-learners.mjs' },
  { name: 'exams', reader: 'read_exams.py', importer: 'import-exams.mjs' },
  { name: 'organisations', reader: 'read_organisations.py', importer: 'import-organisations.mjs' },
  { name: 'groups', reader: 'read_groups.py', importer: 'import-groups.mjs' },
  { name: 'offers', reader: 'read_offers.py', importer: 'import-offers.mjs' },
  { name: 'accommodation', reader: 'read_accommodation.py', importer: 'import-accommodation.mjs' },
  { name: 'follow-ups', reader: 'read_follow_ups.py', importer: 'import-follow-ups.mjs' },
  { name: 'money', reader: 'read_money.py', importer: 'import-money.mjs' },
  { name: 'attendance', reader: 'read_attendance.py', importer: 'import-attendance.mjs' },
  { name: 'intake', reader: 'read_intake.py', importer: 'import-intake.mjs' },
  { name: 'letters-extra', reader: 'read_letters_extra.py', importer: 'import-letters-extra.mjs' },
  { name: 'rest', reader: 'read_rest.py', importer: 'import-rest.mjs' },
  { name: 'day', reader: 'read_day.py', importer: 'import-day.mjs' },
];
