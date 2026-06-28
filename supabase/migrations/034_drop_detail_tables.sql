-- ================================================================
-- Fold per-type detail tables into department_bdt_nodes.metadata (3/3)
--
-- DESTRUCTIVE. Run ONLY after:
--   1) migration 032 backfilled metadata, AND
--   2) the metadata-only route code + migration 033 are deployed & verified
--      (GET /api/departments JSON unchanged; see plan verification #5/#6).
--
-- CASCADE also removes each table's SELECT-only RLS policies (migration 018).
-- KEPT: department_metric_links, department_node_members.
-- ================================================================

DROP TABLE IF EXISTS public.department_teams     CASCADE;
DROP TABLE IF EXISTS public.department_projects  CASCADE;
DROP TABLE IF EXISTS public.department_processes CASCADE;
DROP TABLE IF EXISTS public.department_resources CASCADE;
DROP TABLE IF EXISTS public.department_decisions CASCADE;
DROP TABLE IF EXISTS public.department_risks     CASCADE;
