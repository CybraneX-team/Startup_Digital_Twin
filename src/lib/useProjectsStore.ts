/**
 * Project Management store (localStorage).
 *
 * Models the BDT "Project Management Spaces": projects/products, their tasks,
 * and the team members they're assigned to. Backed by localStorage for now
 * (cross-device sync arrives with the Supabase phase).
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'bdt_projects_v1';

export type ProjectType = 'project' | 'product' | 'initiative' | 'experiment';
export type ProjectStatus = 'on_track' | 'at_risk' | 'delayed' | 'done';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type MemberRole = 'founder' | 'manager' | 'contributor' | 'viewer';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  assigneeId: string | null;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  sourceCardId?: string;     // linked SavedWorkflowItem id
  blockedByTaskId?: string;  // task id that blocks this task
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  ownerId: string;
  memberIds: string[];
  status: ProjectStatus;
  health: number;        // 0–100
  goalId?: string;       // explicit link to a Goal (see useGoalsStore)
  goalLink?: string;     // cached goal title for display
  sourceCardIds?: string[];  // multiple linked SavedWorkflowItem ids
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate?: string;
  done: boolean;
  dependsOnMilestoneId?: string; // parent milestone dependency
}

export type DecisionStatus = 'open' | 'approved' | 'rejected';
export interface Decision {
  id: string;
  projectId: string;
  title: string;
  rationale?: string;
  status: DecisionStatus;
  createdAt: string;
}

export type RiskSeverity = 'low' | 'medium' | 'high';
export interface Risk {
  id: string;
  projectId: string;
  title: string;
  severity: RiskSeverity;
  mitigated: boolean;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  kind: 'link' | 'doc' | 'note';
  ref?: string;
}

export interface ProjectChatMsg {
  id: string;
  projectId: string;
  authorId: string;       // member id, or 'ai'
  role: 'member' | 'ai';
  text: string;
  at: string;
}

interface ProjectsState {
  members: Member[];
  projects: Project[];
  tasks: ProjectTask[];
  milestones: Milestone[];
  decisions: Decision[];
  risks: Risk[];
  files: ProjectFile[];
  chat: ProjectChatMsg[];
  currentMemberId: string;
}

/* ── labels ──────────────────────────────────────────────────────────────── */

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  on_track: { label: 'On track', color: '#34d399' },
  at_risk:  { label: 'At risk',  color: '#fbbf24' },
  delayed:  { label: 'Delayed',  color: '#fb7185' },
  done:     { label: 'Done',     color: '#60a5fa' },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: 'To do',       color: '#94a3b8' },
  in_progress: { label: 'In progress', color: '#fbbf24' },
  review:      { label: 'Review',      color: '#a78bfa' },
  done:        { label: 'Done',        color: '#34d399' },
};

export const MEMBER_ROLE_META: Record<MemberRole, { label: string; color: string }> = {
  founder:     { label: 'Founder',     color: '#f59e0b' },
  manager:     { label: 'Manager',     color: '#60a5fa' },
  contributor: { label: 'Contributor', color: '#a78bfa' },
  viewer:      { label: 'Viewer',      color: '#94a3b8' },
};

export const DECISION_META: Record<DecisionStatus, { label: string; color: string }> = {
  open:     { label: 'Open',     color: '#fbbf24' },
  approved: { label: 'Approved', color: '#34d399' },
  rejected: { label: 'Rejected', color: '#fb7185' },
};

export const RISK_META: Record<RiskSeverity, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#34d399' },
  medium: { label: 'Medium', color: '#fbbf24' },
  high:   { label: 'High',   color: '#fb7185' },
};

/* ── seed (first run only) ───────────────────────────────────────────────── */

function seed(): ProjectsState {
  const now = Date.now();
  const iso = (offsetDays = 0) => new Date(now + offsetDays * 86400000).toISOString();

  const members: Member[] = [
    { id: 'm_you', name: 'You', role: 'founder' },
    { id: 'm_alex', name: 'Alex Rivera', role: 'manager' },
    { id: 'm_sam', name: 'Sam Cole', role: 'contributor' },
    { id: 'm_mia', name: 'Mia Chen', role: 'contributor' },
  ];

  const projects: Project[] = [
    { id: 'p_canvas', name: 'Canvas v2 Launch', description: 'Ship the new active-canvas experience to GA.', type: 'product', ownerId: 'm_you', memberIds: ['m_you', 'm_alex', 'm_sam'], status: 'on_track', health: 72, goalId: 'g_canvas', goalLink: 'Launch Canvas v2', createdAt: iso(-8) },
    { id: 'p_seed', name: 'Seed Round Prep', description: 'Close the seed round with a strong metric pack.', type: 'initiative', ownerId: 'm_you', memberIds: ['m_you', 'm_alex'], status: 'at_risk', health: 48, goalId: 'g_seed', goalLink: 'Close Seed Round', createdAt: iso(-5) },
  ];

  const tasks: ProjectTask[] = [
    { id: 't1', projectId: 'p_canvas', title: 'Stabilize drag-and-drop animations', assigneeId: 'm_sam', status: 'in_progress', dueDate: iso(2), createdAt: iso(-7) },
    { id: 't2', projectId: 'p_canvas', title: 'Polish side panels on expand', assigneeId: 'm_alex', status: 'todo', dueDate: iso(4), createdAt: iso(-6) },
    { id: 't3', projectId: 'p_canvas', title: 'Wire AI copilot save-to-notes', assigneeId: 'm_sam', status: 'todo', createdAt: iso(-5) },
    { id: 't4', projectId: 'p_canvas', title: 'Full QA pass', assigneeId: 'm_you', status: 'todo', createdAt: iso(-4) },
    { id: 't5', projectId: 'p_seed', title: 'Finalize investor deck', assigneeId: 'm_alex', status: 'in_progress', dueDate: iso(1), createdAt: iso(-5) },
    { id: 't6', projectId: 'p_seed', title: 'Build the metric pack', assigneeId: 'm_you', status: 'todo', dueDate: iso(3), createdAt: iso(-4) },
    { id: 't7', projectId: 'p_seed', title: 'Compile target investor list', assigneeId: 'm_alex', status: 'done', createdAt: iso(-3) },
  ];

  const milestones: Milestone[] = [
    { id: 'ms1', projectId: 'p_canvas', title: 'Beta freeze', dueDate: iso(2), done: false },
    { id: 'ms2', projectId: 'p_canvas', title: 'GA release', dueDate: iso(9), done: false },
    { id: 'ms3', projectId: 'p_seed', title: 'Investor deck ready', dueDate: iso(1), done: false },
  ];
  const decisions: Decision[] = [
    { id: 'd1', projectId: 'p_canvas', title: 'Cut mobile redesign from v2 scope', rationale: 'Focus engineering on activation.', status: 'approved', createdAt: iso(-3) },
    { id: 'd2', projectId: 'p_seed', title: 'Raise on a SAFE vs a priced round', rationale: 'Faster close; defer valuation.', status: 'open', createdAt: iso(-1) },
  ];
  const risks: Risk[] = [
    { id: 'rk1', projectId: 'p_canvas', title: 'Drag-drop performance on large boards', severity: 'medium', mitigated: false },
    { id: 'rk2', projectId: 'p_seed', title: 'Runway tight before close', severity: 'high', mitigated: false },
  ];
  const files: ProjectFile[] = [
    { id: 'f1', projectId: 'p_canvas', name: 'Canvas v2 spec', kind: 'doc', ref: '#' },
    { id: 'f2', projectId: 'p_seed', name: 'Metric pack (WIP)', kind: 'link', ref: '#' },
  ];
  const chat: ProjectChatMsg[] = [
    { id: 'c1', projectId: 'p_canvas', authorId: 'm_alex', role: 'member', text: 'Side panels look great now — QA is next.', at: iso(0) },
    { id: 'c2', projectId: 'p_canvas', authorId: 'm_you', role: 'member', text: 'Agreed. Sam, can you take the QA pass?', at: iso(0) },
  ];

  return { members, projects, tasks, milestones, decisions, risks, files, chat, currentMemberId: 'm_you' };
}

/* ── persistence ─────────────────────────────────────────────────────────── */

function load(): ProjectsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<ProjectsState>;
    return {
      members: parsed.members || [],
      projects: (parsed.projects || []).map(p => ({
        ...p,
        sourceCardIds: p.sourceCardIds || [],
      })),
      tasks: parsed.tasks || [],
      milestones: parsed.milestones || [],
      decisions: parsed.decisions || [],
      risks: parsed.risks || [],
      files: parsed.files || [],
      chat: parsed.chat || [],
      currentMemberId: parsed.currentMemberId || 'm1',
    };
  } catch {
    return seed();
  }
}

function persist(state: ProjectsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('projects_updated'));
  } catch { /* quota */ }
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ── hook ────────────────────────────────────────────────────────────────── */

export function useProjectsStore() {
  const [state, setState] = useState<ProjectsState>(() => load());

  useEffect(() => {
    const handler = () => setState(load());
    window.addEventListener('projects_updated', handler);
    return () => window.removeEventListener('projects_updated', handler);
  }, []);

  const update = useCallback((mutate: (s: ProjectsState) => ProjectsState) => {
    setState(prev => {
      const next = mutate(prev);
      persist(next);
      return next;
    });
  }, []);

  const createProject = useCallback((input: {
    name: string;
    type: ProjectType;
    memberIds: string[];
    goalId?: string;
    goalLink?: string;
    description?: string;
    sourceCardId?: string;
  }) => {
    update(s => {
      const ownerId = s.currentMemberId;
      const project: Project = {
        id: uid('p'),
        name: input.name,
        description: input.description,
        type: input.type,
        ownerId,
        memberIds: Array.from(new Set([ownerId, ...input.memberIds])),
        status: 'on_track',
        health: 60,
        goalId: input.goalId,
        goalLink: input.goalLink,
        sourceCardIds: input.sourceCardId ? [input.sourceCardId] : [],
        createdAt: new Date().toISOString(),
      };
      return { ...s, projects: [project, ...s.projects] };
    });
  }, [update]);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) }));
  }, [update]);

  const deleteProject = useCallback((id: string) => {
    update(s => ({
      ...s,
      projects: s.projects.filter(p => p.id !== id),
      tasks: s.tasks.filter(t => t.projectId !== id),
      milestones: s.milestones.filter(x => x.projectId !== id),
      decisions: s.decisions.filter(x => x.projectId !== id),
      risks: s.risks.filter(x => x.projectId !== id),
      files: s.files.filter(x => x.projectId !== id),
      chat: s.chat.filter(x => x.projectId !== id),
    }));
  }, [update]);

  const addTask = useCallback((
    projectId: string,
    title: string,
    assigneeId: string | null,
    status: TaskStatus = 'todo',
    sourceCardId?: string,
    blockedByTaskId?: string
  ) => {
    update(s => ({
      ...s,
      tasks: [
        {
          id: uid('t'),
          projectId,
          title,
          assigneeId,
          status,
          sourceCardId,
          blockedByTaskId,
          createdAt: new Date().toISOString()
        },
        ...s.tasks
      ],
    }));
  }, [update]);

  const updateTask = useCallback((id: string, patch: Partial<ProjectTask>) => {
    update(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }));
  }, [update]);

  const deleteTask = useCallback((id: string) => {
    update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));
  }, [update]);

  const setProjectMembers = useCallback((projectId: string, memberIds: string[]) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === projectId ? { ...p, memberIds } : p) }));
  }, [update]);

  // ── milestones ──
  const addMilestone = useCallback((projectId: string, title: string, dueDate?: string) => {
    update(s => ({ ...s, milestones: [...s.milestones, { id: uid('ms'), projectId, title, dueDate, done: false }] }));
  }, [update]);
  const toggleMilestone = useCallback((id: string) => {
    update(s => ({ ...s, milestones: s.milestones.map(x => x.id === id ? { ...x, done: !x.done } : x) }));
  }, [update]);
  const deleteMilestone = useCallback((id: string) => {
    update(s => ({ ...s, milestones: s.milestones.filter(x => x.id !== id) }));
  }, [update]);

  const updateMilestone = useCallback((id: string, patch: Partial<Milestone>) => {
    update(s => ({ ...s, milestones: s.milestones.map(x => x.id === id ? { ...x, ...patch } : x) }));
  }, [update]);

  const linkCardToProject = useCallback((projectId: string, cardId: string) => {
    update(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id === projectId
          ? { ...p, sourceCardIds: Array.from(new Set([...(p.sourceCardIds || []), cardId])) }
          : p
      )
    }));
  }, [update]);

  const unlinkCardFromProject = useCallback((projectId: string, cardId: string) => {
    update(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id === projectId
          ? { ...p, sourceCardIds: (p.sourceCardIds || []).filter(cid => cid !== cardId) }
          : p
      )
    }));
  }, [update]);

  // ── decisions ──
  const addDecision = useCallback((projectId: string, title: string, rationale?: string) => {
    update(s => ({ ...s, decisions: [{ id: uid('d'), projectId, title, rationale, status: 'open', createdAt: new Date().toISOString() }, ...s.decisions] }));
  }, [update]);
  const setDecisionStatus = useCallback((id: string, status: DecisionStatus) => {
    update(s => ({ ...s, decisions: s.decisions.map(x => x.id === id ? { ...x, status } : x) }));
  }, [update]);
  const deleteDecision = useCallback((id: string) => {
    update(s => ({ ...s, decisions: s.decisions.filter(x => x.id !== id) }));
  }, [update]);

  // ── risks ──
  const addRisk = useCallback((projectId: string, title: string, severity: RiskSeverity) => {
    update(s => ({ ...s, risks: [{ id: uid('rk'), projectId, title, severity, mitigated: false }, ...s.risks] }));
  }, [update]);
  const toggleRisk = useCallback((id: string) => {
    update(s => ({ ...s, risks: s.risks.map(x => x.id === id ? { ...x, mitigated: !x.mitigated } : x) }));
  }, [update]);
  const deleteRisk = useCallback((id: string) => {
    update(s => ({ ...s, risks: s.risks.filter(x => x.id !== id) }));
  }, [update]);

  // ── files ──
  const addFile = useCallback((projectId: string, name: string, kind: ProjectFile['kind'], ref?: string) => {
    update(s => ({ ...s, files: [{ id: uid('f'), projectId, name, kind, ref }, ...s.files] }));
  }, [update]);
  const deleteFile = useCallback((id: string) => {
    update(s => ({ ...s, files: s.files.filter(x => x.id !== id) }));
  }, [update]);

  // ── chat ──
  const addChat = useCallback((projectId: string, authorId: string, role: 'member' | 'ai', text: string) => {
    update(s => ({ ...s, chat: [...s.chat, { id: uid('c'), projectId, authorId, role, text, at: new Date().toISOString() }] }));
  }, [update]);

  /**
   * Recomputes health + status for every project from live task/risk data.
   * Call after any task or risk mutation if you want the card to reflect reality.
   */
  const syncAllHealths = useCallback(() => {
    update(s => ({
      ...s,
      projects: s.projects.map(p => {
        const pt = s.tasks.filter(t => t.projectId === p.id);
        const pr = s.risks.filter(r => r.projectId === p.id);
        const h = computeHealth(pt, pr, p.health);
        return { ...p, health: h, status: p.status === 'done' ? 'done' : healthToStatus(h) };
      }),
    }));
  }, [update]);

  return {
    members: state.members,
    projects: state.projects,
    tasks: state.tasks,
    milestones: state.milestones,
    decisions: state.decisions,
    risks: state.risks,
    files: state.files,
    chat: state.chat,
    currentMemberId: state.currentMemberId,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    setProjectMembers,
    syncAllHealths,
    updateMilestone,
    linkCardToProject,
    unlinkCardFromProject,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    addDecision,
    setDecisionStatus,
    deleteDecision,
    addRisk,
    toggleRisk,
    deleteRisk,
    addFile,
    deleteFile,
    addChat,
  };
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

export function memberInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function taskProgress(tasks: ProjectTask[]): { done: number; total: number; pct: number } {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * Compute a live health score (0–100) for a project from its tasks and risks.
 * Formula: start from task-completion %, then penalise for overdue tasks and
 * open high-severity risks.  Returns the previous health if no tasks exist.
 */
export function computeHealth(
  tasks: ProjectTask[],
  risks: Risk[],
  prevHealth = 60,
): number {
  const total = tasks.length;
  if (total === 0) return prevHealth;
  const done = tasks.filter(t => t.status === 'done').length;
  let h = Math.round((done / total) * 100);
  // overdue penalty: –5 per overdue task (capped at –30)
  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
  h = Math.max(0, h - Math.min(overdue * 5, 30));
  // open high-risk penalty: –10 per high risk (capped at –20)
  const highRisks = risks.filter(r => r.severity === 'high' && !r.mitigated).length;
  h = Math.max(0, h - Math.min(highRisks * 10, 20));
  return h;
}

/**
 * Returns the computed ProjectStatus based on live health.
 */
export function healthToStatus(health: number): ProjectStatus {
  if (health >= 70) return 'on_track';
  if (health >= 40) return 'at_risk';
  return 'delayed';
}

/**
 * Compute task load per member across all projects.
 * Returns { memberId -> { total, overdue, projects } }
 */
export function memberLoad(
  tasks: ProjectTask[],
  projects: Project[],
): Record<string, { total: number; overdue: number; projectNames: string[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const projName = (id: string) => projects.find(p => p.id === id)?.name ?? 'Unknown';
  const result: Record<string, { total: number; overdue: number; projectNames: string[] }> = {};
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    if (!result[t.assigneeId]) result[t.assigneeId] = { total: 0, overdue: 0, projectNames: [] };
    const entry = result[t.assigneeId];
    entry.total++;
    if (t.dueDate && t.dueDate < today && t.status !== 'done') entry.overdue++;
    const pn = projName(t.projectId);
    if (!entry.projectNames.includes(pn)) entry.projectNames.push(pn);
  }
  return result;
}

export type SuggestiveAlert = {
  type: 'overdue' | 'at_risk_project' | 'open_decision' | 'overallocated' | 'goal_gap';
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  projectId?: string;
  memberId?: string;
};

/**
 * Rule-based suggestive alerts. Pure function — no side effects.
 */
export function generateAlerts(
  projects: Project[],
  tasks: ProjectTask[],
  decisions: Decision[],
  risks: Risk[],
  members: Member[],
): SuggestiveAlert[] {
  const alerts: SuggestiveAlert[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Rule 1: overdue tasks per project
  for (const p of projects) {
    const overdue = tasks.filter(t => t.projectId === p.id && t.dueDate && t.dueDate < today && t.status !== 'done');
    if (overdue.length > 0) {
      alerts.push({
        type: 'overdue',
        title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} in "${p.name}"`,
        detail: overdue.map(t => t.title).slice(0, 3).join(', ') + (overdue.length > 3 ? '…' : ''),
        severity: overdue.length >= 3 ? 'high' : 'medium',
        projectId: p.id,
      });
    }
  }

  // Rule 2: at-risk or delayed projects
  for (const p of projects) {
    const h = computeHealth(tasks.filter(t => t.projectId === p.id), risks.filter(r => r.projectId === p.id), p.health);
    if (h < 40 && p.status !== 'done') {
      alerts.push({
        type: 'at_risk_project',
        title: `"${p.name}" is in trouble (health ${h}%)`,
        detail: 'Review blockers, reassign tasks, or adjust scope.',
        severity: 'high',
        projectId: p.id,
      });
    }
  }

  // Rule 3: open decisions needing approval
  const openDecisions = decisions.filter(d => d.status === 'open');
  if (openDecisions.length > 0) {
    alerts.push({
      type: 'open_decision',
      title: `${openDecisions.length} decision${openDecisions.length > 1 ? 's' : ''} awaiting approval`,
      detail: openDecisions.map(d => d.title).slice(0, 2).join('; ') + (openDecisions.length > 2 ? '…' : ''),
      severity: 'medium',
    });
  }

  // Rule 4: over-allocated members (>3 open tasks)
  const load = memberLoad(tasks.filter(t => t.status !== 'done'), projects);
  for (const [mid, l] of Object.entries(load)) {
    if (l.total > 3) {
      const member = members.find(m => m.id === mid);
      alerts.push({
        type: 'overallocated',
        title: `${member?.name ?? mid} has ${l.total} open tasks`,
        detail: `Across: ${l.projectNames.join(', ')}. Consider redistributing.`,
        severity: l.total > 5 ? 'high' : 'medium',
        memberId: mid,
      });
    }
  }

  // Sort: high first
  return alerts.sort((a, b) => (a.severity === 'high' ? -1 : b.severity === 'high' ? 1 : 0));
}
