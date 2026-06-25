-- ================================================================
-- Manual reference-company nodes: user-authored IDT intelligence
-- (signals, people, branches, actions) added by hand alongside the
-- AI-researched node tree. Manual nodes must survive generate/refresh
-- jobs, which delete and rebuild the AI-generated tree.
-- ================================================================

ALTER TABLE public.reference_company_nodes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai'
    CHECK (source IN ('ai', 'manual')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Existing rows default to 'ai' (all pre-existing nodes were AI-generated).
