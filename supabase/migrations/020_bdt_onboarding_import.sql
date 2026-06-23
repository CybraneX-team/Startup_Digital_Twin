-- ================================================================
-- BDT onboarding — full internal trees, per-dept colors, selective import
-- ================================================================

-- Expand node_type to match frontend BDT seed (branch, action, signal)
ALTER TABLE public.department_bdt_nodes
  DROP CONSTRAINT IF EXISTS department_bdt_nodes_node_type_check;

ALTER TABLE public.department_bdt_nodes
  ADD CONSTRAINT department_bdt_nodes_node_type_check
  CHECK (node_type IN (
    'team', 'process', 'project', 'resource', 'decision', 'risk', 'metric',
    'branch', 'action', 'signal'
  ));

-- Per-department accent color (Company Department framework §6)
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS color TEXT;

COMMENT ON COLUMN public.departments.color IS
  'Hex accent for BDT polytope and onboarding chips; distinct per department.';

-- Onboarding selection audit / skip default seed
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS bdt_onboarding_selection JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.companies.bdt_onboarding_selection IS
  'BDT onboarding: { source_keys: string[], custom_labels: string[], imported_at: timestamptz }';

-- Replace all company departments (used by import replace mode)
CREATE OR REPLACE FUNCTION public.clear_company_departments(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.departments WHERE company_id = p_company_id;
END;
$$;

-- Insert one internal node + optional detail row; recurse into children
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
  v_meta JSONB;
  child JSONB;
  v_child_sort INTEGER := 0;
BEGIN
  v_type := coalesce(p_node->>'type', 'team');
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
    company_id, department_id, parent_node_id, source_key, label, node_type, score, sort_order, metadata
  )
  VALUES (
    p_company_id,
    p_department_id,
    p_parent_node_id,
    p_node->>'id',
    coalesce(p_node->>'label', 'Node'),
    v_type,
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
        coalesce(ARRAY(SELECT jsonb_array_elements_text(p_node->'role_templates')), '{}'),
        coalesce(p_node->'members', '[]'::jsonb)
      )
      ON CONFLICT (node_id) DO NOTHING;
    WHEN 'project' THEN
      INSERT INTO public.department_projects (node_id, description, status, deadline, budget, metadata)
      VALUES (
        v_node_id,
        p_node->'projectDetails'->>'description',
        coalesce(p_node->'projectDetails'->>'status', p_node->>'status'),
        p_node->'projectDetails'->>'deadline',
        p_node->'projectDetails'->>'budget',
        coalesce(p_node->'projectDetails', '{}'::jsonb)
      )
      ON CONFLICT (node_id) DO NOTHING;
    WHEN 'process' THEN
      INSERT INTO public.department_processes (node_id, description, owner, metadata)
      VALUES (v_node_id, p_node->>'output', p_node->>'owner', v_meta)
      ON CONFLICT (node_id) DO NOTHING;
    WHEN 'metric' THEN
      INSERT INTO public.department_metric_links (node_id, metric_key, metadata)
      VALUES (
        v_node_id,
        coalesce(p_node->'metricDetails'->>'name', p_node->>'metricImpact'),
        coalesce(p_node->'metricDetails', '{}'::jsonb)
      )
      ON CONFLICT (node_id) DO NOTHING;
    WHEN 'decision' THEN
      INSERT INTO public.department_decisions (node_id, status, metadata)
      VALUES (v_node_id, coalesce(p_node->>'status', 'open'), coalesce(p_node->'decisionDetails', v_meta))
      ON CONFLICT (node_id) DO NOTHING;
    WHEN 'risk' THEN
      INSERT INTO public.department_risks (node_id, status, impact, metadata)
      VALUES (v_node_id, coalesce(p_node->>'status', 'active'), p_node->>'metricImpact', v_meta)
      ON CONFLICT (node_id) DO NOTHING;
    WHEN 'resource' THEN
      INSERT INTO public.department_resources (node_id, resource_type, metadata)
      VALUES (v_node_id, p_node->>'output', v_meta)
      ON CONFLICT (node_id) DO NOTHING;
    ELSE
      NULL;
  END CASE;

  IF p_node ? 'children' AND jsonb_typeof(p_node->'children') = 'array' THEN
    FOR child IN SELECT * FROM jsonb_array_elements(p_node->'children')
    LOOP
      PERFORM public.insert_bdt_node_from_json(
        p_company_id, p_department_id, v_node_id, child, v_child_sort
      );
      v_child_sort := v_child_sort + 1;
    END LOOP;
  END IF;

  RETURN v_node_id;
END;
$$;

-- Import full BDT graph from frontend onboarding payload
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
  'Replace company BDT with onboarding payload. Backend POST /api/departments/import should call this RPC.';

-- Skip seeding all 13 framework departments when onboarding already selected departments
CREATE OR REPLACE FUNCTION public.seed_default_departments_for_company(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  v_department_id UUID;
  v_group_id UUID;
  v_child_id UUID;
  v_sort_order INTEGER := 0;
  v_selection JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.departments WHERE company_id = p_company_id) THEN
    RETURN;
  END IF;

  SELECT coalesce(bdt_onboarding_selection, '{}'::jsonb)
  INTO v_selection
  FROM public.companies
  WHERE id = p_company_id;

  IF jsonb_array_length(coalesce(v_selection->'source_keys', '[]'::jsonb)) > 0 THEN
    RETURN;
  END IF;

  FOR d IN
    SELECT * FROM jsonb_to_recordset('[
      {"source_key":"dept_engineering","label":"Engineering","domain":"build","cluster":"Build","score":91,"metrics":{"performance":91,"efficiency":85,"capacity":78,"alignment":88,"risk":14}},
      {"source_key":"dept_product","label":"Product","domain":"direction","cluster":"Direction","score":91,"metrics":{"performance":93,"efficiency":90,"capacity":85,"alignment":95,"risk":8}},
      {"source_key":"dept_sales","label":"Sales","domain":"market","cluster":"Market","score":78,"metrics":{"performance":80,"efficiency":74,"capacity":82,"alignment":76,"risk":22}},
      {"source_key":"dept_marketing","label":"Marketing","domain":"market","cluster":"Market","score":72,"metrics":{"performance":75,"efficiency":68,"capacity":74,"alignment":72,"risk":26}},
      {"source_key":"dept_hr","label":"People & HR","domain":"people","cluster":"People","score":84,"metrics":{"performance":86,"efficiency":82,"capacity":80,"alignment":88,"risk":12}},
      {"source_key":"dept_finance","label":"Finance","domain":"control","cluster":"Control","score":93,"metrics":{"performance":95,"efficiency":92,"capacity":90,"alignment":94,"risk":6}},
      {"source_key":"dept_operations","label":"Operations","domain":"delivery","cluster":"Delivery","score":61,"metrics":{"performance":63,"efficiency":58,"capacity":65,"alignment":60,"risk":38}},
      {"source_key":"dept_data","label":"Data & Analytics","domain":"build","cluster":"Build","score":76,"metrics":{"performance":78,"efficiency":74,"capacity":72,"alignment":79,"risk":20}},
      {"source_key":"dept_design","label":"Design","domain":"build","cluster":"Build","score":88,"metrics":{"performance":91,"efficiency":87,"capacity":83,"alignment":90,"risk":10}},
      {"source_key":"dept_security","label":"Security","domain":"control","cluster":"Control","score":69,"metrics":{"performance":71,"efficiency":65,"capacity":68,"alignment":73,"risk":32}},
      {"source_key":"dept_customer_success","label":"Customer Success","domain":"delivery","cluster":"Delivery","score":82,"metrics":{"performance":84,"efficiency":80,"capacity":81,"alignment":85,"risk":16}},
      {"source_key":"dept_legal","label":"Legal & Compliance","domain":"control","cluster":"Control","score":87,"metrics":{"performance":88,"efficiency":85,"capacity":82,"alignment":90,"risk":12}},
      {"source_key":"dept_strategy","label":"Strategy","domain":"direction","cluster":"Direction","score":94,"metrics":{"performance":95,"efficiency":92,"capacity":90,"alignment":96,"risk":7}}
    ]'::jsonb) AS x(source_key TEXT, label TEXT, domain TEXT, cluster TEXT, score INT, metrics JSONB)
  LOOP
    INSERT INTO public.departments (company_id, source_key, label, slug, domain, cluster, score, metrics, sort_order)
    VALUES (p_company_id, d.source_key, d.label, public.slugify_department_label(d.label), d.domain, d.cluster, d.score, d.metrics, v_sort_order)
    ON CONFLICT (company_id, slug) DO UPDATE
      SET label = EXCLUDED.label
    RETURNING id INTO v_department_id;

    INSERT INTO public.department_bdt_nodes (company_id, department_id, source_key, label, node_type, score, sort_order)
    VALUES (p_company_id, v_department_id, d.source_key || ':teams', 'Teams', 'team', greatest(d.score - 2, 0), 0)
    RETURNING id INTO v_group_id;
    INSERT INTO public.department_teams (node_id, member_count, role_templates)
    VALUES (v_group_id, 0, '{}') ON CONFLICT (node_id) DO NOTHING;
    INSERT INTO public.department_bdt_nodes (company_id, department_id, parent_node_id, source_key, label, node_type, score, sort_order)
    VALUES (p_company_id, v_department_id, v_group_id, d.source_key || ':core-team', d.label || ' Team', 'team', d.score, 0)
    RETURNING id INTO v_child_id;
    INSERT INTO public.department_teams (node_id, member_count, role_templates)
    VALUES (v_child_id, 0, '{}') ON CONFLICT (node_id) DO NOTHING;

    INSERT INTO public.department_bdt_nodes (company_id, department_id, source_key, label, node_type, score, sort_order)
    VALUES (p_company_id, v_department_id, d.source_key || ':projects', 'Projects', 'project', greatest(d.score - 4, 0), 1)
    RETURNING id INTO v_group_id;
    INSERT INTO public.department_projects (node_id, status, description)
    VALUES (v_group_id, 'Active', d.label || ' initiatives') ON CONFLICT (node_id) DO NOTHING;
    INSERT INTO public.department_bdt_nodes (company_id, department_id, parent_node_id, source_key, label, node_type, score, sort_order)
    VALUES (p_company_id, v_department_id, v_group_id, d.source_key || ':priority-project', d.label || ' Roadmap', 'project', d.score, 0)
    RETURNING id INTO v_child_id;
    INSERT INTO public.department_projects (node_id, status, description)
    VALUES (v_child_id, 'Planning', 'Seeded from the current BDT mock data') ON CONFLICT (node_id) DO NOTHING;

    INSERT INTO public.department_bdt_nodes (company_id, department_id, source_key, label, node_type, score, sort_order)
    VALUES (p_company_id, v_department_id, d.source_key || ':processes', 'Processes', 'process', greatest(d.score - 6, 0), 2)
    RETURNING id INTO v_group_id;
    INSERT INTO public.department_processes (node_id, description)
    VALUES (v_group_id, d.label || ' operating system') ON CONFLICT (node_id) DO NOTHING;
    INSERT INTO public.department_bdt_nodes (company_id, department_id, parent_node_id, source_key, label, node_type, score, sort_order)
    VALUES (p_company_id, v_department_id, v_group_id, d.source_key || ':health-metric', d.label || ' Health', 'metric', d.score, 0)
    RETURNING id INTO v_child_id;
    INSERT INTO public.department_metric_links (node_id, metric_key, metadata)
    VALUES (v_child_id, 'headcount', jsonb_build_object('seeded', true)) ON CONFLICT (node_id) DO NOTHING;

    v_sort_order := v_sort_order + 1;
  END LOOP;
END;
$$;
