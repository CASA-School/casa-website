# CASA Public Data Model

## Scope
This ERD reflects the current public-site-only product scope. Historical portal and role-oriented schema work still exists in older migration files, but it is not part of the intended active model.

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

## Notes
- `course_instances.schedule` should remain structured JSON.
- Public reads should only expose active or publishable records.
- `career_applications` remains a public insert path with storage-backed CV upload support.
- `news_posts` keeps scheduling fields because the public site still auto-publishes due posts through a service-role RPC.
