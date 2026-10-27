import { redirect } from 'next/navigation';

/** The course registrations' old list (before 0096): every registration is one Anmeldung now, in one list. */
export default async function CourseRegistrationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === 'string') params.set(key, value);
  const query = params.toString();
  redirect(`/admin/registrations${query ? `?${query}` : ''}`);
}
