/*
# LockedIn — Core Database Schema (single-tenant, no auth)

## Purpose
Persist the proof-of-work profiles, Jev probability decisions, job matches,
forge recommendations, hackathon scout results, developer news, custom target
analyses, engine configuration, and newsletter editions that the Optimus
Agentic Engine generates per GitHub username.  Today the app computes all of
this in-memory and loses it on reload; this migration gives every artifact a
durable home so the app can cache, rehydrate, and compare scans over time.

## Tenant model
The app has **no sign-in screen** and the frontend talks to Supabase with the
anon key.  All policies therefore grant CRUD to `anon, authenticated` — the
data is intentionally shared/public (one workspace, no per-user isolation).
No `user_id` columns, no `auth.uid()` references.

## New tables (9)

1. `profiles` — one row per analysed GitHub user (login is the natural key).
2. `repos` — repositories snapshot for a profile.
3. `jev_runs` — Jev System-1 probability decision per profile run.
4. `job_matches` — scored roles/grants for a profile.
5. `forge_recs` — certificate / OSS-issue recommendations for a profile.
6. `scout_hackathons` — Firecrawl-surfaced hackathon matches.
7. `dev_news` — curated developer news stories.
8. `target_analyses` — custom URL "autopsy" analyses run against a profile.
9. `engine_configs` — persisted Optimus engine settings (provider, keys, model).

## Storage
A public `logos` bucket is created for general asset storage (logos, avatars,
exported reports).  Public read, no write from the anon key — writes are
expected to come through an edge function or the dashboard.

## Security
- RLS enabled on every table.
- Every policy is `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in and the data is
  intentionally shared.
- The `logos` bucket is public-read.

## Important notes
1. All tables use `gen_random_uuid()` primary keys.
2. `profiles.login` has a unique index so repeated scans upsert cleanly.
3. `repos`, `jev_runs`, `job_matches`, `forge_recs`, `scout_hackathons`,
   `dev_news`, and `target_analyses` reference `profiles(id)` with
   `ON DELETE CASCADE` so deleting a profile cleans up its children.
4. Timestamps are `timestamptz DEFAULT now()`.
5. JSONB columns store rich nested objects (signals, competency, jev payload,
   eligibility, newsletter, briefing, scout, target analysis detail).
*/

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login        text NOT NULL,
  github_id    bigint,
  avatar_url   text,
  html_url     text,
  name         text,
  bio          text,
  public_repos integer,
  followers    integer,
  following    integer,
  location     text,
  company      text,
  total_stars  integer DEFAULT 0,
  total_forks  integer DEFAULT 0,
  fresh_repos  integer DEFAULT 0,
  languages    jsonb DEFAULT '[]'::jsonb,
  signals      jsonb DEFAULT '[]'::jsonb,
  competency   jsonb DEFAULT '{}'::jsonb,
  buzzword_audit jsonb DEFAULT '[]'::jsonb,
  gaps         jsonb DEFAULT '[]'::jsonb,
  strengths    jsonb DEFAULT '[]'::jsonb,
  newsletter   jsonb,
  briefing     jsonb,
  classification text,
  generated_at bigint,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_login_key ON profiles (login);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- repos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  github_repo_id   bigint,
  name             text NOT NULL,
  full_name        text,
  description      text,
  html_url         text,
  language         text,
  stargazers_count integer DEFAULT 0,
  forks_count      integer DEFAULT 0,
  open_issues_count integer DEFAULT 0,
  size             integer DEFAULT 0,
  fork             boolean DEFAULT false,
  topics           jsonb DEFAULT '[]'::jsonb,
  pushed_at        timestamptz,
  updated_at       timestamptz,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repos_profile_id_idx ON repos (profile_id);

ALTER TABLE repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_repos" ON repos;
CREATE POLICY "anon_select_repos" ON repos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_repos" ON repos;
CREATE POLICY "anon_insert_repos" ON repos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_repos" ON repos;
CREATE POLICY "anon_update_repos" ON repos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_repos" ON repos;
CREATE POLICY "anon_delete_repos" ON repos FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- jev_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jev_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  p_shortlist        numeric DEFAULT 0,
  p_offer            numeric DEFAULT 0,
  calibration        numeric DEFAULT 0,
  schema_error_rate  numeric DEFAULT 0,
  latency_ms         integer DEFAULT 0,
  classification     text,
  buzzwords_incinerated integer DEFAULT 0,
  axis_decisions     jsonb DEFAULT '[]'::jsonb,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jev_runs_profile_id_idx ON jev_runs (profile_id);
CREATE INDEX IF NOT EXISTS jev_runs_created_at_idx ON jev_runs (created_at DESC);

ALTER TABLE jev_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_jev_runs" ON jev_runs;
CREATE POLICY "anon_select_jev_runs" ON jev_runs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_jev_runs" ON jev_runs;
CREATE POLICY "anon_insert_jev_runs" ON jev_runs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_jev_runs" ON jev_runs;
CREATE POLICY "anon_update_jev_runs" ON jev_runs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_jev_runs" ON jev_runs;
CREATE POLICY "anon_delete_jev_runs" ON jev_runs FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- job_matches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_matches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL,
  org          text,
  kind         text NOT NULL DEFAULT 'role',
  location     text,
  compensation text,
  tags         jsonb DEFAULT '[]'::jsonb,
  p_accept     numeric DEFAULT 0,
  p_shortlist  numeric DEFAULT 0,
  confidence   numeric DEFAULT 0,
  eligibility  jsonb DEFAULT '[]'::jsonb,
  pitch        text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_matches_profile_id_idx ON job_matches (profile_id);

ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_job_matches" ON job_matches;
CREATE POLICY "anon_select_job_matches" ON job_matches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_job_matches" ON job_matches;
CREATE POLICY "anon_insert_job_matches" ON job_matches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_job_matches" ON job_matches;
CREATE POLICY "anon_update_job_matches" ON job_matches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_job_matches" ON job_matches;
CREATE POLICY "anon_delete_job_matches" ON job_matches FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- forge_recs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forge_recs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rec_kind     text NOT NULL,
  title        text NOT NULL,
  provider     text,
  url          text,
  axis         text,
  delta_p      numeric DEFAULT 0,
  effort       text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forge_recs_profile_id_idx ON forge_recs (profile_id);

ALTER TABLE forge_recs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_forge_recs" ON forge_recs;
CREATE POLICY "anon_select_forge_recs" ON forge_recs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_forge_recs" ON forge_recs;
CREATE POLICY "anon_insert_forge_recs" ON forge_recs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_forge_recs" ON forge_recs;
CREATE POLICY "anon_update_forge_recs" ON forge_recs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_forge_recs" ON forge_recs;
CREATE POLICY "anon_delete_forge_recs" ON forge_recs FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- scout_hackathons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scout_hackathons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  organizer     text,
  prize         text,
  date          text,
  url           text,
  fit_score     numeric DEFAULT 0,
  fit_reason    text,
  discovered_by text DEFAULT 'firecrawl',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scout_hackathons_profile_id_idx ON scout_hackathons (profile_id);

ALTER TABLE scout_hackathons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scout_hackathons" ON scout_hackathons;
CREATE POLICY "anon_select_scout_hackathons" ON scout_hackathons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scout_hackathons" ON scout_hackathons;
CREATE POLICY "anon_insert_scout_hackathons" ON scout_hackathons FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scout_hackathons" ON scout_hackathons;
CREATE POLICY "anon_update_scout_hackathons" ON scout_hackathons FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scout_hackathons" ON scout_hackathons;
CREATE POLICY "anon_delete_scout_hackathons" ON scout_hackathons FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- dev_news
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev_news (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  headline   text NOT NULL,
  source     text,
  signal     text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dev_news_profile_id_idx ON dev_news (profile_id);
CREATE INDEX IF NOT EXISTS dev_news_created_at_idx ON dev_news (created_at DESC);

ALTER TABLE dev_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dev_news" ON dev_news;
CREATE POLICY "anon_select_dev_news" ON dev_news FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_dev_news" ON dev_news;
CREATE POLICY "anon_insert_dev_news" ON dev_news FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_dev_news" ON dev_news;
CREATE POLICY "anon_update_dev_news" ON dev_news FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_dev_news" ON dev_news;
CREATE POLICY "anon_delete_dev_news" ON dev_news FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- target_analyses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS target_analyses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url               text NOT NULL,
  title             text,
  org               text,
  kind              text NOT NULL DEFAULT 'role',
  source            text DEFAULT 'cached',
  latency_ms        integer DEFAULT 0,
  p_accept          numeric DEFAULT 0,
  p_shortlist       numeric DEFAULT 0,
  confidence        numeric DEFAULT 0,
  delta_vs_baseline numeric DEFAULT 0,
  matched_skills    jsonb DEFAULT '[]'::jsonb,
  missing_signals   jsonb DEFAULT '[]'::jsonb,
  pitch             text,
  excerpt           text,
  notice            text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS target_analyses_profile_id_idx ON target_analyses (profile_id);
CREATE INDEX IF NOT EXISTS target_analyses_url_idx ON target_analyses (url);

ALTER TABLE target_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_target_analyses" ON target_analyses;
CREATE POLICY "anon_select_target_analyses" ON target_analyses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_target_analyses" ON target_analyses;
CREATE POLICY "anon_insert_target_analyses" ON target_analyses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_target_analyses" ON target_analyses;
CREATE POLICY "anon_update_target_analyses" ON target_analyses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_target_analyses" ON target_analyses;
CREATE POLICY "anon_delete_target_analyses" ON target_analyses FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- engine_configs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS engine_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL DEFAULT 'default',
  llm_provider  text NOT NULL DEFAULT 'zai',
  llm_model     text,
  jev_endpoint  text,
  firecrawl_key text,
  llm_key       text,
  jev_key       text,
  is_active     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS engine_configs_label_key ON engine_configs (label);

ALTER TABLE engine_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_engine_configs" ON engine_configs;
CREATE POLICY "anon_select_engine_configs" ON engine_configs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_engine_configs" ON engine_configs;
CREATE POLICY "anon_insert_engine_configs" ON engine_configs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_engine_configs" ON engine_configs;
CREATE POLICY "anon_update_engine_configs" ON engine_configs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_engine_configs" ON engine_configs;
CREATE POLICY "anon_delete_engine_configs" ON engine_configs FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS engine_configs_set_updated_at ON engine_configs;
CREATE TRIGGER engine_configs_set_updated_at
  BEFORE UPDATE ON engine_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage bucket for logos / exported assets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_read_logos" ON storage.objects;
CREATE POLICY "anon_read_logos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'logos');
