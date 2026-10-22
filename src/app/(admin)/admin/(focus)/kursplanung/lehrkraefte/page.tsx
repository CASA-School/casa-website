import { redirect } from 'next/navigation';

/**
 * Kursplanung's own teacher list is gone (2026-10-22, Rahman: a teacher's levels and rules are changed on
 * the staff register and their own page, not on the board). An old link lands where they live now.
 */
export default async function LehrkraeftePage({ searchParams }: { searchParams: Promise<{ teacher?: string }> }) {
  const { teacher } = await searchParams;
  redirect(teacher && /^[0-9a-f-]{36}$/i.test(teacher) ? `/admin/staff/${teacher}?tab=teaching` : '/admin/staff?view=teaching');
}
