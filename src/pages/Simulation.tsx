import { useState } from 'react';
import { FlaskConical, Play, RotateCcw, GitBranch, Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
  Line,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import { simulationScenarios, decisionTree, monteCarloData } from '../data/mockData';
import type { DecisionNode } from '../types';

// --- Monte Carlo band data ---
const monteCarloBand = monteCarloData.map((d) => ({
  ...d,
  p10Base: d.p10,
  band: d.p90 - d.p10,
}));

export default function Simulation() {
  const [params, setParams] = useState({
    growthRate: 12,
    burnMultiplier: 1.0,
    hiringPace: 2,
    cacChange: 0,
  });
  const [activeScenario, setActiveScenario] = useState<string>('baseline');
  const [simulating, setSimulating] = useState(false);

  const comparisonData = simulationScenarios.map((s) => ({
    name: s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name,
    'MRR (12mo)': s.outcomes.mrr12m,
    'Runway (mo)': s.outcomes.runway12m * 1000,
    Valuation: s.outcomes.valuation / 1000,
  }));

  const handleSimulate = () => {
    setSimulating(true);
    setTimeout(() => setSimulating(false), 1500);
  };

  const active = simulationScenarios.find((s) => s.id === activeScenario);

  return (
    <div>
      <PageHeader
        title="Simulation Engine"
        subtitle="Bayesian prediction models with quantum-inspired optimization"
        icon={<FlaskConical className="w-6 h-6" />}
        badge="Experimental"
      />

      {/* ===== SCENARIO CONTROLS + COMPARISON ===== */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Parameter Controls */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Scenario Parameters</h3>
          <div className="space-y-5">
            {[
              { key: 'growthRate', label: 'Monthly Growth Rate', unit: '%', min: 0, max: 50, step: 1 },
              { key: 'burnMultiplier', label: 'Burn Multiplier', unit: 'x', min: 0.5, max: 2.5, step: 0.1 },
              { key: 'hiringPace', label: 'Hires / Month', unit: 'people', min: 0, max: 10, step: 1 },
              { key: 'cacChange', label: 'CAC Change', unit: '%', min: -30, max: 30, step: 5 },
            ].map((p) => (
              <div key={p.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-400">{p.label}</label>
                  <span className="text-xs font-mono text-sky-300">
                    {params[p.key as keyof typeof params]}
                    {p.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={params[p.key as keyof typeof params]}
                  onChange={(e) =>
                    setParams({ ...params, [p.key]: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 rounded-full bg-gray-800 appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSimulate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-all"
            >
              {simulating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {simulating ? 'Running...' : 'Simulate'}
            </button>
            <button
              onClick={() =>
                setParams({ growthRate: 12, burnMultiplier: 1.0, hiringPace: 2, cacChange: 0 })
              }
              className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scenario Comparison */}
        <div className="col-span-2 glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Scenario Comparison</h3>
          <div className="flex gap-2 mb-4">
            {simulationScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveScenario(s.id);
                  setParams(s.parameters as typeof params);
                }}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  activeScenario === s.id
                    ? 'bg-sky-600/15 border-sky-500/30 text-sky-300'
                    : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="MRR (12mo)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Valuation" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== ACTIVE SCENARIO OUTCOMES ===== */}
      {active && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">
            Projected Outcomes:{' '}
            <span className="text-sky-300">{active.name}</span>
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: '12-Month MRR',
                value: `$${active.outcomes.mrr12m.toLocaleString()}`,
                color: 'text-sky-300',
              },
              {
                label: 'Remaining Runway',
                value: `${active.outcomes.runway12m} months`,
                color: active.outcomes.runway12m > 6 ? 'text-emerald-300' : 'text-red-300',
              },
              {
                label: 'Team Size (12mo)',
                value: `${active.outcomes.teamSize12m} people`,
                color: 'text-cyan-300',
              },
              {
                label: 'Projected Valuation',
                value: `$${(active.outcomes.valuation / 1000000).toFixed(1)}M`,
                color: 'text-amber-300',
              },
            ].map((o) => (
              <div key={o.label} className="metric-card text-center">
                <span className="text-xs text-gray-500 uppercase tracking-wider">{o.label}</span>
                <p className={`text-xl font-bold mt-2 ${o.color}`}>{o.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-sky-950/30 border border-sky-900/30">
            <p className="text-xs text-sky-300/80">
              Simulation uses hybrid mode: real financial data combined with Bayesian-predicted
              growth trajectories. Override logic:{' '}
              <code className="text-[10px] bg-sky-900/40 px-1 py-0.5 rounded">
                const burnRate = useRealData ? realMetrics.burn : simulatedMetrics.burn
              </code>
            </p>
          </div>
        </div>
      )}

      {/* ===== DECISION TREE ===== */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> Decision Tree — Strategic Paths
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Bayesian probabilities for each decision branch. Color indicates expected impact.
        </p>
        <div className="overflow-x-auto">
          <svg viewBox="0 0 860 470" className="w-full" style={{ minHeight: '400px' }}>
            <DecisionTreeSVG tree={decisionTree} />
          </svg>
        </div>
      </div>

      {/* ===== MONTE CARLO PROJECTION ===== */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Monte Carlo MRR Projection — 12 Months
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          5 simulated growth paths with P10–P90 confidence band. Median path highlighted.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monteCarloBand}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              fontSize={11}
              label={{ value: 'Month', position: 'insideBottom', offset: -4, fill: '#6b7280', fontSize: 10 }}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value);
                return [Number.isFinite(n) ? `$${n.toLocaleString()}` : String(value ?? ''), ''];
              }}
            />

            {/* Confidence band: invisible base + colored band */}
            <Area
              type="monotone"
              dataKey="p10Base"
              stackId="band"
              fill="transparent"
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey="band"
              stackId="band"
              fill="#0ea5e9"
              fillOpacity={0.12}
              stroke="none"
              name="P10–P90 Range"
            />

            {/* Individual sample paths */}
            {[1, 2, 3, 4, 5].map((p) => (
              <Line
                key={p}
                type="monotone"
                dataKey={`path${p}`}
                stroke="#0ea5e9"
                strokeOpacity={0.18}
                strokeWidth={1}
                dot={false}
                name={`Path ${p}`}
              />
            ))}

            {/* Median */}
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={false}
              name="Median (P50)"
            />

            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ===== Decision Tree SVG renderer =====

function DecisionTreeSVG({ tree }: { tree: DecisionNode }) {
  const l1 = tree.children || [];
  const nodeH = 46;

  // Level 2 y-positions (9 leaf nodes, 50px spacing)
  const l2AllY: number[][] = [];
  let yOffset = 12;
  for (const child of l1) {
    const leaves = child.children || [];
    const ys: number[] = [];
    for (let j = 0; j < leaves.length; j++) {
      ys.push(yOffset);
      yOffset += 52;
    }
    l2AllY.push(ys);
    yOffset += 14; // gap between groups
  }

  // Level 1 y-positions (centered on children)
  const l1Y = l2AllY.map((ys) => {
    const mid = (ys[0] + ys[ys.length - 1]) / 2;
    return mid;
  });

  // Root y-position (centered on level 1)
  const rootY = (l1Y[0] + l1Y[l1Y.length - 1]) / 2;

  const rootX = 25;
  const rootW = 140;
  const l1X = 260;
  const l1W = 195;
  const l2X = 560;
  const l2W = 260;

  function impactColor(impact: number) {
    if (impact >= 50) return '#059669';
    if (impact >= 10) return '#d97706';
    if (impact >= 0) return '#9ca3af';
    if (impact >= -30) return '#f59e0b';
    return '#dc2626';
  }

  return (
    <>
      {/* Root → Level 1 edges */}
      {l1.map((_, i) => (
        <path
          key={`e1-${i}`}
          d={`M ${rootX + rootW} ${rootY + nodeH / 2} C ${rootX + rootW + 50} ${rootY + nodeH / 2} ${l1X - 50} ${l1Y[i] + nodeH / 2} ${l1X} ${l1Y[i] + nodeH / 2}`}
          fill="none"
          stroke="#374151"
          strokeWidth={1.5}
        />
      ))}

      {/* Level 1 → Level 2 edges */}
      {l1.map((child, i) =>
        (child.children || []).map((_, j) => (
          <path
            key={`e2-${i}-${j}`}
            d={`M ${l1X + l1W} ${l1Y[i] + nodeH / 2} C ${l1X + l1W + 50} ${l1Y[i] + nodeH / 2} ${l2X - 50} ${l2AllY[i][j] + nodeH / 2} ${l2X} ${l2AllY[i][j] + nodeH / 2}`}
            fill="none"
            stroke="#1f2937"
            strokeWidth={1}
          />
        )),
      )}

      {/* Root node */}
      <rect
        x={rootX}
        y={rootY}
        width={rootW}
        height={nodeH}
        rx={10}
        fill="#1e1b4b"
        stroke="#0ea5e9"
        strokeWidth={1.5}
      />
      <text
        x={rootX + rootW / 2}
        y={rootY + nodeH / 2 + 4}
        textAnchor="middle"
        fill="#c7d2fe"
        fontSize={11}
        fontWeight="bold"
      >
        {tree.label}
      </text>

      {/* Level 1 nodes */}
      {l1.map((child, i) => {
        const ic = impactColor(child.impact);
        return (
          <g key={child.id}>
            <rect
              x={l1X}
              y={l1Y[i]}
              width={l1W}
              height={nodeH}
              rx={8}
              fill="rgba(255,255,255,0.04)"
              stroke="#374151"
            />
            <text
              x={l1X + 10}
              y={l1Y[i] + 18}
              fill="#e5e7eb"
              fontSize={10}
              fontWeight="500"
            >
              {child.label.length > 26 ? child.label.slice(0, 26) + '...' : child.label}
            </text>
            <text x={l1X + 10} y={l1Y[i] + 34} fill="#9ca3af" fontSize={9}>
              {(child.probability * 100).toFixed(0)}%
              {child.outcome ? ` · ${child.outcome.slice(0, 22)}` : ''}
            </text>
            {/* Impact badge */}
            <rect
              x={l1X + l1W - 30}
              y={l1Y[i] + 10}
              width={22}
              height={18}
              rx={4}
              fill={ic}
              fillOpacity={0.2}
            />
            <text
              x={l1X + l1W - 19}
              y={l1Y[i] + 23}
              textAnchor="middle"
              fill={ic}
              fontSize={8}
              fontWeight="bold"
            >
              {child.impact > 0 ? '+' : ''}
              {child.impact}
            </text>
          </g>
        );
      })}

      {/* Level 2 nodes */}
      {l1.map((child, i) =>
        (child.children || []).map((leaf, j) => {
          const ic = impactColor(leaf.impact);
          return (
            <g key={leaf.id}>
              <rect
                x={l2X}
                y={l2AllY[i][j]}
                width={l2W}
                height={nodeH}
                rx={8}
                fill="rgba(255,255,255,0.03)"
                stroke="#1f2937"
              />
              <text
                x={l2X + 10}
                y={l2AllY[i][j] + 18}
                fill="#d1d5db"
                fontSize={10}
              >
                {leaf.label}
              </text>
              <text
                x={l2X + 10}
                y={l2AllY[i][j] + 34}
                fill="#6b7280"
                fontSize={9}
              >
                {(leaf.probability * 100).toFixed(0)}% · {leaf.outcome}
              </text>
              {/* Impact badge */}
              <rect
                x={l2X + l2W - 30}
                y={l2AllY[i][j] + 10}
                width={22}
                height={18}
                rx={4}
                fill={ic}
                fillOpacity={0.2}
              />
              <text
                x={l2X + l2W - 19}
                y={l2AllY[i][j] + 23}
                textAnchor="middle"
                fill={ic}
                fontSize={8}
                fontWeight="bold"
              >
                {leaf.impact > 0 ? '+' : ''}
                {leaf.impact}
              </text>
            </g>
          );
        }),
      )}
    </>
  );
}
