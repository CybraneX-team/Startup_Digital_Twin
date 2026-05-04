import { useState } from 'react';
import {
  X, Building2, Globe, Calendar, Users, DollarSign,
  Briefcase, FileText, ChevronDown, Loader2, CheckCircle2,
} from 'lucide-react';
import { saveLocalCompany, type LocalCompany } from '../lib/localCompanies';
import type { CompanyStage, BusinessModel } from '../lib/supabase';

/* ── Types ──────────────────────────────────────────────── */
interface CreateCompanyModalProps {
  /** The industry galaxy the subdomain belongs to */
  industryId: string;
  /** The specific subdomain planet the user is browsing */
  subdomainId: string;
  subdomainName: string;
  industryName: string;
  industryColor: string;
  onClose: () => void;
  /** Called with the full saved company after a successful save */
  onCreated: (company: LocalCompany) => void;
}

const STAGES: CompanyStage[] = [
  'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B',
  'Series C', 'Series D+', 'Series E', 'Series F',
  'Pre-IPO', 'Public', 'Bootstrapped',
];

const MODELS: BusinessModel[] = ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'SaaS', 'D2C', 'Other'];

const COUNTRIES = [
  'India', 'USA', 'UK', 'Germany', 'France', 'Singapore',
  'Australia', 'Canada', 'Brazil', 'UAE', 'Other',
];

/* ── Field helpers ───────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5E5E5E' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#161618',
  border: '1px solid rgba(255,255,255,0.07)',
  color: '#fff',
  borderRadius: '0.75rem',
  padding: '10px 14px',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        style={{
          ...inputStyle,
          appearance: 'none',
          paddingRight: '36px',
          cursor: 'pointer',
          ...props.style,
        }}
      />
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: '#5E5E5E' }}
      />
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        resize: 'none',
        minHeight: '72px',
        ...props.style,
      }}
    />
  );
}

/* ── Modal ───────────────────────────────────────────────── */
export default function CreateCompanyModal({
  industryId,
  subdomainId,
  subdomainName,
  industryName,
  industryColor,
  onClose,
  onCreated,
}: CreateCompanyModalProps) {
  const [form, setForm] = useState({
    name: '',
    country: 'India',
    stage: 'Seed' as CompanyStage,
    founded_year: new Date().getFullYear(),
    description: '',
    website: '',
    employees: '',
    mrr_usd: '',
    business_model: 'B2B' as BusinessModel,
    problem_solved: '',
    usp: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Company name is required.'); return; }

    setLoading(true);
    setError(null);

    try {
      const saved = saveLocalCompany({
        name: form.name.trim(),
        industry_id: industryId,
        subdomain_id: subdomainId,
        stage: form.stage,
        country: form.country,
        founded_year: form.founded_year,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        employees: form.employees ? parseInt(form.employees, 10) : undefined,
        mrr_usd: form.mrr_usd ? parseFloat(form.mrr_usd) : undefined,
        business_model: form.business_model,
        problem_solved: form.problem_solved.trim() || undefined,
        usp: form.usp.trim() || undefined,
      });

      setLoading(false);
      setDone(true);
      setTimeout(() => {
        onCreated(saved);   // pass full object so caller can append it to graph
        onClose();
      }, 1400);
    } catch (err) {
      setLoading(false);
      setError('Failed to save company. Please try again.');
    }
  }

  /* ── Success state ── */
  if (done) {
    return (
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
      >
        <div
          className="flex flex-col items-center gap-4 p-10 rounded-2xl"
          style={{ background: '#1B1B1D', border: `1px solid ${industryColor}40` }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${industryColor}20` }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: industryColor }} />
          </div>
          <p className="text-white text-lg font-semibold">Company Created!</p>
          <p className="text-sm" style={{ color: '#5E5E5E' }}>
            <span style={{ color: industryColor }}>{form.name}</span> is now orbiting{' '}
            <span className="text-white">{subdomainName}</span>
          </p>
        </div>
      </div>
    );
  }

  /* ── Main modal ── */
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: '#1B1B1D',
          border: `1px solid ${industryColor}25`,
          boxShadow: `0 0 60px ${industryColor}18, 0 24px 64px rgba(0,0,0,0.7)`,
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${industryColor}18`, border: `1px solid ${industryColor}30` }}
          >
            <Building2 className="w-4.5 h-4.5" style={{ color: industryColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-base font-semibold leading-tight">Add Company to Universe</h2>
            <p className="text-xs mt-0.5" style={{ color: '#5E5E5E' }}>
              {industryName} → <span style={{ color: industryColor }}>{subdomainName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10 shrink-0"
            style={{ color: '#5E5E5E' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          <div className="px-6 py-5 flex flex-col gap-5">

            {/* Row 1 — Name + Website */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Name *">
                <Input
                  type="text"
                  placeholder="e.g. Acme Inc."
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
              </Field>
              <Field label="Website">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#5E5E5E' }} />
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={form.website}
                    onChange={e => set('website', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </Field>
            </div>

            {/* Row 2 — Stage + Country + Founded */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Stage *">
                <Select value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Country">
                <Select value={form.country} onChange={e => set('country', e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Founded Year">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#5E5E5E' }} />
                  <Input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={form.founded_year}
                    onChange={e => set('founded_year', parseInt(e.target.value, 10))}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </Field>
            </div>

            {/* Row 3 — Employees + MRR + Business Model */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Team Size">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#5E5E5E' }} />
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 25"
                    value={form.employees}
                    onChange={e => set('employees', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </Field>
              <Field label="MRR (USD)">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#5E5E5E' }} />
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 50000"
                    value={form.mrr_usd}
                    onChange={e => set('mrr_usd', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </Field>
              <Field label="Business Model">
                <Select value={form.business_model} onChange={e => set('business_model', e.target.value)}>
                  {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
            </div>

            {/* Row 4 — Description */}
            <Field label="Description">
              <Textarea
                placeholder="Brief description of what the company does..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
              />
            </Field>

            {/* Row 5 — Problem + USP */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Problem Solved">
                <Textarea
                  placeholder="What core problem does this company solve?"
                  value={form.problem_solved}
                  onChange={e => set('problem_solved', e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Unique Selling Point">
                <Textarea
                  placeholder="What makes this company different?"
                  value={form.usp}
                  onChange={e => set('usp', e.target.value)}
                  rows={2}
                />
              </Field>
            </div>

            {/* Context badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{
                background: `${industryColor}0d`,
                border: `1px solid ${industryColor}20`,
                color: industryColor,
              }}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              This company will orbit the <strong>{subdomainName}</strong> subdomain within the{' '}
              <strong>{industryName}</strong> galaxy.
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-sm rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
              >
                {error}
              </p>
            )}
          </div>
        </form>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: '#5E5E5E' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-company-form"
            disabled={loading || !form.name.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${industryColor}, ${industryColor}bb)`,
              color: '#161618',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                Launch into Universe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
