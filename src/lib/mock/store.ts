type MockRow = {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type TableName = 'career_positions';

/*
 * A fixed date, the day these fixtures entered the repository, not the start
 * of the server process: a timestamp taken at boot re-dated every listing on
 * each restart and told applicants a role had opened that morning.
 */
const FIXTURE_DATE = '2026-08-12T00:00:00.000Z';

/*
 * The address casa-bremen.de publishes for job applications, and the one the
 * database seed uses (db/seeds/0001_public_baseline.sql), so both runtime
 * modes send an applicant to the same inbox.
 */
const APPLY_EMAIL = 'bewerbungen@casa-bremen.de';

const tables: Record<TableName, MockRow[]> = {
  career_positions: [
    {
      id: '79b868c5-c66b-4288-9be6-000000000041',
      slug: 'daf-teacher-bremen',
      locale: 'en',
      title: 'German Teacher (DaF)',
      team: 'Academic Team',
      location: 'Bremen',
      employment_type: 'Part-time / Full-time',
      work_mode: 'On-site',
      short_description: 'Teach international adult learners in small groups from A1 to C1 with communicative, human-centered methods.',
      description:
        'You will lead classroom sessions, support placement alignment, and collaborate with the academic coordination team.\n\nExperience in DaF/DaZ teaching and strong classroom facilitation are expected.',
      requirements:
        'DaF/DaZ qualification or equivalent\nClassroom teaching experience\nStrong communication skills in German and English',
      apply_url: null,
      apply_email: APPLY_EMAIL,
      is_published: true,
      is_featured: true,
      posted_at: FIXTURE_DATE,
      closes_at: null,
      created_at: FIXTURE_DATE,
      updated_at: FIXTURE_DATE,
    },
    {
      id: '79b868c5-c66b-4288-9be6-000000000042',
      slug: 'academic-coordinator-bremen',
      locale: 'en',
      title: 'Academic Coordinator',
      team: 'Academic Operations',
      location: 'Bremen',
      employment_type: 'Full-time',
      work_mode: 'On-site',
      short_description: 'Coordinate teaching quality, schedules, and learner progression with teachers and student services.',
      description:
        'You will align course planning, support teacher workflows, and help keep progression pathways clear across formats.',
      requirements:
        'Experience in educational coordination\nStrong organizational communication\nGerman language school context preferred',
      apply_url: null,
      apply_email: APPLY_EMAIL,
      is_published: true,
      is_featured: false,
      posted_at: FIXTURE_DATE,
      closes_at: null,
      created_at: FIXTURE_DATE,
      updated_at: FIXTURE_DATE,
    },
    {
      id: '79b868c5-c66b-4288-9be6-000000000043',
      slug: 'daf-lehrkraft-bremen',
      locale: 'de',
      title: 'DaF-Lehrkraft',
      team: 'Akademisches Team',
      location: 'Bremen',
      employment_type: 'Teilzeit / Vollzeit',
      work_mode: 'Präsenz',
      short_description: 'Unterrichten Sie internationale Lernende in kleinen Gruppen mit kommunikativer Methodik.',
      description:
        'Sie planen Unterricht, begleiten Lernfortschritte und arbeiten eng mit Koordination und Student Services zusammen.',
      requirements:
        'DaF/DaZ-Qualifikation oder vergleichbar\nUnterrichtserfahrung\nSehr gute Kommunikationsfähigkeit',
      apply_url: null,
      apply_email: APPLY_EMAIL,
      is_published: true,
      is_featured: true,
      posted_at: FIXTURE_DATE,
      closes_at: null,
      created_at: FIXTURE_DATE,
      updated_at: FIXTURE_DATE,
    },
  ],
};

const sortRows = (rows: MockRow[], orderBy: string) =>
  [...rows].sort((a, b) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return bValue - aValue;
    }

    return 0;
  });

export const listMockRows = (table: TableName, orderBy = 'created_at') =>
  sortRows(tables[table], orderBy);
