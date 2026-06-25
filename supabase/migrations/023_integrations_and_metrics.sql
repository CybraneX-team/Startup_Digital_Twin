-- ================================================================
-- Integrations: OAuth connections and metric snapshots
-- ================================================================

CREATE TABLE IF NOT EXISTS public.integration_connections (
  company_id        UUID         NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id    TEXT         NOT NULL,
  account_name      TEXT,
  sandbox_mode      BOOLEAN      NOT NULL DEFAULT false,
  access_token_enc  TEXT,
  refresh_token_enc TEXT,
  token_expires_at  TIMESTAMPTZ,
  last_synced_at    TIMESTAMPTZ,
  metadata          JSONB        NOT NULL DEFAULT '{}',
  connected_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, integration_id)
);

CREATE TABLE IF NOT EXISTS public.metric_snapshots (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id TEXT        NOT NULL,
  snapshot_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  metrics        JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_lookup
  ON public.metric_snapshots (company_id, integration_id, snapshot_at DESC);
