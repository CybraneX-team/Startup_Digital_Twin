-- ================================================================
-- FounderOS — PostgreSQL Schema (Supabase)
-- Run in Supabase Dashboard > SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- ENUM types
-- ----------------------------------------------------------------
CREATE TYPE company_stage AS ENUM (
  'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B',
  'Series C', 'Series D+', 'Pre-IPO', 'Public', 'PSU', 'Bootstrapped'
);

CREATE TYPE company_status AS ENUM (
  'onboarding', 'active', 'inactive', 'suspended'
);

CREATE TYPE business_model AS ENUM (
  'B2B', 'B2C', 'B2B2C', 'Marketplace', 'SaaS', 'D2C', 'Other'
);

CREATE TYPE user_role AS ENUM (
  'super_admin', 'founder', 'co_founder', 'admin',
  'analyst', 'engineer', 'viewer', 'investor'
);

-- ----------------------------------------------------------------
-- Industries (reference data — seeded, not user-created)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS industries (
  id            TEXT PRIMARY KEY,
  label         TEXT        NOT NULL,
  description   TEXT,
  color         TEXT        NOT NULL DEFAULT '#ffffff',
  position_3d   JSONB       NOT NULL DEFAULT '{"x":0,"y":0,"z":0}',
  bubble_radius NUMERIC     NOT NULL DEFAULT 10,
  tags          TEXT[]      DEFAULT '{}'
);

-- ----------------------------------------------------------------
-- Companies (user-onboarded startups)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT           NOT NULL,
  slug            TEXT           UNIQUE NOT NULL,
  industry_id     TEXT           REFERENCES industries(id) ON DELETE SET NULL,
  stage           company_stage  NOT NULL DEFAULT 'Seed',
  country         TEXT           NOT NULL DEFAULT 'India',
  founded_year    INTEGER,
  description     TEXT,
  website         TEXT,
  logo_url        TEXT,
  mrr_usd         NUMERIC        DEFAULT 0,
  employees       INTEGER        DEFAULT 1,
  annual_revenue  NUMERIC        DEFAULT 0,
  burn_rate_usd   NUMERIC        DEFAULT 0,
  runway_months   INTEGER        DEFAULT 0,
  valuation       TEXT,
  target_market   TEXT,
  business_model  business_model,
  problem_solved  TEXT,
  usp             TEXT,
  competitors     TEXT[],
  status          company_status NOT NULL DEFAULT 'onboarding',
  is_public       BOOLEAN        DEFAULT FALSE,
  stock_symbol    TEXT,
  offset_3d       JSONB,         -- {x, y, z} computed on onboarding completion
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Roles + permissions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          TEXT  PRIMARY KEY,
  name        TEXT  NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'
  -- permissions shape: { module: { read: bool, write: bool, delete: bool } }
);

-- Seed roles
INSERT INTO roles (id, name, description, permissions) VALUES
('super_admin', 'Super Admin', 'Platform-level administrator', '{
  "*": {"read": true, "write": true, "delete": true}
}'),
('founder', 'Founder', 'Company founder — full access to own company', '{
  "twin":       {"read": true, "write": true, "delete": false},
  "strategy":   {"read": true, "write": true, "delete": true},
  "analytics":  {"read": true, "write": true, "delete": false},
  "data":       {"read": true, "write": true, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": true, "delete": true},
  "ecosystem":  {"read": true, "write": true, "delete": false},
  "settings":   {"read": true, "write": true, "delete": false}
}'),
('co_founder', 'Co-Founder', 'Co-founder — same as founder', '{
  "twin":       {"read": true, "write": true, "delete": false},
  "strategy":   {"read": true, "write": true, "delete": true},
  "analytics":  {"read": true, "write": true, "delete": false},
  "data":       {"read": true, "write": true, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": true, "delete": false},
  "ecosystem":  {"read": true, "write": true, "delete": false},
  "settings":   {"read": true, "write": false, "delete": false}
}'),
('admin', 'Admin', 'Team admin — manage members, read-write most modules', '{
  "twin":       {"read": true, "write": true, "delete": false},
  "strategy":   {"read": true, "write": true, "delete": false},
  "analytics":  {"read": true, "write": true, "delete": false},
  "data":       {"read": true, "write": true, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": true, "delete": false},
  "ecosystem":  {"read": true, "write": false, "delete": false},
  "settings":   {"read": true, "write": false, "delete": false}
}'),
('analyst', 'Analyst', 'Strategy and data analyst — no team management', '{
  "twin":       {"read": true, "write": false, "delete": false},
  "strategy":   {"read": true, "write": true,  "delete": false},
  "analytics":  {"read": true, "write": true,  "delete": false},
  "data":       {"read": true, "write": false, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": false, "delete": false},
  "ecosystem":  {"read": true, "write": false, "delete": false},
  "settings":   {"read": false,"write": false, "delete": false}
}'),
('engineer', 'Engineer', 'Engineering team — data ingestion + analytics read', '{
  "twin":       {"read": true, "write": false, "delete": false},
  "strategy":   {"read": true, "write": false, "delete": false},
  "analytics":  {"read": true, "write": false, "delete": false},
  "data":       {"read": true, "write": true,  "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": false, "delete": false},
  "ecosystem":  {"read": false,"write": false, "delete": false},
  "settings":   {"read": false,"write": false, "delete": false}
}'),
('viewer', 'Viewer', 'Read-only access to all modules', '{
  "twin":       {"read": true, "write": false, "delete": false},
  "strategy":   {"read": true, "write": false, "delete": false},
  "analytics":  {"read": true, "write": false, "delete": false},
  "data":       {"read": true, "write": false, "delete": false},
  "benchmarks": {"read": true, "write": false, "delete": false},
  "team":       {"read": true, "write": false, "delete": false},
  "ecosystem":  {"read": true, "write": false, "delete": false},
  "settings":   {"read": false,"write": false, "delete": false}
}'),
('investor', 'Investor', 'Limited read access — metrics and benchmarks only', '{
  "twin":       {"read": true,  "write": false, "delete": false},
  "strategy":   {"read": false, "write": false, "delete": false},
  "analytics":  {"read": true,  "write": false, "delete": false},
  "data":       {"read": false, "write": false, "delete": false},
  "benchmarks": {"read": true,  "write": false, "delete": false},
  "team":       {"read": true,  "write": false, "delete": false},
  "ecosystem":  {"read": false, "write": false, "delete": false},
  "settings":   {"read": false, "write": false, "delete": false}
}')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- User profiles (extends Supabase auth.users)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id           UUID        REFERENCES companies(id) ON DELETE SET NULL,
  role                 user_role   NOT NULL DEFAULT 'viewer',
  first_name           TEXT,
  last_name            TEXT,
  title                TEXT,
  avatar_url           TEXT,
  onboarding_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'founder'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------
-- Company members (team membership + per-company role)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'viewer',
  invited_by  UUID        REFERENCES auth.users(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);

-- ----------------------------------------------------------------
-- Onboarding progress (per company + user, per step)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id),
  current_step INTEGER     NOT NULL DEFAULT 1,
  steps_data   JSONB       NOT NULL DEFAULT '{}',
  completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);

-- ----------------------------------------------------------------
-- updated_at auto-trigger
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER companies_updated_at      BEFORE UPDATE ON companies      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER user_profiles_updated_at  BEFORE UPDATE ON user_profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER onboarding_updated_at     BEFORE UPDATE ON onboarding_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE industries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;

-- Industries: public read
CREATE POLICY "industries_public_read"
  ON industries FOR SELECT USING (TRUE);

-- Roles: public read
CREATE POLICY "roles_public_read"
  ON roles FOR SELECT USING (TRUE);

-- Companies: members can read; founder/admin can write
CREATE POLICY "companies_member_read"
  ON companies FOR SELECT USING (
    id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
    OR status = 'active'  -- active companies visible to all authenticated users
  );

CREATE POLICY "companies_founder_write"
  ON companies FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "companies_member_update"
  ON companies FOR UPDATE USING (
    id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()
      AND role IN ('founder', 'co_founder', 'admin')
    )
  );

-- User profiles: own profile
CREATE POLICY "profiles_own_read"
  ON user_profiles FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM company_members
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "profiles_own_write"
  ON user_profiles FOR ALL USING (id = auth.uid());

-- Company members: members of same company
CREATE POLICY "members_company_read"
  ON company_members FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members_founder_write"
  ON company_members FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()
      AND role IN ('founder', 'co_founder', 'admin')
    )
  );

-- Onboarding: own company
CREATE POLICY "onboarding_own"
  ON onboarding_progress FOR ALL USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND role IN ('founder','co_founder','admin')
    )
  );

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_companies_industry    ON companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_companies_status      ON companies(status);
CREATE INDEX IF NOT EXISTS idx_company_members_user  ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_comp  ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_company    ON onboarding_progress(company_id);
