-- ================================================================
-- BDT Level-1 Node Layer
-- Adds 'level1' to node_level, mapped_universal_category column,
-- and DB-level max-6 enforcement trigger.
-- ================================================================

-- Extend node_level CHECK to include 'level1'
ALTER TABLE public.department_bdt_nodes
  DROP CONSTRAINT IF EXISTS department_bdt_nodes_node_level_check;

ALTER TABLE public.department_bdt_nodes
  ADD CONSTRAINT department_bdt_nodes_node_level_check
  CHECK (node_level IN ('level1', 'branch', 'internal', 'action'));

-- Hidden AI/analytics taxonomy field on Level-1 nodes
ALTER TABLE public.department_bdt_nodes
  ADD COLUMN IF NOT EXISTS mapped_universal_category TEXT
  CHECK (mapped_universal_category IN (
    'purpose_scope', 'objectives_okrs', 'core_workstreams',
    'metrics_health', 'resources_capacity', 'dependencies',
    'risks_controls', 'decision_queue'
  ));

COMMENT ON COLUMN public.department_bdt_nodes.mapped_universal_category IS
  'Hidden universal taxonomy for AI/analytics — set only on node_level=''level1'' nodes. Maps dept-specific visible label to a standard BDT branch category.';

-- Efficient lookup for "which Level-1 nodes does this dept have?"
CREATE INDEX IF NOT EXISTS idx_dept_nodes_level1
  ON public.department_bdt_nodes (department_id, node_level)
  WHERE node_level = 'level1';

-- DB-level max-6 guard (belt-and-suspenders; app code also enforces)
CREATE OR REPLACE FUNCTION public.check_level1_node_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.node_level = 'level1' THEN
    IF (
      SELECT COUNT(*)
        FROM public.department_bdt_nodes
       WHERE department_id = NEW.department_id
         AND node_level = 'level1'
         AND id IS DISTINCT FROM NEW.id
    ) >= 6 THEN
      RAISE EXCEPTION 'department_level1_limit: Department cannot have more than 6 Level-1 nodes';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_level1_limit ON public.department_bdt_nodes;
CREATE TRIGGER enforce_level1_limit
  BEFORE INSERT OR UPDATE ON public.department_bdt_nodes
  FOR EACH ROW EXECUTE FUNCTION public.check_level1_node_limit();

-- Update insert_bdt_node_from_json to persist node_level and mapped_universal_category
CREATE OR REPLACE FUNCTION public.insert_bdt_node_from_json(
  p_company_id UUID,
  p_department_id UUID,
  p_parent_node_id UUID,
  p_node JSONB,
  p_sort_order INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node_id UUID;
  v_type TEXT;
  v_node_level TEXT;
  v_mapped_category TEXT;
  v_meta JSONB;
  child JSONB;
  v_child_sort INTEGER := 0;
BEGIN
  v_type := coalesce(p_node->>'type', 'team');
  v_node_level := p_node->>'nodeLevel';
  v_mapped_category := p_node->>'mappedUniversalCategory';

  v_meta := coalesce(p_node->'metadata', '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'owner', p_node->>'owner',
      'dueDate', p_node->>'dueDate',
      'status', p_node->>'status',
      'output', p_node->>'output',
      'metricImpact', p_node->>'metricImpact',
      'dependencies', p_node->'dependencies',
      'workflowSteps', p_node->'workflowSteps',
      'interrelatedDepartments', p_node->'interrelatedDepartments',
      'members', p_node->'members',
      'memberCount', p_node->'memberCount',
      'projectDetails', p_node->'projectDetails',
      'signalDetails', p_node->'signalDetails',
      'decisionDetails', p_node->'decisionDetails',
      'metricDetails', p_node->'metricDetails',
      'actionDetails', p_node->'actionDetails'
    ));

  INSERT INTO public.department_bdt_nodes (
    company_id, department_id, parent_node_id, source_key, label,
    node_type, node_level, mapped_universal_category,
    score, sort_order, metadata
  )
  VALUES (
    p_company_id,
    p_department_id,
    p_parent_node_id,
    p_node->>'id',
    coalesce(p_node->>'label', 'Node'),
    v_type,
    v_node_level,
    v_mapped_category,
    coalesce((p_node->>'score')::INTEGER, 75),
    p_sort_order,
    v_meta
  )
  RETURNING id INTO v_node_id;

  CASE v_type
    WHEN 'team' THEN
      INSERT INTO public.department_teams (node_id, member_count, role_templates, metadata)
      VALUES (
        v_node_id,
        coalesce((p_node->>'memberCount')::INTEGER, 0),
        ARRAY[]::TEXT[],
        jsonb_build_object('members', coalesce(p_node->'members', '[]'::jsonb))
      )
      ON CONFLICT (node_id) DO UPDATE
        SET member_count = EXCLUDED.member_count,
            metadata = EXCLUDED.metadata;
    WHEN 'project' THEN
      INSERT INTO public.department_projects (node_id, description, status, deadline, budget)
      VALUES (
        v_node_id,
        p_node->'projectDetails'->>'description',
        p_node->'projectDetails'->>'status',
        p_node->'projectDetails'->>'deadline',
        p_node->'projectDetails'->>'budget'
      )
      ON CONFLICT (node_id) DO UPDATE
        SET description = EXCLUDED.description,
            status = EXCLUDED.status,
            deadline = EXCLUDED.deadline,
            budget = EXCLUDED.budget;
    WHEN 'process' THEN
      INSERT INTO public.department_processes (node_id, description, metadata)
      VALUES (v_node_id, p_node->>'description', v_meta)
      ON CONFLICT (node_id) DO UPDATE
        SET description = EXCLUDED.description, metadata = EXCLUDED.metadata;
    WHEN 'resource' THEN
      INSERT INTO public.department_resources (node_id, resource_type, metadata)
      VALUES (v_node_id, p_node->>'resourceType', v_meta)
      ON CONFLICT (node_id) DO UPDATE
        SET resource_type = EXCLUDED.resource_type, metadata = EXCLUDED.metadata;
    WHEN 'decision' THEN
      INSERT INTO public.department_decisions (node_id, status, metadata)
      VALUES (v_node_id, p_node->>'status', v_meta)
      ON CONFLICT (node_id) DO UPDATE
        SET status = EXCLUDED.status, metadata = EXCLUDED.metadata;
    WHEN 'risk' THEN
      INSERT INTO public.department_risks (node_id, status, impact, metadata)
      VALUES (v_node_id, coalesce(p_node->>'status', 'active'), p_node->>'impact', v_meta)
      ON CONFLICT (node_id) DO UPDATE
        SET status = EXCLUDED.status, impact = EXCLUDED.impact, metadata = EXCLUDED.metadata;
    WHEN 'metric' THEN
      INSERT INTO public.department_metric_links (node_id, metric_key, metadata)
      VALUES (v_node_id, p_node->>'metricKey', v_meta)
      ON CONFLICT (node_id) DO UPDATE
        SET metric_key = EXCLUDED.metric_key, metadata = EXCLUDED.metadata;
    ELSE NULL;
  END CASE;

  FOR child IN SELECT * FROM jsonb_array_elements(coalesce(p_node->'children', '[]'::jsonb))
  LOOP
    PERFORM public.insert_bdt_node_from_json(
      p_company_id, p_department_id, v_node_id, child, v_child_sort
    );
    v_child_sort := v_child_sort + 1;
  END LOOP;

  RETURN v_node_id;
END;
$$;
