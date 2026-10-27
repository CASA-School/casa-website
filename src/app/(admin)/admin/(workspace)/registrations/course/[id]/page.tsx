import { notFound, redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { isUuid } from '@/lib/admin/ids';
import { registrationOfLine } from '@/lib/admin/registrations';

/**
 * A course line's old address (before 0096): a booking, a letter, a flag or a search still links here.
 * Each line is part of an Anmeldung now, shown on its page at the line.
 */
export default async function CourseRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireModule('registrations')]);
  const registration = isUuid(id) ? await registrationOfLine('course', id) : null;
  if (!registration) notFound();
  redirect(`/admin/registrations/${registration}#line-${id}`);
}
