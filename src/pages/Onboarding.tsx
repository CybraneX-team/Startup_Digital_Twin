import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Hexagon, Check, Search, Users, Building2, Clock, CheckCircle, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { createCompany } from '../lib/db/companies';
import type { CreateCompanyInput } from '../lib/db/companies';
import { INDUSTRIES } from '../db/industries';
import { useSubdomainsByIndustry } from '../lib/db/subdomains';
import type { BusinessModel, CompanyStage } from '../lib/supabase';
import { submitJoinRequest, listJoinableCompanies } from '../lib/db/team';
import type { JoinableCompany } from '../lib/db/team';
import { api } from '../lib/api';
import { COUNTRIES, getCurrencyCodeForCountry } from '../lib/currency';

/* ──────────────────────────────────────────────────
   Step definitions
────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Company' },
  { id: 2, label: 'Story' },
  { id: 3, label: 'Metrics' },
  { id: 4, label: 'Departments' },
  { id: 5, label: 'Profile' },
  { id: 6, label: 'Launch' },
];

const STAGES: CompanyStage[] = [
  'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B',
  'Series C', 'Series D+', 'Pre-IPO', 'Public', 'PSU', 'Bootstrapped',
];

const BUSINESS_MODELS: BusinessModel[] = ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'SaaS', 'D2C', 'Other'];

const JOIN_PAGE_SIZE = 4;

/* ──────────────────────────────────────────────────
   Form state
────────────────────────────────────────────────── */
interface FormData {
  // Step 1
  name: string;
  industry_id: string;
  subdomain_id: string;
  stage: CompanyStage;
  country: string;
  founded_year: string;
  website: string;
  // Step 2
  description: string;
  problem_solved: string;
  usp: string;
  target_market: string;
  business_model: BusinessModel | '';
  // Step 3
  employees: string;
  mrr_usd: string;
  burn_rate_usd: string;
  runway_months: string;
  cltv_usd: string;
  cac_usd: string;
  monthly_churn_rate: string;
  nps_score: string;
  competitors: string;   // comma-separated
  // Step 4
  first_name: string;
  last_name: string;
  title: string;
}

const INITIAL: FormData = {
  name: '', industry_id: '', subdomain_id: '', stage: 'Seed', country: 'India',
  founded_year: '', website: '',
  description: '', problem_solved: '', usp: '', target_market: '', business_model: '',
  employees: '', mrr_usd: '', burn_rate_usd: '', runway_months: '',
  cltv_usd: '', cac_usd: '', monthly_churn_rate: '', nps_score: '',
  competitors: '',
  first_name: '', last_name: '', title: '',
};

/* ──────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────── */
function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: '#5E5E5E' }}>{label}</label>
      {children}
      {hint && <span className="text-xs" style={{ color: '#5E5E5E' }}>{hint}</span>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none text-white';
const inputStyle = { background: '#161618', color: '#fff' };

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} style={inputStyle} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
      style={inputStyle}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
      style={{ ...inputStyle, backgroundImage: 'none' }}
    />
  );
}

/* ──────────────────────────────────────────────────
   Main component
────────────────────────────────────────────────── */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  // 'choose' = pick create vs join, 'create' = wizard, 'join' = join flow
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Departments State
  const [suggestedDepartments, setSuggestedDepartments] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState('');

  function toggleDepartment(dept: string) {
    setSelectedDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  }

  function addCustomDepartment() {
    const trimmed = customDeptInput.trim();
    if (!trimmed) return;
    if (!suggestedDepartments.includes(trimmed)) {
      setSuggestedDepartments(prev => [...prev, trimmed]);
    }
    if (!selectedDepartments.includes(trimmed)) {
      setSelectedDepartments(prev => [...prev, trimmed]);
    }
    setCustomDeptInput('');
  }

  function getFallbackDepartments(industryId: string, businessModel: string): string[] {
    const defaults = ['Engineering', 'Product Management', 'Marketing', 'Operations', 'Finance & HR'];
    if (businessModel === 'SaaS') {
      return [...defaults, 'Customer Success', 'Sales'];
    }
    if (businessModel === 'Marketplace' || businessModel === 'B2C') {
      return [...defaults, 'Customer Support', 'Growth'];
    }
    if (industryId === 'fintech') {
      return [...defaults, 'Risk & Compliance', 'Customer Operations'];
    }
    if (industryId === 'healthcare') {
      return [...defaults, 'Clinical Operations', 'Regulatory Affairs'];
    }
    return defaults;
  }

  async function fetchSuggestedDepartments() {
    setDepartmentsLoading(true);
    setError(null);
    
    try {
      const industryName = INDUSTRIES.find(i => i.id === form.industry_id)?.label ?? 'Tech';
      const response = await api.post<{ departments: string[] }>('/api/metrics-onboarding/generate-departments', {
        name: form.name.trim(),
        industryName: industryName,
        description: form.description.trim(),
        businessModel: form.business_model,
        problemSolved: form.problem_solved.trim(),
        usp: form.usp.trim(),
      });

      if (response && Array.isArray(response.departments)) {
        setSuggestedDepartments(response.departments);
        setSelectedDepartments(response.departments);
      } else {
        throw new Error('Invalid response structure from backend generate-departments');
      }
    } catch (err) {
      console.error('[onboarding] secure department fetch failed', err);
      const fallback = getFallbackDepartments(form.industry_id, form.business_model);
      setSuggestedDepartments(fallback);
      setSelectedDepartments(fallback);
    } finally {
      setDepartmentsLoading(false);
    }
  }

  // Join workspace state
  const [joinSearch, setJoinSearch] = useState('');
  const [joinCompanies, setJoinCompanies] = useState<JoinableCompany[]>([]);
  const [joinSelected, setJoinSelected] = useState<JoinableCompany | null>(null);
  const [joinJoined, setJoinJoined] = useState(false);
  const [joinSearching, setJoinSearching] = useState(false);
  const [joinHasLoaded, setJoinHasLoaded] = useState(false);
  const [joinPage, setJoinPage] = useState(1);
  const [joinTotal, setJoinTotal] = useState(0);

  async function loadJoinCompanies(page = joinPage, search = joinSearch) {
    setJoinSearching(true);
    const { companies, total } = await listJoinableCompanies({
      page,
      pageSize: JOIN_PAGE_SIZE,
      search,
    });
    setJoinCompanies(companies);
    setJoinTotal(total);
    setJoinPage(page);
    if (joinSelected && !companies.some(c => c.id === joinSelected.id)) {
      setJoinSelected(null);
    }
    setJoinHasLoaded(true);
    setJoinSearching(false);
  }

  useEffect(() => {
    if (mode !== 'join') return;
    const timer = window.setTimeout(() => {
      void loadJoinCompanies(1, joinSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [mode, joinSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile?.company_id) return;
    const timer = window.setTimeout(() => {
      navigate('/overview', { replace: true });
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [profile?.company_id, navigate]);

  async function requestToJoin(company: JoinableCompany) {
    if (!user) return;
    if (profile?.company_id) {
      setError('You are already a company account, so you cannot join another workspace.');
      return;
    }
    setJoinSelected(company);
    setLoading(true);
    setError(null);
    const result = await submitJoinRequest(company.id, user.id);
    if (!result.success) {
      setError(result.error ?? 'Failed to send join request');
      setLoading(false);
      return;
    }
    setLoading(false);
    setJoinJoined(true);
  }

  async function handleJoinSubmit() {
    if (!joinSelected) return;
    await requestToJoin(joinSelected);
  }

  function update(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError(null);
  }

  function nextStep() {
    if (!validateStep()) return;
    const next = step + 1;
    if (next === 4 && suggestedDepartments.length === 0) {
      void fetchSuggestedDepartments();
    }
    setStep(s => Math.min(s + 1, 6));
  }

  function prevStep() { setStep(s => Math.max(s - 1, 1)); }

  function validateStep(): boolean {
    if (step === 1) {
      if (!form.name.trim()) { setError('Company name is required'); return false; }
      if (!form.industry_id) { setError('Please select an industry'); return false; }
    }
    if (step === 2) {
      if (!form.description.trim()) { setError('A short description is required'); return false; }
    }
    if (step === 5) {
      if (!form.first_name.trim()) { setError('First name is required'); return false; }
    }
    return true;
  }

  async function handleLaunch() {
    if (!user) return;
    if (profile?.company_id) {
      setError('You already have a company account.');
      navigate('/overview', { replace: true });
      return;
    }
    setLoading(true);
    setError(null);

    const payload: CreateCompanyInput = {
      name: form.name.trim(),
      industry_id: form.industry_id,
      subdomain_id: form.subdomain_id || undefined,
      stage: form.stage,
      country: form.country,
      currency: getCurrencyCodeForCountry(form.country),
      founded_year: form.founded_year ? parseInt(form.founded_year) : undefined,
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
      problem_solved: form.problem_solved.trim() || undefined,
      usp: form.usp.trim() || undefined,
      target_market: form.target_market.trim() || undefined,
      business_model: (form.business_model as BusinessModel) || undefined,
      mrr_usd: form.mrr_usd ? parseFloat(form.mrr_usd) : undefined,
      employees: form.employees ? parseInt(form.employees) : undefined,
      burn_rate_usd: form.burn_rate_usd ? parseFloat(form.burn_rate_usd) : undefined,
      runway_months: form.runway_months ? parseInt(form.runway_months) : undefined,
      competitors: form.competitors
        ? form.competitors.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      departments: selectedDepartments,
      profile: {
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        title: form.title.trim() || undefined,
      },
    };

    const company = await createCompany(payload, user.id);
    if (!company) {
      setError('Failed to create company. Please try again.');
      setLoading(false);
      return;
    }

    // Save metrics to metric_snapshots so they appear on the home page immediately
    const hasAnyMetric = form.mrr_usd || form.burn_rate_usd || form.employees ||
      form.runway_months || form.cltv_usd || form.cac_usd ||
      form.monthly_churn_rate || form.nps_score;
    if (hasAnyMetric) {
      try {
        await api.post(`/api/metrics-onboarding/${company.id}/initial`, {
          mrr:      parseFloat(form.mrr_usd)           || 0,
          burn:     parseFloat(form.burn_rate_usd)      || 0,
          headcount: parseInt(form.employees)           || 0,
          runway:   parseInt(form.runway_months)        || 0,
          ltv:      parseFloat(form.cltv_usd)           || 0,
          cac:      parseFloat(form.cac_usd)            || 0,
          churn:    parseFloat(form.monthly_churn_rate) || 0,
          nps:      parseFloat(form.nps_score)          || 0,
        });
      } catch (metricsErr) {
        console.error('[onboarding] metrics save failed (non-fatal)', metricsErr);
      }
    }

    // Save generated and selected departments to localStorage so they can be referenced/sent later
    localStorage.setItem('onboarding_departments', JSON.stringify(selectedDepartments));

    await refreshProfile();
    navigate('/twin/data', { replace: true });
  }

  const selectedIndustry = INDUSTRIES.find(i => i.id === form.industry_id);
  const { subdomains: industrySubdomains } = useSubdomainsByIndustry(form.industry_id || null);

  if (profile?.company_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#161618' }}>
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}>
            <Hexagon size={22} color="#161618" fill="#161618" strokeWidth={1.5} />
          </div>
          <div className="rounded-2xl p-8" style={{ background: '#1B1B1D' }}>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-semibold mb-2">Company account already exists</h2>
            <p className="text-sm mb-6" style={{ color: '#5E5E5E' }}>
              You are already a company account, so you cannot create a new company or join another workspace.
            </p>
            <button
              onClick={() => navigate('/overview', { replace: true })}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
            >
              Open Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Mode chooser screen ── */
  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#161618' }}>
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}>
              <Hexagon size={22} color="#161618" fill="#161618" strokeWidth={1.5} />
            </div>
            <h1 className="text-white text-2xl font-semibold">Welcome to FounderOS</h1>
            <p className="text-sm" style={{ color: '#5E5E5E' }}>How do you want to get started?</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('create')}
              className="rounded-2xl p-6 text-left border border-gray-800 hover:border-violet-500/40 transition-all group"
              style={{ background: '#1B1B1D' }}
            >
              <Building2 className="w-7 h-7 text-violet-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Create a Workspace</h3>
              <p className="text-xs" style={{ color: '#5E5E5E' }}>
                You're the founder. Set up your company, add your metrics, and invite your team.
              </p>
            </button>
            <button
              onClick={() => {
                setMode('join');
                if (joinCompanies.length === 0) void loadJoinCompanies(1, joinSearch);
              }}
              className="rounded-2xl p-6 text-left border border-gray-800 hover:border-sky-500/40 transition-all group"
              style={{ background: '#1B1B1D' }}
            >
              <Users className="w-7 h-7 text-sky-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Join a Workspace</h3>
              <p className="text-xs" style={{ color: '#5E5E5E' }}>
                Your team already uses FounderOS. Choose the company and enter as read-only.
              </p>
            </button>
          </div>
          <p className="text-center text-[11px] mt-6" style={{ color: '#3E3E3E' }}>
            Have an invite link?{' '}
            <button className="text-violet-400 underline" onClick={() => navigate('/join')}>
              Use it here
            </button>
          </p>
        </div>
      </div>
    );
  }

  /* ── Join workspace screen ── */
  if (mode === 'join') {
    const joinTotalPages = Math.max(1, Math.ceil(joinTotal / JOIN_PAGE_SIZE));
    const joinStart = joinTotal === 0 ? 0 : (joinPage - 1) * JOIN_PAGE_SIZE + 1;
    const joinEnd = Math.min(joinPage * JOIN_PAGE_SIZE, joinTotal);

    if (joinJoined) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#161618' }}>
          <div className="w-full max-w-md text-center">
            <Clock className="w-14 h-14 text-amber-400 mx-auto mb-5" />
            <h2 className="text-white text-xl font-semibold mb-2">Request Sent</h2>
            <p className="text-sm mb-1" style={{ color: '#5E5E5E' }}>
              We've asked the owner of <span className="text-white font-medium">{joinSelected?.name}</span> to approve your request.
              You'll get access once they accept it.
            </p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#161618' }}>
        <div className="w-full max-w-lg">
          <button onClick={() => setMode('choose')} className="flex items-center gap-1.5 text-xs mb-8" style={{ color: '#5E5E5E' }}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-white text-xl font-semibold mb-1">Find your workspace</h2>
          <p className="text-sm mb-6" style={{ color: '#5E5E5E' }}>Select your company to join with read-only access.</p>

          <div className="rounded-2xl p-6 space-y-4" style={{ background: '#1B1B1D' }}>
            {/* Search */}
            <div className="flex gap-2">
              <input
                value={joinSearch}
                onChange={e => {
                  setJoinSearch(e.target.value);
                  setJoinPage(1);
                }}
                placeholder="Search all companies..."
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: '#161618' }}
              />
              <button
                onClick={() => loadJoinCompanies(1, joinSearch)}
                disabled={joinSearching}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #C1AEFF, #F9C6FF)', color: '#161618' }}
              >
                {joinSearching ? <div className="w-4 h-4 border-2 border-gray-800/30 border-t-gray-800 rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {/* Results */}
            {joinSearching && !joinHasLoaded ? (
              <div className="py-10 flex flex-col items-center gap-3 text-sm" style={{ color: '#5E5E5E' }}>
                <div className="w-5 h-5 border-2 border-violet-300/30 border-t-violet-300 rounded-full animate-spin" />
                Loading workspaces...
              </div>
            ) : joinCompanies.length > 0 ? (
              <div
                className="space-y-2 min-h-[392px] transition-opacity duration-150"
                style={{ opacity: joinSearching ? 0.55 : 1 }}
              >
                {joinCompanies.map(r => {
                  const industryLabel = r.industry_id
                    ? INDUSTRIES.find(i => i.id === r.industry_id)?.label ?? r.industry_id
                    : 'Industry not set';
                  return (
                  <div
                    key={r.id}
                    onClick={() => setJoinSelected(r)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                      joinSelected?.id === r.id
                        ? 'border-sky-500/40 bg-sky-500/10'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium">{r.name}</span>
                          {joinSelected?.id === r.id && <Check className="w-4 h-4 text-sky-400" />}
                        </div>
                        <span className="text-[10px]" style={{ color: '#5E5E5E' }}>
                          {r.stage ?? 'Stage not set'} · {industryLabel}{r.country ? ` · ${r.country}` : ''}
                        </span>
                        {r.description && (
                          <p className="text-[11px] mt-1 line-clamp-2" style={{ color: '#4E4E4E' }}>
                            {r.description}
                          </p>
                        )}
                        {r.founderEmailMasked && (
                          <p className="text-[10px] mt-1" style={{ color: '#4E4E4E' }}>
                            Owner: {r.founderEmailMasked}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); void requestToJoin(r); }}
                        disabled={loading}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="text-center py-8 min-h-[220px] flex flex-col items-center justify-center">
                <p className="text-sm" style={{ color: '#5E5E5E' }}>
                  {joinSearch ? 'No workspaces match this filter.' : 'No active workspaces are available yet.'}
                </p>
                <button
                  onClick={() => loadJoinCompanies(1, joinSearch)}
                  className="text-xs text-violet-400 underline mt-2"
                >
                  Refresh list
                </button>
              </div>
            )}

            {joinTotal > 0 && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] truncate" style={{ color: '#5E5E5E' }}>
                    Showing {joinStart}-{joinEnd} of {joinTotal} · Page {joinPage} of {joinTotalPages}
                  </span>
                  {joinSearching && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#C1AEFF' }} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadJoinCompanies(Math.max(1, joinPage - 1), joinSearch)}
                    disabled={joinSearching || joinPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-35 transition-all"
                    style={{ background: '#161618', color: '#C1AEFF', border: '1px solid rgba(193,174,255,0.18)' }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => loadJoinCompanies(Math.min(joinTotalPages, joinPage + 1), joinSearch)}
                    disabled={joinSearching || joinPage >= joinTotalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-35 transition-all"
                    style={{ background: '#161618', color: '#C1AEFF', border: '1px solid rgba(193,174,255,0.18)' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              onClick={handleJoinSubmit}
              disabled={!joinSelected || loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
            >
              {loading ? 'Sending request...' : `Request to Join ${joinSelected?.name ?? 'Workspace'}`}
            </button>

            <div className="flex items-center gap-2 text-[10px]" style={{ color: '#3E3E3E' }}>
              <Clock className="w-3 h-3" />
              The company owner must approve your request before you get read-only access.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#161618' }}
    >
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}>
            <Hexagon size={18} color="#161618" fill="#161618" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">Set up your company</h1>
            <p className="text-xs" style={{ color: '#5E5E5E' }}>
              Your startup will be placed in the FounderOS Twin graph
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map(s => (
            <div key={s.id} className="flex-1 flex flex-col gap-1.5">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  background: s.id < step
                    ? 'linear-gradient(135deg, #F9C6FF, #C1AEFF)'
                    : s.id === step
                      ? '#C1AEFF'
                      : '#2a2a2e',
                }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: s.id <= step ? '#C1AEFF' : '#5E5E5E' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: '#1B1B1D' }}>

          {/* Step 1 — Company Basics */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-white font-semibold text-base">Company basics</h2>
              <Field label="Company name *">
                <Input
                  placeholder="e.g. Acme Fintech Pvt Ltd"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                />
              </Field>
              <Field label="Industry *">
                <div className="grid grid-cols-3 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => { update('industry_id', ind.id); update('subdomain_id', ''); }}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all"
                      style={{
                        background: form.industry_id === ind.id
                          ? 'rgba(193,174,255,0.15)' : '#161618',
                        color: form.industry_id === ind.id ? '#C1AEFF' : '#5E5E5E',
                        border: form.industry_id === ind.id
                          ? '1px solid rgba(193,174,255,0.4)' : '1px solid transparent',
                      }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ background: ind.color }}
                      />
                      {ind.label}
                    </button>
                  ))}
                </div>
              </Field>
              {form.industry_id && industrySubdomains.length > 0 && (
                <Field label="Sub-domain (where in the industry?)">
                  <div className="grid grid-cols-2 gap-2">
                    {industrySubdomains.map(sd => (
                      <button
                        key={sd.id}
                        type="button"
                        onClick={() => update('subdomain_id', sd.id)}
                        className="rounded-xl px-3 py-2 text-xs font-medium text-left transition-all"
                        style={{
                          background: form.subdomain_id === sd.id
                            ? 'rgba(193,174,255,0.15)' : '#161618',
                          color: form.subdomain_id === sd.id ? '#C1AEFF' : '#5E5E5E',
                          border: form.subdomain_id === sd.id
                            ? '1px solid rgba(193,174,255,0.4)' : '1px solid transparent',
                        }}
                      >
                        {sd.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Stage">
                  <Select value={form.stage} onChange={e => update('stage', e.target.value)}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Country">
                  <Select value={form.country} onChange={e => update('country', e.target.value)}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Founded year" hint="Optional">
                  <Input
                    type="number"
                    placeholder="2022"
                    min={1990} max={2025}
                    value={form.founded_year}
                    onChange={e => update('founded_year', e.target.value)}
                  />
                </Field>
                <Field label="Website" hint="Optional">
                  <Input
                    type="url"
                    placeholder="https://yourco.com"
                    value={form.website}
                    onChange={e => update('website', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2 — Story */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-white font-semibold text-base">Your story</h2>
              <Field label="One-line description *">
                <Textarea
                  placeholder="What does your company do in one sentence?"
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                />
              </Field>
              <Field label="Problem you solve" hint="Optional but helps your Twin graph">
                <Textarea
                  placeholder="What problem are you solving and for whom?"
                  value={form.problem_solved}
                  onChange={e => update('problem_solved', e.target.value)}
                />
              </Field>
              <Field label="Unique selling point" hint="Optional">
                <Input
                  placeholder="What makes you different?"
                  value={form.usp}
                  onChange={e => update('usp', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Target market" hint="Optional">
                  <Input
                    placeholder="SMBs in India, D2C consumers…"
                    value={form.target_market}
                    onChange={e => update('target_market', e.target.value)}
                  />
                </Field>
                <Field label="Business model" hint="Optional">
                  <Select
                    value={form.business_model}
                    onChange={e => update('business_model', e.target.value)}
                  >
                    <option value="">Select…</option>
                    {BUSINESS_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {/* Step 3 — Team & Metrics */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-white font-semibold text-base">Team & metrics</h2>
              <p className="text-xs" style={{ color: '#5E5E5E' }}>
                All fields optional — add what you know. You can update these anytime.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Team size">
                  <Input
                    type="number" min={1}
                    placeholder="10"
                    value={form.employees}
                    onChange={e => update('employees', e.target.value)}
                  />
                </Field>
                <Field label={`Monthly Revenue (${getCurrencyCodeForCountry(form.country)})`}>
                  <Input
                    type="number" min={0}
                    placeholder="50000"
                    value={form.mrr_usd}
                    onChange={e => update('mrr_usd', e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={`Monthly Burn Rate (${getCurrencyCodeForCountry(form.country)})`}>
                  <Input
                    type="number" min={0}
                    placeholder="30000"
                    value={form.burn_rate_usd}
                    onChange={e => update('burn_rate_usd', e.target.value)}
                  />
                </Field>
                <Field label="Runway (months)">
                  <Input
                    type="number" min={0}
                    placeholder="18"
                    value={form.runway_months}
                    onChange={e => update('runway_months', e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={`Customer Lifetime Value / CLTV (${getCurrencyCodeForCountry(form.country)})`} hint="Optional">
                  <Input
                    type="number" min={0}
                    placeholder="1200"
                    value={form.cltv_usd}
                    onChange={e => update('cltv_usd', e.target.value)}
                  />
                </Field>
                <Field label={`Customer Acquisition Cost / CAC (${getCurrencyCodeForCountry(form.country)})`} hint="Optional">
                  <Input
                    type="number" min={0}
                    placeholder="95"
                    value={form.cac_usd}
                    onChange={e => update('cac_usd', e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Monthly Churn Rate (%)" hint="Optional">
                  <Input
                    type="number" min={0} max={100} step={0.1}
                    placeholder="4.2"
                    value={form.monthly_churn_rate}
                    onChange={e => update('monthly_churn_rate', e.target.value)}
                  />
                </Field>
                <Field label="Net Promoter Score (NPS)" hint="Optional — range −100 to 100">
                  <Input
                    type="number" min={-100} max={100}
                    placeholder="42"
                    value={form.nps_score}
                    onChange={e => update('nps_score', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Competitors" hint="Comma-separated — e.g. Stripe, Razorpay">
                <Input
                  placeholder="Competitor A, Competitor B"
                  value={form.competitors}
                  onChange={e => update('competitors', e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* Step 4 — Departments Setup */}
          {step === 4 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-white font-semibold text-base flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-400 animate-pulse" />
                  AI Generated Departments
                </h2>
                <p className="text-xs mt-1.5" style={{ color: '#5E5E5E' }}>
                  Based on your company details, we suggested these departments. Click to select/deselect them.
                </p>
              </div>

              {departmentsLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-6 h-6 rounded-full animate-spin"
                    style={{ border: '2px solid #C1AEFF', borderTopColor: 'transparent' }} />
                  <span className="text-xs" style={{ color: '#5E5E5E' }}>Generating structure using AI...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap gap-2">
                    {suggestedDepartments.map(dept => {
                      const isSelected = selectedDepartments.includes(dept);
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleDepartment(dept)}
                          className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2"
                          style={{
                            background: isSelected ? 'rgba(193,174,255,0.12)' : '#161618',
                            color: isSelected ? '#C1AEFF' : '#5E5E5E',
                            border: isSelected ? '1px solid rgba(193,174,255,0.35)' : '1px solid rgba(255,255,255,0.03)',
                          }}
                        >
                          {isSelected ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-700" />}
                          {dept}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 items-center mt-2">
                    <input
                      type="text"
                      placeholder="Add a custom department..."
                      value={customDeptInput}
                      onChange={e => setCustomDeptInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomDepartment(); } }}
                      className="flex-1 rounded-xl px-4 py-2.5 text-xs outline-none text-white border border-transparent"
                      style={{ background: '#161618' }}
                    />
                    <button
                      type="button"
                      onClick={addCustomDepartment}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                      style={{ background: '#C1AEFF', color: '#161618' }}
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5 — Founder Profile */}
          {step === 5 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-white font-semibold text-base">Founder profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name *">
                  <Input
                    placeholder="Arjun"
                    value={form.first_name}
                    onChange={e => update('first_name', e.target.value)}
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    placeholder="Sharma"
                    value={form.last_name}
                    onChange={e => update('last_name', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Title / Role" hint="e.g. CEO, Co-founder & CTO">
                <Input
                  placeholder="Founder & CEO"
                  value={form.title}
                  onChange={e => update('title', e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* Step 6 — Review & Launch */}
          {step === 6 && (
            <div className="flex flex-col gap-6">
              <h2 className="text-white font-semibold text-base">Ready to launch</h2>

              {/* Summary card */}
              <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: '#161618' }}>
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: selectedIndustry?.color ?? '#C1AEFF', color: '#161618' }}
                  >
                    {form.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{form.name || '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#5E5E5E' }}>
                      {selectedIndustry?.label ?? '—'} · {form.stage} · {form.country}
                    </p>
                    {form.description && (
                      <p className="text-xs mt-2" style={{ color: '#5E5E5E' }}>
                        {form.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* What happens */}
              <div className="flex flex-col gap-3">
                {[
                  'Your company is created and placed in the Twin graph',
                  `Positioned in the ${selectedIndustry?.label ?? 'selected'} industry cluster`,
                  'You are added as Founder with full access',
                  'You can invite team members after launch',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(193,174,255,0.15)' }}
                    >
                      <Check size={12} color="#C1AEFF" />
                    </div>
                    <span className="text-sm" style={{ color: '#5E5E5E' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm rounded-xl px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
              {error}
            </p>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity"
              style={{
                background: '#161618',
                color: step === 1 ? '#3a3a3e' : '#5E5E5E',
                opacity: step === 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)',
                  color: '#161618',
                }}
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunch}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)',
                  color: '#161618',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Launching…' : 'Launch in Twin'}
                {!loading && <Hexagon size={15} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
