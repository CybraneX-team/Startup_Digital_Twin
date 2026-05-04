/* ================================================================
   FounderOS — Universe Graph Builder
   Produces the UniverseData shape consumed by the
   /3d UniverseController. All data is fetched from Supabase:
     • industries        → lib/db/industries.ts
     • subdomains        → lib/db/subdomains.ts
     • catalog_companies → lib/db/catalogCompanies.ts  (pre-seeded universe)
     • companies         → lib/db/companies.ts          (live user companies)
================================================================ */

import { useEffect, useMemo, useState } from 'react';
import { getAllIndustries, type DbIndustry } from '../lib/db/industries';
import { getAllSubdomains, type DbSubdomain } from '../lib/db/subdomains';
import { getActiveCompanies } from '../lib/db/companies';
import { getCatalogCompanies, type CatalogCompany } from '../lib/db/catalogCompanies';
import { getAllLocalCompanies } from '../lib/localCompanies';
import type { DbCompany } from '../lib/supabase';

/* ──────────────────────────────────────────────────
   UniverseData — exactly what UniverseController consumes
────────────────────────────────────────────────── */
export interface UniverseCompany {
  id: string;
  name: string;
  description?: string;
  founded?: number;
  funding?: string;
  employees?: number;
  stage?: string;
  isLive: boolean;
  departments?: { id: string; name: string; headcount?: number; focus?: string; metrics?: Record<string, number> }[];
  raw?: DbCompany;
}

export interface UniverseSubdomain {
  id: string;
  name: string;
  description?: string;
  orbit_index: number;
  color?: string;
  companies: UniverseCompany[];
}

export interface UniverseIndustry {
  id: string;
  name: string;
  description?: string;
  color: string;
  angle: number;
  subdomains: UniverseSubdomain[];
  // position exposed for 3D controller
  position3D?: [number, number, number];
  bubbleRadius?: number;
}

export interface UniverseData {
  industries: UniverseIndustry[];
  myCompanyNodeId: string | null;
}

/* ──────────────────────────────────────────────────
   Pure builder — testable without React
────────────────────────────────────────────────── */
export function buildUniverseData(args: {
  industries: DbIndustry[];
  subdomains: DbSubdomain[];
  liveCompanies: DbCompany[];
  catalogCompanies: CatalogCompany[];
  myCompanyId?: string | null;
}): UniverseData {
  const { industries, subdomains, liveCompanies, catalogCompanies, myCompanyId } = args;

  // ── Index subdomains by industry ─────────────────────────────────
  const subsByInd = new Map<string, DbSubdomain[]>();
  for (const sd of subdomains) {
    if (!subsByInd.has(sd.industry_id)) subsByInd.set(sd.industry_id, []);
    subsByInd.get(sd.industry_id)!.push(sd);
  }
  for (const list of subsByInd.values()) list.sort((a, b) => a.orbit_index - b.orbit_index);

  // ── Bucket companies under subdomain IDs ─────────────────────────
  const compsBySub = new Map<string, UniverseCompany[]>();

  function addToSub(sdId: string, node: UniverseCompany) {
    if (!compsBySub.has(sdId)) compsBySub.set(sdId, []);
    compsBySub.get(sdId)!.push(node);
  }

  // 1. Live user companies (from `companies` table)
  for (const c of liveCompanies) {
    if (!c.industry_id) continue;
    let sdId = c.subdomain_id;
    if (!sdId) {
      sdId = subsByInd.get(c.industry_id)?.[0]?.id ?? null;
    }
    if (!sdId) continue;
    addToSub(sdId, {
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
    });
  }

  // 2. Catalog companies (from `catalog_companies` table)
  for (const c of catalogCompanies) {
    // Resolve subdomain ID
    let sdId: string | null = c.subdomain_id;

    if (!sdId && c.subdomain_name) {
      const dbSubs = subsByInd.get(c.industry_id);
      if (dbSubs) {
        const match = dbSubs.find(s => s.label === c.subdomain_name);
        if (match) sdId = match.id;
      }
    }
    if (!sdId) {
      sdId = subsByInd.get(c.industry_id)?.[0]?.id ?? null;
    }
    if (!sdId) continue;

    addToSub(sdId, {
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      founded: c.founded_year ?? undefined,
      funding: c.stage ?? undefined,
      stage: c.stage ?? undefined,
      employees: c.employees ?? undefined,
      isLive: false,
      departments: [],
      raw: {
        id: c.id,
        name: c.name,
        slug: c.id,
        industry_id: c.industry_id,
        subdomain_id: sdId,
        stage: (c.stage ?? 'Seed') as any,
        country: c.country ?? 'Global',
        founded_year: c.founded_year,
        description: c.description,
        website: null,
        logo_url: null,
        mrr_usd: c.mrr_usd,
        employees: c.employees,
        annual_revenue: c.mrr_usd ? c.mrr_usd * 12 : null,
        burn_rate_usd: null,
        runway_months: null,
        valuation: c.valuation,
        target_market: null,
        business_model: null,
        problem_solved: null,
        usp: null,
        competitors: null,
        status: 'active',
      } as any,
    });
  }

  // ── Assemble the industry tree ────────────────────────────────────
  const TAU = Math.PI * 2;
  const out: UniverseIndustry[] = industries.map((ind, idx) => {
    const dbSubdomains = subsByInd.get(ind.id) ?? [];

    const effectiveSubs: UniverseSubdomain[] = dbSubdomains.map(sd => ({
      id: sd.id,
      name: sd.label,
      description: sd.description ?? undefined,
      orbit_index: sd.orbit_index,
      color: sd.color ?? ind.color,
      companies: compsBySub.get(sd.id) ?? [],
    }));

    const pos = ind.position_3d;

    return {
      id: ind.id,
      name: ind.label,
      description: ind.description ?? undefined,
      color: ind.color,
      angle: TAU * (idx / industries.length),
      subdomains: effectiveSubs,
      position3D: [pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 0],
      bubbleRadius: ind.bubble_radius,
    };
  });

  return {
    industries: out,
    myCompanyNodeId: myCompanyId ? `live-${myCompanyId}` : null,
  };
}

/* ──────────────────────────────────────────────────
   useUniverseGraph — React hook for the /3d page.
   100% DB-driven — no hardcoded TypeScript arrays.
────────────────────────────────────────────────── */
export function useUniverseGraph(authCompanyId?: string | null): {
  data: UniverseData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  appendLocalCompany: (company: DbCompany) => void;
} {
  const [industries, setIndustries]       = useState<DbIndustry[]>([]);
  const [subdomains, setSubdomains]       = useState<DbSubdomain[]>([]);
  const [liveCompanies, setLive]          = useState<DbCompany[]>([]);
  const [catalogCompanies, setCatalog]    = useState<CatalogCompany[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [refreshKey, setRefreshKey]       = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  const appendLocalCompany = (company: DbCompany) => {
    setLive(prev => [...prev, company]);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      getAllIndustries(),
      getAllSubdomains(),
      getActiveCompanies(),
      getCatalogCompanies(),
    ])
      .then(([inds, sds, live, catalog]) => {
        if (!alive) return;
        setIndustries(inds);
        setSubdomains(sds);
        setCatalog(catalog);
        const localCos = getAllLocalCompanies() as unknown as DbCompany[];
        setLive([...live, ...localCos]);
        setLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        setError(err?.message ?? 'Failed to load universe data');
        setLoading(false);
      });

    return () => { alive = false; };
  }, [refreshKey]);

  const data = useMemo(() => {
    if (loading || industries.length === 0) return null;
    return buildUniverseData({
      industries,
      subdomains,
      liveCompanies,
      catalogCompanies,
      myCompanyId: authCompanyId ?? null,
    });
  }, [loading, industries, subdomains, liveCompanies, catalogCompanies, authCompanyId]);

  return { data, loading, error, refresh, appendLocalCompany };
}
