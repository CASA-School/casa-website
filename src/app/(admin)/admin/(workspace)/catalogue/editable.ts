import type { EditableCourse } from './course-actions';
import { dayRange } from '@/components/admin/list';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import type { CourseListRow } from '@/lib/admin/course-list';
import type { CourseForEdit } from '@/lib/admin/courses';
import { pick, type T, type WsLang } from '@/lib/admin/i18n';

/** A course as its „Aktionen" menu and editor need it, in the list and on its own page. */
export function toEditable(r: CourseListRow, e: CourseForEdit | undefined, t: T, lang: WsLang): EditableCourse {
  const numbers = r.groupRows.map((g) => g.number).filter(Boolean);
  return {
    id: r.courseId,
    startId: r.courseInstanceId,
    label: r.title ?? r.levelCode ?? r.typeName,
    context: [
      r.title && r.levelCode ? r.levelCode : null,
      `${r.typeName}${r.session ? ` · ${pick(lang, SESSION_LABELS[r.session])}` : ''}`,
      dayRange(r.startDate, r.endDate, lang),
      numbers.length ? `${t('Kurs-Nr.', 'Course no.')} ${numbers.join(' · ')}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    waitingHref: `/admin/catalogue/${r.courseInstanceId}?level=${encodeURIComponent(r.levelCode ?? r.courseId)}`,
    waiting: r.waiting + r.offered,
    named: !r.levelCode,
    title: e?.title ?? r.title,
    roomId: e?.roomId ?? null,
    groups: e?.groups ?? r.groups,
    placesPerGroup: e?.placesPerGroup ?? r.placesPerGroup,
    bookable: e?.bookable ?? r.bookable,
    price: e?.price ?? null,
    lessons: e?.lessons ?? null,
    note: e?.note ?? null,
  };
}
