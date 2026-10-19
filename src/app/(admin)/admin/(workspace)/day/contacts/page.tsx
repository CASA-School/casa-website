import { notFound } from 'next/navigation';

import { ContactList } from './contact-list';
import { PageHeader } from '@/components/admin/ui';
import { classContacts } from '@/lib/admin/day-plan';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

/** A class's learners with their addresses for its teacher, opened from the class in the Tagesplan (2026-10-19). */
export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const [{ lesson }] = await Promise.all([searchParams, requireModule('day')]);
  if (!lesson || !/^[0-9a-f-]{36}$/i.test(lesson)) notFound();
  const list = await classContacts(lesson);
  if (!list) notFound();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader backHref={`/admin/day/courses?date=${list.date}`} backLabel={t('Kurse des Tages', 'The day’s courses')} title={t(`Teilnehmerliste ${list.label}`, `Class list ${list.label}`)} />
      <ContactList list={list} />
    </>
  );
}
