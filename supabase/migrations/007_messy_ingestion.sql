-- ================================================================
-- FounderOS — Migration 007: Messy Excel Ingestion Foundation
-- ================================================================

-- ----------------------------------------------------------------
-- Metric registry: global canonical + extension metrics
-- ----------------------------------------------------------------
create table if not exists public.metric_definitions (
  metric_key            text primary key,
  tier                  text not null check (tier in ('canonical', 'extension')),
  parent_key            text references public.metric_definitions(metric_key),
  display_name          text not null,
  description           text,
  metric_kind           text not null check (metric_kind in ('flow', 'stock', 'ratio', 'count', 'derived')),
  aggregation_method    text not null check (aggregation_method in ('sum', 'avg', 'last', 'min', 'max', 'none')),
  default_period_grain  text not null check (default_period_grain in ('month', 'quarter', 'year', 'point_in_time')),
  polarity              text not null check (polarity in ('positive_good', 'negative_good', 'neutral')),
  unit_default          text not null,
  twin_node_hint        text,
  is_derived            boolean not null default false,
  derivation_expr       text,
  taxonomy_version      text not null default '2026-05-01',
  created_at            timestamptz not null default now()
);

alter table public.metric_definitions enable row level security;

drop policy if exists md_public_read on public.metric_definitions;
create policy md_public_read
  on public.metric_definitions
  for select
  using (true);

revoke insert, update, delete on public.metric_definitions from anon, authenticated;

insert into public.metric_definitions
  (metric_key, tier, parent_key, display_name, description, metric_kind,
   aggregation_method, default_period_grain, polarity, unit_default, twin_node_hint)
values
  ('revenue', 'canonical', null, 'Revenue', 'Top-line revenue for the period.', 'flow', 'sum', 'month', 'positive_good', 'usd', 'company'),
  ('mrr', 'canonical', null, 'MRR', 'Monthly recurring revenue.', 'stock', 'last', 'month', 'positive_good', 'usd', 'company'),
  ('arr', 'canonical', null, 'ARR', 'Annual recurring revenue.', 'stock', 'last', 'year', 'positive_good', 'usd', 'company'),
  ('burn', 'canonical', null, 'Burn', 'Net cash burn for the period.', 'flow', 'sum', 'month', 'negative_good', 'usd', 'company'),
  ('cash', 'canonical', null, 'Cash', 'Cash balance at period end.', 'stock', 'last', 'point_in_time', 'positive_good', 'usd', 'company'),
  ('headcount', 'canonical', null, 'Headcount', 'Team size at period end.', 'stock', 'last', 'point_in_time', 'neutral', 'count', 'company'),
  ('ad_spend', 'canonical', null, 'Ad Spend', 'Paid acquisition spend for the period.', 'flow', 'sum', 'month', 'negative_good', 'usd', 'kpi-growth-cac'),
  ('signups', 'canonical', null, 'Signups', 'New signups for the period.', 'flow', 'sum', 'month', 'positive_good', 'count', 'kpi-growth-activation'),
  ('cac', 'canonical', null, 'CAC', 'Customer acquisition cost.', 'ratio', 'avg', 'month', 'negative_good', 'usd', 'kpi-growth-cac'),
  ('ltv', 'canonical', null, 'LTV', 'Customer lifetime value.', 'ratio', 'avg', 'month', 'positive_good', 'usd', 'kpi-growth-ltv'),
  ('gross_margin_pct', 'canonical', null, 'Gross Margin %', 'Gross margin percentage.', 'ratio', 'avg', 'month', 'positive_good', 'percent', 'company'),
  ('cost_of_goods_sold', 'extension', 'revenue', 'COGS', 'Cost of goods sold for the period.', 'flow', 'sum', 'month', 'negative_good', 'usd', 'company'),
  ('operating_expenses', 'extension', 'burn', 'Operating Expenses', 'Operating expenses for the period.', 'flow', 'sum', 'month', 'negative_good', 'usd', 'company')
on conflict (metric_key) do update
  set tier = excluded.tier,
      parent_key = excluded.parent_key,
      display_name = excluded.display_name,
      description = excluded.description,
      metric_kind = excluded.metric_kind,
      aggregation_method = excluded.aggregation_method,
      default_period_grain = excluded.default_period_grain,
      polarity = excluded.polarity,
      unit_default = excluded.unit_default,
      twin_node_hint = excluded.twin_node_hint;

-- ----------------------------------------------------------------
-- Tenant-scoped custom metrics
-- ----------------------------------------------------------------
create table if not exists public.company_metric_definitions (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  metric_key          text not null,
  display_name        text not null,
  parent_key          text,
  description         text,
  metric_kind         text check (metric_kind in ('flow', 'stock', 'ratio', 'count', 'derived')),
  aggregation_method  text check (aggregation_method in ('sum', 'avg', 'last', 'min', 'max', 'none')),
  unit_default        text,
  created_at          timestamptz not null default now(),
  unique (company_id, metric_key)
);

alter table public.company_metric_definitions enable row level security;

drop policy if exists cmd_tenant on public.company_metric_definitions;
create policy cmd_tenant
  on public.company_metric_definitions
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ----------------------------------------------------------------
-- Full-sheet raw preservation, before region detection
-- ----------------------------------------------------------------
create table if not exists public.raw_workbook_sheets (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  file_id         uuid not null references public.ingestion_files(id) on delete cascade,
  job_id          uuid not null references public.ingestion_jobs(id) on delete cascade,
  sheet_idx       int not null,
  sheet_name      text not null,
  max_row         int not null default 0,
  max_column      int not null default 0,
  raw_grid        jsonb not null,
  schema_version  int not null default 1,
  created_at      timestamptz not null default now(),
  unique (file_id, sheet_idx)
);

create index if not exists ix_raw_sheets_company_file
  on public.raw_workbook_sheets (company_id, file_id);

alter table public.raw_workbook_sheets enable row level security;

drop policy if exists rws_tenant on public.raw_workbook_sheets;
create policy rws_tenant
  on public.raw_workbook_sheets
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ----------------------------------------------------------------
-- Region-level raw staging
-- ----------------------------------------------------------------
create table if not exists public.raw_extractions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  file_id         uuid not null references public.ingestion_files(id) on delete cascade,
  job_id          uuid not null references public.ingestion_jobs(id) on delete cascade,
  raw_sheet_id    uuid references public.raw_workbook_sheets(id) on delete set null,
  sheet_idx       int not null default 0,
  sheet_name      text not null,
  region_idx      int not null,
  bbox            text,
  layout          jsonb not null,
  raw_grid        jsonb not null,
  schema_version  int not null default 1,
  created_at      timestamptz not null default now(),
  unique (file_id, sheet_idx, region_idx)
);

create index if not exists ix_raw_company_file
  on public.raw_extractions (company_id, file_id);

alter table public.raw_extractions enable row level security;

drop policy if exists re_tenant on public.raw_extractions;
create policy re_tenant
  on public.raw_extractions
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ----------------------------------------------------------------
-- Extraction runs
-- ----------------------------------------------------------------
create table if not exists public.extraction_runs (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  file_id             uuid not null references public.ingestion_files(id) on delete cascade,
  region_id           uuid references public.raw_extractions(id) on delete cascade,
  job_id              uuid references public.ingestion_jobs(id),
  parser_version      text not null,
  taxonomy_version    text not null,
  classifier_version  text not null,
  prompt_version      text,
  status              text not null check (status in ('running', 'complete', 'failed')),
  is_current          boolean not null default false,
  error               text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz,
  unique (file_id, region_id, parser_version, taxonomy_version, classifier_version, prompt_version)
);

create unique index if not exists ux_runs_current
  on public.extraction_runs (file_id, region_id)
  where is_current;

create index if not exists ix_runs_company_file
  on public.extraction_runs (company_id, file_id, created_at desc);

alter table public.extraction_runs enable row level security;

drop policy if exists er_tenant on public.extraction_runs;
create policy er_tenant
  on public.extraction_runs
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ----------------------------------------------------------------
-- Per-locator extraction decisions
-- ----------------------------------------------------------------
create table if not exists public.extraction_decisions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  run_id          uuid not null references public.extraction_runs(id) on delete cascade,
  source_locator  jsonb not null,
  source_label    text,
  role            text not null check (role in (
                    'metric', 'period', 'unit_label', 'scale_label',
                    'value_field', 'exclude', 'entity_field'
                  )),
  proposed_key    text,
  final_key       text,
  confidence      numeric(3,2) check (confidence between 0 and 1),
  stage           text not null check (stage in (
                    'known_source', 'profile', 'dictionary', 'fuzzy',
                    'cache', 'llm', 'manual'
                  )),
  status          text not null default 'accepted' check (status in (
                    'accepted', 'pending_review', 'overridden', 'rejected'
                  )),
  llm_model       text,
  prompt_version  text,
  reasoning       text,
  overridden_by   uuid references auth.users(id),
  overridden_at   timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists ix_decisions_run
  on public.extraction_decisions (run_id);

create index if not exists ix_decisions_company_status
  on public.extraction_decisions (company_id, status, created_at desc);

alter table public.extraction_decisions enable row level security;

drop policy if exists ed_tenant on public.extraction_decisions;
create policy ed_tenant
  on public.extraction_decisions
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ----------------------------------------------------------------
-- Learned source profiles
-- ----------------------------------------------------------------
create table if not exists public.source_profiles (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  signature     text not null,
  name          text not null,
  recipe        jsonb not null,
  last_used_at  timestamptz,
  use_count     int not null default 0,
  created_at    timestamptz not null default now(),
  unique (company_id, signature)
);

create index if not exists ix_source_profiles_company_used
  on public.source_profiles (company_id, last_used_at desc);

alter table public.source_profiles enable row level security;

drop policy if exists sp_tenant on public.source_profiles;
create policy sp_tenant
  on public.source_profiles
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ----------------------------------------------------------------
-- Global classifier cache: backend/service-role only
-- ----------------------------------------------------------------
create table if not exists public.classification_cache (
  cache_key              text primary key,
  normalized_label_hash  text not null,
  value_type_sig         text not null,
  siblings_hash          text not null,
  layout_context_hash    text not null,
  proposed_role          text not null,
  proposed_key           text,
  confidence             numeric(3,2) not null check (confidence between 0 and 1),
  taxonomy_version       text not null,
  prompt_version         text not null,
  llm_model              text not null,
  hits                   int not null default 1,
  plaintext_label        text,
  created_at             timestamptz not null default now(),
  last_hit_at            timestamptz not null default now()
);

revoke all on public.classification_cache from anon, authenticated;

-- ----------------------------------------------------------------
-- Augment normalized metrics for v2 lineage and scenarios
-- ----------------------------------------------------------------
alter table public.normalized_metrics
  add column if not exists run_id                  uuid references public.extraction_runs(id),
  add column if not exists decision_id             uuid references public.extraction_decisions(id),
  add column if not exists source_profile_id       uuid references public.source_profiles(id),
  add column if not exists confidence              numeric(3,2) check (confidence between 0 and 1),
  add column if not exists scenario                text not null default 'actual',
  add column if not exists scale                   numeric not null default 1,
  add column if not exists currency                text,
  add column if not exists source_sheet_name       text,
  add column if not exists source_cell_ref         text,
  add column if not exists source_locator          jsonb,
  add column if not exists superseded_by_metric_id uuid references public.normalized_metrics(id);

drop index if exists public.ux_metrics_live;
create unique index ux_metrics_live
  on public.normalized_metrics (company_id, metric_key, period_start, period_end, scenario, source_id)
  where superseded_by is null and superseded_by_metric_id is null;

create index if not exists ix_metrics_run
  on public.normalized_metrics (run_id);

create index if not exists ix_metrics_source_profile
  on public.normalized_metrics (source_profile_id);

-- Keep the existing RPC stable for the frontend while ignoring both old and
-- new supersession markers.
create or replace function public.latest_metrics_for_company(p_company_id uuid)
returns table (
  metric_key text,
  value numeric,
  unit text,
  period_end date
)
language sql
stable
set search_path = public
as $$
  select distinct on (nm.metric_key)
    nm.metric_key,
    nm.value,
    nm.unit,
    nm.period_end
  from public.normalized_metrics nm
  where nm.company_id = p_company_id
    and nm.superseded_by is null
    and nm.superseded_by_metric_id is null
  order by nm.metric_key, nm.period_end desc
$$;
