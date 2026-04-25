import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { DbCompany, CompanyStage, BusinessModel } from '../supabase';
import { INDUSTRIES } from '../../db/industries';

/* ──────────────────────────────────────────────────
   Fetch all active companies (for Twin graph)
────────────────────────────────────────────────── */
export async function getActiveCompanies(): Promise<DbCompany[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error) { console.error('[db/companies]', error); return []; }
  return data ?? [];
}

/* ──────────────────────────────────────────────────
   Get a single company by id
────────────────────────────────────────────────── */
export async function getCompanyById(id: string): Promise<DbCompany | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('[db/companies]', error); return null; }
  return data;
}

/* ──────────────────────────────────────────────────
   Slug from name (url-safe)
────────────────────────────────────────────────── */
function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).slice(2, 6);
}

/* ──────────────────────────────────────────────────
   Compute 3D offset for placement in industry cluster
   Distributes new companies in expanding rings
────────────────────────────────────────────────── */
async function computeOffset3D(industryId: string): Promise<{x:number; y:number; z:number}> {
  const { count } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('industry_id', industryId)
    .eq('status', 'active');

  const idx = count ?? 0;
  const phi = (1 + Math.sqrt(5)) / 2;
  const radius = 9 + Math.floor(idx / 8) * 4;  // expand ring every 8 companies
  const az = 2 * Math.PI * (idx / phi);
  const el = Math.asin(((2 * (idx % 8) + 1) / 8) - 1) * 0.6;
  return {
    x: Math.round(radius * Math.cos(el) * Math.cos(az) * 10) / 10,
    y: Math.round(radius * Math.sin(el) * 10) / 10,
    z: Math.round(radius * Math.cos(el) * Math.sin(az) * 10) / 10,
  };
}

/* ──────────────────────────────────────────────────
   Create company from onboarding data
────────────────────────────────────────────────── */
export interface CreateCompanyInput {
  name: string;
  industry_id: string;
  stage: CompanyStage;
  country: string;
  founded_year?: number;
  description?: string;
  website?: string;
  mrr_usd?: number;
  employees?: number;
  burn_rate_usd?: number;
  runway_months?: number;
  target_market?: string;
  business_model?: BusinessModel;
  problem_solved?: string;
  usp?: string;
  competitors?: string[];
}

export async function createCompany(
  input: CreateCompanyInput,
  userId: string,
): Promise<DbCompany | null> {
  const offset_3d = await computeOffset3D(input.industry_id);

  const payload = {
    ...input,
    slug: toSlug(input.name),
    status: 'active' as const,
    offset_3d,
  };

  const { data: company, error: compErr } = await supabase
    .from('companies')
    .insert(payload)
    .select()
    .single();

  if (compErr || !company) {
    console.error('[db/companies] create error — code:', compErr?.code, '| message:', compErr?.message, '| details:', compErr?.details);
    return null;
  }

  // Add creator as founder member
  const { error: memberErr } = await supabase.from('company_members').insert({
    company_id: company.id,
    user_id: userId,
    role: 'founder',
    status: 'active',
  });
  if (memberErr) console.error('[db/companies] company_members insert', memberErr);

  // Link user profile to company — use UPSERT so it works even if the
  // trigger-created row is missing (email-confirmed signup edge case).
  const { error: profileErr } = await supabase
    .from('user_profiles')
    .upsert(
      { id: userId, company_id: company.id, role: 'founder', onboarding_completed: true },
      { onConflict: 'id' },
    );
  if (profileErr) console.error('[db/companies] profile upsert', profileErr);

  return company;
}

/* ──────────────────────────────────────────────────
   useCompany — live hook for the logged-in user's company
────────────────────────────────────────────────── */
export function useCompany(companyId: string | null | undefined): {
  company: DbCompany | null;
  loading: boolean;
} {
  const [company, setCompany] = useState<DbCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    getCompanyById(companyId).then(c => {
      setCompany(c);
      setLoading(false);
    });
  }, [companyId]);

  return { company, loading };
}

/* ──────────────────────────────────────────────────
   Convert DbCompany → TwinNode-compatible shape
────────────────────────────────────────────────── */
export function companyToTwinNodeData(c: DbCompany) {
  const industry = INDUSTRIES.find(i => i.id === c.industry_id);

  // Fallback: place at industry center + small deterministic offset when offset_3d is missing
  const fallbackOffset = industry
    ? { x: (c.name.charCodeAt(0) % 10) - 5, y: (c.name.charCodeAt(1) % 10) - 5, z: (c.name.charCodeAt(2) % 8) - 4 }
    : { x: 0, y: 0, z: 0 };
  const off = c.offset_3d ?? fallbackOffset;

  const pos3D = industry
    ? {
        x: industry.position3D[0] + off.x,
        y: industry.position3D[1] + off.y,
        z: industry.position3D[2] + off.z,
      }
    : null;

  return {
    id: `live-${c.id}`,
    label: c.name,
    type: 'company' as const,
    status: 'healthy' as const,
    description: c.description ?? undefined,
    metrics: {
      mrr: c.mrr_usd,
      team: c.employees,
      stage: c.stage,
    },
    _pos3D: pos3D,       // used by twinGraph to inject into POS3D
    _industryId: c.industry_id ?? undefined,
  };
}
