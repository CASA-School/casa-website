import { notFound } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { PersonPanel } from '@/components/admin/person-panel';
import { FactGrid, MetaItem, MetaLine, OwnerControl, StatusBar, SubmissionCard, Timeline } from '@/components/admin/record-parts';
import { Badge, BirthDate, Card, DetailList, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { findDuplicateCandidates, getPersonSummary } from '@/lib/admin/people';
import { getExamRegistration, registrationTypeLabel } from '@/lib/admin/registrations';
import { inTheirLanguage, replyHref } from '@/lib/admin/reply';
import { listAssignableStaff } from '@/lib/admin/staff';
import { toDateInputValue } from '@/lib/dates';
import { formatDay, parseOptionLabel } from '../../option-label';

const SALUTATIONS: Record<string, Bilingual> = {
  mr: { de: 'Herr', en: 'Mr' },
  ms: { de: 'Frau', en: 'Ms' },
  mx: { de: 'Mx', en: 'Mx' },
  neutral: { de: 'Keine Anrede', en: 'No salutation' },
};

/**
 * One exam registration, in the inbox records' one design (2026-10-15): the head
 * with who and which exam and, in its bar, where it stands and who has it; the
 * registration as it was sent — the name on the certificate first, then the
 * sitting and the parts; who they are; beside it the person and one line of
 * notes and changes.
 *
 * The name comes first and stays marked until the candidate has confirmed it
 * matches their ID: a telc certificate is printed from the name on the entry,
 * and a mismatch is found on exam day, after the fee is paid and the sitting is
 * full — the single most expensive error this queue can pass on.
 */
export default async function ExamRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireModule('registrations')]);
  const [registration, { t, lang }] = await Promise.all([getExamRegistration(id), getI18n()]);

  if (!registration) {
    notFound();
  }

  const canEdit = canAccess(user, 'registrations', 'edit');
  const [notes, activity, staff, flags, person] = await Promise.all([
    listNotes('exam_registration', registration.id),
    activityFor('exam_registration', registration.id),
    listAssignableStaff(),
    listFlags('exam_registration', registration.id),
    registration.personId ? getPersonSummary(registration.personId) : null,
  ]);
  const candidates = person
    ? await findDuplicateCandidates({
        email: registration.email,
        lastName: registration.lastName,
        birthDate: toDateInputValue(registration.birthDate) || null,
        excludePersonId: person.id,
      })
    : [];

  const fullName = `${registration.firstName} ${registration.lastName}`;
  const exam = registration.examTypeLabel ?? t('Prüfung', 'Exam');
  const sitting = parseOptionLabel(registration.examSessionLabel);
  const german = registration.locale === 'de';
  const reply = replyHref({
    email: registration.email,
    subject: inTheirLanguage(registration.locale, `Deine Prüfungsanmeldung: ${exam}`, `Your exam registration: ${exam}`),
    firstName: registration.firstName,
    locale: registration.locale,
    signer: user.name,
  });

  return (
    <>
      <RecordHeader
        backHref="/admin/registrations/exam"
        backLabel={t('Anmeldungen', 'Registrations')}
        title={fullName}
        avatar={fullName}
        status={<Badge tone="neutral">{t('Prüfung', 'Exam')}</Badge>}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">{exam}</span>
            <MetaLine>
              <MetaItem icon={Icon.mail}>
                <a href={`mailto:${registration.email}`} className="hover:text-[var(--casa-ink)] hover:underline">
                  {registration.email}
                </a>
              </MetaItem>
              <MetaItem icon={Icon.phone}>
                <a href={`tel:${registration.phone}`} className="hover:text-[var(--casa-ink)] hover:underline">
                  {registration.phone}
                </a>
              </MetaItem>
              <MetaItem icon={Icon.globe}>{german ? t('auf Deutsch', 'in German') : t('auf Englisch', 'in English')}</MetaItem>
            </MetaLine>
          </>
        }
        bar={
          <>
            <StatusBar entity="exam_registration" id={registration.id} status={registration.status} canEdit={canEdit} />
            <OwnerControl entity="exam_registration" id={registration.id} assignedTo={registration.assignedTo} staff={staff} me={user} canEdit={canEdit} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <SubmissionCard
            name={fullName}
            email={registration.email}
            at={registration.submittedAt}
            via={t('über das Anmeldeformular', 'from the registration form')}
            title={exam}
            reply={{ href: reply, locale: registration.locale }}
          >
            <FactGrid
              facts={[
                {
                  label: t('Name auf dem Zertifikat', 'Name on the certificate'),
                  value: fullName,
                  sub: registration.officialNameConfirmed
                    ? t('Bestätigt: wie im Ausweis', 'Confirmed: as on their ID')
                    : t('Nicht bestätigt — vor der Meldung klären', 'Not confirmed — check before filing'),
                  tone: registration.officialNameConfirmed ? 'good' : 'attention',
                },
                {
                  label: t('Prüfungstermin', 'Sitting'),
                  value: sitting?.start
                    ? formatDay(sitting.start, lang, true)
                    : sitting?.toBeArranged
                      ? t('Wird noch festgelegt', 'To be arranged')
                      : (sitting?.raw ?? null),
                  sub: sitting?.start ? [sitting.time, sitting.location].filter(Boolean).join(' · ') || undefined : undefined,
                },
                { label: t('Teile', 'Parts'), value: registrationTypeLabel(registration.registrationType, lang) },
              ]}
            />
          </SubmissionCard>

          <Card title={t('Angaben zur Person', 'Candidate')} icon={Icon.person} tint="ink">
            <DetailList
              items={[
                {
                  label: t('Anrede', 'Salutation'),
                  value: SALUTATIONS[registration.salutation] ? pick(lang, SALUTATIONS[registration.salutation]) : registration.salutation,
                },
                {
                  label: t('Nationalität', 'Nationality'),
                  value: registration.nationalityName ?? (
                    <span className="flex items-center gap-2">
                      {registration.nationalityRaw}
                      <Badge tone="warning">{t('nicht erkannt', 'unrecognised')}</Badge>
                    </span>
                  ),
                },
                { label: t('Geburtsdatum', 'Date of birth'), value: <BirthDate value={registration.birthDate ?? registration.birthDateRaw} /> },
              ]}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <PersonPanel person={person} candidates={candidates} flags={flags} returnTo={`/admin/registrations/exam/${registration.id}`} />
          <Timeline
            canWrite={canEdit}
            entity="exam_registration"
            id={registration.id}
            notes={notes}
            activity={activity}
            origin={{ at: registration.submittedAt, label: t('Angemeldet über das Formular', 'Registered through the form') }}
          />
        </div>
      </div>
    </>
  );
}
