import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Building2, Globe, Calendar, Users, DollarSign,
  Briefcase, ChevronDown, Loader2, CheckCircle2, Rocket,
} from 'lucide-react';
import { saveLocalCompany, type LocalCompany } from '../lib/localCompanies';
import type { CompanyStage, BusinessModel } from '../lib/supabase';
import type { UniverseController } from '../three-universe/UniverseController';

/* ── Types ──────────────────────────────────────────────── */
interface CreateCompanyModalProps {
  industryId: string;
  subdomainId: string;
  subdomainName: string;
  industryName: string;
  industryColor: string;
  draftPlanetId: string | null;
  controllerRef: React.MutableRefObject<UniverseController | null>;
  onClose: (isCancel?: boolean) => void;
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
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5E5E5E' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  borderRadius: '0.625rem',
  padding: '8px 12px',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s',
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        style={{
          ...inputStyle,
          appearance: 'none',
          paddingRight: '30px',
          cursor: 'pointer',
          ...props.style,
        }}
      />
      <ChevronDown
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
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
        minHeight: '56px',
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
  draftPlanetId,
  controllerRef,
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
  const [planetPos, setPlanetPos] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
    setError(null);
  }

  // Live-update planet label when name changes
  useEffect(() => {
    if (draftPlanetId && controllerRef.current) {
      controllerRef.current.updateDraftName(draftPlanetId, form.name || 'New Company');
    }
  }, [form.name, draftPlanetId, controllerRef]);

  // Track planet screen position for connector line
  const updatePlanetPos = useCallback(() => {
    if (!draftPlanetId || !controllerRef.current) return;
    const pos = controllerRef.current.getCompanyScreenPos(draftPlanetId);
    if (pos) setPlanetPos(pos);
    rafRef.current = requestAnimationFrame(updatePlanetPos);
  }, [draftPlanetId, controllerRef]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updatePlanetPos);
    return () => cancelAnimationFrame(rafRef.current);
  }, [updatePlanetPos]);

  // Auto-focus name field
  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 300);
  }, []);

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
        onCreated(saved);
        onClose(false); // false = not cancelled
      }, 1200);
    } catch (err) {
      setLoading(false);
      setError('Failed to save company. Please try again.');
    }
  }

  const modalLeft = 24;
  const modalTop = 100;
  const modalWidth = 340;
  const modalHeight = 580;
  const modalCenterY = modalTop + modalHeight / 2;
  const modalRight = modalLeft + modalWidth;

  /* ── Success state ── */
  if (done) {
    return (
      <div
        className="fixed z-[999] flex flex-col items-center justify-center gap-4 p-8 rounded-2xl"
        style={{
          left: modalLeft, top: modalTop, width: modalWidth,
          background: 'rgba(10, 10, 12, 0.95)',
          border: `1px solid ${industryColor}40`,
          backdropFilter: 'blur(20px)',
          boxShadow: `0 0 60px ${industryColor}18, 0 24px 64px rgba(0,0,0,0.7)`,
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: `${industryColor}20` }}
        >
          <CheckCircle2 className="w-7 h-7" style={{ color: industryColor }} />
        </div>
        <p className="text-white text-sm font-semibold">Company Created!</p>
        <p className="text-xs text-center" style={{ color: '#5E5E5E' }}>
          <span style={{ color: industryColor }}>{form.name}</span> is now orbiting{' '}
          <span className="text-white">{subdomainName}</span>
        </p>
      </div>
    );
  }

  /* ── Main floating panel ── */
  return (
    <>
      {/* Connector line from modal to planet */}
      {planetPos && (
        <svg
          className="create-modal-connector"
          style={{ left: 0, top: 0, width: '100vw', height: '100vh' }}
        >
          <line
            x1={modalRight + 8}
            y1={modalCenterY}
            x2={planetPos.x}
            y2={planetPos.y}
            stroke={industryColor}
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
          {/* Dot at planet end */}
          <circle cx={planetPos.x} cy={planetPos.y} r="4" fill={industryColor} fillOpacity="0.7" />
          {/* Dot at modal end */}
          <circle cx={modalRight + 8} cy={modalCenterY} r="3" fill={industryColor} fillOpacity="0.5" />
        </svg>
      )}

      {/* Floating left-side panel */}
      <div
        className="fixed z-[999] flex flex-col rounded-2xl overflow-hidden"
        style={{
          left: modalLeft,
          top: modalTop,
          width: modalWidth,
          maxHeight: `calc(100vh - ${modalTop + 40}px)`,
          background: 'rgba(10, 10, 12, 0.92)',
          border: `1px solid ${industryColor}25`,
          backdropFilter: 'blur(24px)',
          boxShadow: `0 0 80px ${industryColor}12, 0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`,
          animation: 'panel-slide-in 0.3s cubic-bezier(0.23, 1, 0.32, 1) both',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-2.5 px-4 py-3.5 shrink-0"
          style={{ borderBottom: `1px solid ${industryColor}15` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${industryColor}18`, border: `1px solid ${industryColor}25` }}
          >
            <Rocket className="w-4 h-4" style={{ color: industryColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-sm font-semibold leading-tight">Launch Company</h2>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: '#5E5E5E' }}>
              {industryName} → <span style={{ color: industryColor }}>{subdomainName}</span>
            </p>
          </div>
          <button
            onClick={() => onClose(true)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10 shrink-0"
            style={{ color: '#5E5E5E' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          <div className="px-4 py-3.5 flex flex-col gap-3.5">
            {/* Name — large prominent field */}
            <Field label="Company Name *">
              <Input
                ref={nameInputRef}
                type="text"
                placeholder="e.g. Acme Inc."
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                style={{ fontSize: '14px', padding: '10px 12px', borderColor: `${industryColor}30` }}
              />
            </Field>

            {/* Website */}
            <Field label="Website">
              <div className="relative">
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#5E5E5E' }} />
                <Input
                  type="url"
                  placeholder="https://..."
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  style={{ paddingLeft: '28px' }}
                />
              </div>
            </Field>

            {/* Stage + Country */}
            <div className="grid grid-cols-2 gap-2.5">
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
            </div>

            {/* Founded + Team Size */}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Founded">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#5E5E5E' }} />
                  <Input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={form.founded_year}
                    onChange={e => set('founded_year', parseInt(e.target.value, 10))}
                    style={{ paddingLeft: '28px' }}
                  />
                </div>
              </Field>
              <Field label="Team Size">
                <div className="relative">
                  <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#5E5E5E' }} />
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 25"
                    value={form.employees}
                    onChange={e => set('employees', e.target.value)}
                    style={{ paddingLeft: '28px' }}
                  />
                </div>
              </Field>
            </div>

            {/* MRR + Business Model */}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="MRR (USD)">
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#5E5E5E' }} />
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 50000"
                    value={form.mrr_usd}
                    onChange={e => set('mrr_usd', e.target.value)}
                    style={{ paddingLeft: '28px' }}
                  />
                </div>
              </Field>
              <Field label="Model">
                <Select value={form.business_model} onChange={e => set('business_model', e.target.value)}>
                  {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
            </div>

            {/* Description */}
            <Field label="Description">
              <Textarea
                placeholder="Brief description..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={2}
              />
            </Field>

            {/* Context badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px]"
              style={{
                background: `${industryColor}0a`,
                border: `1px solid ${industryColor}15`,
                color: industryColor,
              }}
            >
              <Briefcase className="w-3 h-3 shrink-0" />
              <span>
                Orbiting <strong>{subdomainName}</strong> in <strong>{industryName}</strong>
              </span>
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-xs rounded-lg px-3 py-2"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
              >
                {error}
              </p>
            )}
          </div>
        </form>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: `1px solid ${industryColor}12` }}
        >
          <button
            type="button"
            onClick={() => onClose(true)}
            className="px-4 py-2 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5"
            style={{ color: '#5E5E5E' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${industryColor}, ${industryColor}bb)`,
              color: '#161618',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Rocket className="w-3.5 h-3.5" />
                Launch
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
