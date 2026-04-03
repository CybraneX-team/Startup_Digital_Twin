import { useState } from 'react';
import {
  GitBranch, ArrowDownToLine, ArrowUpFromLine, Sparkles, CheckCircle2,
  Loader2, Shield, AlertTriangle, Zap, BarChart3, User, Bot, ChevronDown, ChevronUp,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { decisions as initialDecisions } from '../data/mockData';
import type { Decision, DecisionOption } from '../types';

const ORIGIN_CFG = {
  'top-down': { icon: ArrowDownToLine, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Top-Down' },
  'bottom-up': { icon: ArrowUpFromLine, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Bottom-Up' },
};

const STATUS_CFG = {
  draft: { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
  evaluating: { color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  ranked: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  decided: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

const EVAL_BARS: { key: keyof DecisionOption['evaluation']; label: string; color: string; goodHigh: boolean }[] = [
  { key: 'impact', label: 'Impact', color: 'bg-emerald-500', goodHigh: true },
  { key: 'confidence', label: 'Confidence', color: 'bg-sky-500', goodHigh: true },
  { key: 'risk', label: 'Risk', color: 'bg-red-500', goodHigh: false },
  { key: 'resources', label: 'Resources', color: 'bg-amber-500', goodHigh: false },
  { key: 'sensitivity', label: 'Sensitivity', color: 'bg-cyan-500', goodHigh: false },
];

function optimizationScore(ev: DecisionOption['evaluation']): number {
  return Math.round(ev.impact * 0.35 + ev.confidence * 0.25 - ev.risk * 0.2 - ev.resources * 0.1 - ev.sensitivity * 0.1);
}

export default function Decisions() {
  const [decs, setDecs] = useState<Decision[]>(initialDecisions);
  const [selectedId, setSelectedId] = useState<string>('dec-pricing');
  const [evaluating, setEvaluating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = decs.find((d) => d.id === selectedId)!;
  const oCfg = ORIGIN_CFG[active.origin];
  const OIcon = oCfg.icon;

  const sortedOptions = [...active.options].sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    return optimizationScore(b.evaluation) - optimizationScore(a.evaluation);
  });

  const handleEvaluate = () => {
    setEvaluating(true);
    setTimeout(() => {
      setDecs((prev) =>
        prev.map((d) => {
          if (d.id !== selectedId) return d;
          const scored = d.options
            .map((o) => ({ ...o, rank: undefined as number | undefined }))
            .sort((a, b) => optimizationScore(b.evaluation) - optimizationScore(a.evaluation))
            .map((o, i) => ({ ...o, rank: i + 1 }));
          return { ...d, options: scored, status: 'ranked' as const };
        }),
      );
      setEvaluating(false);
    }, 2000);
  };

  const handleSelect = (optId: string, by: string) => {
    setDecs((prev) =>
      prev.map((d) =>
        d.id === selectedId ? { ...d, selectedOption: optId, decidedBy: by, status: 'decided' as const } : d,
      ),
    );
  };

  return (
    <div>
      <PageHeader
        title="Decision Flow"
        subtitle="Evaluate, rank, and optimize decisions with quantum-inspired scoring"
        icon={<GitBranch className="w-6 h-6" />}
        badge="Active"
      />

      {/* ===== Decision List ===== */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
        {decs.map((d) => {
          const cfg = STATUS_CFG[d.status];
          const origin = ORIGIN_CFG[d.origin];
          const OI = origin.icon;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`flex-shrink-0 text-left px-4 py-3 rounded-xl border transition-all ${
                selectedId === d.id
                  ? 'bg-sky-600/10 border-sky-500/30'
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
              }`}
              style={{ minWidth: 240 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <OI className={`w-3.5 h-3.5 ${origin.color}`} />
                <span className="text-xs text-gray-400">{d.department}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ml-auto`}>
                  {d.status}
                </span>
              </div>
              <p className="text-sm text-white font-medium truncate">{d.title}</p>
              <span className="text-[10px] text-gray-500">by {d.proposedBy} · {d.options.length} options</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ===== Left: Decision Context ===== */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <OIcon className={`w-4 h-4 ${oCfg.color}`} />
              <span className={`text-xs px-2 py-0.5 rounded-full ${oCfg.bg} border ${oCfg.border} ${oCfg.color}`}>
                {oCfg.label}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">{active.title}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
              <span>{active.department}</span>
              <span>·</span>
              <span>by {active.proposedBy}</span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Options ({active.options.length})</p>
              {active.options.map((o) => (
                <div
                  key={o.id}
                  className={`px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    expanded === o.id ? 'bg-sky-500/5 border-sky-500/20' : 'bg-gray-900/50 border-gray-800/50 hover:border-gray-700'
                  } ${active.selectedOption === o.id ? 'ring-1 ring-emerald-500/40' : ''}`}
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {o.rank && (
                        <span className="text-[10px] w-5 h-5 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center font-bold">
                          {o.rank}
                        </span>
                      )}
                      <span className="text-sm text-gray-200">{o.label}</span>
                    </div>
                    {expanded === o.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                  </div>
                  {expanded === o.id && (
                    <div className="mt-2 pt-2 border-t border-gray-800/50">
                      <p className="text-xs text-gray-400 mb-2">{o.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.source === 'generated' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-800 text-gray-400'}`}>
                          {o.source === 'generated' ? 'AI Generated' : 'User Proposed'}
                        </span>
                        {o.dependencies.map((dep) => (
                          <span key={dep} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{dep}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {active.status !== 'decided' && (
                <button
                  onClick={handleEvaluate}
                  disabled={evaluating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {evaluating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {evaluating ? 'Optimizing...' : 'Run Evaluation'}
                </button>
              )}
              {active.status === 'decided' && (
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">Decided by {active.decidedBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Center: Ranked Results + Evaluation ===== */}
        <div className="col-span-2 space-y-4">
          {/* Optimization scores */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Quantum-Optimized Ranking
            </h4>
            <div className="space-y-4">
              {sortedOptions.map((opt, idx) => {
                const score = optimizationScore(opt.evaluation);
                const isSelected = active.selectedOption === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                        : 'bg-gray-900/40 border-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-amber-500/15 text-amber-400' :
                          idx === 1 ? 'bg-gray-700 text-gray-300' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="text-sm font-medium text-white">{opt.label}</h5>
                          <p className="text-[10px] text-gray-500">{opt.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs text-gray-500">Score</span>
                          <p className={`text-lg font-bold ${score > 30 ? 'text-emerald-400' : score > 10 ? 'text-amber-400' : 'text-red-400'}`}>
                            {score}
                          </p>
                        </div>
                        {active.status === 'ranked' && !active.selectedOption && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSelect(opt.id, 'Founder')}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors" title="Founder decides"
                            >
                              <User className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleSelect(opt.id, 'AI Agent')}
                              className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/15 transition-colors" title="AI decides"
                            >
                              <Bot className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                          </div>
                        )}
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                    </div>

                    {/* Evaluation bars */}
                    <div className="grid grid-cols-5 gap-3">
                      {EVAL_BARS.map((bar) => {
                        const val = opt.evaluation[bar.key];
                        const absVal = bar.key === 'impact' ? Math.abs(val) : val;
                        const isNeg = bar.key === 'impact' && val < 0;
                        return (
                          <div key={bar.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-500">{bar.label}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {isNeg ? '-' : ''}{absVal}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${bar.color}`}
                                style={{ width: `${absVal}%`, opacity: 0.8 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dependencies */}
                    {opt.dependencies.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/50">
                        <AlertTriangle className="w-3 h-3 text-amber-500/60" />
                        <span className="text-[10px] text-gray-500">Dependencies:</span>
                        {opt.dependencies.map((dep) => (
                          <span key={dep} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/70">
                            {dep}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade-off matrix */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Trade-off Matrix
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Option</th>
                    {EVAL_BARS.map((b) => (
                      <th key={b.key} className="text-center py-2 px-3 text-gray-500 font-medium">{b.label}</th>
                    ))}
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">
                      <Shield className="w-3 h-3 inline" /> Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOptions.map((opt) => {
                    const score = optimizationScore(opt.evaluation);
                    return (
                      <tr key={opt.id} className="border-b border-gray-800/50">
                        <td className="py-2 px-3 text-gray-300">{opt.label}</td>
                        {EVAL_BARS.map((b) => {
                          const v = opt.evaluation[b.key];
                          const abs = b.key === 'impact' ? Math.abs(v) : v;
                          const good = b.goodHigh ? abs > 60 : abs < 40;
                          return (
                            <td key={b.key} className={`text-center py-2 px-3 font-mono ${good ? 'text-emerald-400' : 'text-gray-400'}`}>
                              {b.key === 'impact' && v < 0 ? '-' : ''}{abs}
                            </td>
                          );
                        })}
                        <td className={`text-center py-2 px-3 font-bold ${score > 30 ? 'text-emerald-400' : score > 10 ? 'text-amber-400' : 'text-red-400'}`}>
                          {score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-600 mt-3">
              Score = Impact(35%) + Confidence(25%) - Risk(20%) - Resources(10%) - Sensitivity(10%). QUBO-optimized.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
