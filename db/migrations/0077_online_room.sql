-- 0077 — Online as a place to teach (Rahman, 2026-10-21).
--
-- „There might be online courses … add the online course in this dropdown … a numbering for online
-- courses too, in case we have more of them." SchoolMan keeps online teaching as a place, not a room:
-- its `LocationReference` has OnlineGroup and OnlineOne (seed 0002, kind `online`), and no classroom in
-- them. A lesson's place in the workspace is its room, so online classes get numbered rooms under
-- OnlineGroup: „Online 1" now, „Online 2" and on added under Settings → Räume when two run at once.
-- Each is a room like any other — one class at a time, chosen from the same list — with no floor, not
-- counted among the building's rooms in use, and shown in the Raumplan below the building.

INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('OnlineGroup', 'OnGr', 'online', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO rooms (location_id, name, kind, is_bookable, is_active)
SELECT id, 'Online 1', 'classroom', true, true FROM locations WHERE name = 'OnlineGroup'
ON CONFLICT (location_id, name) DO NOTHING;
