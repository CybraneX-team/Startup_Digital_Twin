-- ================================================================
-- BDT structural alignment: branch kinds, node levels, company size
-- ================================================================

ALTER TABLE public.department_bdt_nodes
  ADD COLUMN IF NOT EXISTS branch_kind TEXT
    CHECK (branch_kind IN (
      'purpose_scope','objectives_okrs','core_workstreams','metrics_health',
      'resources_capacity','dependencies','risks_controls','decision_queue'
    ));

ALTER TABLE public.department_bdt_nodes
  ADD COLUMN IF NOT EXISTS node_level TEXT
    CHECK (node_level IN ('branch','internal','action'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS bdt_company_size TEXT
    CHECK (bdt_company_size IN ('micro','msme','standard','enterprise'))
    DEFAULT 'standard';

-- Seed 13 departments × 8 empty branches on company creation
CREATE OR REPLACE FUNCTION public.seed_default_departments_for_company(p_company_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_dept_id UUID;
  v_dept RECORD;
  v_branch RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM public.departments WHERE company_id = p_company_id LIMIT 1) THEN
    RETURN;
  END IF;

  FOR v_dept IN SELECT * FROM (VALUES
    ('dept_strategy',         'Strategy',            'direction', 'Direction', 95, '#F2C94C'),
    ('dept_product',          'Product',             'direction', 'Direction', 91, '#6C63FF'),
    ('dept_engineering',      'Engineering',         'build',     'Build',     85, '#2F80ED'),
    ('dept_design',           'Design',              'build',     'Build',     88, '#BB6BD9'),
    ('dept_data',             'Data & Analytics',    'build',     'Build',     76, '#56CCF2'),
    ('dept_sales',            'Sales',               'market',    'Market',    78, '#F2994A'),
    ('dept_marketing',        'Marketing',           'market',    'Market',    72, '#EB5757'),
    ('dept_customer_success', 'Customer Success',    'delivery',  'Delivery',  82, '#00BFA6'),
    ('dept_hr',               'People & HR',         'people',    'People',    84, '#27AE60'),
    ('dept_finance',          'Finance',             'control',   'Control',   93, '#219653'),
    ('dept_operations',       'Operations',          'delivery',  'Delivery',  61, '#2D9CDB'),
    ('dept_security',         'Security',            'control',   'Control',   69, '#E8A317'),
    ('dept_legal',            'Legal & Compliance',  'control',   'Control',   89, '#D97706')
  ) AS t(source_key, label, domain, cluster, score, color)
  LOOP
    INSERT INTO public.departments
      (company_id, source_key, label, slug, domain, cluster, score, color, metrics, sort_order)
    VALUES (
      p_company_id, v_dept.source_key, v_dept.label,
      lower(replace(replace(v_dept.label, ' & ', '_'), ' ', '_')),
      v_dept.domain, v_dept.cluster, v_dept.score, v_dept.color,
      jsonb_build_object(
        'performance', v_dept.score, 'efficiency', v_dept.score - 5,
        'capacity', v_dept.score - 10, 'alignment', v_dept.score + 2, 'risk', 100 - v_dept.score
      ),
      0
    )
    ON CONFLICT (company_id, slug) DO NOTHING
    RETURNING id INTO v_dept_id;

    IF v_dept_id IS NOT NULL THEN
      FOR v_branch IN SELECT * FROM (VALUES
        ('purpose_scope',      'Purpose & Scope',       1),
        ('objectives_okrs',    'Objectives / OKRs',     2),
        ('core_workstreams',   'Core Workstreams',       3),
        ('metrics_health',     'Metrics & Health',       4),
        ('resources_capacity', 'Resources & Capacity',   5),
        ('dependencies',       'Dependencies',           6),
        ('risks_controls',     'Risks & Controls',       7),
        ('decision_queue',     'Decision Queue',         8)
      ) AS b(kind, label, sort_order)
      LOOP
        INSERT INTO public.department_bdt_nodes
          (company_id, department_id, label, node_type, branch_kind, node_level, score, sort_order, metadata)
        VALUES (
          p_company_id, v_dept_id, v_branch.label,
          'branch', v_branch.kind, 'branch', 75, v_branch.sort_order, '{}'
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
