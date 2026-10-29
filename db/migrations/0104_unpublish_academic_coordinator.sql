-- Rahman, 2026-10-29: the English-only „Academic coordinator" posting is sample content from the
-- first build, not a real opening, and the German site never showed it. Unpublished, not deleted,
-- so an application ever made to it keeps its position.
UPDATE career_positions SET is_published = false, updated_at = timezone('utc', now())
WHERE id = '79b868c5-c66b-4288-9be6-000000000042';
