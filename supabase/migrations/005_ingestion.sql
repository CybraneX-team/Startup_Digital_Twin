-- ================================================================
-- FounderOS — Migration 005: Excel Ingestion (Phase 1)
-- ================================================================

-- ----------------------------------------------------------------
-- Helper: caller company id from auth context
-- ----------------------------------------------------------------
create or replace function public.auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.user_profiles
  where id = auth.uid()
$$;

-- ----------------------------------------------------------------
-- data_sources
-- ----------------------------------------------------------------
create table if not exists public.data_sources (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  type          text not null check (type in ('excel', 'manual')),
  name          text not null,
  status        text not null default 'active' check (status in ('active', 'paused', 'error')),
  last_sync_at  timestamptz,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  unique (company_id, type)
);

create index if not exists ix_data_sources_company
  on public.data_sources (company_id);

-- ----------------------------------------------------------------
-- ingestion_files
-- ----------------------------------------------------------------
create table if not exists public.ingestion_files (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  source_id      uuid not null references public.data_sources(id) on delete cascade,
  storage_path   text not null,
  checksum       text not null,
  byte_size      bigint not null,
  original_name  text not null,
  uploaded_by    uuid not null references auth.users(id),
  uploaded_at    timestamptz not null default now(),
  unique (source_id, checksum)
);

create index if not exists ix_ingestion_files_company_uploaded
  on public.ingestion_files (company_id, uploaded_at desc);

-- ----------------------------------------------------------------
-- ingestion_jobs
-- ----------------------------------------------------------------
create table if not exists public.ingestion_jobs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  file_id       uuid not null references public.ingestion_files(id) on delete cascade,
  kind          text not null check (kind in ('normalize')),
  status        text not null default 'pending'
                check (status in ('pending', 'running', 'complete', 'failed')),
  payload       jsonb not null default '{}'::jsonb,
  attempts      int not null default 0,
  max_attempts  int not null default 3,
  locked_until  timestamptz,
  locked_by     text,
  last_error    text,
  record_count  int,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists ix_jobs_pickup
  on public.ingestion_jobs (status, created_at)
  where status in ('pending', 'running');

create index if not exists ix_jobs_company_created
  on public.ingestion_jobs (company_id, created_at desc);

-- ----------------------------------------------------------------
-- normalized_metrics
-- ----------------------------------------------------------------
create table if not exists public.normalized_metrics (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  metric_key    text not null,
  period_start  date not null,
  period_end    date not null,
  value         numeric not null,
  unit          text not null,
  source_id     uuid not null references public.data_sources(id) on delete cascade,
  job_id        uuid not null references public.ingestion_jobs(id) on delete cascade,
  superseded_by uuid references public.ingestion_jobs(id),
  created_at    timestamptz not null default now()
);

create unique index if not exists ux_metrics_live
  on public.normalized_metrics (company_id, metric_key, period_start, period_end, source_id)
  where superseded_by is null;

create index if not exists ix_metrics_company_metric_period
  on public.normalized_metrics (company_id, metric_key, period_end desc)
  where superseded_by is null;

-- ----------------------------------------------------------------
-- RPC for latest metric values
-- ----------------------------------------------------------------
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
  order by nm.metric_key, nm.period_end desc
$$;

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
alter table public.data_sources enable row level security;
alter table public.ingestion_files enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.normalized_metrics enable row level security;

drop policy if exists ds_tenant on public.data_sources;
create policy ds_tenant
  on public.data_sources
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

drop policy if exists if_tenant on public.ingestion_files;
create policy if_tenant
  on public.ingestion_files
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

drop policy if exists ij_tenant on public.ingestion_jobs;
create policy ij_tenant
  on public.ingestion_jobs
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

drop policy if exists nm_tenant on public.normalized_metrics;
create policy nm_tenant
  on public.normalized_metrics
  for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ----------------------------------------------------------------
-- Storage bucket + policies
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ingestion', 'ingestion', false)
on conflict (id) do nothing;

drop policy if exists "ingestion read own" on storage.objects;
create policy "ingestion read own"
  on storage.objects
  for select
  using (
    bucket_id = 'ingestion'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  );

drop policy if exists "ingestion insert own" on storage.objects;
create policy "ingestion insert own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'ingestion'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  );
