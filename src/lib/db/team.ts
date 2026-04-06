import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { UserRole } from '../supabase';

/* ──────────────────────────────────────────────────
   Types
────────────────────────────────────────────────── */

export type MemberStatus = 'pending' | 'active' | 'rejected' | 'removed';

export interface TeamMember {
  id: string;              // company_members.id
  user_id: string;
  company_id: string;
  role: UserRole;
  status: MemberStatus;
  invited_by: string | null;
  approved_at: string | null;
  joined_at: string;
  // joined from user_profiles
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface JoinRequest {
  id: string;
  company_id: string;
  user_id: string;
  requested_role: UserRole;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  assigned_role: UserRole | null;
  created_at: string;
  // joined from user_profiles
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
}

export interface WorkspaceInvite {
  id: string;
  company_id: string;
  token: string;
  role: UserRole;
  email: string | null;
  expires_at: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

/* ──────────────────────────────────────────────────
   useTeamMembers — live subscription to company members
────────────────────────────────────────────────── */

export function useTeamMembers(companyId: string | null | undefined) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchMembers() {
    if (!companyId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('company_members')
      .select(`
        id, user_id, company_id, role, status, invited_by, approved_at, joined_at,
        user_profiles (first_name, last_name, title, avatar_url),
        auth_users:user_id (email)
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'pending'])
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[team] fetchMembers', error);
      setLoading(false);
      return;
    }

    const shaped: TeamMember[] = (data ?? []).map((row: any) => ({
      id:          row.id,
      user_id:     row.user_id,
      company_id:  row.company_id,
      role:        row.role,
      status:      row.status,
      invited_by:  row.invited_by,
      approved_at: row.approved_at,
      joined_at:   row.joined_at,
      first_name:  row.user_profiles?.first_name ?? null,
      last_name:   row.user_profiles?.last_name ?? null,
      title:       row.user_profiles?.title ?? null,
      avatar_url:  row.user_profiles?.avatar_url ?? null,
      email:       row.auth_users?.email ?? null,
    }));

    setMembers(shaped);
    setLoading(false);
  }

  useEffect(() => {
    fetchMembers();

    // Real-time: re-fetch when members table changes for this company
    const channel = supabase
      .channel(`team-${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'company_members',
        filter: `company_id=eq.${companyId}`,
      }, () => fetchMembers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  return { members, loading, refetch: fetchMembers };
}

/* ──────────────────────────────────────────────────
   useJoinRequests — pending requests for this company
────────────────────────────────────────────────── */

export function useJoinRequests(companyId: string | null | undefined) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRequests() {
    if (!companyId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('join_requests')
      .select(`
        id, company_id, user_id, requested_role, message, status,
        reviewed_by, reviewed_at, assigned_role, created_at,
        user_profiles (first_name, last_name, title)
      `)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) { console.error('[team] fetchRequests', error); setLoading(false); return; }

    const shaped: JoinRequest[] = (data ?? []).map((row: any) => ({
      id:             row.id,
      company_id:     row.company_id,
      user_id:        row.user_id,
      requested_role: row.requested_role,
      message:        row.message,
      status:         row.status,
      reviewed_by:    row.reviewed_by,
      reviewed_at:    row.reviewed_at,
      assigned_role:  row.assigned_role,
      created_at:     row.created_at,
      first_name:     row.user_profiles?.first_name ?? null,
      last_name:      row.user_profiles?.last_name ?? null,
      email:          null,
      title:          row.user_profiles?.title ?? null,
    }));

    setRequests(shaped);
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel(`joinreq-${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'join_requests',
        filter: `company_id=eq.${companyId}`,
      }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  return { requests, loading, refetch: fetchRequests };
}

/* ──────────────────────────────────────────────────
   useWorkspaceInvites — active invite links
────────────────────────────────────────────────── */

export function useWorkspaceInvites(companyId: string | null | undefined) {
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchInvites() {
    if (!companyId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) { console.error('[team] fetchInvites', error); setLoading(false); return; }
    setInvites(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchInvites(); }, [companyId]);

  return { invites, loading, refetch: fetchInvites };
}

/* ──────────────────────────────────────────────────
   generateInviteLink — create a shareable invite
────────────────────────────────────────────────── */

export async function generateInviteLink(
  companyId: string,
  createdBy: string,
  role: UserRole = 'viewer',
  options?: { email?: string; maxUses?: number; expiresInDays?: number },
): Promise<{ token: string; url: string } | { error: string }> {

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays ?? 7));

  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({
      company_id:  companyId,
      created_by:  createdBy,
      role,
      email:       options?.email ?? null,
      max_uses:    options?.maxUses ?? 1,
      expires_at:  expiresAt.toISOString(),
    })
    .select('token')
    .single();

  if (error || !data) {
    console.error('[team] generateInviteLink', error);
    return { error: error?.message ?? 'Failed to generate link' };
  }

  const url = `${window.location.origin}/join?token=${data.token}`;
  return { token: data.token, url };
}

/* ──────────────────────────────────────────────────
   deactivateInvite — revoke a link
────────────────────────────────────────────────── */

export async function deactivateInvite(inviteId: string): Promise<boolean> {
  const { error } = await supabase
    .from('workspace_invites')
    .update({ is_active: false })
    .eq('id', inviteId);
  return !error;
}

/* ──────────────────────────────────────────────────
   approveJoinRequest — via DB function
────────────────────────────────────────────────── */

export async function approveJoinRequest(
  requestId: string,
  reviewerId: string,
  assignedRole: UserRole = 'viewer',
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('approve_join_request', {
    p_request_id:    requestId,
    p_reviewer_id:   reviewerId,
    p_assigned_role: assignedRole,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

/* ──────────────────────────────────────────────────
   rejectJoinRequest
────────────────────────────────────────────────── */

export async function rejectJoinRequest(
  requestId: string,
  reviewerId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'rejected', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  return !error;
}

/* ──────────────────────────────────────────────────
   changeMemberRole
────────────────────────────────────────────────── */

export async function changeMemberRole(
  memberId: string,
  newRole: UserRole,
): Promise<boolean> {
  const { error } = await supabase
    .from('company_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (!error) {
    // Sync to user_profiles
    const { data: member } = await supabase
      .from('company_members')
      .select('user_id')
      .eq('id', memberId)
      .single();
    if (member) {
      await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', member.user_id);
    }
  }

  return !error;
}

/* ──────────────────────────────────────────────────
   removeMember
────────────────────────────────────────────────── */

export async function removeMember(memberId: string): Promise<boolean> {
  const { error } = await supabase
    .from('company_members')
    .update({ status: 'removed' })
    .eq('id', memberId);
  return !error;
}

/* ──────────────────────────────────────────────────
   lookupInviteToken — fetch invite info without auth
   (shown on /join page before user decides to accept)
────────────────────────────────────────────────── */

export async function lookupInviteToken(token: string): Promise<{
  companyName: string;
  role: UserRole;
  expiresAt: string;
  valid: boolean;
} | null> {
  const { data, error } = await supabase
    .from('workspace_invites')
    .select(`
      role, expires_at, is_active, max_uses, used_count,
      companies (name)
    `)
    .eq('token', token)
    .single();

  if (error || !data) return null;

  const expired = new Date(data.expires_at) < new Date();
  const exhausted = data.max_uses > 0 && data.used_count >= data.max_uses;

  return {
    companyName: (data as any).companies?.name ?? 'Unknown Company',
    role:        data.role,
    expiresAt:   data.expires_at,
    valid:       data.is_active && !expired && !exhausted,
  };
}

/* ──────────────────────────────────────────────────
   acceptInviteToken — call the DB function
────────────────────────────────────────────────── */

export async function acceptInviteToken(
  token: string,
  userId: string,
): Promise<{ success: boolean; companyId?: string; role?: string; error?: string }> {
  const { data, error } = await supabase.rpc('accept_invite', {
    p_token:   token,
    p_user_id: userId,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; companyId?: string; role?: string; error?: string };
}

/* ──────────────────────────────────────────────────
   submitJoinRequest — user requests to join a company by slug
────────────────────────────────────────────────── */

export async function submitJoinRequest(
  companyId: string,
  userId: string,
  requestedRole: UserRole = 'viewer',
  message?: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('join_requests')
    .insert({ company_id: companyId, user_id: userId, requested_role: requestedRole, message });

  if (error) {
    if (error.code === '23505') return { success: false, error: 'You already have a pending request for this workspace' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

/* ──────────────────────────────────────────────────
   searchCompanyBySlug — for join-by-name flow
────────────────────────────────────────────────── */

export async function searchCompanyBySlug(slug: string) {
  const { data } = await supabase
    .from('companies')
    .select('id, name, slug, stage, industry_id, status')
    .ilike('slug', `%${slug}%`)
    .eq('status', 'active')
    .limit(5);
  return data ?? [];
}
