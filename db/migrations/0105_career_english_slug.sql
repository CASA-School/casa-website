-- 2026-10-29: the English open application had a slug of its own (daf-teacher-bremen), so the
-- sitemap's English twin of /karriere/daf-lehrkraft-bremen (/en/careers/daf-lehrkraft-bremen)
-- fell back to the German row and showed a German title on an English page, while the English
-- row lived at a second address nothing pointed to. One slug for both languages, as every other
-- page has; (slug, locale) stays unique.
UPDATE career_positions SET slug = 'daf-lehrkraft-bremen', updated_at = timezone('utc', now())
WHERE id = '79b868c5-c66b-4288-9be6-000000000041' AND locale = 'en';
