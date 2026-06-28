-- Add color column to departments table
-- Required by seed_default_departments_for_company() which was added in 025_bdt_structure.sql
-- but this ALTER was never included in that migration.

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS color TEXT;
