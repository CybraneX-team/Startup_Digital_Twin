import { useEffect, useRef, useState } from 'react';
import {
  Database, Upload, PenLine, FileSpreadsheet, Check, AlertCircle,
  Link2, Globe2, Wifi, WifiOff, Clock,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { integrations } from '../data/mockData';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

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

export default function DataIngestion() {
  const { canWrite } = useAuth();
  const canUploadExcel = canWrite('data');
  const [activeTab, setActiveTab] = useState<Tab>('manual');
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

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
  }, [jobId]);

  async function handleExcelFile(file: File) {
    if (!canUploadExcel) return;
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
              canUploadExcel
                ? 'border-gray-700 hover:border-sky-500/50 cursor-pointer'
                : 'border-gray-800 cursor-not-allowed opacity-60'
            }`}
            onClick={() => canUploadExcel && fileInputRef.current?.click()}
            disabled={!canUploadExcel || uploading}
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
                  {canUploadExcel
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
        </div>
      )}

      {/* ===== INTEGRATIONS ===== */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300">Connected Integrations</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {integrations.filter((i) => i.status === 'connected').length} connected,{' '}
                  {integrations.filter((i) => i.status === 'available').length} available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 status-pulse" />
                <span className="text-xs text-gray-400">Auto-sync every 15min</span>
              </div>
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
