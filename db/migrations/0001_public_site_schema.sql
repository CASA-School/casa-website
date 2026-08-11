CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE news_status AS ENUM (
    'draft',
    'in_review',
    'changes_requested',
    'scheduled',
    'published',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE OR REPLACE FUNCTION is_valid_schedule(schedule_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item jsonb;
  day_val text;
  time_val text;
BEGIN
  IF schedule_data IS NULL OR jsonb_typeof(schedule_data) <> 'object' THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(schedule_data->'days') <> 'array' THEN
    RETURN false;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(schedule_data->'days')
  LOOP
    day_val := trim(both '"' FROM item::text);

    IF day_val NOT IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') THEN
      RETURN false;
    END IF;
  END LOOP;

  time_val := schedule_data->>'time';
  IF time_val IS NULL OR time_val !~ '^[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]$' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS course_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  format text,
  level_min text,
  level_max text,
  lessons_per_week integer NOT NULL DEFAULT 0,
  default_price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS course_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_type_id uuid NOT NULL REFERENCES course_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  capacity integer NOT NULL DEFAULT 0,
  schedule jsonb NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT course_instances_capacity_check CHECK (capacity >= 0),
  CONSTRAINT course_instances_date_order_check CHECK (start_date <= end_date),
  CONSTRAINT course_instances_schedule_valid_check CHECK (is_valid_schedule(schedule))
);

CREATE TABLE IF NOT EXISTS exam_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  level text,
  default_fee numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type_id uuid NOT NULL REFERENCES exam_types(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  registration_deadline date,
  capacity integer NOT NULL DEFAULT 0,
  fee_override numeric(10,2),
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT exam_sessions_capacity_check CHECK (capacity >= 0),
  CONSTRAINT exam_sessions_date_order_check CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  title text NOT NULL,
  summary text,
  body text NOT NULL,
  status news_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_html text,
  hero_image_path text,
  hero_image_alt text,
  scheduled_for timestamptz,
  archived_at timestamptz,
  category text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  seo_title text,
  seo_description text,
  canonical_url text,
  reading_minutes integer NOT NULL DEFAULT 1,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT news_posts_slug_locale_unique UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL DEFAULT 'en',
  category text,
  display_order integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  answer text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS career_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  title text NOT NULL,
  team text,
  location text NOT NULL DEFAULT 'Bremen',
  employment_type text NOT NULL DEFAULT 'Full-time',
  work_mode text NOT NULL DEFAULT 'On-site',
  short_description text NOT NULL,
  description text,
  requirements text,
  apply_url text,
  apply_email text NOT NULL DEFAULT 'info@casa-bremen.de',
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  posted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  closes_at date,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT career_positions_slug_locale_unique UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS career_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_position_id uuid REFERENCES career_positions(id) ON DELETE SET NULL,
  position_slug text NOT NULL,
  position_title text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  linkedin_url text,
  cover_letter text NOT NULL,
  cv_file_name text NOT NULL,
  cv_file_size integer NOT NULL,
  cv_mime_type text,
  cv_storage_path text,
  source text NOT NULL DEFAULT 'careers-page',
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS career_application_files (
  career_application_id uuid PRIMARY KEY REFERENCES career_applications(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  mime_type text,
  file_bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS set_course_types_updated_at ON course_types;
CREATE TRIGGER set_course_types_updated_at
  BEFORE UPDATE ON course_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_course_instances_updated_at ON course_instances;
CREATE TRIGGER set_course_instances_updated_at
  BEFORE UPDATE ON course_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_exam_sessions_updated_at ON exam_sessions;
CREATE TRIGGER set_exam_sessions_updated_at
  BEFORE UPDATE ON exam_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_news_posts_updated_at ON news_posts;
CREATE TRIGGER set_news_posts_updated_at
  BEFORE UPDATE ON news_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_faq_items_updated_at ON faq_items;
CREATE TRIGGER set_faq_items_updated_at
  BEFORE UPDATE ON faq_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_career_positions_updated_at ON career_positions;
CREATE TRIGGER set_career_positions_updated_at
  BEFORE UPDATE ON career_positions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_career_applications_updated_at ON career_applications;
CREATE TRIGGER set_career_applications_updated_at
  BEFORE UPDATE ON career_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_course_instances_course_type_id ON course_instances(course_type_id);
CREATE INDEX IF NOT EXISTS idx_course_instances_status ON course_instances(status);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_type_id ON exam_sessions(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_news_posts_status ON news_posts(status);
CREATE INDEX IF NOT EXISTS idx_news_posts_published_at ON news_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_posts_scheduled_for ON news_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_faq_items_locale_order ON faq_items(locale, display_order, created_at);
CREATE INDEX IF NOT EXISTS idx_career_positions_is_published ON career_positions(is_published);
CREATE INDEX IF NOT EXISTS idx_career_positions_locale ON career_positions(locale);
CREATE INDEX IF NOT EXISTS idx_career_positions_posted_at ON career_positions(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_career_applications_position_slug ON career_applications(position_slug);
CREATE INDEX IF NOT EXISTS idx_career_applications_created_at ON career_applications(created_at DESC);
