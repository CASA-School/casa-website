import { redirect } from 'next/navigation';

import { courseHref } from '../../course-href';
import { CoursePage } from '../course-page';
import { requireModule } from '@/lib/admin/guard';

/** A course's page — its first course number (`course-page.tsx`); the others are at `/<n>`. */
export default async function CourseRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; group?: string; error?: string; book?: string }>;
}) {
  const [{ id }, { tab, group, error, book }, user] = await Promise.all([params, searchParams, requireModule('catalogue')]);
  // The address a group had before each course number had its own page.
  const n = Number(group);
  if (Number.isInteger(n) && n > 1 && n < 10) redirect(`${courseHref(id, n)}${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`);
  return <CoursePage id={id} group={1} user={user} tab={tab} error={error} book={book} />;
}
