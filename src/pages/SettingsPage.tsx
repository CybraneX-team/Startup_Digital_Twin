import { useState, useEffect } from 'react';
import { Settings, Palette, Bell, Layers, Plus, Trash2, ImagePlus, Save, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';
import { supabase } from '../lib/supabase';
import { INDUSTRIES } from '../db/industries';
import type { CompanyStage, BusinessModel } from '../lib/supabase';

const STAGES: CompanyStage[] = [
  'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B',
  'Series C', 'Series D+', 'Pre-IPO', 'Public', 'PSU', 'Bootstrapped',
];

const COUNTRIES = [
  'India', 'USA', 'UK', 'Singapore', 'UAE', 'Germany', 'Canada',
  'Australia', 'Japan', 'Brazil', 'Indonesia', 'Nigeria', 'Other',
];

interface DeptConfig {
  name: string;
  size: number;
  hod: string;
}

export default function SettingsPage() {
  const { user, profile, refreshProfile, canWrite, role } = useAuth();
  const { company, loading: companyLoading } = useCompany(profile?.company_id);
  const canEditSettings = canWrite('settings');

  // Company config — populated from real data
  const [config, setConfig] = useState({
    companyName: '',
    stage: '' as string,
    industry_id: '',
    country: '',
    website: '',
    description: '',
    aiAgents: true,
    theme: 'dark',
    notifications: true,
    logoUrl: '',
  });

  // Profile config
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    title: '',
  });

  const [depts, setDepts] = useState<DeptConfig[]>([
    { name: 'Product', size: 4, hod: 'Founder' },
    { name: 'Growth', size: 3, hod: 'Growth Lead' },
    { name: 'Engineering', size: 6, hod: 'CTO' },
    { name: 'Support', size: 2, hod: 'Support Lead' },
  ]);

  const [newDept, setNewDept] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load real data from company + profile
  useEffect(() => {
    if (company) {
      setConfig(c => ({
        ...c,
        companyName: company.name ?? '',
        stage: company.stage ?? '',
        industry_id: company.industry_id ?? '',
        country: company.country ?? '',
        website: company.website ?? '',
        description: company.description ?? '',
      }));
    }
  }, [company]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        title: profile.title ?? '',
      });
    }
  }, [profile]);

  // Save company settings
  async function handleSaveCompany() {
    if (!company || !canEditSettings) return;
    setSaving(true);
    setSaveMsg(null);

    const { error } = await supabase
      .from('companies')
      .update({
        name: config.companyName.trim(),
        stage: config.stage,
        industry_id: config.industry_id,
        country: config.country,
        website: config.website.trim() || null,
        description: config.description.trim() || null,
      })
      .eq('id', company.id);

    if (error) {
      setSaveMsg('Failed to save: ' + error.message);
    } else {
      setSaveMsg('Company settings saved');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  // Save profile settings
  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    setSaveMsg(null);

    const { error } = await supabase
      .from('user_profiles')
      .update({
        first_name: profileForm.first_name.trim() || null,
        last_name: profileForm.last_name.trim() || null,
        title: profileForm.title.trim() || null,
      })
      .eq('id', user.id);

    if (error) {
      setSaveMsg('Failed to save: ' + error.message);
    } else {
      await refreshProfile();
      setSaveMsg('Profile updated');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  const addDept = () => {
    if (!newDept.trim()) return;
    setDepts((prev) => [...prev, { name: newDept.trim(), size: 1, hod: 'Unassigned' }]);
    setNewDept('');
  };

  const removeDept = (idx: number) => {
    setDepts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateDept = (idx: number, field: keyof DeptConfig, value: string | number) => {
    setDepts((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const applyTemplate = (template: string) => {
    const templates: Record<string, DeptConfig[]> = {
      'SaaS B2B': [
        { name: 'Product', size: 4, hod: 'CPO' },
        { name: 'Engineering', size: 8, hod: 'CTO' },
        { name: 'Growth', size: 3, hod: 'Growth Lead' },
        { name: 'Sales', size: 4, hod: 'Sales Lead' },
        { name: 'Support', size: 3, hod: 'Support Lead' },
      ],
      Marketplace: [
        { name: 'Product', size: 3, hod: 'CPO' },
        { name: 'Engineering', size: 6, hod: 'CTO' },
        { name: 'Supply Ops', size: 4, hod: 'Ops Lead' },
        { name: 'Demand Growth', size: 3, hod: 'Growth Lead' },
        { name: 'Trust & Safety', size: 2, hod: 'T&S Lead' },
      ],
      D2C: [
        { name: 'Product', size: 3, hod: 'CPO' },
        { name: 'Engineering', size: 4, hod: 'CTO' },
        { name: 'Marketing', size: 5, hod: 'CMO' },
        { name: 'Supply Chain', size: 3, hod: 'SCM Lead' },
        { name: 'CX', size: 3, hod: 'CX Lead' },
      ],
      FinTech: [
        { name: 'Product', size: 3, hod: 'CPO' },
        { name: 'Engineering', size: 6, hod: 'CTO' },
        { name: 'Risk & Compliance', size: 4, hod: 'CRO' },
        { name: 'Growth', size: 3, hod: 'Growth Lead' },
        { name: 'Operations', size: 3, hod: 'COO' },
      ],
      HealthTech: [
        { name: 'Product', size: 3, hod: 'CPO' },
        { name: 'Engineering', size: 5, hod: 'CTO' },
        { name: 'Clinical Ops', size: 4, hod: 'Clinical Lead' },
        { name: 'Regulatory', size: 2, hod: 'Regulatory Lead' },
        { name: 'Growth', size: 2, hod: 'Growth Lead' },
      ],
      ClimateTech: [
        { name: 'Product', size: 3, hod: 'CPO' },
        { name: 'Engineering', size: 5, hod: 'CTO' },
        { name: 'Science', size: 3, hod: 'CSO' },
        { name: 'Partnerships', size: 2, hod: 'BD Lead' },
        { name: 'Impact', size: 2, hod: 'Impact Lead' },
      ],
    };
    if (templates[template]) {
      setDepts(templates[template]);
    }
  };

  const selectedIndustry = INDUSTRIES.find(i => i.id === config.industry_id);

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your digital twin workspace and preferences"
        icon={<Settings className="w-6 h-6" />}
        badge={role ?? undefined}
      />

      {/* Save status */}
      {saveMsg && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm ${
          saveMsg.startsWith('Failed') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {saveMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* ===== Left Column: Organization + Profile ===== */}
        <div className="space-y-6">
          {/* Organization Config */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Organization
              </h3>
              {canEditSettings && (
                <button
                  onClick={handleSaveCompany}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/15 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Company Name</label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                  disabled={!canEditSettings}
                  className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Industry</label>
                <select
                  value={config.industry_id}
                  onChange={(e) => setConfig({ ...config, industry_id: e.target.value })}
                  disabled={!canEditSettings}
                  className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Funding Stage</label>
                  <select
                    value={config.stage}
                    onChange={(e) => setConfig({ ...config, stage: e.target.value })}
                    disabled={!canEditSettings}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Country</label>
                  <select
                    value={config.country}
                    onChange={(e) => setConfig({ ...config, country: e.target.value })}
                    disabled={!canEditSettings}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Website</label>
                <input
                  type="url"
                  value={config.website}
                  onChange={(e) => setConfig({ ...config, website: e.target.value })}
                  disabled={!canEditSettings}
                  placeholder="https://yourcompany.com"
                  className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  disabled={!canEditSettings}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors resize-none disabled:opacity-50"
                />
              </div>
              {!canEditSettings && (
                <p className="text-[10px] text-amber-400/70">You need Admin or Founder role to edit company settings.</p>
              )}
            </div>
          </div>

          {/* Profile */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <ImagePlus className="w-4 h-4" /> Your Profile
              </h3>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/15 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">First Name</label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Last Name</label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Title / Role</label>
                <input
                  type="text"
                  value={profileForm.title}
                  onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                  placeholder="e.g. Founder & CEO"
                  className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/30">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
                >
                  {(profileForm.first_name?.[0] ?? '?').toUpperCase()}
                  {(profileForm.last_name?.[0] ?? '').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-white font-medium">
                    {[profileForm.first_name, profileForm.last_name].filter(Boolean).join(' ') || 'Your Name'}
                  </p>
                  <p className="text-[10px] text-gray-500">{profileForm.title || 'No title set'}</p>
                  <p className="text-[10px] text-gray-600">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Right Column ===== */}
        <div className="space-y-6">
          {/* Department Config */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Departments
            </h3>
            <div className="space-y-2 mb-4">
              {depts.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-900/50 border border-gray-800/50"
                >
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => updateDept(i, 'name', e.target.value)}
                    disabled={!canEditSettings}
                    className="flex-1 bg-transparent text-sm text-white outline-none disabled:opacity-50"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={d.size}
                      onChange={(e) => updateDept(i, 'size', Number(e.target.value))}
                      disabled={!canEditSettings}
                      className="w-12 bg-gray-800 rounded px-1.5 py-0.5 text-xs text-gray-300 text-center outline-none border border-gray-700 disabled:opacity-50"
                    />
                    <span className="text-[10px] text-gray-500">ppl</span>
                  </div>
                  <input
                    type="text"
                    value={d.hod}
                    onChange={(e) => updateDept(i, 'hod', e.target.value)}
                    disabled={!canEditSettings}
                    placeholder="HOD"
                    className="w-28 bg-transparent text-xs text-gray-400 outline-none border-b border-gray-800 focus:border-sky-500 disabled:opacity-50"
                  />
                  {canEditSettings && (
                    <button
                      onClick={() => removeDept(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canEditSettings && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDept()}
                  placeholder="New department name"
                  className="flex-1 px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
                />
                <button
                  onClick={addDept}
                  className="flex items-center gap-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            )}
            <p className="text-[10px] text-gray-600 mt-2">
              Total team: {depts.reduce((s, d) => s + d.size, 0)} across {depts.length} departments
            </p>
          </div>

          {/* Workspace */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Workspace
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">AI Agents</span>
                <button
                  onClick={() => setConfig({ ...config, aiAgents: !config.aiAgents })}
                  className={`w-10 h-6 rounded-full transition-colors ${config.aiAgents ? 'bg-sky-600' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${config.aiAgents ? 'translate-x-4' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Dark Theme</span>
                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded-lg">Active</span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h3>
            <div className="space-y-3">
              {['KPI threshold alerts', 'Environment signal updates', 'Simulation completed', 'Data sync status'].map((item) => (
                <div key={item} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-400">{item}</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Stage Templates */}
          {canEditSettings && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Templates</h3>
              <p className="text-[10px] text-gray-500 mb-3">Apply a preset department structure based on your sector</p>
              <div className="grid grid-cols-2 gap-2">
                {['SaaS B2B', 'Marketplace', 'D2C', 'FinTech', 'HealthTech', 'ClimateTech'].map((t) => (
                  <button
                    key={t}
                    onClick={() => applyTemplate(t)}
                    className="px-3 py-2 text-xs text-gray-400 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-sky-500/30 hover:text-sky-300 transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
