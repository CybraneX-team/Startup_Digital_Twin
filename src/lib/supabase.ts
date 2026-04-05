import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[FounderOS] Supabase env vars missing. Add VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_ANON_KEY to .env.local. Running in offline/demo mode.'
  );
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
);

/* ---------------------------------------------------------------- */
/*  Database types (mirrors SQL schema)                              */
/* ---------------------------------------------------------------- */

export type CompanyStage =
  | 'Idea' | 'Pre-seed' | 'Seed' | 'Series A' | 'Series B'
  | 'Series C' | 'Series D+' | 'Pre-IPO' | 'Public' | 'PSU' | 'Bootstrapped';

export type CompanyStatus = 'onboarding' | 'active' | 'inactive' | 'suspended';
export type BusinessModel  = 'B2B' | 'B2C' | 'B2B2C' | 'Marketplace' | 'SaaS' | 'D2C' | 'Other';
export type UserRole =
  | 'super_admin' | 'founder' | 'co_founder' | 'admin'
  | 'analyst' | 'engineer' | 'viewer' | 'investor';

export interface DbIndustry {
  id: string;
  label: string;
  description: string | null;
  color: string;
  position_3d: { x: number; y: number; z: number };
  bubble_radius: number;
  tags: string[];
}

export interface DbCompany {
  id: string;
  name: string;
  slug: string;
  industry_id: string | null;
  stage: CompanyStage;
  country: string;
  founded_year: number | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  mrr_usd: number;
  employees: number;
  annual_revenue: number;
  burn_rate_usd: number;
  runway_months: number;
  valuation: string | null;
  target_market: string | null;
  business_model: BusinessModel | null;
  problem_solved: string | null;
  usp: string | null;
  competitors: string[] | null;
  status: CompanyStatus;
  is_public: boolean;
  stock_symbol: string | null;
  offset_3d: { x: number; y: number; z: number } | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserProfile {
  id: string;
  company_id: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  joined_at: string;
}

export interface DbOnboardingProgress {
  id: string;
  company_id: string;
  user_id: string;
  current_step: number;
  steps_data: Record<string, unknown>;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, { read: boolean; write: boolean; delete: boolean }>;
}
