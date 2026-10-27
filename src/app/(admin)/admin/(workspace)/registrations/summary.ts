/**
 * An Anmeldung in a few words, and what its lines say together (0096, 2026-10-27).
 *
 * Meike's test — the intensive course from A1 to C1 and telc B2 — read „Intensivkurse, Intensivkurse,
 * …" six times over. A path through the levels of one course is that path: „Intensive German A1 → C1
 * + telc Deutsch B2". And what no single line can show is checked across them: an exam before the
 * course that leads to it ends, a level with no date yet, a gap or an overlap between two levels.
 */

/** „A1 komplett · 8 Wochen" → „A1"; „B1.2" stays; nothing → null. */
export const levelWord = (raw: string | null | undefined): string | null => raw?.trim().split(/\s/)[0] || null;

export type TitleLine = { kind: 'course' | 'exam'; name: string | null; level: string | null };

/** „Intensive German A1 → C1 + telc Deutsch B2"; one course alone is its name. */
export function registrationTitle(lines: readonly TitleLine[]): string {
  const runs: { name: string; levels: string[] }[] = [];
  for (const line of lines.filter((l) => l.kind === 'course')) {
    if (!line.name) continue;
    const level = levelWord(line.level);
    const last = runs.at(-1);
    if (last && last.name === line.name) {
      if (level) last.levels.push(level);
    } else runs.push({ name: line.name, levels: level ? [level] : [] });
  }
  const courses = runs.map((run) => (run.levels.length > 1 ? `${run.name} ${run.levels[0]} → ${run.levels.at(-1)}` : run.name));
  const exams = lines.filter((l) => l.kind === 'exam' && l.name).map((l) => l.name!);
  return [courses.join(', '), ...exams].filter(Boolean).join(' + ');
}

export type CheckLine = {
  id: string;
  kind: 'course' | 'exam';
  /** The level a course leads to, „B2"; an exam's level, read from its name („telc Deutsch B2"). */
  level: string | null;
  start: Date | null;
  end: Date | null;
  /** A course with no start yet („Termin wird noch festgelegt"). */
  toBeArranged: boolean;
  /** Booked or declined lines are past checking. */
  settled: boolean;
};

export type RegistrationCheck =
  | { kind: 'exam_before_course_end'; examId: string; courseId: string; level: string; examDay: Date; courseEnd: Date }
  | { kind: 'no_date'; courseId: string; level: string | null }
  | { kind: 'gap'; fromId: string; toId: string; fromLevel: string | null; toLevel: string | null; days: number }
  | { kind: 'overlap'; fromId: string; toId: string; fromLevel: string | null; toLevel: string | null };

const DAY = 24 * 60 * 60 * 1000;
/** The CEFR band of a level: „B1+", „B1.2" and „B1" are all B1; C1H is C1. */
const band = (level: string | null) => level?.match(/^[ABC][12]/i)?.[0].toUpperCase() ?? null;
/** An exam's level, from its name: „telc Deutsch B2" → „B2". */
export const examLevel = (name: string | null) => name?.match(/\b([ABC][12])\b/)?.[1] ?? null;

/** What the lines say together. Weekends between two levels are no gap; more than three days are. */
export function registrationChecks(lines: readonly CheckLine[]): RegistrationCheck[] {
  const checks: RegistrationCheck[] = [];
  const courses = lines.filter((l) => l.kind === 'course' && !l.settled);
  const dated = courses.filter((l) => l.start && l.end).sort((a, b) => a.start!.getTime() - b.start!.getTime());

  for (const exam of lines.filter((l) => l.kind === 'exam' && !l.settled && l.start)) {
    const level = band(exam.level);
    if (!level) continue;
    const course = dated.find((c) => band(c.level) === level && c.end!.getTime() > exam.start!.getTime() && c.start!.getTime() < exam.start!.getTime() + 60 * DAY);
    if (course) checks.push({ kind: 'exam_before_course_end', examId: exam.id, courseId: course.id, level, examDay: exam.start!, courseEnd: course.end! });
  }
  for (const course of courses.filter((c) => c.toBeArranged)) checks.push({ kind: 'no_date', courseId: course.id, level: course.level });
  for (let i = 1; i < dated.length; i += 1) {
    const before = dated[i - 1];
    const after = dated[i];
    const days = Math.round((after.start!.getTime() - before.end!.getTime()) / DAY);
    if (days <= 0) checks.push({ kind: 'overlap', fromId: before.id, toId: after.id, fromLevel: before.level, toLevel: after.level });
    else if (days > 3) checks.push({ kind: 'gap', fromId: before.id, toId: after.id, fromLevel: before.level, toLevel: after.level, days: days - 1 });
  }
  return checks;
}
