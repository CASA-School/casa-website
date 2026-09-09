-- Locations and rooms, ported from FileMaker SchoolMan on 2026-09-09.
--
-- Source: the `LocationReference` (8) and `Classroom` (29) layouts, read via the
-- Data API with the shared credential (GET only). Applied to real databases,
-- which is right: these are CASA's actual rooms, not placeholders.
--
-- What was cleaned on the way in (docs/FILEMAKER_LESSONS.md §12):
--   * `_ID_Active` 1/2 → boolean; one room carried 21 and is treated as inactive.
--   * Offices (Werner, Buchhaltung, Studienleitung, Keller Lehrer, KG Studien) and
--     the Glaskasten are `kind` office/meeting/other and never bookable.
--   * `CapStudent` → capacity (planning), `MaxStudent` → capacity_max (ceiling).
--     0/0 rooms get NULL, not zero.
--   * `CityClassRoom` → nickname, the name staff use.
--   * Locations 5–6 (Inhouse) are client premises; 7–8 are online.
--
-- Idempotent: keyed on the FileMaker ids through filemaker_links, and on
-- (location, name) for the rows themselves.

-- ---------------------------------------------------------------- locations
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('Am Dobben 14 – 16', 'Dobben', 'site', true)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '1', '1', '1' FROM locations WHERE name = 'Am Dobben 14 – 16'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('Kinderklinik', 'Creativ', 'site', true)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '2', '2', '2' FROM locations WHERE name = 'Kinderklinik'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('Villa Ichon', 'Villa', 'site', false)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '3', '3', '1' FROM locations WHERE name = 'Villa Ichon'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('Rembertistift', 'Rem', 'site', false)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '4', '4', '1' FROM locations WHERE name = 'Rembertistift'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('Inhouse', 'InPre', 'client', true)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '5', '5', '1' FROM locations WHERE name = 'Inhouse'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('InhouseOn', 'InOn', 'client', true)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '6', '6', '1' FROM locations WHERE name = 'InhouseOn'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('OnlineGroup', 'OnGr', 'online', true)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '7', '7', '1' FROM locations WHERE name = 'OnlineGroup'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO locations (name, short_name, kind, is_active)
VALUES ('OnlineOne', 'OnOn', 'online', true)
ON CONFLICT (name) DO UPDATE SET short_name = EXCLUDED.short_name, kind = EXCLUDED.kind, is_active = EXCLUDED.is_active;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'location', id, 'LocationReference', '8', '8', '1' FROM locations WHERE name = 'OnlineOne'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;

-- -------------------------------------------------------------------- rooms
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '1. OG Werner', '15 We', NULL, 1, 'office', 2, 2, false, false, 'rot', '1. OG rechts', '2 Personen'
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '9', '10', '4'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '1. OG Werner'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '1.OG L1', '16', 'Dresden', 1, 'classroom', 16, 18, true, true, 'gelb', '1. OG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '27', '65', '10'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '1.OG L1'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '1.OG L2', '17', 'Leipzig', 1, 'classroom', 14, 15, true, true, 'gelb', '1. OG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '28', '66', '7'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '1.OG L2'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '1.OG L3', '17', 'Weimar', 1, 'classroom', 14, 15, false, false, 'gelb', '1. OG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '29', '67', '15'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '1.OG L3'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '1.OG R1', '11', 'Berlin', 1, 'classroom', 13, 15, true, true, 'rot', '1. OG rechts', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '6', '6', '8'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '1.OG R1'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '1.OG R2', '13', 'Frankfurt', 1, 'classroom', 18, 22, true, true, 'rot', '1. OG rechts', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '7', '8', '8'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '1.OG R2'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '1.OG R3', '14', 'Köln', 1, 'classroom', NULL, NULL, false, false, 'rot', '1. OG rechts', '4 Personen'
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '8', '9', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '1.OG R3'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '2. OG 1', '21', 'Hamburg', 2, 'classroom', 18, 22, true, true, 'blau', '2. OG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '11', '12', '4'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '2. OG 1'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '2. OG 2', '22', 'Kiel', 2, 'classroom', 5, 7, true, false, 'blau', '2. OG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '12', '13', '4'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '2. OG 2'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '2. OG 3', '23', 'Lübeck', 2, 'classroom', 18, 22, true, true, 'blau', '2. OG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '13', '14', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '2. OG 3'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '2. OG 4', '24', 'Bielefeld', 2, 'classroom', NULL, NULL, false, false, 'blau', '2. OG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '10', '11', '4'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '2. OG 4'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, '2. OG Buchhaltung', '25 Bu', NULL, 2, 'office', 2, 2, false, false, 'grau', NULL, NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '14', '15', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = '2. OG Buchhaltung'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 1', '01', 'Freiburg', 0, 'classroom', 15, 16, true, true, 'grün', 'Empfang EG rechts', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '1', '1', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 1'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 2', '02', 'Heidelberg', 0, 'classroom', 12, 14, true, true, 'grün', 'Empfang EG rechts', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '2', '2', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 2'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 3', '03', 'München', 0, 'classroom', 14, 15, true, true, 'grün', 'Empfang EG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '3', '3', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 3'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 4', '04', 'Nürnberg', 0, 'classroom', 14, 15, true, true, 'grün', 'Empfang EG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '4', '4', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 4'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 5', '05', 'Stuttgart', 0, 'classroom', 13, 15, true, true, 'grün', 'Empfang EG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '5', '5', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 5'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 7', '07', 'Ulm', 0, 'classroom', 14, 16, true, true, 'grün', 'Empfang EG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '23', '28', '4'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 7'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 7 Glaskasten', '06 Glaskasten', NULL, 0, 'meeting', 3, 3, false, false, 'grün', 'Empfang EG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '17', '22', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 7 Glaskasten'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'EG 8', '08', 'Augsburg', 0, 'classroom', 13, 15, true, true, 'grün', 'Empfang EG links', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '25', '31', '4'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'EG 8'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'KG 1', '-01', 'Wien', -1, 'classroom', 8, 11, true, true, 'grau', 'Keller Kaffeeküche', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '26', '32', '10'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'KG 1'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'KG Studien', '-02', NULL, -1, 'office', 3, 3, false, false, 'grau', 'Keller Lehrer', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '24', '29', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'KG Studien'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'Keller Lehrer', '110', NULL, -1, 'office', 16, 16, false, false, 'grau', 'Keller Lehrer', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '16', '21', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'Keller Lehrer'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'Studienleitung', '111', NULL, -1, 'office', 3, 3, false, false, 'grau', 'Keller Lehrer', NULL
  FROM locations l WHERE l.name = 'Am Dobben 14 – 16'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '18', '23', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Am Dobben 14 – 16' AND r.name = 'Studienleitung'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'Creativ 1', '1001', NULL, 3, 'classroom', 15, 15, false, false, NULL, NULL, NULL
  FROM locations l WHERE l.name = 'Kinderklinik'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '19', '24', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Kinderklinik' AND r.name = 'Creativ 1'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'Creativ 2', '1002', NULL, 3, 'classroom', 15, 15, false, false, NULL, NULL, NULL
  FROM locations l WHERE l.name = 'Kinderklinik'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '20', '25', '5'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Kinderklinik' AND r.name = 'Creativ 2'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'Creativ 3', '1004', NULL, 3, 'classroom', 15, 15, false, false, NULL, NULL, NULL
  FROM locations l WHERE l.name = 'Kinderklinik'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '22', '27', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Kinderklinik' AND r.name = 'Creativ 3'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'Creativ 4', '1003', NULL, 3, 'classroom', 15, 15, false, false, NULL, NULL, NULL
  FROM locations l WHERE l.name = 'Kinderklinik'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '21', '26', '3'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'Kinderklinik' AND r.name = 'Creativ 4'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
INSERT INTO rooms (location_id, name, short_name, nickname, floor, kind, capacity, capacity_max, is_bookable, is_active, colour, zone, notes)
SELECT l.id, 'Inhouse', '60', NULL, NULL, 'other', NULL, NULL, false, false, NULL, NULL, NULL
  FROM locations l WHERE l.name = 'InhouseOn'
ON CONFLICT (location_id, name) DO UPDATE SET short_name = EXCLUDED.short_name, floor = EXCLUDED.floor, kind = EXCLUDED.kind,
  capacity = EXCLUDED.capacity, capacity_max = EXCLUDED.capacity_max, colour = EXCLUDED.colour, zone = EXCLUDED.zone;
INSERT INTO filemaker_links (entity, entity_id, source_layout, source_record_id, source_primary_key, source_mod_id)
SELECT 'room', r.id, 'Classroom', '15', '20', '4'
  FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.name = 'InhouseOn' AND r.name = 'Inhouse'
ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING;
