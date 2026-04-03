import { useState } from 'react';
import { Building2, Users, Bot, ChevronRight, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../components/PageHeader';
import { departments, companyInfo, departmentHealth } from '../data/mockData';

export function SystemContent() {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  return (
    <>
      {/* Company Overview Card */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-5 gap-6">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Company</span>
            <p className="text-lg font-semibold text-white mt-1">{companyInfo.name}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Stage</span>
            <p className="text-lg font-semibold text-sky-300 mt-1">{companyInfo.stage}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Team Size</span>
            <p className="text-lg font-semibold text-white mt-1">{companyInfo.teamSize}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Monthly Burn</span>
            <p className="text-lg font-semibold text-white mt-1">${companyInfo.monthlyBurn.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Runway</span>
            <p className="text-lg font-semibold text-emerald-300 mt-1">{companyInfo.runway}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Department List */}
        <div className="col-span-1 glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Departments
          </h3>
          <div className="space-y-2">
            {departments.map((dept) => (
              <button
                key={dept.name}
                onClick={() => setSelectedDept(selectedDept === dept.name ? null : dept.name)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  selectedDept === dept.name
                    ? 'bg-sky-600/15 border-sky-500/30 text-sky-300'
                    : 'bg-gray-900/50 border-gray-800/50 text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dept.name}</span>
                      {dept.aiAugmented && (
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{dept.size} members · HOD: {dept.hod}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${
                    selectedDept === dept.name ? 'rotate-90' : ''
                  }`} />
                </div>
                {selectedDept === dept.name && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-2">KPIs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dept.kpis.map((kpi) => (
                        <span key={kpi} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                          {kpi}
                        </span>
                      ))}
                    </div>
                    {dept.aiAugmented && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-cyan-400">
                        <Bot className="w-3 h-3" /> AI-Augmented Role
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Department Health Chart */}
        <div className="col-span-2 glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Department Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentHealth} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={80} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="health" fill="#0ea5e9" name="Health" radius={[0, 4, 4, 0]} />
              <Bar dataKey="velocity" fill="#06b6d4" name="Velocity" radius={[0, 4, 4, 0]} />
              <Bar dataKey="satisfaction" fill="#10b981" name="Satisfaction" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RBAC & AI Augmentation */}
      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Role-Based Access Control
          </h3>
          <div className="space-y-3">
            {['Founder', 'CTO', 'Growth Lead', 'Support Lead'].map((role, i) => (
              <div key={role} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
                <span className="text-sm text-gray-300">{role}</span>
                <div className="flex gap-2">
                  {['View', 'Edit', 'Execute'].map((perm, j) => (
                    <span
                      key={perm}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        j <= (i === 0 ? 2 : i === 1 ? 2 : 1)
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-gray-800 text-gray-600'
                      }`}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4" /> AI Augmentation Status
          </h3>
          <div className="space-y-3">
            {[
              { agent: 'Analytics Assistant', status: 'Active', dept: 'Growth' },
              { agent: 'Customer Support', status: 'Active', dept: 'Support' },
              { agent: 'Report Generator', status: 'Standby', dept: 'All' },
            ].map((ai) => (
              <div key={ai.agent} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
                <div>
                  <span className="text-sm text-gray-300">{ai.agent}</span>
                  <span className="text-xs text-gray-500 ml-2">({ai.dept})</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  ai.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {ai.status}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-4">
            AI agents operate with opt-in permissions. Augmentation level scales with company stage.
          </p>
        </div>
      </div>
    </>
  );
}

export default function System() {
  return (
    <div>
      <PageHeader
        title="System Twin"
        subtitle="Internal company structure, departments, and organizational metrics"
        icon={<Building2 className="w-6 h-6" />}
        badge="Internal"
      />
      <SystemContent />
    </div>
  );
}
