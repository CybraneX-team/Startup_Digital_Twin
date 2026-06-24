import { useMemo, useEffect, useState } from 'react';
import { LayoutDashboard, Activity, Zap, Shield, Bot, User, Clock, CheckCircle2, Loader2, CircleDot } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { keyMetrics, revenueHistory, departmentHealth, environmentSignals, activeTasks } from '../data/mockData';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import { useCompanyMetrics } from '../lib/db/metrics';
import { INDUSTRIES } from '../db/industries';
import { api } from '../lib/api';
import { getCurrencyCodeForCountry, getCurrencySymbol } from '../lib/currency';
import type { Metric } from '../types';

const statusConfig = {
  running:   { icon: Loader2,      color: 'text-sky-400',     animate: 'animate-spin' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', animate: '' },
  queued:    { icon: Clock,        color: 'text-gray-400',    animate: '' },
  failed:    { icon: CircleDot,    color: 'text-red-400',     animate: '' },
};

export default function Overview() {
  const { profile } = useAuth();
  const { company } = useCompany(profile?.company_id);
  const { metrics } = useCompanyMetrics(profile?.company_id ?? null);

  const currencySymbol = getCurrencySymbol(
    company?.currency || getCurrencyCodeForCountry(company?.country),
  );

  const industryLabel = company?.industry_id
    ? INDUSTRIES.find(i => i.id === company.industry_id)?.label ?? company.industry_id
    : 'SaaS';

  const displayName = company?.name ?? 'Your Company';
  const displayStage = company?.stage ?? 'Seed';

  const [simSnapshot, setSimSnapshot] = useState<Record<string, number> | null>(null);
  const [chartData, setChartData] = useState(revenueHistory);

  useEffect(() => {
    if (!profile?.company_id) return;
    api.get<Record<string, number> | null>(`/api/metrics-onboarding/${profile.company_id}/latest`)
      .then((m) => { if (m) setSimSnapshot(m); })
      .catch(() => {});
    api.get<{ month: string; mrr: number; burn: number }[]>(`/api/metrics-onboarding/${profile.company_id}/history`)
      .then((rows) => { if (rows?.length) setChartData(rows); })
      .catch(() => {});
  }, [profile?.company_id]);

  const liveKeyMetrics = useMemo<Metric[]>(() => {
    const c = currencySymbol;
    const ordered = [
      { key: 'revenue',             name: 'Monthly Revenue',     unit: c },
      { key: 'burn',                name: 'Monthly Burn',        unit: c },
      { key: 'headcount',           name: 'Team Size',           unit: 'people' },
      { key: 'signups',             name: 'User Acquisition',    unit: '/mo' },
      { key: 'buyer_count',         name: 'Buyers',              unit: 'count' },
      { key: 'conversion_rate',     name: 'Conversion',          unit: '%' },
      { key: 'avg_order_value',     name: 'Avg Order Value',     unit: c },
      { key: 'cogs',                name: 'COGS',                unit: c },
      { key: 'customer_ltv',        name: 'Customer LTV',        unit: c },
      { key: 'arpu',                name: 'ARPU',                unit: c },
      { key: 'cpa',                 name: 'CPA',                 unit: c },
      { key: 'contribution_margin', name: 'Contribution Margin', unit: c },
    ];
    return ordered
      .map(({ key, name, unit }) => {
        const m = metrics[key];
        if (!m) return null;
        const displayUnit = unit === c ? c : m.unit && m.unit !== 'count' ? m.unit : unit;
        return { name, value: Number(m.value), unit: displayUnit, change: 0 } as Metric;
      })
      .filter(Boolean) as Metric[];
  }, [metrics, currencySymbol]);

  const companyFallbackMetrics = useMemo<Metric[]>(() => {
    if (!company) return [];
    const c = currencySymbol;
    return [
      { name: 'Revenue',    value: company.mrr_usd      ?? 0, unit: c,        change: 0 },
      { name: 'Burn Rate',  value: company.burn_rate_usd ?? 0, unit: c,        change: 0 },
      { name: 'Team Size',  value: company.employees     ?? 0, unit: 'people', change: 0 },
      { name: 'Runway',     value: company.runway_months ?? 0, unit: 'months', change: 0 },
      { name: 'CAC',        value: 0,                          unit: c,        change: 0 },
      { name: 'Churn',      value: 0,                          unit: '%',      change: 0 },
    ];
  }, [company, currencySymbol]);

  const displayMetrics = useMemo<Metric[]>(() => {
    if (simSnapshot) {
      const c = currencySymbol;
      return [
        { name: 'MRR',       value: simSnapshot.revenue  ?? 0, unit: c,        change: 0 },
        { name: 'CAC',       value: simSnapshot.cpa       ?? 0, unit: c,        change: 0 },
        { name: 'LTV',       value: simSnapshot.cltv      ?? 0, unit: c,        change: 0 },
        { name: 'Churn',     value: simSnapshot.churn     ?? 0, unit: '%',      change: 0 },
        { name: 'Burn',      value: simSnapshot.burn      ?? 0, unit: c,        change: 0 },
        { name: 'Runway',    value: simSnapshot.runway    ?? 0, unit: 'months', change: 0 },
      ];
    }
    if (liveKeyMetrics.length > 0) return liveKeyMetrics.slice(0, 6);
    if (companyFallbackMetrics.length > 0) return companyFallbackMetrics;
    return keyMetrics.slice(0, 6);
  }, [simSnapshot, liveKeyMetrics, companyFallbackMetrics, currencySymbol]);

  /* ─────────────────── design tokens ─────────────────── */
  const B  = 'rgba(255,255,255,0.06)';
  const AC = '#C1AEFF';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{`@keyframes tw-pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', paddingBottom:26, borderBottom:`1px solid ${B}` }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10, fontSize:10, color:'rgba(255,255,255,0.22)', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:600 }}>
            <LayoutDashboard size={11} color={AC} /> Overview
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, color:'#fff', letterSpacing:'-0.025em', margin:0, lineHeight:1 }}>{displayName}</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.3)', margin:'7px 0 0' }}>{displayStage} · {industryLabel}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:22 }}>
          {([{c:'#10b981',l:'System Twin'},{c:'#06b6d4',l:'Env Twin'}] as {c:string,l:string}[]).map(s => (
            <div key={s.l} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:s.c,boxShadow:`0 0 8px ${s.c}80`,display:'inline-block',animation:'tw-pulse 3s ease-in-out infinite' }} />
              <div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:'0.06em' }}>{s.l}</div>
                <div style={{ fontSize:12, color:s.c, fontWeight:600 }}>Synced</div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:6, paddingLeft:18, borderLeft:`1px solid ${B}`, fontSize:11, color:'rgba(255,255,255,0.2)' }}>
            <Activity size={11} /> 2m ago
          </div>
        </div>
      </div>

      {/* ── Metric Strip ──────────────────────────────────────── */}
      {displayMetrics.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(displayMetrics.length,6)},1fr)`, borderBottom:`1px solid ${B}` }}>
          {displayMetrics.slice(0,6).map((m, i) => (
            <div key={m.name} style={{ padding:'24px 20px', borderLeft: i > 0 ? `1px solid ${B}` : 'none' }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {m.name}
              </div>
              <div style={{ fontSize:30, fontWeight:700, color:'#fff', letterSpacing:'-0.025em', lineHeight:1 }}>
                {m.unit === currencySymbol && <span style={{ fontSize:18, color:AC, fontWeight:600, marginRight:1, verticalAlign:'baseline' }}>{currencySymbol}</span>}
                {m.value.toLocaleString()}
              </div>
              {m.unit && m.unit !== currencySymbol && (
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.22)', marginTop:5 }}>{m.unit}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Bento: Charts + Tasks ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 296px', borderBottom:`1px solid ${B}` }}>

        {/* Revenue vs Burn — full-bleed in its cell */}
        <div style={{ borderRight:`1px solid ${B}`, padding:'20px 20px 12px' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:18 }}>Revenue vs Burn</div>
          <ResponsiveContainer width="100%" height={246}>
            <AreaChart data={chartData} margin={{ left:-16, right:4, top:4, bottom:0 }}>
              <defs>
                <linearGradient id="ovMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ovBurn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0)" tick={{ fill:'rgba(255,255,255,0.22)', fontSize:11 }} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0)" tick={{ fill:'rgba(255,255,255,0.22)', fontSize:11 }} tickLine={false} width={48} />
              <Tooltip contentStyle={{ background:'#0d0d14', border:`1px solid ${B}`, borderRadius:8, fontSize:12 }} labelStyle={{ color:'rgba(255,255,255,0.4)' }} />
              <Area type="monotone" dataKey="mrr"  stroke="#0ea5e9" fill="url(#ovMrr)"  strokeWidth={1.5} name={`MRR (${currencySymbol})`}  dot={false} />
              <Area type="monotone" dataKey="burn" stroke="#ef4444" fill="url(#ovBurn)" strokeWidth={1.5} name={`Burn (${currencySymbol})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right column: Radar + Tasks */}
        <div style={{ display:'flex', flexDirection:'column' }}>

          {/* Dept Health radar */}
          <div style={{ borderBottom:`1px solid ${B}`, padding:'20px 16px 8px' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Dept Health</div>
            <ResponsiveContainer width="100%" height={178}>
              <RadarChart data={departmentHealth}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="name" tick={{ fill:'rgba(255,255,255,0.25)', fontSize:10 }} />
                <Radar name="Health"   dataKey="health"   stroke={AC}       fill={AC}       fillOpacity={0.1}  strokeWidth={1.5} />
                <Radar name="Velocity" dataKey="velocity" stroke="#06b6d4"  fill="#06b6d4"  fillOpacity={0.07} strokeWidth={1.5} />
                <Tooltip contentStyle={{ background:'#0d0d14', border:`1px solid ${B}`, borderRadius:8, fontSize:12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Active Tasks */}
          <div style={{ flex:1, padding:'16px', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Tasks</span>
              <span style={{ fontSize:10, color:'#0ea5e9', background:'rgba(14,165,233,0.08)', padding:'2px 8px', borderRadius:100, border:'1px solid rgba(14,165,233,0.18)' }}>
                {activeTasks.filter(t => t.status === 'running').length} running
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {activeTasks.slice(0, 6).map(task => {
                const cfg = statusConfig[task.status];
                const Icon = cfg.icon;
                return (
                  <div key={task.id} style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
                    <Icon className={`${cfg.color} ${cfg.animate} shrink-0`} style={{ width:12, height:12, marginTop:2 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.78)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</div>
                      <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center' }}>
                        <span style={{ fontSize:10, color:'rgba(255,255,255,0.22)' }}>{task.department}</span>
                        {task.aiPowered && <Bot size={9} color="#0ea5e9" />}
                      </div>
                      {task.status === 'running' && (
                        <div style={{ marginTop:4, height:2, borderRadius:2, background:'rgba(255,255,255,0.06)' }}>
                          <div style={{ width:`${task.progress}%`, height:'100%', borderRadius:2, background:'#0ea5e9', transition:'width 0.5s ease' }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Environment Signals ───────────────────────────────── */}
      <div style={{ display:'flex', borderBottom:`1px solid ${B}` }}>
        {environmentSignals.slice(0, 4).map((sig, i) => (
          <div key={i} style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'13px 20px', borderLeft: i > 0 ? `1px solid ${B}` : 'none' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
              background: sig.impact === 'positive' ? '#10b981' : sig.impact === 'negative' ? '#ef4444' : '#52525b' }} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.62)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sig.title}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:1 }}>{sig.type} · {sig.timestamp}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer strip ──────────────────────────────────────── */}
      <div style={{ display:'flex', padding:'11px 0' }}>
        {[
          { icon: <Zap   size={12} color="#f59e0b" />, label: '3 AI Agents Active' },
          { icon: <Shield size={12} color="#0ea5e9" />, label: 'Data: Real + Simulated' },
          { icon: <User   size={12} color={AC}     />, label: `${displayMetrics.length} metrics tracked` },
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'2px 20px', borderRight: i < 2 ? `1px solid ${B}` : 'none', fontSize:12, color:'rgba(255,255,255,0.28)' }}>
            {item.icon} {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
