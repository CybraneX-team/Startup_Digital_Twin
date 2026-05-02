-- ================================================================
-- 007_subdomains.sql
-- Adds the subdomain layer that bridges Industry → Company in the
-- 3D universe view (/3d). Each industry galaxy now has 5–8
-- subdomain "planets" orbiting it, and each company orbits a
-- specific subdomain instead of the industry centroid.
-- ================================================================

CREATE TABLE IF NOT EXISTS subdomains (
  id           TEXT PRIMARY KEY,                    -- e.g. 'sd-saas-crm'
  industry_id  TEXT NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  description  TEXT,
  orbit_index  INT  NOT NULL DEFAULT 0,             -- 0..N within industry (controls planet ring radius)
  color        TEXT,                                 -- optional hex; falls back to industry color
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subdomains_industry ON subdomains(industry_id);

-- Add subdomain_id FK on companies. NULL until backfill / onboarding picks one.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subdomain_id TEXT REFERENCES subdomains(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON companies(subdomain_id);

-- ────────────────────────────────────────────────────────────────
-- RLS — read-only to authenticated users (subdomain catalog is public-ish)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE subdomains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subdomains_read_authenticated" ON subdomains;
CREATE POLICY "subdomains_read_authenticated"
  ON subdomains FOR SELECT
  USING (auth.role() = 'authenticated');
