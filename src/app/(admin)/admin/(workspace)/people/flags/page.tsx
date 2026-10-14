import { ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { FLAG_LABELS, listOpenFlags, openFlagsByCode, type FlagCode } from '@/lib/admin/flags';
import { capitalise, pick, relativeDays, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

const ENTITY_LABELS: Record<string, Bilingual> = {
  person: { de: 'Teilnehmende', en: 'Student' },
  enquiry: { de: 'Anfrage', en: 'Enquiry' },
  course_registration: { de: 'Kursanmeldung', en: 'Course registration' },
  exam_registration: { de: 'Prüfungsanmeldung', en: 'Exam registration' },
  career_application: { de: 'Bewerbung', en: 'Application' },
  placement_attempt: { de: 'Einstufung', en: 'Placement' },
  booking: { de: 'Buchung', en: 'Booking' },
};

const isFlagCode = (value: string | undefined): value is FlagCode =>
  value !== undefined && value in FLAG_LABELS;

/**
 * The open-flag work list.
 *
 * Oldest first, because a flag is a question intake could not answer and the
 * longest-unanswered one has been wrong on the most screens for the longest
 * time. Each row opens the record it belongs to; the flag is cleared there,
 * next to the value it is about, never from this list — clearing a flag
 * without seeing the record is how "as written" values become permanent.
 *
 * The kinds are the list's views. Under each name is what the flag says,
 * except in a kind's own view, whose tab already says it (§Lists).
 */
export default async function FlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const filter = isFlagCode(code) ? code : undefined;
  const [flags, counts, { t, lang }] = await Promise.all([listOpenFlags(filter), openFlagsByCode(), getI18n()]);

  const kinds = (Object.keys(FLAG_LABELS) as FlagCode[]).filter((k) => (counts[k] ?? 0) > 0 || k === filter);
  const total = kinds.reduce((n, k) => n + (counts[k] ?? 0), 0);
  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader backHref="/admin/people" backLabel={t('Teilnehmende', 'Students')} title={t('Hinweise', 'Flags')} />

      <Card bleed>
        {kinds.length > 1 || filter ? (
          <ListBar
            tabs={[
              { key: 'all', label: t('Alle', 'All'), href: '/admin/people/flags', count: total },
              ...kinds.map((k) => ({
                key: k,
                label: pick(lang, FLAG_LABELS[k]),
                href: `/admin/people/flags?code=${k}`,
                count: counts[k],
              })),
            ]}
            active={filter ?? 'all'}
          />
        ) : null}
        {flags.length === 0 ? (
          <ListEmpty title={t('Nichts zu prüfen', 'Nothing needs a look')} />
        ) : (
          <Table
            head={[
              t('Name', 'Name'),
              { label: t('Angegeben als', 'Submitted as'), className: `w-[14rem] ${hide}` },
              { label: t('Datensatz', 'Record'), className: `w-[11rem] ${hide}` },
              { label: t('Gemeldet', 'Raised'), className: 'w-[7.5rem] md:w-[8.5rem]' },
            ]}
          >
            {flags.map((flag) => (
              <TableRow key={flag.id} interactive>
                <Cell href={flag.href} className="max-w-0">
                  <RecordName
                    name={flag.subject || t('Unbekannter Datensatz', 'Unknown record')}
                    about={filter ? undefined : pick(lang, FLAG_LABELS[flag.code])}
                  />
                </Cell>
                <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>
                  {typeof flag.detail?.raw === 'string'
                    ? t(`„${flag.detail.raw}“`, `“${flag.detail.raw}”`)
                    : Array.isArray(flag.detail?.candidates)
                      ? flag.detail.candidates.length === 1
                        ? t('1 möglicher Treffer', '1 possible match')
                        : t(
                            `${flag.detail.candidates.length} mögliche Treffer`,
                            `${flag.detail.candidates.length} possible matches`
                          )
                      : null}
                </Cell>
                <Cell className={`text-[0.84rem] text-[var(--casa-muted)] ${hide}`}>
                  {ENTITY_LABELS[flag.entity] ? pick(lang, ENTITY_LABELS[flag.entity]) : capitalise(flag.entity.replace(/_/g, ' '))}
                </Cell>
                <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                  {capitalise(relativeDays(flag.createdAt, lang))}
                </Cell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
