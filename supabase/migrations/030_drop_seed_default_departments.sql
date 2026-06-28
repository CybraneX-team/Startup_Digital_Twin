-- ================================================================
-- Drop the legacy default-department seeder.
--
-- Department seeding is now owned by the backend: POST /api/companies
-- builds the selected departments' full BDT tree from a committed seed
-- and persists it via import_bdt_departments_from_json(). That is the
-- single inserter, which removes the slug-collision that produced
-- duplicate departments (e.g. customer_success vs customer-success).
--
-- seed_default_departments_for_company() is no longer called from
-- application code; its only other reference was a one-time DO block in
-- migration 018 that has already executed.
-- ================================================================

DROP FUNCTION IF EXISTS public.seed_default_departments_for_company(UUID);
