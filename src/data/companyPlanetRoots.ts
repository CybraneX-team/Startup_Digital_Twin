/**
 * Industry OS — user-specific company planet root systems.
 * Galaxy → Star → Planet → Roots → Branches → Action nodes
 */

import type { UDomain, UExternalNode, UInternalNode } from '../lib/universalPolytopeData';
import { resolvePolytopeNodeCount } from '../lib/universalPolytopeData';
import type { CompanyTag } from '../lib/useSavedWorkflows';

export type UserPlanetRole = 'career' | 'founder' | 'vc' | 'investor';

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
  vc: 'VC Partner',
  investor: 'Investor',
};

type PlanetRootTemplate = Omit<PlanetRootNode, 'id' | 'branches'> & {
  branches: PlanetBranchTemplate[];
};

const FIXED_ROOTS_TEMPLATE: PlanetRootTemplate[] = [
  {
    label: 'Identity',
    description: 'Name, stage, size, HQ, founding year, website',
    relevance: 100,
    color: '#60a5fa',
    branches: [{ label: 'Overview', actions: [{ label: 'View Profile', hint: 'Basic details' }] }]
  },
  {
    label: 'Product & Tech',
    description: 'Core offering, differentiators, tech stack, APIs',
    relevance: 95,
    color: '#a78bfa',
    branches: [{ label: 'Core Offering', actions: [{ label: 'View Product', hint: 'Main features' }] }]
  },
  {
    label: 'Market Position',
    description: 'ICP, GTM motion, pricing model, geography',
    relevance: 90,
    color: '#34d399',
    branches: [{ label: 'GTM Motion', actions: [{ label: 'View GTM', hint: 'Market approach' }] }]
  },
  {
    label: 'Commercial Signals',
    description: 'Funding, revenue range, hiring velocity',
    relevance: 85,
    color: '#fbbf24',
    branches: [{ label: 'Funding', actions: [{ label: 'View Funding', hint: 'Capital raised' }] }]
  },
  {
    label: 'People & Access',
    description: 'Founders, key contacts, warm intro paths',
    relevance: 80,
    color: '#f472b6',
    branches: [{ label: 'Key Contacts', actions: [{ label: 'View People', hint: 'Decision makers' }] }]
  },
  {
    label: 'Engagement History',
    description: 'Past interactions, deal stage, notes, next action',
    relevance: 75,
    color: '#22d3ee',
    branches: [{ label: 'History', actions: [{ label: 'View History', hint: 'Past events' }] }]
  }
];

const DYNAMIC_NODES: Record<string, PlanetRootTemplate> = {
  'ICP Overlap': { label: 'ICP Overlap', description: 'How much of their ICP maps to yours / fit', relevance: 92, color: '#f97316', branches: [{ label: 'Analysis', actions: [{ label: 'View Overlap', hint: 'ICP match' }] }] },
  'Product Delta': { label: 'Product Delta', description: 'Feature gaps between you and them', relevance: 88, color: '#38bdf8', branches: [{ label: 'Analysis', actions: [{ label: 'View Delta', hint: 'Gap analysis' }] }] },
  'GTM & Win/Loss': { label: 'GTM & Win/Loss', description: 'Where you\'ve met in deals, who won, why', relevance: 85, color: '#a78bfa', branches: [{ label: 'Analysis', actions: [{ label: 'View GTM', hint: 'Win/Loss reasons' }] }] },
  'Velocity & Threat': { label: 'Velocity & Threat', description: 'Headcount growth rate vs yours', relevance: 78, color: '#34d399', branches: [{ label: 'Analysis', actions: [{ label: 'View Velocity', hint: 'Growth rate' }] }] },
  'Buyer Map': { label: 'Buyer Map', description: 'Economic buyer, champion, blocker', relevance: 88, color: '#38bdf8', branches: [{ label: 'Analysis', actions: [{ label: 'View Map', hint: 'Buyer roles' }] }] },
  'Pain & Trigger': { label: 'Pain & Trigger', description: 'Specific pain, buying window trigger', relevance: 85, color: '#a78bfa', branches: [{ label: 'Analysis', actions: [{ label: 'View Pain', hint: 'Triggers' }] }] },
  'Stack Intel / Deal Urgency': { label: 'Stack Intel / Deal Urgency', description: 'Current tooling, displacement / Compliance, fundraise', relevance: 78, color: '#34d399', branches: [{ label: 'Analysis', actions: [{ label: 'View Stack', hint: 'Urgency' }] }] },
  'Integration Fit': { label: 'Integration Fit', description: 'API compatibility, data model overlap', relevance: 88, color: '#38bdf8', branches: [{ label: 'Analysis', actions: [{ label: 'View Fit', hint: 'Compatibility' }] }] },
  'Value Split': { label: 'Value Split', description: 'Rev share, referral, white-label model', relevance: 85, color: '#a78bfa', branches: [{ label: 'Analysis', actions: [{ label: 'View Split', hint: 'Models' }] }] },
  'Joint Champion / Conflict Risk': { label: 'Joint Champion / Conflict Risk', description: 'Internal sponsor / Roadmap overlap', relevance: 78, color: '#34d399', branches: [{ label: 'Analysis', actions: [{ label: 'View Champion', hint: 'Risks' }] }] },
};

const DYNAMIC_SETS: Record<CompanyTag, string[]> = {
  competitor: ['ICP Overlap', 'Product Delta', 'GTM & Win/Loss', 'Velocity & Threat'],
  potential_client: ['ICP Overlap', 'Buyer Map', 'Pain & Trigger', 'Stack Intel / Deal Urgency'],
  partner: ['Product Delta', 'Integration Fit', 'Value Split', 'Joint Champion / Conflict Risk']
};

const ALL_DYNAMIC_KEYS = Object.keys(DYNAMIC_NODES);

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

export interface PlanetCoreDetails {
  companyId: string;
  companyName: string;
  role: UserPlanetRole;
  roleLabel: string;
  roleTag: string;
  headline: string;
  subline: string;
  metrics: { label: string; value: string }[];
  focusHint: string;
}

function getTagForCompany(companyId: string, role: string): CompanyTag | undefined {
  try {
    const raw = localStorage.getItem('industry_os_saved_workflows_v1');
    if (!raw) return undefined;
    const items = JSON.parse(raw);
    const item = items.find((i: any) => i.level === 'planet' && i.companyId === companyId && i.role === role);
    return item?.planetTag;
  } catch {
    return undefined;
  }
}

// Simple seeded PRNG
function seedRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export function getPlanetCoreDetails(ctx: CompanyPlanetContext): PlanetCoreDetails {
  const rootCount = ctx.roots.length;
  const sorted = [...ctx.roots].sort((a, b) => b.relevance - a.relevance);
  const topRoot = sorted[0];
  const avgRel =
    rootCount > 0
      ? Math.round(ctx.roots.reduce((s, r) => s + r.relevance, 0) / rootCount)
      : 0;

  const base = {
    companyId: ctx.companyId,
    companyName: ctx.companyName,
    role: ctx.role,
    roleLabel: ctx.roleLabel,
  };

  const tag = getTagForCompany(ctx.companyId, ctx.role);
  const tagLabel = tag === 'competitor' ? 'Competitor' 
                 : tag === 'potential_client' ? 'Client' 
                 : tag === 'partner' ? 'Partner' 
                 : 'Untagged';

  return {
    ...base,
    roleTag: `${tagLabel} lens`,
    headline: ctx.companyName,
    subline: tagLabel,
    metrics: [
      { label: 'Root systems', value: String(rootCount) },
      { label: 'Top signal', value: topRoot?.label ?? '—' },
      { label: 'Avg relevance', value: `${avgRel}%` },
    ],
    focusHint: 'Identity · Product · Positioning · Commercial · People',
  };
}

export function getPlanetRootsForCompany(
  companyId: string,
  companyName: string,
  role: UserPlanetRole,
): CompanyPlanetContext {
  const tag = getTagForCompany(companyId, role);

  let dynamicTemplates: PlanetRootTemplate[] = [];

  if (tag && DYNAMIC_SETS[tag]) {
    dynamicTemplates = DYNAMIC_SETS[tag].map(key => DYNAMIC_NODES[key]);
  } else {
    // 4 random nodes based on companyId
    const rand = seedRandom(hashString(companyId));
    // Provide a stable sort so that random shuffle is deterministic
    const shuffled = [...ALL_DYNAMIC_KEYS].sort((a, b) => {
      const cmp = a.localeCompare(b);
      const val = rand() - 0.5;
      return val === 0 ? cmp : val;
    });
    dynamicTemplates = shuffled.slice(0, 4).map(key => DYNAMIC_NODES[key]);
  }

  const template = [...FIXED_ROOTS_TEMPLATE, ...dynamicTemplates];

  const roots = expandTemplate(companyId, template, role);
  return {
    companyId,
    companyName,
    role,
    roleLabel: ROLE_LABELS[role],
    roots,
  };
}

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
