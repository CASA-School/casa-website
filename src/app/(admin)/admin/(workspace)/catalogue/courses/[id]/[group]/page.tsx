import { notFound, redirect } from 'next/navigation';

import { courseHref } from '../../../course-href';
import { CoursePage } from '../../course-page';
import { requireModule } from '@/lib/admin/guard';

/** A course's further course numbers, each its own page (`course-page.tsx`); the first is the course's own address. */
export default async function CourseNumberRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; group: string }>;
  searchParams: Promise<{ tab?: string; error?: string; book?: string }>;
}) {
  const [{ id, group }, { tab, error, book }, user] = await Promise.all([params, searchParams, requireModule('catalogue')]);
  if (!/^[1-9]$/.test(group)) notFound();
  if (group === '1') redirect(`${courseHref(id)}${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`);
  return <CoursePage id={id} group={Number(group)} user={user} tab={tab} error={error} book={book} />;
}
