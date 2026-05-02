/* ================================================================
   FounderOS — Universe Graph Builder
   Produces the UniverseData shape consumed by the
   /3d UniverseController. Merges Supabase industries +
   subdomains + live companies into the nested structure
   the Three.js controller expects.
================================================================ */

import { useEffect, useMemo, useState } from 'react';
import { INDUSTRIES } from '../db/industries';
import type { IndustryRecord } from '../db/schema';
import { getAllSubdomains, type DbSubdomain } from '../lib/db/subdomains';
import { getActiveCompanies } from '../lib/db/companies';
import type { DbCompany } from '../lib/supabase';

/* ──────────────────────────────────────────────────
   UniverseData — exactly what UniverseController consumes
────────────────────────────────────────────────── */
export interface UniverseCompany {
  id: string;                   // 'live-{uuid}'
  name: string;
  description?: string;
  founded?: number;
  funding?: string;             // stage as funding label
  employees?: number;
  stage?: string;
  isLive: boolean;
  departments?: { id: string; name: string; headcount?: number; focus?: string; metrics?: Record<string, number> }[];
  raw?: DbCompany;              // pass-through for HUD click-through
}

export interface UniverseSubdomain {
  id: string;                   // 'sd-saas-crm'
  name: string;
  description?: string;
  orbit_index: number;
  color?: string;
  companies: UniverseCompany[];
}

export interface UniverseIndustry {
  id: string;                   // 'ind-saas'
  name: string;                 // display label
  description?: string;
  color: string;
  angle: number;                // radians; auto-derived from idx
  subdomains: UniverseSubdomain[];
  raw?: IndustryRecord;
}

export interface UniverseData {
  industries: UniverseIndustry[];
  myCompanyNodeId: string | null;
}

/* ──────────────────────────────────────────────────
   Pure builder — testable without React
────────────────────────────────────────────────── */
export function buildUniverseData(args: {
  industries: IndustryRecord[];
  subdomains: DbSubdomain[];
  companies: DbCompany[];
  myCompanyId?: string | null;
}): UniverseData {
  const { industries, subdomains, companies, myCompanyId } = args;

  // Index subdomains by industry, ordered by orbit_index
  const subsByInd = new Map<string, DbSubdomain[]>();
  for (const sd of subdomains) {
    if (!subsByInd.has(sd.industry_id)) subsByInd.set(sd.industry_id, []);
    subsByInd.get(sd.industry_id)!.push(sd);
  }
  // Already ordered by orbit_index from the SQL query, but defend anyway:
  for (const list of subsByInd.values()) list.sort((a, b) => a.orbit_index - b.orbit_index);

  // Bucket companies under subdomains. If subdomain_id is null, fall
  // back to the first subdomain of the company's industry.
  const compsBySub = new Map<string, UniverseCompany[]>();
  for (const c of companies) {
    if (!c.industry_id) continue;
    let sdId = c.subdomain_id;
    if (!sdId) {
      const fallback = subsByInd.get(c.industry_id)?.[0];
      sdId = fallback?.id ?? null;
    }
    if (!sdId) continue;
    const node: UniverseCompany = {
      id: `live-${c.id}`,
      name: c.name,
      description: c.description ?? undefined,
      founded: c.founded_year ?? undefined,
      funding: c.stage,
      stage: c.stage,
      employees: c.employees,
      isLive: true,
      departments: [],
      raw: c,
    };
    if (!compsBySub.has(sdId)) compsBySub.set(sdId, []);
    compsBySub.get(sdId)!.push(node);
  }

  // Assemble industries with derived angle. Angle is the polar
  // azimuth derived from idx — keeps galaxies in a ring.
  const TAU = Math.PI * 2;
  const out: UniverseIndustry[] = industries.map((ind, idx) => {
    const subdomainsOut: UniverseSubdomain[] = (subsByInd.get(ind.id) ?? []).map(sd => ({
      id: sd.id,
      name: sd.label,
      description: sd.description ?? undefined,
      orbit_index: sd.orbit_index,
      color: sd.color ?? ind.color,
      companies: compsBySub.get(sd.id) ?? [],
    }));
    return {
      id: ind.id,
      name: ind.label,
      description: ind.description,
      color: ind.color,
      angle: TAU * (idx / industries.length),
      subdomains: subdomainsOut,
      raw: ind,
    };
  });

  return {
    industries: out,
    myCompanyNodeId: myCompanyId ? `live-${myCompanyId}` : null,
  };
}

/* ──────────────────────────────────────────────────
   useUniverseGraph — React hook for the /3d page
────────────────────────────────────────────────── */
export function useUniverseGraph(authCompanyId?: string | null): {
  data: UniverseData | null;
  loading: boolean;
  error: string | null;
} {
  const [subdomains, setSubdomains] = useState<DbSubdomain[]>([]);
  const [companies, setCompanies]   = useState<DbCompany[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getAllSubdomains(), getActiveCompanies()])
      .then(([sd, co]) => {
        if (!alive) return;
        setSubdomains(sd);
        setCompanies(co);
        setLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        setError(err?.message ?? 'Failed to load universe data');
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const data = useMemo(() => {
    if (loading) return null;
    return buildUniverseData({
      industries: INDUSTRIES,
      subdomains,
      companies,
      myCompanyId: authCompanyId ?? null,
    });
  }, [loading, subdomains, companies, authCompanyId]);

  return { data, loading, error };
}
