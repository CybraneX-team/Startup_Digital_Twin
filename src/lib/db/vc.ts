import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

/* ──────────────────────────────────────────────────
   Types
────────────────────────────────────────────────── */

export type InvestorStatus =
  | 'prospect' | 'contacted' | 'in-discussion' | 'term-sheet' | 'committed' | 'passed';

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type UpdateStatus = 'draft' | 'sent';

export interface VcFirm {
  id: string;
  name: string;
  short_name: string | null;
  region: string;
  hq_city: string | null;
  website: string | null;
  focus_stage: string[];
  sectors: string[];
  avg_ticket: string | null;
  total_fund: string | null;
  notable_investments: string[];
}

export interface InvestorPipeline {
  id: string;
  company_id: string;
  vc_firm_id: string | null;
  custom_name: string | null;
  custom_firm: string | null;
  partner_name: string | null;
  status: InvestorStatus;
  last_contact: string | null;
  next_followup: string | null;
  ask_amount: string | null;
  notes: string | null;
  warm_intro: boolean;
  intro_by: string | null;
  shared_metrics: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  // joined
  vc_firm?: VcFirm | null;
}

export interface InvestorUpdate {
  id: string;
  company_id: string;
  title: string;
  period: string;
  status: UpdateStatus;
  highlights: string[];
  asks: string[];
  metrics: { mrr?: number; arr?: number; customers?: number; burn?: number; runway?: number };
  sent_to: string[];
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VcMentor {
  id: string;
  company_id: string;
  name: string;
  role: string | null;
  company: string | null;
  linkedin: string | null;
  expertise: string[];
  availability: string;
  notes: string | null;
  created_at: string;
}

export interface MentorSession {
  id: string;
  mentor_id: string;
  company_id: string;
  session_date: string;
  status: SessionStatus;
  agenda: string[];
  actions: string[];
  follow_ups: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ──────────────────────────────────────────────────
   VC Firms — reference data (public)
────────────────────────────────────────────────── */

export async function getVcFirms(region?: string): Promise<VcFirm[]> {
  let q = supabase.from('vc_firms').select('*').order('name');
  if (region && region !== 'All') q = q.eq('region', region);
  const { data, error } = await q;
  if (error) { console.error('[vc] getVcFirms', error); return []; }
  return (data ?? []).map(r => ({
    ...r,
    focus_stage: r.focus_stage ?? [],
    sectors: r.sectors ?? [],
    notable_investments: r.notable_investments ?? [],
  }));
}

/* ──────────────────────────────────────────────────
   Investor Pipeline — CRUD
────────────────────────────────────────────────── */

export function useInvestorPipeline(companyId: string | null | undefined) {
  const [pipeline, setPipeline] = useState<InvestorPipeline[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPipeline() {
    if (!companyId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('investor_pipeline')
      .select('*, vc_firms(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) { console.error('[vc] fetchPipeline', error); setLoading(false); return; }

    const shaped: InvestorPipeline[] = (data ?? []).map((r: any) => ({
      ...r,
      shared_metrics: r.shared_metrics ?? [],
      tags: r.tags ?? [],
      vc_firm: r.vc_firms ?? null,
    }));
    setPipeline(shaped);
    setLoading(false);
  }

  useEffect(() => {
    fetchPipeline();

    const channel = supabase
      .channel(`pipeline-${companyId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'investor_pipeline',
        filter: `company_id=eq.${companyId}`,
      }, fetchPipeline)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  return { pipeline, loading, refetch: fetchPipeline };
}

export interface AddInvestorInput {
  company_id: string;
  created_by: string;
  vc_firm_id?: string;
  custom_name?: string;
  custom_firm?: string;
  partner_name?: string;
  status?: InvestorStatus;
  ask_amount?: string;
  warm_intro?: boolean;
  intro_by?: string;
  notes?: string;
}

export async function addInvestorToPipeline(input: AddInvestorInput): Promise<InvestorPipeline | null> {
  const { data, error } = await supabase
    .from('investor_pipeline')
    .insert({
      company_id: input.company_id,
      created_by: input.created_by,
      vc_firm_id: input.vc_firm_id ?? null,
      custom_name: input.custom_name ?? null,
      custom_firm: input.custom_firm ?? null,
      partner_name: input.partner_name ?? null,
      status: input.status ?? 'prospect',
      ask_amount: input.ask_amount ?? null,
      warm_intro: input.warm_intro ?? false,
      intro_by: input.intro_by ?? null,
      notes: input.notes ?? null,
    })
    .select('*, vc_firms(*)')
    .single();

  if (error) { console.error('[vc] addInvestor', error); return null; }
  return { ...data, shared_metrics: data.shared_metrics ?? [], tags: data.tags ?? [], vc_firm: (data as any).vc_firms ?? null };
}

export async function updateInvestorStatus(
  id: string,
  status: InvestorStatus,
  extra?: { notes?: string; last_contact?: string; next_followup?: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('investor_pipeline')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id);
  return !error;
}

export async function updateInvestorNotes(id: string, notes: string): Promise<boolean> {
  const { error } = await supabase
    .from('investor_pipeline')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function removeInvestorFromPipeline(id: string): Promise<boolean> {
  const { error } = await supabase.from('investor_pipeline').delete().eq('id', id);
  return !error;
}

/* ──────────────────────────────────────────────────
   Investor Updates — CRUD
────────────────────────────────────────────────── */

export function useInvestorUpdates(companyId: string | null | undefined) {
  const [updates, setUpdates] = useState<InvestorUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchUpdates() {
    if (!companyId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('investor_updates')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) { console.error('[vc] fetchUpdates', error); setLoading(false); return; }
    const shaped: InvestorUpdate[] = (data ?? []).map((r: any) => ({
      ...r,
      highlights: r.highlights ?? [],
      asks: r.asks ?? [],
      sent_to: r.sent_to ?? [],
      metrics: r.metrics ?? {},
    }));
    setUpdates(shaped);
    setLoading(false);
  }

  useEffect(() => { fetchUpdates(); }, [companyId]);
  return { updates, loading, refetch: fetchUpdates };
}

export async function createInvestorUpdate(
  companyId: string,
  createdBy: string,
  input: Partial<Pick<InvestorUpdate, 'title' | 'period' | 'highlights' | 'asks' | 'metrics'>>,
): Promise<InvestorUpdate | null> {
  const { data, error } = await supabase
    .from('investor_updates')
    .insert({
      company_id: companyId,
      created_by: createdBy,
      title: input.title ?? 'Investor Update',
      period: input.period ?? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      highlights: input.highlights ?? [],
      asks: input.asks ?? [],
      metrics: input.metrics ?? {},
    })
    .select()
    .single();

  if (error) { console.error('[vc] createUpdate', error); return null; }
  return { ...data, highlights: data.highlights ?? [], asks: data.asks ?? [], sent_to: data.sent_to ?? [], metrics: data.metrics ?? {} };
}

export async function saveInvestorUpdate(
  id: string,
  patch: Partial<Pick<InvestorUpdate, 'title' | 'period' | 'highlights' | 'asks' | 'metrics' | 'status'>>,
): Promise<boolean> {
  const { error } = await supabase
    .from('investor_updates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function markUpdateSent(id: string, recipientIds: string[]): Promise<boolean> {
  const { error } = await supabase
    .from('investor_updates')
    .update({ status: 'sent', sent_to: recipientIds, sent_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

/* ──────────────────────────────────────────────────
   Mentors — CRUD
────────────────────────────────────────────────── */

export function useMentors(companyId: string | null | undefined) {
  const [mentors, setMentors] = useState<VcMentor[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchMentors() {
    if (!companyId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('vc_mentors')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[vc] fetchMentors', error); setLoading(false); return; }
    setMentors((data ?? []).map(r => ({ ...r, expertise: r.expertise ?? [] })));
    setLoading(false);
  }

  useEffect(() => { fetchMentors(); }, [companyId]);
  return { mentors, loading, refetch: fetchMentors };
}

export async function addMentor(
  companyId: string,
  addedBy: string,
  input: Pick<VcMentor, 'name' | 'role' | 'company' | 'linkedin' | 'expertise' | 'availability' | 'notes'>,
): Promise<VcMentor | null> {
  const { data, error } = await supabase
    .from('vc_mentors')
    .insert({ company_id: companyId, added_by: addedBy, ...input })
    .select()
    .single();
  if (error) { console.error('[vc] addMentor', error); return null; }
  return { ...data, expertise: data.expertise ?? [] };
}

export async function removeMentorById(id: string): Promise<boolean> {
  const { error } = await supabase.from('vc_mentors').delete().eq('id', id);
  return !error;
}

/* ──────────────────────────────────────────────────
   Mentor Sessions — CRUD
────────────────────────────────────────────────── */

export function useMentorSessions(companyId: string | null | undefined) {
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchSessions() {
    if (!companyId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('mentor_sessions')
      .select('*')
      .eq('company_id', companyId)
      .order('session_date', { ascending: false });
    if (error) { console.error('[vc] fetchSessions', error); setLoading(false); return; }
    setSessions((data ?? []).map(r => ({
      ...r,
      agenda: r.agenda ?? [],
      actions: r.actions ?? [],
      follow_ups: r.follow_ups ?? [],
    })));
    setLoading(false);
  }

  useEffect(() => { fetchSessions(); }, [companyId]);
  return { sessions, loading, refetch: fetchSessions };
}

export async function addMentorSession(
  companyId: string,
  createdBy: string,
  input: Pick<MentorSession, 'mentor_id' | 'session_date' | 'status' | 'agenda'>,
): Promise<MentorSession | null> {
  const { data, error } = await supabase
    .from('mentor_sessions')
    .insert({ company_id: companyId, created_by: createdBy, ...input, actions: [], follow_ups: [] })
    .select()
    .single();
  if (error) { console.error('[vc] addSession', error); return null; }
  return { ...data, agenda: data.agenda ?? [], actions: data.actions ?? [], follow_ups: data.follow_ups ?? [] };
}

export async function updateMentorSession(
  id: string,
  patch: Partial<Pick<MentorSession, 'status' | 'agenda' | 'actions' | 'follow_ups' | 'notes'>>,
): Promise<boolean> {
  const { error } = await supabase
    .from('mentor_sessions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}
