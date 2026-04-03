import { useState } from 'react';
import { ShieldCheck, Users, Bot, ChevronRight, Crown, Briefcase, UserCircle, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { orgRoles, orgMembers, departments } from '../data/mockData';
import type { OrgRole } from '../types';

const PERM_LABELS: Record<string, string> = {
  viewDashboard: 'View Dashboard',
  editData: 'Edit Data',
  runSimulations: 'Run Simulations',
  manageTeam: 'Manage Team',
  adminSettings: 'Admin Settings',
};

const LEVEL_CONFIG = {
  founder: { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Founder' },
  hod: { icon: Briefcase, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', label: 'Head of Dept' },
  lead: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Team Lead' },
  ic: { icon: UserCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', label: 'Individual' },
};

export default function RBAC() {
  const [roles, setRoles] = useState(orgRoles);
  const [selectedRole, setSelectedRole] = useState<string>('founder');
  const [showAddRole, setShowAddRole] = useState(false);

  const active = roles.find((r) => r.id === selectedRole)!;
  const members = orgMembers.filter((m) => m.roleId === selectedRole);
  const humans = members.filter((m) => !m.isAI);
  const agents = members.filter((m) => m.isAI);

  const togglePerm = (roleId: string, perm: keyof OrgRole['permissions']) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, permissions: { ...r.permissions, [perm]: !r.permissions[perm] } } : r,
      ),
    );
  };

  const toggleAI = (roleId: string) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, aiAugmented: !r.aiAugmented } : r)),
    );
  };

  // Build org hierarchy tree
  const founderMembers = orgMembers.filter((m) => m.roleId === 'founder' && !m.isAI);
  const deptGroups = departments.map((dept) => {
    const hodRole = roles.find((r) => r.level === 'hod' && r.department === dept.name);
    const hodMember = hodRole ? orgMembers.find((m) => m.roleId === hodRole.id && !m.isAI) : null;
    const deptMembers = orgMembers.filter(
      (m) => m.department === dept.name && m.roleId !== hodRole?.id && !m.isAI,
    );
    const deptAgents = orgMembers.filter((m) => m.department === dept.name && m.isAI);
    return { dept, hodRole, hodMember, deptMembers, deptAgents };
  });

  return (
    <div>
      <PageHeader
        title="Team & Access Control"
        subtitle="Organisational structure, role-based permissions, and AI augmentation"
        icon={<ShieldCheck className="w-6 h-6" />}
        badge="RBAC"
      />

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* ===== Left: Org Hierarchy ===== */}
        <div className="col-span-1 glass-card p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Org Hierarchy
          </h3>

          <div className="space-y-1">
            {/* Founder */}
            {founderMembers.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedRole('founder')}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  selectedRole === 'founder'
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-white font-medium">{f.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 ml-6">Founder / CEO — All Departments</span>
              </button>
            ))}

            {/* Department groups */}
            {deptGroups.map(({ dept, hodRole, hodMember, deptMembers, deptAgents }) => (
              <div key={dept.name} className="ml-3 border-l border-gray-800 pl-3 mt-2">
                {/* HOD */}
                {hodMember && hodRole && (
                  <button
                    onClick={() => setSelectedRole(hodRole.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      selectedRole === hodRole.id
                        ? 'bg-sky-500/10 border border-sky-500/20'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-sm text-gray-200">{hodMember.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">
                        {dept.name}
                      </span>
                    </div>
                  </button>
                )}

                {/* ICs */}
                <div className="ml-4 border-l border-gray-800/50 pl-2 space-y-0.5 mt-1">
                  {deptMembers.map((m) => {
                    const mRole = roles.find((r) => r.id === m.roleId);
                    return (
                      <button
                        key={m.id}
                        onClick={() => mRole && setSelectedRole(mRole.id)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-white/[0.03] transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-400">{m.name}</span>
                        </div>
                      </button>
                    );
                  })}
                  {/* AI Agents */}
                  {deptAgents.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-cyan-500/[0.04]"
                    >
                      <Bot className="w-3 h-3 text-cyan-400" />
                      <span className="text-xs text-cyan-400/80">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Global AI Agents */}
            {orgMembers
              .filter((m) => m.isAI && m.department === 'All')
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-1.5 mt-2 rounded bg-cyan-500/[0.04] ml-3"
                >
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-cyan-400/80">{a.name}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">Global</span>
                </div>
              ))}
          </div>
        </div>

        {/* ===== Right: Role Detail ===== */}
        <div className="col-span-2 space-y-6">
          {/* Role Info */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {(() => {
                  const cfg = LEVEL_CONFIG[active.level];
                  const Icon = cfg.icon;
                  return (
                    <>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{active.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {active.department && (
                            <span className="text-[10px] text-gray-500">
                              {active.department}
                            </span>
                          )}
                          {!active.department && (
                            <span className="text-[10px] text-gray-500">All Departments</span>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* AI Augmentation Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">AI Augmentation</span>
                <button onClick={() => toggleAI(active.id)} className="flex items-center">
                  {active.aiAugmented ? (
                    <ToggleRight className="w-7 h-7 text-cyan-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-600" />
                  )}
                </button>
                {active.aiAugmented && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Permissions Grid */}
            <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Permissions</h4>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(PERM_LABELS) as (keyof OrgRole['permissions'])[]).map((perm) => (
                <button
                  key={perm}
                  onClick={() => togglePerm(active.id, perm)}
                  className={`py-3 px-3 rounded-lg border text-center transition-all ${
                    active.permissions[perm]
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-gray-900/50 border-gray-800/50 text-gray-600'
                  }`}
                >
                  <p className="text-xs font-medium">{PERM_LABELS[perm]}</p>
                  <p className="text-[10px] mt-1">
                    {active.permissions[perm] ? 'Granted' : 'Denied'}
                  </p>
                </button>
              ))}
            </div>

            {/* Members with this role */}
            <div className="mt-5 pt-5 border-t border-gray-800/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider">
                  Members ({humans.length} human{humans.length !== 1 ? 's' : ''}
                  {agents.length > 0 ? `, ${agents.length} AI` : ''})
                </h4>
                <button className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors">
                  <Plus className="w-3 h-3" /> Add Member
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {humans.map((m) => (
                  <span
                    key={m.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-900/50 border border-gray-800/50 text-xs text-gray-300"
                  >
                    <UserCircle className="w-3.5 h-3.5 text-gray-500" />
                    {m.name}
                  </span>
                ))}
                {agents.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/15 text-xs text-cyan-400"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Department Access Matrix */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Department Access Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Department</th>
                    {roles
                      .filter((r) => r.level === 'founder' || r.level === 'hod')
                      .map((r) => (
                        <th key={r.id} className="text-center py-2 px-3 text-xs text-gray-500 font-medium">
                          {r.name.split(' ')[0]}
                        </th>
                      ))}
                    <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">IC</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.name} className="border-b border-gray-800/50">
                      <td className="py-2.5 px-3">
                        <span className="text-gray-300">{dept.name}</span>
                      </td>
                      {roles
                        .filter((r) => r.level === 'founder' || r.level === 'hod')
                        .map((r) => {
                          const isOwner = !r.department || r.department === dept.name;
                          const level = r.level === 'founder' ? 'Full' : isOwner ? 'Full' : 'View';
                          return (
                            <td key={r.id} className="text-center py-2.5 px-3">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  level === 'Full'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-gray-800 text-gray-500'
                                }`}
                              >
                                {level}
                              </span>
                            </td>
                          );
                        })}
                      <td className="text-center py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-600">
                          Dept Only
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ===== AI Agents Section ===== */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Bot className="w-4 h-4" /> AI Agents
          </h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-sky-400 bg-sky-500/10 rounded-lg border border-sky-500/20 hover:bg-sky-500/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> Deploy Agent
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {orgMembers
            .filter((m) => m.isAI)
            .map((agent) => {
              const role = roles.find((r) => r.id === agent.roleId);
              return (
                <div
                  key={agent.id}
                  className="rounded-xl p-4 border border-cyan-500/15 bg-cyan-500/[0.04]"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-5 h-5 text-cyan-400" />
                    <h4 className="text-sm font-medium text-white">{agent.name}</h4>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Department</span>
                      <span className="text-[10px] text-gray-300">{agent.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Role Level</span>
                      <span className="text-[10px] text-gray-300">{role?.name ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Status</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800/50">
                    <button className="flex-1 text-[10px] py-1.5 rounded-lg bg-gray-900/50 border border-gray-800/50 text-gray-400 hover:text-white transition-colors">
                      Configure
                    </button>
                    <button className="flex-1 text-[10px] py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors">
                      Deactivate
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          AI agents operate with opt-in permissions matching their assigned role level. Augmentation scales with company stage.
        </p>
      </div>
    </div>
  );
}
