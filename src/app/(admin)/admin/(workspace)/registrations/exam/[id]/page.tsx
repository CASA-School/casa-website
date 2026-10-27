import { notFound, redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { isUuid } from '@/lib/admin/ids';
import { registrationOfLine } from '@/lib/admin/registrations';

/** An exam line's old address (before 0096): its Anmeldung's page, at the line. */
export default async function ExamRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireModule('registrations')]);
  const registration = isUuid(id) ? await registrationOfLine('exam', id) : null;
  if (!registration) notFound();
  redirect(`/admin/registrations/${registration}#line-${id}`);
}
