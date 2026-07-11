// TODO(marketing-adapter): This panel renders MOCK/DEMO data only. Marketing has no ERPNext
// doctype, so it will need a real Meta Ads / GA4-style OAuth adapter + a node-aware backend
// summary route (mirroring erpnextSales.ts/erpnextProducts.ts's pattern) once ad-platform
// credentials are wired per company — see IntegrationModal.tsx's MetaPanel/GAPanel for the
// real-adapter connection flow this should eventually reuse.

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import type { UInternalNode } from '../../../lib/usePolytopeStore';

// Tier 1 = rich Recharts panel (mirrors MetaPanel/GAPanel), Tier 2 = lighter Stat-only panel.
// Matched on node.label alone (case-insensitive) — safe from cross-department collisions since
// this only runs after isMarketingContext has already scoped us to the Marketing subtree.
const TIER1_LABELS = new Set(
  ['campaigns', 'launches', 'SEO', 'paid ads', 'landing pages', 'funnels', 'conversion optimization', 'email growth']
    .map(s => s.toLowerCase()),
);
const TIER2_LABELS = new Set(
  [
    'Leads', 'MQLs', 'CAC', 'ROAS', 'conversion', 'engagement', 'pipeline contribution',
    'Blogs', 'newsletters', 'social', 'webinars', 'community', 'events', 'thought leadership',
  ].map(s => s.toLowerCase()),
);

export function isMarketingMockActive(node: Pick<UInternalNode, 'label'>): boolean {
  const label = node.label.toLowerCase();
  return TIER1_LABELS.has(label) || TIER2_LABELS.has(label);
}

function isTier1(node: Pick<UInternalNode, 'label'>): boolean {
  return TIER1_LABELS.has(node.label.toLowerCase());
}

// Deterministic pseudo-random generator keyed off a string (node.id) — numbers stay stable
// across re-renders but differ per node, instead of Math.random() churning on every render.
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function Stat({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
      {sub && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500'}`}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

function DemoDataBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
      <Sparkles className="w-3 h-3" />
      Demo data
    </div>
  );
}

interface MockMarketingData {
  spend30d: number;
  roas: number;
  cac: number;
  conversions30d: number;
  leads30d: number;
  mqls30d: number;
  topCampaigns: Array<{ name: string; spend: number }>;
  trend: Array<{ date: string; value: number }>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function buildMockData(seedKey: string): MockMarketingData {
  const rand = seededRandom(hashSeed(seedKey));
  const spend30d = Math.round(5_000 + rand() * 45_000);
  const roas = Math.round((1.5 + rand() * 4) * 10) / 10;
  const cac = Math.round(50 + rand() * 250);
  const conversions30d = Math.round(50 + rand() * 950);
  const leads30d = Math.round(100 + rand() * 900);
  const mqls30d = Math.round(leads30d * (0.2 + rand() * 0.4));
  const topCampaigns = ['Brand awareness', 'Retargeting', 'Lead gen', 'Product launch'].map(name => ({
    name,
    spend: Math.round(spend30d * (0.1 + rand() * 0.3)),
  }));
  const trend = MONTHS.map(date => ({ date, value: Math.round(200 + rand() * 800) }));
  return { spend30d, roas, cac, conversions30d, leads30d, mqls30d, topCampaigns, trend };
}

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'];

export function MarketingMockPanel({ node }: { node: UInternalNode }) {
  const data = buildMockData(node.id);
  const tier1 = isTier1(node);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0c10]/70 p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Marketing · {node.label}</p>
        <DemoDataBadge />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Ad spend (30d)" value={fmt$(data.spend30d)} />
        <Stat label="ROAS" value={`${data.roas}x`} sub="return on ad spend" trend="up" />
        <Stat label="CAC" value={fmt$(data.cac)} sub="per acquisition" />
        <Stat label="Leads (30d)" value={fmtNum(data.leads30d)} sub={`${fmtNum(data.mqls30d)} MQLs`} trend="up" />
      </div>

      {tier1 && (
        <>
          <div>
            <p className="text-xs text-gray-500 mb-2">Campaign spend breakdown</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={data.topCampaigns} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt$(v)} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmt$(Number(v ?? 0)), 'Spend']} />
                <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
                  {data.topCampaigns.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Conversions trend (6 months)</p>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={data.trend}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <p className="text-[10px] text-white/30">
        Illustrative numbers — not connected to a real ad platform yet. Replace with a Meta Ads / GA4-style adapter.
      </p>
    </div>
  );
}
