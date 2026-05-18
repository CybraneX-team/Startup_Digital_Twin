import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Database, Upload, PenLine, FileSpreadsheet, Check, AlertCircle,
  Link2, Globe2, Wifi, WifiOff, Clock, XCircle, RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import IntegrationModal from '../components/IntegrationModal';
import { integrations } from '../data/mockData';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { fetchConnections } from '../lib/integrations/service';
import type { IntegrationConnection } from '../lib/integrations/types';
import type { Integration } from '../types';
import type { UserRole } from '../lib/supabase';

type Tab = 'manual' | 'csv' | 'integrations' | 'public';

interface FormData {
  mrr: string;
  burnRate: string;
  teamSize: string;
  cac: string;
  ltv: string;
  churnRate: string;
  nps: string;
}

interface ReviewDecision {
  id: string;
  run_id: string;
  source_label: string | null;
  proposed_key: string | null;
  final_key: string | null;
  confidence: number | null;
  stage: string;
  status: string;
  reasoning: string | null;
  source_locator: Record<string, unknown>;
  original_name: string;
  sheet_name: string;
  bbox: string | null;
  promoted_count: number;
  impact_value_count?: number;
  created_at: string;
}

const statusBadge = {
  connected: { icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  available: { icon: WifiOff, color: 'text-gray-400', bg: 'bg-gray-800 border-gray-700' },
  'coming-soon': { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

const catLabels: Record<string, string> = {
  finance: 'Finance & Payments',
  crm: 'CRM & Sales',
  analytics: 'Product Analytics',
  project: 'Project & Comms',
  market: 'Market Intelligence',
  social: 'Social Listening',
  government: 'Government & Compliance',
};

const INGESTION_WRITE_ROLES = new Set<UserRole>(['founder', 'co_founder', 'admin', 'super_admin']);

export default function DataIngestion() {
  const { canWrite, role } = useAuth();
  const canManageExcel = Boolean(role && INGESTION_WRITE_ROLES.has(role) && canWrite('data'));
  const [activeTab, setActiveTab] = useState<Tab>('manual');

  // ── Integration state ──────────────────────────────────────────────────────
  const [connections, setConnections]       = useState<Record<string, IntegrationConnection>>({});
  const [loadingConns, setLoadingConns]     = useState(false);
  const [selectedInt, setSelectedInt]       = useState<Integration | null>(null);

  const loadConnections = useCallback(async () => {
    setLoadingConns(true);
    try {
      const c = await fetchConnections();
      setConnections(c);
    } catch { /* backend may not be running */ }
    finally { setLoadingConns(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'integrations') void loadConnections();
  }, [activeTab, loadConnections]);

  // ──────────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<FormData>({
    mrr: '8500',
    burnRate: '45000',
    teamSize: '12',
    cac: '95',
    ltv: '1200',
    churnRate: '4.2',
    nps: '42',
  });
  const [submitted, setSubmitted] = useState(false);
  const [csvFile, setCsvFile] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [jobState, setJobState] = useState<{
    status: 'pending' | 'running' | 'complete' | 'failed';
    record_count?: number | null;
    last_error?: string | null;
  } | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewDecision[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>({});
  const [actingDecisionId, setActingDecisionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const loadReviewQueue = useCallback(async () => {
    setReviewLoading(true);
    setReviewError(null);
    try {
      const rows = await api.get<ReviewDecision[]>('/api/ingestion/decisions/pending');
      setReviewQueue(rows);
      setOverrideInputs((current) => {
        const next = { ...current };
        for (const row of rows) {
          if (!next[row.id]) next[row.id] = row.proposed_key ?? '';
        }
        return next;
      });
    } catch (e) {
      setReviewError(String(e));
    } finally {
      setReviewLoading(false);
    }
  }, []);

  async function handleDecisionAction(
    decision: ReviewDecision,
    action: 'accept' | 'override' | 'reject',
  ) {
    setActingDecisionId(decision.id);
    setReviewError(null);
    try {
      await api.post<{ promoted: number; status: string; finalKey?: string }>(
        `/api/ingestion/decisions/${decision.id}/override`,
        {
          action,
          ...(action === 'override' ? { finalKey: overrideInputs[decision.id] } : {}),
        },
      );
      await loadReviewQueue();
    } catch (e) {
      setReviewError(String(e));
    } finally {
      setActingDecisionId(null);
    }
  }

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const next = await api.get<{
          status: 'pending' | 'running' | 'complete' | 'failed';
          record_count?: number | null;
          last_error?: string | null;
        }>(`/api/ingestion/jobs/${jobId}`);
        if (cancelled) return;
        setJobState(next);
        if (next.status === 'complete' || next.status === 'failed') {
          clearInterval(timer);
          if (next.status === 'complete') void loadReviewQueue();
        }
      } catch (e) {
        if (!cancelled) {
          setUploadError(String(e));
          clearInterval(timer);
        }
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, loadReviewQueue]);

  useEffect(() => {
    if (activeTab === 'csv') void loadReviewQueue();
  }, [activeTab, loadReviewQueue]);

  async function handleExcelFile(file: File) {
    if (!canManageExcel) return;
    setUploading(true);
    setUploadError(null);
    setJobState(null);
    setJobId(null);
    setCsvFile(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.post<{ jobId: string; dedup?: boolean }>(
        '/api/ingestion/excel/upload',
        formData,
      );
      setJobId(result.jobId);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  }

  const fields = [
    { key: 'mrr', label: 'Monthly Recurring Revenue', unit: '$', placeholder: '8500' },
    { key: 'burnRate', label: 'Monthly Burn Rate', unit: '$', placeholder: '45000' },
    { key: 'teamSize', label: 'Team Size', unit: 'people', placeholder: '12' },
    { key: 'cac', label: 'Customer Acquisition Cost', unit: '$', placeholder: '95' },
    { key: 'ltv', label: 'Customer Lifetime Value', unit: '$', placeholder: '1200' },
    { key: 'churnRate', label: 'Monthly Churn Rate', unit: '%', placeholder: '4.2' },
    { key: 'nps', label: 'Net Promoter Score', unit: '', placeholder: '42' },
  ];

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'manual', icon: <PenLine className="w-4 h-4" />, label: 'Manual Input' },
    { id: 'csv', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Excel Upload' },
    { id: 'integrations', icon: <Link2 className="w-4 h-4" />, label: 'Integrations' },
    { id: 'public', icon: <Globe2 className="w-4 h-4" />, label: 'Public Sources' },
  ];

  // Group integrations by category
  const intCats = ['finance', 'crm', 'analytics', 'project'] as const;
  const pubCats = ['market', 'social', 'government'] as const;

  return (
    <div>
      <PageHeader
        title="Data Ingestion"
        subtitle="Feed real operational data into your digital twin"
        icon={<Database className="w-6 h-6" />}
      />

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-all ${
              activeTab === t.id
                ? 'bg-sky-600/15 border-sky-500/30 text-sky-300 font-medium'
                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ===== MANUAL ===== */}
      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit}>
          <div className="glass-card p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Operational Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1.5 block">{f.label}</label>
                  <div className="flex items-center gap-2">
                    {f.unit && f.unit !== '%' && f.unit !== 'people' && (
                      <span className="text-sm text-gray-500">{f.unit}</span>
                    )}
                    <input
                      type="number"
                      value={formData[f.key as keyof FormData]}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                    {(f.unit === '%' || f.unit === 'people') && (
                      <span className="text-xs text-gray-500">{f.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Normalization Preview</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { dim: 'Industry', value: 'SaaS', desc: 'Adjusted for SaaS benchmarks' },
                { dim: 'Geography', value: 'India', desc: 'Regional salary & CAC norms' },
                { dim: 'Stage', value: 'Seed', desc: 'Compared to seed-stage cohort' },
                { dim: 'Model', value: 'B2B', desc: 'B2B unit economics applied' },
              ].map((n) => (
                <div key={n.dim} className="py-3 px-4 rounded-lg bg-gray-900/50 border border-gray-800/50">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{n.dim}</span>
                  <p className="text-sm font-medium text-sky-300 mt-1">{n.value}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{n.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-all"
          >
            {submitted ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {submitted ? 'Data Synced to Twin!' : 'Sync to Digital Twin'}
          </button>
        </form>
      )}

      {/* ===== CSV ===== */}
      {activeTab === 'csv' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">Excel Upload</h3>
            <a
              href="/templates/FounderOS_Metrics_Template.xlsx"
              className="text-xs text-sky-400 hover:text-sky-300 underline"
            >
              Download template
            </a>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleExcelFile(file);
              e.currentTarget.value = '';
            }}
          />

          <button
            type="button"
            className={`w-full border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              canManageExcel
                ? 'border-gray-700 hover:border-sky-500/50 cursor-pointer'
                : 'border-gray-800 cursor-not-allowed opacity-60'
            }`}
            onClick={() => canManageExcel && fileInputRef.current?.click()}
            disabled={!canManageExcel || uploading}
          >
            {uploading ? (
              <div>
                <Upload className="w-8 h-8 text-sky-400 mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-sky-300">Uploading file...</p>
                <p className="text-xs text-gray-500 mt-1">We will process and sync automatically</p>
              </div>
            ) : csvFile ? (
              <div>
                <Check className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm text-emerald-300 font-medium">{csvFile}</p>
                <p className="text-xs text-gray-500 mt-1">Upload submitted. Tracking ingestion job.</p>
              </div>
            ) : (
              <div>
                <FileSpreadsheet className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  {canManageExcel
                    ? 'Click to upload filled .xlsx template'
                    : 'You do not have permission to upload data'}
                </p>
                <p className="text-xs text-gray-600 mt-1">Supported: FounderOS canonical template</p>
              </div>
            )}
          </button>

          {(jobState || uploadError) && (
            <div className="mt-6">
              <h4 className="text-xs font-medium text-gray-400 mb-3">Ingestion Job</h4>
              {uploadError && (
                <div className="flex items-center gap-2 text-sm text-red-400 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {uploadError}
                </div>
              )}
              {jobState && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${
                      jobState.status === 'complete'
                        ? 'text-emerald-400'
                        : jobState.status === 'failed'
                          ? 'text-red-400'
                          : 'text-sky-400'
                    }`}>
                      {jobState.status}
                    </span>
                  </div>
                  {typeof jobState.record_count === 'number' && (
                    <div className="text-gray-300">
                      <span className="text-gray-500">Records:</span> {jobState.record_count}
                    </div>
                  )}
                  {jobState.last_error && (
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {jobState.last_error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 border-t border-gray-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Review Queue
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  {reviewQueue.length} pending mappings
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadReviewQueue()}
                className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-gray-800 text-gray-400 hover:text-sky-300 hover:border-sky-500/30 transition-colors"
                disabled={reviewLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reviewLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {!canManageExcel && reviewQueue.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 mb-3">
                Your role can view pending mappings, but only founders, co-founders, admins, and super admins can apply changes.
              </div>
            )}

            {reviewError && (
              <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
                <AlertCircle className="w-3.5 h-3.5" />
                {reviewError}
              </div>
            )}

            {reviewLoading && reviewQueue.length === 0 ? (
              <div className="text-sm text-gray-500 py-6">Loading review items...</div>
            ) : reviewQueue.length === 0 ? (
              <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-5 text-sm text-gray-500">
                No pending mappings.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewQueue.map((decision) => {
                  const busy = actingDecisionId === decision.id;
                  const locator = decision.source_locator ?? {};
                  const locatorText = [
                    decision.sheet_name,
                    typeof locator.row_idx === 'number' ? `row ${Number(locator.row_idx) + 1}` : null,
                    decision.bbox,
                  ].filter(Boolean).join(' · ');

                  return (
                    <div
                      key={decision.id}
                      className="rounded-lg border border-gray-800 bg-gray-950/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {decision.source_label ?? 'Unlabeled source'}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              {Math.round(Number(decision.confidence ?? 0) * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {decision.original_name} · {locatorText}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Proposed: <span className="text-gray-400">{decision.proposed_key ?? 'none'}</span>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Impact: <span className="text-gray-400">
                              promotes up to {decision.impact_value_count ?? 0} source values from this row
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDecisionAction(decision, 'reject')}
                          disabled={busy || !canManageExcel}
                          className="shrink-0 p-2 rounded-lg border border-gray-800 text-gray-500 hover:text-red-300 hover:border-red-500/30 transition-colors"
                          title="Reject mapping"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                        <input
                          value={overrideInputs[decision.id] ?? decision.proposed_key ?? ''}
                          onChange={(e) => setOverrideInputs({
                            ...overrideInputs,
                            [decision.id]: e.target.value,
                          })}
                          className="min-w-0 flex-1 px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
                          placeholder="metric_key"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleDecisionAction(decision, 'accept')}
                            disabled={busy || !canManageExcel || !decision.proposed_key}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-600/25 disabled:opacity-50 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDecisionAction(decision, 'override')}
                            disabled={busy || !canManageExcel || !(overrideInputs[decision.id] ?? '').trim()}
                            className="flex items-center gap-2 px-3 py-2 bg-sky-600/15 border border-sky-500/25 text-sky-300 text-xs font-medium rounded-lg hover:bg-sky-600/25 disabled:opacity-50 transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== INTEGRATIONS ===== */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-300">Connected Integrations</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {Object.keys(connections).length} live · click any card to connect or view metrics
                </p>
              </div>
              <button
                onClick={() => void loadConnections()}
                disabled={loadingConns}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingConns ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {intCats.map((cat) => {
            const items = integrations.filter((i) => i.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
                  {catLabels[cat]}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {items.map((int) => {
                    const liveConn = connections[int.id];
                    const isConnected = !!liveConn;
                    const isComingSoon = int.status === 'coming-soon';

                    return (
                      <button
                        key={int.id}
                        onClick={() => !isComingSoon && setSelectedInt(int)}
                        disabled={isComingSoon}
                        className={`glass-card p-4 flex items-start justify-between text-left transition-all ${
                          isComingSoon
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-sky-500/30 hover:bg-sky-500/5 cursor-pointer'
                        }`}
                      >
                        <div>
                          <h5 className="text-sm font-medium text-white">{int.name}</h5>
                          <p className="text-[10px] text-gray-500 mt-0.5">{int.description}</p>
                          {isConnected && (
                            <p className="text-[10px] text-gray-600 mt-1 truncate max-w-[120px]">
                              {liveConn.accountName}
                            </p>
                          )}
                        </div>
                        {isConnected ? (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex-shrink-0">
                            <Wifi className="w-3 h-3" /> Live
                          </span>
                        ) : isComingSoon ? (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/20 text-amber-400 flex-shrink-0">
                            <Clock className="w-3 h-3" /> Soon
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-gray-800 border-gray-700 text-gray-400 flex-shrink-0">
                            <WifiOff className="w-3 h-3" /> Connect
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Modal */}
          {selectedInt && (
            <IntegrationModal
              integration={selectedInt}
              connection={connections[selectedInt.id] ?? null}
              onClose={() => setSelectedInt(null)}
              onConnectionChange={() => void loadConnections()}
            />
          )}
        </div>
      )}

      {/* ===== PUBLIC SOURCES ===== */}
      {activeTab === 'public' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-1">External Data Feeds</h3>
            <p className="text-xs text-gray-500">
              Public and online sources powering the Environment Twin — market signals, competitor intel, sentiment, and regulatory updates.
            </p>
          </div>

          {pubCats.map((cat) => {
            const items = integrations.filter((i) => i.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
                  {catLabels[cat]}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {items.map((int) => {
                    const badge = statusBadge[int.status];
                    const Icon = badge.icon;
                    return (
                      <div
                        key={int.id}
                        className="glass-card p-4 flex items-start justify-between"
                      >
                        <div>
                          <h5 className="text-sm font-medium text-white">{int.name}</h5>
                          <p className="text-[10px] text-gray-500 mt-0.5">{int.description}</p>
                        </div>
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}>
                          <Icon className="w-3 h-3" />
                          {int.status === 'connected' ? 'Live' : int.status === 'available' ? 'Connect' : 'Soon'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="glass-card p-6">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Signal Pipeline</h4>
            <div className="flex items-center gap-4">
              {['Ingest', 'Normalize', 'Score', 'Route to Twin'].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-1">
                      <span className="text-xs font-medium text-sky-300">{i + 1}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{step}</span>
                  </div>
                  {i < 3 && <div className="w-8 h-px bg-gray-800 mt-[-12px]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
