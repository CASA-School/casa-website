-- Rahman, 2026-10-29: the DaF teacher page becomes an open application (Initiativbewerbung).
-- An open application is not a vacancy: the pages show no posting date and give Google no
-- JobPosting for it, and its copy promises a reply, not a job. The two rows are the German
-- page and its English twin (db/seeds/0001_public_baseline.sql holds the same text).
ALTER TABLE career_positions ADD COLUMN IF NOT EXISTS open_application boolean NOT NULL DEFAULT false;

UPDATE career_positions SET
  open_application = true,
  title = 'Initiativbewerbung als DaF-Lehrkraft',
  employment_type = 'Teilzeit oder Vollzeit, nach Absprache',
  short_description = 'Auch wenn gerade keine Stelle ausgeschrieben ist: Wir freuen uns jederzeit über Bewerbungen von DaF-Lehrkräften, die bei uns unterrichten möchten.',
  description = 'Bei CASA lernen jedes Jahr Menschen aus vielen Ländern Deutsch, in Intensivkursen, Abendkursen, in der Prüfungsvorbereitung und in Gruppen, die uns besuchen. Schick uns deine Unterlagen, auch ohne ausgeschriebene Stelle. Wir lesen jede Bewerbung und melden uns bei dir.

Du unterrichtest internationale Lernende in kleinen Gruppen, von A1 bis C1.
Du arbeitest mit kommunikativen Methoden und planst deinen Unterricht selbst.
Du begleitest die Fortschritte deiner Lernenden.
Du arbeitest eng mit der Koordination und der Verwaltung zusammen.',
  updated_at = timezone('utc', now())
WHERE id = '79b868c5-c66b-4288-9be6-000000000043';

UPDATE career_positions SET
  open_application = true,
  title = 'Speculative application: German teacher (DaF)',
  employment_type = 'Part-time or full-time, by arrangement',
  short_description = 'Even when no position is advertised, we are always glad to hear from teachers of German as a foreign language who would like to teach with us.',
  description = 'Every year, people from many countries learn German at CASA: in intensive courses, evening courses, exam preparation and visiting groups. Send us your application, even if no position is advertised at the moment. We read every application and get back to you.

You teach international learners in small groups, from A1 to C1.
You use communicative methods and plan your own lessons.
You follow your learners’ progress.
You work closely with the coordination and administration teams.',
  updated_at = timezone('utc', now())
WHERE id = '79b868c5-c66b-4288-9be6-000000000041';
