/**
 * Industry OS — user-specific company planet root systems (mock).
 * Galaxy → Star → Planet → Roots → Branches → Action nodes
 */

import type { UDomain, UExternalNode, UInternalNode } from '../lib/universalPolytopeData';
import { resolvePolytopeNodeCount } from '../lib/universalPolytopeData';

export type UserPlanetRole = 'career' | 'founder' | 'investor';

export interface PlanetActionNode {
  id: string;
  label: string;
  hint?: string;
}

export interface PlanetBranchNode {
  id: string;
  label: string;
  actions: PlanetActionNode[];
}

/** Template branch before IDs are assigned */
interface PlanetBranchTemplate {
  label: string;
  actions: Omit<PlanetActionNode, 'id'>[];
}

export interface PlanetRootNode {
  id: string;
  label: string;
  description: string;
  relevance: number;
  color: string;
  branches: PlanetBranchNode[];
}

export interface CompanyPlanetContext {
  companyId: string;
  companyName: string;
  role: UserPlanetRole;
  roleLabel: string;
  roots: PlanetRootNode[];
}

/** Interior tree node (compatible with CompanyPlanetRootView) */
export interface PlanetTreeNode {
  id: string;
  label: string;
  domain?: string;
  relevance?: number;
  children?: PlanetTreeNode[];
}

const ROLE_LABELS: Record<UserPlanetRole, string> = {
  career: 'Career User',
  founder: 'Founder',
  investor: 'Investor',
};

type PlanetRootTemplate = Omit<PlanetRootNode, 'id' | 'branches'> & {
  branches: PlanetBranchTemplate[];
};

const FOUNDER_ROOTS_TEMPLATE: PlanetRootTemplate[] = [
  {
    label: 'Competitors',
    description: 'Direct, indirect, and substitute competition',
    relevance: 92,
    color: '#f97316',
    branches: [
      { label: 'Direct competitors', actions: [{ label: 'Compare pricing', hint: 'Find positioning gap' }, { label: 'Feature matrix', hint: 'Map overlap vs wedge' }] },
      { label: 'Substitutes', actions: [{ label: 'Legacy workarounds', hint: 'Beat current behavior' }, { label: 'Open-source tools', hint: 'Monitor adoption' }] },
    ],
  },
  {
    label: 'Potential Customers',
    description: 'Who buys, why, and how to reach them',
    relevance: 88,
    color: '#38bdf8',
    branches: [
      { label: 'SMB segment', actions: [{ label: 'Interview 10 operators', hint: 'Validate pain' }, { label: 'Pilot proposal', hint: 'Design offer' }] },
      { label: 'Enterprise', actions: [{ label: 'Map buying committee', hint: 'Find economic buyer' }, { label: 'Procurement signals', hint: 'Time outreach' }] },
    ],
  },
  {
    label: 'People to Contact',
    description: 'Decision makers, partners, and operators',
    relevance: 85,
    color: '#a78bfa',
    branches: [
      { label: 'Partnership leads', actions: [{ label: 'Request intro', hint: 'Warm path' }, { label: 'Integration pitch', hint: 'API / co-sell' }] },
      { label: 'Product leaders', actions: [{ label: 'Discovery call', hint: 'Workflow pain' }, { label: 'Feedback loop', hint: 'Gap validation' }] },
    ],
  },
  {
    label: 'Market Gap',
    description: 'Underserved segments and weak incumbent coverage',
    relevance: 78,
    color: '#34d399',
    branches: [
      { label: 'Vertical niches', actions: [{ label: 'Choose wedge', hint: 'Narrow MVP' }, { label: 'Landing test', hint: 'Collect signal' }] },
    ],
  },
  {
    label: 'GTM / Distribution',
    description: 'Channels and motion to reach buyers',
    relevance: 72,
    color: '#fbbf24',
    branches: [
      { label: 'Community routes', actions: [{ label: 'Launch pilot', hint: 'One buyer persona' }, { label: 'Partner marketplace', hint: 'Distribution fit' }] },
    ],
  },
];

const INVESTOR_ROOTS_TEMPLATE: PlanetRootTemplate[] = [
  {
    label: 'Growth',
    description: 'Revenue, adoption, and expansion signals',
    relevance: 90,
    color: '#22d3ee',
    branches: [
      { label: 'Enterprise adoption', actions: [{ label: 'Track quarterly logos', hint: 'Expansion revenue' }, { label: 'Cohort retention', hint: 'Request data' }] },
    ],
  },
  {
    label: 'Moat',
    description: 'Defensibility and switching costs',
    relevance: 86,
    color: '#8b5cf6',
    branches: [
      { label: 'Data advantage', actions: [{ label: 'Compare platform risk', hint: 'Workflow data' }, { label: 'Distribution moat', hint: 'Channel lock-in' }] },
    ],
  },
  {
    label: 'Risk',
    description: 'Regulatory, competitive, and execution risk',
    relevance: 84,
    color: '#f87171',
    branches: [
      { label: 'Platform dependency', actions: [{ label: 'Mitigation plan', hint: 'Fragile deps' }, { label: 'Incumbent response', hint: 'Threat watch' }] },
    ],
  },
  {
    label: 'Financial',
    description: 'Unit economics, burn, and capital intensity',
    relevance: 80,
    color: '#fbbf24',
    branches: [
      { label: 'Revenue model', actions: [{ label: 'Benchmark margins', hint: 'Vs comparables' }, { label: 'Runway stress', hint: 'Burn scenarios' }] },
    ],
  },
  {
    label: 'Deal',
    description: 'Valuation, terms, and round structure',
    relevance: 75,
    color: '#34d399',
    branches: [
      { label: 'Round terms', actions: [{ label: 'Request data room', hint: 'Diligence pack' }, { label: 'Co-investor map', hint: 'Syndicate fit' }] },
    ],
  },
];

const CAREER_ROOTS_TEMPLATE: PlanetRootTemplate[] = [
  {
    label: 'Roles',
    description: 'Open and target role families',
    relevance: 94,
    color: '#60a5fa',
    branches: [
      { label: 'Target roles', actions: [{ label: 'Shortlist 5 roles', hint: 'Seniority fit' }, { label: 'Application plan', hint: 'Timeline' }] },
      { label: 'Role families', actions: [{ label: 'Compare ladders', hint: 'Growth path' }] },
    ],
  },
  {
    label: 'Skill Gap',
    description: 'Required vs current skills and proof',
    relevance: 88,
    color: '#a78bfa',
    branches: [
      { label: 'Missing skills', actions: [{ label: 'Learning plan', hint: '8-week sprint' }, { label: 'Portfolio project', hint: 'Show proof' }] },
    ],
  },
  {
    label: 'People / Network',
    description: 'Recruiters, hiring managers, alumni',
    relevance: 82,
    color: '#34d399',
    branches: [
      { label: 'Warm paths', actions: [{ label: '10 outreach messages', hint: 'Personalized' }, { label: 'Referral ask', hint: 'Mutual contacts' }] },
    ],
  },
  {
    label: 'Hiring Process',
    description: 'Stages, assessments, and timelines',
    relevance: 76,
    color: '#fbbf24',
    branches: [
      { label: 'Interview prep', actions: [{ label: 'Practice case', hint: 'Role-specific' }, { label: 'Culture fit notes', hint: 'Values alignment' }] },
    ],
  },
  {
    label: 'Compensation',
    description: 'Bands, equity, and negotiation range',
    relevance: 70,
    color: '#f472b6',
    branches: [
      { label: 'Salary bands', actions: [{ label: 'Prepare negotiation', hint: 'Market data' }] },
    ],
  },
];

function expandTemplate(
  companyId: string,
  template: PlanetRootTemplate[],
  prefix: string,
): PlanetRootNode[] {
  return template.map((t, ri) => ({
    ...t,
    id: `${companyId}_${prefix}_root_${ri}`,
    branches: t.branches.map((b, bi) => ({
      ...b,
      id: `${companyId}_${prefix}_branch_${ri}_${bi}`,
      actions: b.actions.map((a, ai) => ({
        ...a,
        id: `${companyId}_${prefix}_action_${ri}_${bi}_${ai}`,
      })),
    })),
  }));
}

export function getRoleLabel(role: UserPlanetRole): string {
  return ROLE_LABELS[role];
}

/** Role-specific copy for the center energy orb on the 2D planet map */
export interface PlanetCoreDetails {
  roleTag: string;
  headline: string;
  subline: string;
  metrics: { label: string; value: string }[];
  focusHint: string;
}

export function getPlanetCoreDetails(ctx: CompanyPlanetContext): PlanetCoreDetails {
  const rootCount = ctx.roots.length;
  const sorted = [...ctx.roots].sort((a, b) => b.relevance - a.relevance);
  const topRoot = sorted[0];
  const avgRel =
    rootCount > 0
      ? Math.round(ctx.roots.reduce((s, r) => s + r.relevance, 0) / rootCount)
      : 0;
  const branchTotal = ctx.roots.reduce((s, r) => s + r.branches.length, 0);

  if (ctx.role === 'investor') {
    return {
      roleTag: 'Investor lens',
      headline: ctx.companyName,
      subline: ctx.roleLabel,
      metrics: [
        { label: 'Root systems', value: String(rootCount) },
        { label: 'Top signal', value: topRoot?.label ?? '—' },
        { label: 'Avg relevance', value: `${avgRel}%` },
      ],
      focusHint: 'Growth · Moat · Risk · Financial · Deal',
    };
  }

  if (ctx.role === 'founder') {
    return {
      roleTag: 'Founder lens',
      headline: ctx.companyName,
      subline: ctx.roleLabel,
      metrics: [
        { label: 'Root systems', value: String(rootCount) },
        { label: 'Top priority', value: topRoot?.label ?? '—' },
        { label: 'Branch paths', value: String(branchTotal) },
      ],
      focusHint: 'Competitors · Customers · Contacts · Gaps · GTM',
    };
  }

  return {
    roleTag: 'Career lens',
    headline: ctx.companyName,
    subline: ctx.roleLabel,
    metrics: [
      { label: 'Root systems', value: String(rootCount) },
      { label: 'Best fit', value: topRoot?.label ?? '—' },
      { label: 'Avg relevance', value: `${avgRel}%` },
    ],
    focusHint: 'Roles · Skills · Network · Hiring · Compensation',
  };
}

export function getPlanetRootsForCompany(
  companyId: string,
  companyName: string,
  role: UserPlanetRole,
): CompanyPlanetContext {
  const template =
    role === 'founder' ? FOUNDER_ROOTS_TEMPLATE
    : role === 'investor' ? INVESTOR_ROOTS_TEMPLATE
    : CAREER_ROOTS_TEMPLATE;

  const roots = expandTemplate(companyId, template, role);
  return {
    companyId,
    companyName,
    role,
    roleLabel: ROLE_LABELS[role],
    roots,
  };
}

/** Convert planet hierarchy → tree for 3D interior view */
export function planetRootsToTree(roots: PlanetRootNode[]): PlanetTreeNode[] {
  return roots.map(root => ({
    id: root.id,
    label: root.label,
    domain: root.color,
    relevance: root.relevance,
    children: root.branches.map(branch => ({
      id: branch.id,
      label: branch.label,
      domain: root.color,
      children: branch.actions.map(action => ({
        id: action.id,
        label: action.label,
        domain: root.color,
        children: [],
      })),
    })),
  }));
}

export type PlanetExploreLevel = 'roots' | 'branches' | 'actions';

export function getExploreLevel(depth: number): PlanetExploreLevel {
  if (depth <= 0) return 'roots';
  if (depth === 1) return 'branches';
  return 'actions';
}

export interface Planet2DNode {
  id: string;
  label: string;
  color: string;
  relevance?: number;
  hint?: string;
  hasChildren: boolean;
}

export function getPlanetNodesAtPath(
  ctx: CompanyPlanetContext,
  path: string[],
): Planet2DNode[] {
  if (path.length === 0) {
    return [...ctx.roots]
      .sort((a, b) => b.relevance - a.relevance)
      .map(root => ({
        id: root.id,
        label: root.label,
        color: root.color,
        relevance: root.relevance,
        hint: root.description,
        hasChildren: root.branches.length > 0,
      }));
  }

  const root = ctx.roots.find(r => r.id === path[0]);
  if (!root) return [];

  if (path.length === 1) {
    return root.branches.map(branch => ({
      id: branch.id,
      label: branch.label,
      color: root.color,
      hasChildren: branch.actions.length > 0,
    }));
  }

  const branch = root.branches.find(b => b.id === path[1]);
  if (!branch) return [];

  return branch.actions.map(action => ({
    id: action.id,
    label: action.label,
    color: root.color,
    hint: action.hint,
    hasChildren: false,
  }));
}

export function canDrillInto(ctx: CompanyPlanetContext, path: string[], nodeId: string): boolean {
  const nodes = getPlanetNodesAtPath(ctx, path);
  const node = nodes.find(n => n.id === nodeId);
  return !!node?.hasChildren;
}

const ROOT_DOMAINS: UDomain[] = ['build', 'market', 'delivery', 'direction', 'people', 'control'];

function branchToInternalNode(branch: PlanetBranchNode, root: PlanetRootNode): UInternalNode {
  return {
    id: branch.id,
    label: branch.label,
    type: 'team',
    score: Math.min(98, root.relevance - 4),
    children: branch.actions.map(action => ({
      id: action.id,
      label: action.label,
      type: 'process' as const,
      score: Math.min(95, root.relevance - 8),
      children: [],
    })),
  };
}

/** Map planet roots → UniversalPolytope external nodes (same shape as BDT departments). */
export function rootsToPolytopeDepartments(roots: PlanetRootNode[]): UExternalNode[] {
  const active: UExternalNode[] = roots.map((root, i) => {
    const score = root.relevance;
    return {
      id: root.id,
      label: root.label,
      domain: ROOT_DOMAINS[i % ROOT_DOMAINS.length],
      cluster: 'Root',
      score,
      metrics: {
        performance: score,
        efficiency: Math.max(50, score - 6),
        capacity: Math.max(45, score - 10),
        alignment: Math.max(40, score - 12),
        risk: Math.max(8, 100 - score),
      },
      internalNodes: root.branches.map(b => branchToInternalNode(b, root)),
    };
  });

  const { inactiveCount } = resolvePolytopeNodeCount(active.length);
  const inactive: UExternalNode[] = Array.from({ length: inactiveCount }, (_, i) => ({
    id: `planet_inactive_${i}`,
    label: '',
    domain: 'inactive',
    cluster: '',
    score: 0,
    metrics: { performance: 0, efficiency: 0, capacity: 0, alignment: 0, risk: 0 },
    internalNodes: [],
  }));

  return [...active, ...inactive];
}
