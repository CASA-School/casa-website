-- 0077 — Online as a place to teach (Rahman, 2026-10-21).
--
-- „There might be online courses." SchoolMan keeps online teaching as a place, not a room: its
-- `LocationReference` has OnlineGroup and OnlineOne (seed 0002, kind `online`), and no classroom in
-- them. A lesson's place in the workspace is its room, so an online class gets a room of its own:
-- „Online", under OnlineGroup. It is chosen like any room (Tagesplan, Raumplan, the course's weekly
-- plan); the plans know it by its location's kind — any number of classes at once, never a clash, no
-- floor, not counted among the rooms in use — and the Raumplan shows it below the building.

INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('OnlineGroup', 'OnGr', 'online', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO rooms (location_id, name, kind, is_bookable, is_active)
SELECT id, 'Online', 'classroom', true, true FROM locations WHERE name = 'OnlineGroup'
ON CONFLICT (location_id, name) DO NOTHING;
