-- ================================================================
-- Fold per-type detail tables into department_bdt_nodes.metadata (2/3)
--
-- Recreate insert_bdt_node_from_json WITHOUT the per-type detail inserts for the
-- 6 folded tables. v_meta already carries every type-specific field into the node
-- metadata (members, memberCount, projectDetails, status, etc.), so no data is lost.
-- Only department_metric_links is still written (kept side table).
--
-- Deploy together with the metadata-only route code, AFTER 032 backfill,
-- BEFORE 034 drop.
-- ================================================================

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

  -- Only metric nodes keep a side table; all other detail lives in v_meta above.
  IF v_type = 'metric' THEN
    INSERT INTO public.department_metric_links (node_id, metric_key, metadata)
    VALUES (v_node_id, p_node->>'metricKey', v_meta)
    ON CONFLICT (node_id) DO UPDATE
      SET metric_key = EXCLUDED.metric_key, metadata = EXCLUDED.metadata;
  END IF;

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
