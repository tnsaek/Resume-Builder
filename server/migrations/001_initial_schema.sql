CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  github_url TEXT,
  headline TEXT,
  summary TEXT,
  skills JSONB,
  tools JSONB,
  work_history JSONB,
  education JSONB,
  certifications JSONB,
  projects JSONB,
  achievements JSONB,
  volunteer_work JSONB,
  languages JSONB,
  job_preferences JSONB,
  availability TEXT,
  work_authorization TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS tools JSONB,
  ADD COLUMN IF NOT EXISTS education JSONB,
  ADD COLUMN IF NOT EXISTS certifications JSONB,
  ADD COLUMN IF NOT EXISTS projects JSONB,
  ADD COLUMN IF NOT EXISTS achievements JSONB,
  ADD COLUMN IF NOT EXISTS volunteer_work JSONB,
  ADD COLUMN IF NOT EXISTS languages JSONB,
  ADD COLUMN IF NOT EXISTS job_preferences JSONB,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS work_authorization TEXT;

CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generate_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS saved_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  job_post TEXT NOT NULL,
  resume_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_letter TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_drafts_user_updated ON saved_drafts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
