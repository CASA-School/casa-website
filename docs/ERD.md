# CASA Data Model

## Scope
Two models share one database. The first is the public site's content and
intake tables (0001–0005). The second, below it, is the staff workspace's
queues and its person register (0006–0007). Historical portal and
role-oriented schema work still exists in older migration files, but it is
not part of the intended active model.

```mermaid
erDiagram
  COURSE_TYPES ||--o{ COURSE_INSTANCES : schedules
  EXAM_TYPES ||--o{ EXAM_SESSIONS : schedules
  CAREER_POSITIONS ||--o{ CAREER_APPLICATIONS : receives

  COURSE_TYPES {
    uuid id PK
    text slug
    text name
    text format
    text level_min
    text level_max
    int lessons_per_week
    numeric default_price
    text currency
    bool is_active
    timestamptz created_at
    timestamptz updated_at
  }

  COURSE_INSTANCES {
    uuid id PK
    uuid course_type_id FK
    date start_date
    date end_date
    int capacity
    jsonb schedule
    text location
    text status
    timestamptz created_at
    timestamptz updated_at
  }

  EXAM_TYPES {
    uuid id PK
    text code
    text name
    text level
    numeric default_fee
    text currency
    bool is_active
  }

  EXAM_SESSIONS {
    uuid id PK
    uuid exam_type_id FK
    timestamptz starts_at
    timestamptz ends_at
    date registration_deadline
    int capacity
    numeric fee_override
    text status
    timestamptz created_at
    timestamptz updated_at
  }

  CAREER_POSITIONS {
    uuid id PK
    text slug
    text locale
    text title
    text team
    text location
    text employment_type
    text work_mode
    text short_description
    text description
    text requirements
    text apply_url
    text apply_email
    bool is_published
    bool is_featured
    timestamptz posted_at
    date closes_at
    timestamptz created_at
    timestamptz updated_at
  }

  CAREER_APPLICATIONS {
    uuid id PK
    uuid career_position_id FK
    text position_slug
    text position_title
    text locale
    text first_name
    text last_name
    text email
    text phone
    text linkedin_url
    text cover_letter
    text cv_file_name
    int cv_file_size
    text cv_mime_type
    text cv_storage_path
    text source
    text status
    timestamptz created_at
    timestamptz updated_at
  }

  NEWS_POSTS {
    uuid id PK
    text slug
    text locale
    text title
    text summary
    text body
    text status
    timestamptz published_at
    jsonb content_json
    text content_html
    text hero_image_path
    text hero_image_alt
    timestamptz scheduled_for
    timestamptz archived_at
    text category
    text[] tags
    text seo_title
    text seo_description
    text canonical_url
    int reading_minutes
    bool is_featured
    timestamptz created_at
    timestamptz updated_at
  }

  FAQ_ITEMS {
    uuid id PK
    text locale
    text category
    int display_order
    text question
    text answer
    bool is_published
    timestamptz created_at
    timestamptz updated_at
  }
```

## Staff workspace, person register, rooms and access (0006–0008)

```mermaid
erDiagram
  PEOPLE ||--o{ EMAILS : has
  PEOPLE ||--o{ PHONES : has
  PEOPLE o|--o{ PEOPLE : merged_into
  COUNTRIES ||--o{ PEOPLE : nationality_code
  PEOPLE ||--o{ ENQUIRIES : person_id
  PEOPLE ||--o{ COURSE_REGISTRATIONS : person_id
  PEOPLE ||--o{ EXAM_REGISTRATIONS : person_id
  PEOPLE ||--o{ PLACEMENT_REVIEWS : person_id
  LEVELS ||--o{ COURSE_REGISTRATIONS : declared_level_code
  LEVELS ||--o{ PLACEMENT_REVIEWS : confirmed_level_code
  STAFF_USERS ||--o{ STAFF_SESSIONS : holds
  STAFF_USERS ||--o{ RECORD_FLAGS : resolved_by
  STAFF_USERS ||--o{ FILEMAKER_LINKS : linked_by

  PEOPLE {
    uuid id PK
    salutation salutation
    text first_name
    text last_name
    date birth_date
    char2 nationality_code FK
    text nationality_raw
    uuid merged_into FK
    text created_by
    timestamptz created_at
  }

  EMAILS {
    uuid id PK
    uuid person_id FK
    text address
    text normalized
    text kind
    bool is_primary
  }

  PHONES {
    uuid id PK
    uuid person_id FK
    text number
    text normalized
    text kind
    bool is_primary
  }

  COUNTRIES {
    char2 code PK
    text name_en
    text name_de
    int filemaker_flag_id
  }

  LEVELS {
    text code PK
    int position
    int filemaker_level_step_id
  }

  COURSE_REGISTRATIONS {
    uuid id PK
    uuid request_id
    uuid person_id FK
    text nationality_raw
    char2 nationality_code FK
    text birth_date_raw
    date birth_date
    text declared_level_raw
    text declared_level_code FK
    accommodation_type accommodation_type
    work_status status
    uuid assigned_to FK
    text source
  }

  EXAM_REGISTRATIONS {
    uuid id PK
    uuid request_id
    uuid person_id FK
    text nationality_raw
    char2 nationality_code FK
    text birth_date_raw
    date birth_date
    bool official_name_confirmed
    work_status status
    text source
  }

  ENQUIRIES {
    uuid id PK
    uuid request_id
    uuid person_id FK
    text kind
    jsonb organiser_brief
    work_status status
    text source
  }

  PLACEMENT_REVIEWS {
    uuid attempt_id PK
    uuid person_id FK
    text confirmed_level
    text confirmed_level_code FK
    uuid reviewed_by FK
    timestamptz decided_at
  }

  RECORD_FLAGS {
    uuid id PK
    text entity
    uuid entity_id
    text code
    jsonb detail
    timestamptz resolved_at
    uuid resolved_by FK
  }

  FILEMAKER_LINKS {
    uuid id PK
    text entity
    uuid entity_id
    text source_database
    text source_layout
    text source_record_id
    text source_primary_key
    int source_mod_id
    uuid linked_by FK
  }
```

```mermaid
erDiagram
  LOCATIONS ||--o{ ROOMS : holds
  ROOMS o|--o{ COURSE_INSTANCES : room_id
  STAFF_USERS ||--o{ STAFF_MODULE_ACCESS : exceptions

  LOCATIONS {
    uuid id PK
    text name
    text short_name
    text kind
    bool is_active
  }

  ROOMS {
    uuid id PK
    uuid location_id FK
    text name
    text short_name
    text nickname
    smallint floor
    room_kind kind
    smallint capacity
    smallint capacity_max
    bool is_bookable
    bool is_active
    text colour
    text zone
    text notes
  }

  STAFF_MODULE_ACCESS {
    uuid staff_user_id PK
    text module PK
    bool allowed
    uuid granted_by FK
  }
```

`record_flags` and `filemaker_links` are polymorphic by `(entity, entity_id)`
and carry no foreign key to the row, the same pattern as `staff_notes`.
`canonical_person_id(uuid)` is the read-time function that follows
`people.merged_into`; every reader that groups by person calls it rather than
reading `person_id` directly.

## Notes
- `course_instances.schedule` should remain structured JSON.
- Public reads should only expose active or publishable records.
- `career_applications` remains a public insert path with storage-backed CV upload support.
- `news_posts` keeps scheduling fields because the public site still auto-publishes due posts through a service-role RPC.
