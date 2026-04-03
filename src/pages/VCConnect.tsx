import { useState } from 'react';
import {
  Handshake,
  Users,
  Send,
  FileText,
  Calendar,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Plus,
  ArrowUpRight,
  Sparkles,
  UserCheck,
  BadgeDollarSign,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { investors, investorUpdates, mentors, mentorSessions } from '../data/mockData';
import type { Investor, InvestorStatus, MentorSession } from '../types';

/* ── status config ── */
const STATUS_CFG: Record<InvestorStatus, { label: string; color: string; bg: string }> = {
  prospect:       { label: 'Prospect',       color: 'text-gray-400',   bg: 'bg-gray-500/10' },
  contacted:      { label: 'Contacted',      color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  'in-discussion':{ label: 'In Discussion',  color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  'term-sheet':   { label: 'Term Sheet',     color: 'text-sky-400', bg: 'bg-sky-500/10' },
  committed:      { label: 'Committed',      color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  passed:         { label: 'Passed',         color: 'text-red-400',    bg: 'bg-red-500/10' },
};

const PIPELINE_ORDER: InvestorStatus[] = ['prospect', 'contacted', 'in-discussion', 'term-sheet', 'committed', 'passed'];

const SESSION_ICON: Record<MentorSession['status'], typeof CheckCircle2> = {
  completed: CheckCircle2,
  scheduled: Clock,
  cancelled: XCircle,
};
const SESSION_COLOR: Record<MentorSession['status'], string> = {
  completed: 'text-emerald-400',
  scheduled: 'text-amber-400',
  cancelled: 'text-red-400',
};

type Tab = 'pipeline' | 'updates' | 'mentors';

export default function VCConnect() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const inv = selectedInvestor ? investors.find((i) => i.id === selectedInvestor) : null;
  const sess = selectedSession ? mentorSessions.find((s) => s.id === selectedSession) : null;

  return (
    <div>
      <PageHeader
        title="VC & Mentor Connect"
        subtitle="Investor pipeline, structured updates, and mentor session workflows"
        icon={<Handshake className="w-6 h-6" />}
        badge="Ecosystem"
      />

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-sky-900/20 w-fit">
        {([['pipeline', BadgeDollarSign, 'Investor Pipeline'], ['updates', FileText, 'Monthly Updates'], ['mentors', Users, 'Mentors']] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              tab === key
                ? 'bg-sky-600/20 text-sky-300 font-medium shadow-[0_0_15px_rgba(14,165,233,0.1)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════ PIPELINE ═══════════ */}
      {tab === 'pipeline' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left — Kanban-style pipeline */}
          <div className="col-span-2 space-y-4">
            {/* Pipeline summary row */}
            <div className="flex gap-3 flex-wrap">
              {PIPELINE_ORDER.map((st) => {
                const count = investors.filter((i) => i.status === st).length;
                const cfg = STATUS_CFG[st];
                return (
                  <div key={st} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.bg} border border-white/5`}>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Investor cards */}
            <div className="space-y-3">
              {investors.map((inv) => {
                const cfg = STATUS_CFG[inv.status];
                return (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedInvestor(inv.id)}
                    className={`w-full text-left glass-card p-4 transition-all hover:border-sky-500/30 ${
                      selectedInvestor === inv.id ? 'border-sky-500/40 bg-sky-600/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center text-xs font-bold text-sky-300">
                          {inv.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-white">{inv.name}</h4>
                          <p className="text-xs text-gray-500">{inv.firm}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-medium`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{inv.avgTicket}</span>
                      <span>{inv.stages.join(', ')}</span>
                      {inv.warmIntro && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <UserCheck className="w-3 h-3" /> Warm intro
                        </span>
                      )}
                      {inv.sharedDashboards.length > 0 && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Eye className="w-3 h-3" /> {inv.sharedDashboards.length} metrics shared
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — Detail panel */}
          <div className="col-span-1">
            {inv ? (
              <div className="glass-card p-6 space-y-5 sticky top-[4.5rem]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center text-sm font-bold text-sky-300">
                    {inv.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{inv.name}</h3>
                    <p className="text-sm text-gray-400">{inv.firm}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <p className="text-gray-500 mb-0.5">Avg. Ticket</p>
                    <p className="text-white font-medium">{inv.avgTicket}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <p className="text-gray-500 mb-0.5">Stages</p>
                    <p className="text-white font-medium">{inv.stages.join(', ')}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <p className="text-gray-500 mb-0.5">Sectors</p>
                    <p className="text-white font-medium">{inv.sectors.join(', ')}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <p className="text-gray-500 mb-0.5">Status</p>
                    <p className={`font-medium ${STATUS_CFG[inv.status].color}`}>{STATUS_CFG[inv.status].label}</p>
                  </div>
                </div>

                {inv.lastContact && (
                  <div className="text-xs text-gray-500">
                    Last contact: <span className="text-gray-300">{inv.lastContact}</span>
                    {inv.nextFollowUp && (
                      <> &middot; Follow-up: <span className="text-amber-400">{inv.nextFollowUp}</span></>
                    )}
                  </div>
                )}

                {inv.notes && (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-gray-400 leading-relaxed">
                    <MessageSquare className="w-3 h-3 inline mr-1 text-gray-500" />
                    {inv.notes}
                  </div>
                )}

                {/* Shared dashboards */}
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-2">
                    {inv.sharedDashboards.length > 0 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    Shared Metrics ({inv.sharedDashboards.length})
                  </h4>
                  {inv.sharedDashboards.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {inv.sharedDashboards.map((m) => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {m.replace('tm-', '')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">No metrics shared yet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-600/15 text-sky-300 text-xs font-medium hover:bg-sky-600/25 transition-all">
                    <Send className="w-3 h-3" /> Send Update
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-600/15 text-cyan-300 text-xs font-medium hover:bg-cyan-600/25 transition-all">
                    <Eye className="w-3 h-3" /> Share Metrics
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 flex flex-col items-center justify-center text-gray-500">
                <Handshake className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Select an investor to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ MONTHLY UPDATES ═══════════ */}
      {tab === 'updates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Investor Update Templates</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600/15 text-sky-300 text-xs font-medium hover:bg-sky-600/25 transition-all">
              <Plus className="w-3 h-3" /> New Update
            </button>
          </div>

          {investorUpdates.map((upd) => (
            <div key={upd.id} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-sky-400" />
                  <div>
                    <h4 className="text-base font-semibold text-white">{upd.month}</h4>
                    <p className="text-xs text-gray-500">
                      {upd.status === 'sent'
                        ? `Sent to ${upd.sentTo.length} investor${upd.sentTo.length > 1 ? 's' : ''}`
                        : 'Draft — not sent yet'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    upd.status === 'sent'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {upd.status === 'sent' ? 'Sent' : 'Draft'}
                </span>
              </div>

              {upd.highlights.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-gray-400 mb-2">Highlights</h5>
                  <ul className="space-y-1">
                    {upd.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <Sparkles className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(upd.metrics).some((k) => upd.metrics[k] > 0) && (
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-gray-400 mb-2">Metrics Snapshot</h5>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(upd.metrics)
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => (
                        <div key={k} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-center min-w-[80px]">
                          <p className="text-sm font-semibold text-white">{typeof v === 'number' && v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{k}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {upd.asks.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-gray-400 mb-2">Asks</h5>
                  <ul className="space-y-1">
                    {upd.asks.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                        <ArrowUpRight className="w-3 h-3 text-cyan-400 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {upd.sentTo.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-400 mb-2">Recipients</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {upd.sentTo.map((invId) => {
                      const i = investors.find((x) => x.id === invId);
                      return i ? (
                        <span key={invId} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          {i.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ MENTORS ═══════════ */}
      {tab === 'mentors' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: mentor list */}
          <div className="col-span-1 space-y-3">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Your Mentors</h3>
            {mentors.map((m) => {
              const nextSess = mentorSessions.find(
                (s) => s.mentorId === m.id && s.status === 'scheduled',
              );
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    const latest = mentorSessions.filter((s) => s.mentorId === m.id).sort((a, b) => b.date.localeCompare(a.date))[0];
                    if (latest) setSelectedSession(latest.id);
                  }}
                  className="w-full text-left glass-card p-4 hover:border-sky-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-sky-500/10 flex items-center justify-center text-xs font-bold text-cyan-300">
                      {m.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{m.name}</h4>
                      <p className="text-xs text-gray-500">{m.role}{m.company ? ` · ${m.company}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.expertise.map((e) => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400">
                        {e}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="capitalize">{m.availability}</span>
                    {nextSess && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {nextSess.date}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: session workflow */}
          <div className="col-span-2 space-y-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Session Workflow</h3>

            {mentorSessions.map((s) => {
              const mentor = mentors.find((m) => m.id === s.mentorId);
              const StatusIcon = SESSION_ICON[s.status];
              const statusColor = SESSION_COLOR[s.status];
              const isSelected = selectedSession === s.id;

              return (
                <div
                  key={s.id}
                  className={`glass-card p-5 transition-all ${isSelected ? 'border-sky-500/40 bg-sky-600/5' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                      <div>
                        <h4 className="text-sm font-medium text-white">
                          {mentor?.name} &middot; <span className="text-gray-400">{s.date}</span>
                        </h4>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                        s.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : s.status === 'scheduled'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  {/* Agenda → Actions → Follow-ups flow */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Agenda
                      </h5>
                      <ul className="space-y-1">
                        {s.agenda.map((a, i) => (
                          <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                            <ChevronRight className="w-3 h-3 mt-0.5 text-sky-500 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Actions
                      </h5>
                      {s.actions.length > 0 ? (
                        <ul className="space-y-1">
                          {s.actions.map((a, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                              <ChevronRight className="w-3 h-3 mt-0.5 text-cyan-500 shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Pending session</p>
                      )}
                    </div>
                    <div>
                      <h5 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> Follow-ups
                      </h5>
                      {s.followUps.length > 0 ? (
                        <ul className="space-y-1">
                          {s.followUps.map((f, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                              <ChevronRight className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Pending session</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
