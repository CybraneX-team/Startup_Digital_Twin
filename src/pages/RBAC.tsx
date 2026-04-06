import { useState } from 'react';
import {
  ShieldCheck, Users, Crown, Briefcase, UserCircle, Plus, Copy,
  Check, X, ChevronDown, Clock, Link2, Trash2, MoreHorizontal,
  UserCheck, AlertCircle, Bot, Mail,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../lib/auth';
import {
  useTeamMembers, useJoinRequests, useWorkspaceInvites,
  generateInviteLink, deactivateInvite,
  approveJoinRequest, rejectJoinRequest,
  changeMemberRole, removeMember,
} from '../lib/db/team';
import type { UserRole } from '../lib/supabase';
import type { TeamMember, JoinRequest } from '../lib/db/team';

/* ─────────────────────────────────────────────────── */

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; border: string; icon: typeof Crown }> = {
  super_admin: { label: 'Super Admin', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: ShieldCheck },
  founder:     { label: 'Founder',     color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Crown },
  co_founder:  { label: 'Co-Founder',  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Crown },
  admin:       { label: 'Admin',       color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    icon: Briefcase },
  analyst:     { label: 'Analyst',     color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   icon: UserCircle },
  engineer:    { label: 'Engineer',    color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: UserCircle },
  viewer:      { label: 'Viewer',      color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20',   icon: UserCircle },
  investor:    { label: 'Investor',    color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',icon: UserCircle },
};

const ASSIGNABLE_ROLES: UserRole[] = ['co_founder', 'admin', 'analyst', 'engineer', 'viewer', 'investor'];

const MODULE_PERMS: Record<UserRole, Record<string, { read: boolean; write: boolean }>> = {
  super_admin: { twin: {read:true,write:true}, strategy:{read:true,write:true}, analytics:{read:true,write:true}, data:{read:true,write:true}, benchmarks:{read:true,write:true}, team:{read:true,write:true} },
  founder:     { twin: {read:true,write:true}, strategy:{read:true,write:true}, analytics:{read:true,write:true}, data:{read:true,write:true}, benchmarks:{read:true,write:false},team:{read:true,write:true} },
  co_founder:  { twin: {read:true,write:true}, strategy:{read:true,write:true}, analytics:{read:true,write:true}, data:{read:true,write:true}, benchmarks:{read:true,write:false},team:{read:true,write:true} },
  admin:       { twin: {read:true,write:true}, strategy:{read:true,write:true}, analytics:{read:true,write:true}, data:{read:true,write:true}, benchmarks:{read:true,write:false},team:{read:true,write:true} },
  analyst:     { twin: {read:true,write:false},strategy:{read:true,write:true}, analytics:{read:true,write:true}, data:{read:true,write:false},benchmarks:{read:true,write:false}, team:{read:true,write:false} },
  engineer:    { twin: {read:true,write:false},strategy:{read:true,write:false},analytics:{read:true,write:false},data:{read:true,write:true}, benchmarks:{read:true,write:false}, team:{read:true,write:false} },
  viewer:      { twin: {read:true,write:false},strategy:{read:true,write:false},analytics:{read:true,write:false},data:{read:true,write:false},benchmarks:{read:true,write:false}, team:{read:true,write:false} },
  investor:    { twin: {read:true,write:false},strategy:{read:false,write:false},analytics:{read:true,write:false},data:{read:false,write:false},benchmarks:{read:true,write:false},team:{read:true,write:false} },
};

const MODULES = ['twin', 'strategy', 'analytics', 'data', 'benchmarks', 'team'];

function memberName(m: TeamMember | JoinRequest) {
  if (m.first_name || m.last_name) return [m.first_name, m.last_name].filter(Boolean).join(' ');
  return m.email ?? 'Unknown';
}

function initials(m: TeamMember | JoinRequest) {
  const n = memberName(m);
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ─────────────────────────────────────────────────── */

export default function RBAC() {
  const { user, profile, role: myRole, canWrite } = useAuth();
  const companyId = profile?.company_id ?? null;
  const canManage = canWrite('team');

  const { members, loading: loadingMembers, refetch: refetchMembers } = useTeamMembers(companyId);
  const { requests, loading: loadingRequests, refetch: refetchRequests } = useJoinRequests(companyId);
  const { invites, loading: loadingInvites, refetch: refetchInvites } = useWorkspaceInvites(companyId);

  const [selectedRole, setSelectedRole] = useState<UserRole>('founder');
  const [tab, setTab] = useState<'members' | 'requests' | 'invites' | 'permissions'>('members');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveRole, setApproveRole] = useState<Record<string, UserRole>>({});

  /* ── Invite link ── */
  async function handleGenerateLink() {
    if (!companyId || !user) return;
    setGeneratingLink(true);
    const result = await generateInviteLink(companyId, user.id, inviteRole, { maxUses: 10, expiresInDays: 7 });
    setGeneratingLink(false);
    if ('error' in result) { alert(result.error); return; }
    await navigator.clipboard.writeText(result.url).catch(() => {});
    setCopiedToken(result.token);
    refetchInvites();
    setTimeout(() => setCopiedToken(null), 3000);
  }

  async function handleDeactivate(inviteId: string) {
    setActionLoading(inviteId);
    await deactivateInvite(inviteId);
    refetchInvites();
    setActionLoading(null);
  }

  /* ── Join requests ── */
  async function handleApprove(req: JoinRequest) {
    if (!user) return;
    const role = approveRole[req.id] ?? req.requested_role;
    setActionLoading(req.id);
    const result = await approveJoinRequest(req.id, user.id, role);
    setActionLoading(null);
    if (!result.success) { alert(result.error); return; }
    refetchRequests();
    refetchMembers();
  }

  async function handleReject(reqId: string) {
    if (!user) return;
    setActionLoading(reqId);
    await rejectJoinRequest(reqId, user.id);
    setActionLoading(null);
    refetchRequests();
  }

  /* ── Member actions ── */
  async function handleRoleChange(memberId: string, newRole: UserRole) {
    setActionLoading(memberId);
    await changeMemberRole(memberId, newRole);
    setActionLoading(null);
    refetchMembers();
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this member from the workspace?')) return;
    setActionLoading(memberId);
    await removeMember(memberId);
    setActionLoading(null);
    refetchMembers();
  }

  /* ── Copy invite URL ── */
  function copyInviteUrl(token: string) {
    const url = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingCount = requests.length;

  return (
    <div>
      <PageHeader
        title="Team & Access"
        subtitle="Manage who's in your workspace, their roles, and join requests"
        icon={<ShieldCheck className="w-6 h-6" />}
        badge={`${activeMembers.length} member${activeMembers.length !== 1 ? 's' : ''}`}
      />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Members', value: activeMembers.length, color: 'text-sky-400' },
          { label: 'Pending Requests', value: pendingCount, color: pendingCount > 0 ? 'text-amber-400' : 'text-gray-500' },
          { label: 'Active Invite Links', value: invites.length, color: 'text-violet-400' },
          { label: 'Your Role', value: ROLE_META[myRole ?? 'viewer']?.label ?? '—', color: ROLE_META[myRole ?? 'viewer']?.color ?? 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-gray-900/50 border border-gray-800 w-fit">
        {([
          { key: 'members',     label: 'Members',     count: activeMembers.length },
          { key: 'requests',    label: 'Join Requests', count: pendingCount, alert: pendingCount > 0 },
          { key: 'invites',     label: 'Invite Links', count: invites.length },
          { key: 'permissions', label: 'Permissions',  count: null },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-lg transition-all ${
              tab === t.key
                ? 'bg-gray-800 text-white font-medium'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                t.alert ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════ MEMBERS TAB */}
      {tab === 'members' && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
            <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Workspace Members
            </h3>
            {canManage && (
              <button
                onClick={() => setTab('invites')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/15 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Invite Member
              </button>
            )}
          </div>

          {loadingMembers ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading members...</div>
          ) : activeMembers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No members yet. Send an invite link to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/40">
              {activeMembers.map(m => {
                const meta = ROLE_META[m.role] ?? ROLE_META.viewer;
                const Icon = meta.icon;
                const isMe = m.user_id === user?.id;
                const isFounder = m.role === 'founder';
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${meta.bg} ${meta.color}`}>
                      {initials(m)}
                    </div>

                    {/* Name + title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium truncate">{memberName(m)}</span>
                        {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400">You</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {m.email ?? m.title ?? '—'}
                      </p>
                    </div>

                    {/* Role badge / selector */}
                    <div className="flex items-center gap-2">
                      {canManage && !isMe && !isFounder ? (
                        <div className="relative">
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value as UserRole)}
                            disabled={actionLoading === m.id}
                            className={`text-[11px] px-2.5 py-1.5 pr-6 rounded-lg border appearance-none cursor-pointer transition-colors ${meta.bg} ${meta.border} ${meta.color} bg-transparent`}
                          >
                            {ASSIGNABLE_ROLES.map(r => (
                              <option key={r} value={r} className="bg-gray-900 text-white">{ROLE_META[r].label}</option>
                            ))}
                          </select>
                          <ChevronDown className={`w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${meta.color}`} />
                        </div>
                      ) : (
                        <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border ${meta.bg} ${meta.border} ${meta.color}`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      )}

                      {/* Remove */}
                      {canManage && !isMe && !isFounder && (
                        <button
                          onClick={() => handleRemove(m.id)}
                          disabled={actionLoading === m.id}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════ JOIN REQUESTS TAB */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {!canManage && (
            <div className="glass-card p-4 flex items-center gap-3 text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              You need Admin or above to approve requests.
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800/50">
              <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                Pending Join Requests
                {pendingCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                    {pendingCount} pending
                  </span>
                )}
              </h3>
            </div>

            {loadingRequests ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center">
                <UserCheck className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending requests right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/40">
                {requests.map(req => {
                  const roleForApproval = approveRole[req.id] ?? req.requested_role;
                  const meta = ROLE_META[roleForApproval] ?? ROLE_META.viewer;
                  return (
                    <div key={req.id} className="flex items-center gap-4 px-5 py-4">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-amber-500/10 text-amber-400">
                        {initials(req)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">{memberName(req)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500">Requested:</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ROLE_META[req.requested_role]?.bg} ${ROLE_META[req.requested_role]?.color}`}>
                            {ROLE_META[req.requested_role]?.label}
                          </span>
                          <span className="text-[10px] text-gray-600 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {req.message && (
                          <p className="text-[11px] text-gray-400 mt-1 italic">"{req.message}"</p>
                        )}
                      </div>

                      {/* Assign role selector + actions */}
                      {canManage && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={roleForApproval}
                            onChange={e => setApproveRole(prev => ({ ...prev, [req.id]: e.target.value as UserRole }))}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg border appearance-none cursor-pointer ${meta.bg} ${meta.border} ${meta.color} bg-transparent`}
                          >
                            {ASSIGNABLE_ROLES.map(r => (
                              <option key={r} value={r} className="bg-gray-900 text-white">{ROLE_META[r].label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ INVITE LINKS TAB */}
      {tab === 'invites' && (
        <div className="space-y-4">
          {/* Generate new link */}
          {canManage && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-medium text-gray-200 mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-violet-400" />
                Generate Invite Link
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Role to Assign</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-700 bg-gray-900/50 text-white focus:border-violet-500/50 focus:outline-none"
                  >
                    {ASSIGNABLE_ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all disabled:opacity-60"
                >
                  {generatingLink ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  Generate & Copy Link
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Links expire in 7 days and can be used up to 10 times. Share with caution.
              </p>
            </div>
          )}

          {/* Active invite links */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800/50">
              <h3 className="text-sm font-medium text-gray-200">Active Invite Links</h3>
            </div>

            {loadingInvites ? (
              <div className="p-6 text-center text-gray-500 text-sm">Loading...</div>
            ) : invites.length === 0 ? (
              <div className="p-8 text-center">
                <Link2 className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active invite links. Generate one above.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/40">
                {invites.map(inv => {
                  const meta = ROLE_META[inv.role] ?? ROLE_META.viewer;
                  const expiresIn = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000);
                  const copied = copiedToken === inv.token;
                  return (
                    <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                        <Link2 className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}>
                            {meta.label}
                          </span>
                          {inv.email && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {inv.email}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {inv.used_count}/{inv.max_uses} uses · expires in {expiresIn}d
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyInviteUrl(inv.token)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg border transition-all ${
                            copied
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                        {canManage && (
                          <button
                            onClick={() => handleDeactivate(inv.id)}
                            disabled={actionLoading === inv.id}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ PERMISSIONS TAB */}
      {tab === 'permissions' && (
        <div className="space-y-4">
          {/* Role selector */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-gray-200 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Permission Matrix
            </h3>
            <div className="flex flex-wrap gap-2 mb-5">
              {(Object.keys(ROLE_META) as UserRole[]).map(r => {
                const meta = ROLE_META[r];
                const Icon = meta.icon;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedRole === r
                        ? `${meta.bg} ${meta.border} ${meta.color} font-medium`
                        : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Permission grid for selected role */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2.5 px-4 text-[10px] text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="text-center py-2.5 px-4 text-[10px] text-gray-500 uppercase tracking-wider">Read</th>
                    <th className="text-center py-2.5 px-4 text-[10px] text-gray-500 uppercase tracking-wider">Write</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(mod => {
                    const perms = MODULE_PERMS[selectedRole]?.[mod] ?? { read: false, write: false };
                    return (
                      <tr key={mod} className="border-b border-gray-800/40">
                        <td className="py-3 px-4 text-sm text-gray-300 capitalize">{mod}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                            perms.read ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-600'
                          }`}>
                            {perms.read ? '✓' : '✕'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                            perms.write ? 'bg-sky-500/15 text-sky-400' : 'bg-gray-800 text-gray-600'
                          }`}>
                            {perms.write ? '✓' : '✕'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-gray-600 mt-4">
              Permissions are enforced both client-side and via Supabase Row Level Security policies on the server.
            </p>
          </div>

          {/* Members per role quick view */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-gray-200 mb-4">Members by Role</h3>
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(ROLE_META) as UserRole[]).map(r => {
                const count = activeMembers.filter(m => m.role === r).length;
                if (count === 0) return null;
                const meta = ROLE_META[r];
                const Icon = meta.icon;
                return (
                  <div key={r} className={`p-3 rounded-xl border ${meta.bg} ${meta.border}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      <span className={`text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
                    </div>
                    <p className="text-xl font-bold text-white">{count}</p>
                    <p className="text-[9px] text-gray-600">{count === 1 ? 'member' : 'members'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
