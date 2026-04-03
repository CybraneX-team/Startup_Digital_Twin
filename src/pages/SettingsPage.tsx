import { useState } from 'react';
import { Settings, Palette, Bell, Layers, Plus, Trash2, ImagePlus } from 'lucide-react';
import PageHeader from '../components/PageHeader';

interface DeptConfig {
  name: string;
  size: number;
  hod: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState({
    companyName: 'TechStartup Inc.',
    stage: 'seed',
    industry: 'saas',
    geography: 'india',
    aiAgents: true,
    theme: 'dark',
    notifications: true,
    logoUrl: '',
  });

  const [depts, setDepts] = useState<DeptConfig[]>([
    { name: 'Product', size: 4, hod: 'Founder' },
    { name: 'Growth', size: 3, hod: 'Growth Lead' },
    { name: 'Engineering', size: 6, hod: 'CTO' },
    { name: 'Support', size: 2, hod: 'Support Lead' },
  ]);

  const [newDept, setNewDept] = useState('');

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

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your digital twin workspace and preferences"
        icon={<Settings className="w-6 h-6" />}
      />

      <div className="grid grid-cols-2 gap-6">
        {/* ===== Organization Config ===== */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Organization
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Company Name</label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
              {[
                { key: 'stage', label: 'Funding Stage', options: ['pre-seed', 'seed', 'series-a', 'series-b', 'growth'] },
                { key: 'industry', label: 'Industry', options: ['saas', 'marketplace', 'd2c', 'fintech', 'healthtech', 'climatetech'] },
                { key: 'geography', label: 'Geography', options: ['india', 'usa', 'europe', 'sea', 'latam'] },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1.5 block">{f.label}</label>
                  <select
                    value={config[f.key as keyof typeof config] as string}
                    onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                  >
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <ImagePlus className="w-4 h-4" /> Company Logo
            </h3>
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-sky-500/50 transition-colors cursor-pointer"
              onClick={() => setConfig({ ...config, logoUrl: 'logo.svg' })}
            >
              {config.logoUrl ? (
                <div>
                  <div className="w-16 h-16 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-bold text-sky-300">
                      {config.companyName.charAt(0)}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-400">{config.logoUrl} uploaded</p>
                  <p className="text-[10px] text-gray-500 mt-1">Logo will appear in the 3D graph on your company node</p>
                </div>
              ) : (
                <div>
                  <ImagePlus className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload logo</p>
                  <p className="text-[10px] text-gray-600 mt-1">SVG or PNG, displayed on 3D graph</p>
                </div>
              )}
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
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={d.size}
                      onChange={(e) => updateDept(i, 'size', Number(e.target.value))}
                      className="w-12 bg-gray-800 rounded px-1.5 py-0.5 text-xs text-gray-300 text-center outline-none border border-gray-700"
                    />
                    <span className="text-[10px] text-gray-500">ppl</span>
                  </div>
                  <input
                    type="text"
                    value={d.hod}
                    onChange={(e) => updateDept(i, 'hod', e.target.value)}
                    placeholder="HOD"
                    className="w-28 bg-transparent text-xs text-gray-400 outline-none border-b border-gray-800 focus:border-sky-500"
                  />
                  <button
                    onClick={() => removeDept(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
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
        </div>
      </div>
    </div>
  );
}
