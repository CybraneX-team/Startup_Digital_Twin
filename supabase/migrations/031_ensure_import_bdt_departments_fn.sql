-- ================================================================
-- Ensure import_bdt_departments_from_json() exists.
--
-- This wrapper was defined in 020_bdt_onboarding_import.sql but is MISSING from the
-- live database (only its helpers insert_bdt_node_from_json + clear_company_departments
-- were applied). It is now the single department seeding path, called from
-- POST /api/companies, so it must exist. Recreate it from the canonical 020 body.
--
-- Dependencies (all verified present): companies.bdt_onboarding_selection,
-- departments.color (029), department_bdt_nodes.node_level + mapped_universal_category
-- (028), clear_company_departments, slugify_department_label, insert_bdt_node_from_json.
-- ================================================================

CREATE OR REPLACE FUNCTION public.import_bdt_departments_from_json(
  p_company_id UUID,
  p_departments JSONB,
  p_selection JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dept JSONB;
  v_department_id UUID;
  v_sort INTEGER := 0;
  node JSONB;
  v_node_sort INTEGER;
  v_source_key TEXT;
BEGIN
  PERFORM public.clear_company_departments(p_company_id);

  UPDATE public.companies
  SET bdt_onboarding_selection = coalesce(p_selection, '{}'::jsonb),
      updated_at = NOW()
  WHERE id = p_company_id;

  FOR dept IN SELECT * FROM jsonb_array_elements(coalesce(p_departments, '[]'::jsonb))
  LOOP
    v_source_key := coalesce(dept->>'source_key', dept->>'id');

    INSERT INTO public.departments (
      company_id, source_key, label, slug, domain, cluster, score, metrics, color, sort_order
    )
    VALUES (
      p_company_id,
      v_source_key,
      coalesce(dept->>'label', 'Department'),
      public.slugify_department_label(coalesce(dept->>'label', 'department')),
      coalesce(dept->>'domain', 'build'),
      coalesce(dept->>'cluster', ''),
      coalesce((dept->>'score')::INTEGER, 75),
      coalesce(dept->'metrics', '{"performance":75,"efficiency":75,"capacity":75,"alignment":75,"risk":25}'::jsonb),
      dept->>'color',
      v_sort
    )
    ON CONFLICT (company_id, slug) DO UPDATE
      SET source_key = EXCLUDED.source_key,
          label = EXCLUDED.label,
          domain = EXCLUDED.domain,
          cluster = EXCLUDED.cluster,
          score = EXCLUDED.score,
          metrics = EXCLUDED.metrics,
          color = EXCLUDED.color,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
    RETURNING id INTO v_department_id;

    v_node_sort := 0;
    IF dept ? 'internalNodes' AND jsonb_typeof(dept->'internalNodes') = 'array' THEN
      FOR node IN SELECT * FROM jsonb_array_elements(dept->'internalNodes')
      LOOP
        PERFORM public.insert_bdt_node_from_json(
          p_company_id, v_department_id, NULL, node, v_node_sort
        );
        v_node_sort := v_node_sort + 1;
      END LOOP;
    END IF;

    v_sort := v_sort + 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.import_bdt_departments_from_json IS
  'Replace company BDT with a department payload. Called by POST /api/companies during seeding.';
