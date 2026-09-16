import type { PlanContext } from '../fit';
import type { Absence, Assignment, CourseGroup, Teacher } from '../types';
import { planningWeeks } from '../weeks';

export const teacher = (over: Partial<Teacher> & Pick<Teacher, 'id'>): Teacher => ({
  shortName: over.id,
  fullName: over.id,
  contract: 'employed',
  shifts: ['morning'],
  daysPerWeek: 5,
  weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr'],
  levels: ['A1', 'A2'],
  note: null,
  filemakerStaffId: null,
  isActive: true,
  ...over,
});

export const group = (over: Partial<CourseGroup> & Pick<CourseGroup, 'id'>): CourseGroup => ({
  month: '2026-10-01',
  shift: 'morning',
  level: 'A1',
  phase: '2',
  groupIndex: 1,
  registrations: 12,
  teacherFirst: null,
  teacherSecond: null,
  roomId: null,
  filemakerCourseId: null,
  ...over,
});

export const assignment = (groupId: string, onDate: string, teacherId: string, over: Partial<Assignment> = {}): Assignment => ({
  groupId,
  onDate,
  teacherId,
  isSubstitute: false,
  isTentative: false,
  ...over,
});

export const context = (over: Partial<PlanContext>): PlanContext => ({
  teachers: [],
  groups: [],
  assignments: [],
  absences: [] as Absence[],
  weeks: planningWeeks('2026-10'),
  ...over,
});

/** KW 40 of October 2026. */
export const KW40 = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
