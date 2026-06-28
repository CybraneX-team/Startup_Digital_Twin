-- ================================================================
-- Fold per-type detail tables into department_bdt_nodes.metadata (1/3)
--
-- Backfill only. No drops. Idempotent: each UPDATE fills a metadata key
-- ONLY when it is absent (existing metadata always wins via `built || n.metadata`).
-- Run BEFORE deploying the metadata-only route code; the DROP is migration 034.
--
-- Tables folded: department_teams, department_projects, department_processes,
-- department_resources, department_decisions, department_risks.
-- KEPT (not touched here): department_metric_links, department_node_members.
-- ================================================================

-- Projects → metadata.projectDetails {description,status,deadline,budget}
UPDATE public.department_bdt_nodes n
   SET metadata = jsonb_strip_nulls(jsonb_build_object(
         'projectDetails', jsonb_strip_nulls(jsonb_build_object(
           'description', p.description,
           'status',      p.status,
           'deadline',    p.deadline,
           'budget',      p.budget
         ))
       )) || n.metadata
  FROM public.department_projects p
 WHERE p.node_id = n.id
   AND NOT (n.metadata ? 'projectDetails');

-- Teams → metadata.memberCount + metadata.members (members live relationally in
-- department_node_members; this is the cached fallback the read path uses)
UPDATE public.department_bdt_nodes n
   SET metadata = jsonb_strip_nulls(jsonb_build_object(
         'memberCount', to_jsonb(t.member_count),
         'members',     t.metadata->'members'
       )) || n.metadata
  FROM public.department_teams t
 WHERE t.node_id = n.id
   AND NOT (n.metadata ? 'members');

-- Processes → metadata.description / metadata.owner
UPDATE public.department_bdt_nodes n
   SET metadata = jsonb_strip_nulls(jsonb_build_object(
         'description', pr.description,
         'owner',       pr.owner
       )) || n.metadata
  FROM public.department_processes pr
 WHERE pr.node_id = n.id
   AND NOT (n.metadata ? 'description');

-- Resources → metadata.resourceType
UPDATE public.department_bdt_nodes n
   SET metadata = jsonb_strip_nulls(jsonb_build_object(
         'resourceType', r.resource_type
       )) || n.metadata
  FROM public.department_resources r
 WHERE r.node_id = n.id
   AND NOT (n.metadata ? 'resourceType');

-- Decisions → metadata.status / metadata.decidedAt
UPDATE public.department_bdt_nodes n
   SET metadata = jsonb_strip_nulls(jsonb_build_object(
         'status',    d.status,
         'decidedAt', d.decided_at
       )) || n.metadata
  FROM public.department_decisions d
 WHERE d.node_id = n.id
   AND NOT (n.metadata ? 'status');

-- Risks → metadata.status / metadata.impact
UPDATE public.department_bdt_nodes n
   SET metadata = jsonb_strip_nulls(jsonb_build_object(
         'status', rk.status,
         'impact', rk.impact
       )) || n.metadata
  FROM public.department_risks rk
 WHERE rk.node_id = n.id
   AND NOT (n.metadata ? 'impact');
