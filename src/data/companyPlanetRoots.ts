/**
 * Industry OS — user-specific company planet root systems.
 * Galaxy → Star → Planet → Roots → Branches → Action nodes
 */

import type { UDomain, UExternalNode, UInternalNode } from '../lib/universalPolytopeData';
import { resolvePolytopeNodeCount } from '../lib/universalPolytopeData';
import type { CompanyTag } from '../lib/useSavedWorkflows';
import type { PersistedPlanetState } from '../lib/universeNavPersistence';

export type UserPlanetRole = 'career' | 'founder' | 'vc' | 'investor';

/** Inner branch node types — see Industry OS Inner Branch & Action Node Framework §3.3 */
export type PlanetBranchNodeType =
  | 'information'
  | 'metric'
  | 'signal'
  | 'relationship'
  | 'evidence'
  | 'decision';

export interface PlanetActionNode {
  id: string;
  label: string;
  hint?: string;
}

export interface PlanetBranchNode {
  id: string;
  label: string;
  nodeType: PlanetBranchNodeType;
  actions: PlanetActionNode[];
}

interface PlanetBranchTemplate {
  label: string;
  nodeType: PlanetBranchNodeType;
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
    branches: [
      {
        label: 'Company Profile',
        nodeType: 'information',
        actions: [{ label: 'Verify company profile', hint: 'Confirm name, HQ, website, and entity status' }],
      },
      {
        label: 'Stage & Maturity',
        nodeType: 'metric',
        actions: [{ label: 'Set stage alert', hint: 'Notify when stage or size changes' }],
      },
      {
        label: 'Category Tags',
        nodeType: 'information',
        actions: [{ label: 'Tag or re-tag company', hint: 'Industry, model, geography, and segment tags' }],
      },
      {
        label: 'Relationship Classification',
        nodeType: 'decision',
        actions: [{ label: 'Assign classification', hint: 'Competitor, client, partner, or other lens' }],
      },
    ],
  },
  {
    label: 'Product & Tech',
    description: 'Core offering, differentiators, tech stack, APIs',
    relevance: 95,
    color: '#a78bfa',
    branches: [
      {
        label: 'Core Offering Map',
        nodeType: 'information',
        actions: [{ label: 'Capture differentiators', hint: 'What appears unique vs alternatives' }],
      },
      {
        label: 'Tech Stack',
        nodeType: 'evidence',
        actions: [{ label: 'Request technical docs', hint: 'Stack, APIs, and platform dependencies' }],
      },
      {
        label: 'API / Integration Surface',
        nodeType: 'metric',
        actions: [{ label: 'Run integration assessment', hint: 'APIs, auth methods, and data formats' }],
      },
      {
        label: 'Roadmap Signals',
        nodeType: 'signal',
        actions: [{ label: 'Add roadmap alert', hint: 'Releases, hiring roles, and product announcements' }],
      },
    ],
  },
  {
    label: 'Market Position',
    description: 'ICP, GTM motion, pricing model, geography',
    relevance: 90,
    color: '#34d399',
    branches: [
      {
        label: 'ICP Definition',
        nodeType: 'metric',
        actions: [{ label: 'Map ICP against ours', hint: 'Segment, size, buyer persona overlap' }],
      },
      {
        label: 'GTM Motion',
        nodeType: 'metric',
        actions: [{ label: 'Compare GTM motion', hint: 'Self-serve vs sales-led vs partner-led' }],
      },
      {
        label: 'Pricing Model',
        nodeType: 'metric',
        actions: [{ label: 'Create pricing benchmark', hint: 'Tiers, packaging, and discount patterns' }],
      },
      {
        label: 'Positioning Statement',
        nodeType: 'information',
        actions: [{ label: 'Add positioning note', hint: 'How they describe category and value' }],
      },
    ],
  },
  {
    label: 'Commercial Signals',
    description: 'Funding, revenue range, hiring velocity',
    relevance: 85,
    color: '#fbbf24',
    branches: [
      {
        label: 'Funding Signals',
        nodeType: 'signal',
        actions: [{ label: 'Add funding alert', hint: 'Rounds, investors, and capital events' }],
      },
      {
        label: 'Hiring Velocity',
        nodeType: 'signal',
        actions: [{ label: 'Track hiring spike', hint: 'Open roles and headcount growth' }],
      },
      {
        label: 'Press / News Signals',
        nodeType: 'evidence',
        actions: [{ label: 'Create market update note', hint: 'Launches, media, and regulatory events' }],
      },
      {
        label: 'Partnership Signals',
        nodeType: 'signal',
        actions: [{ label: 'Investigate partner route', hint: 'Integrations, co-sell, and channel deals' }],
      },
    ],
  },
];

/** Relationship-specific roots — 3 per company tag (+ untagged default). */
const DYNAMIC_NODES: Record<string, PlanetRootTemplate> = {
  'People & Access': {
    label: 'People & Access',
    description: 'Founders, key contacts, warm intro paths',
    relevance: 80,
    color: '#f472b6',
    branches: [
      {
        label: 'Founders / Leadership',
        nodeType: 'relationship',
        actions: [{ label: 'Research leader', hint: 'Founders, CEO, and CXOs' }],
      },
      {
        label: 'Warm Intro Paths',
        nodeType: 'relationship',
        actions: [{ label: 'Request intro', hint: 'Shared investors, alumni, or customers' }],
      },
      {
        label: 'Influence Map',
        nodeType: 'relationship',
        actions: [{ label: 'Map stakeholder', hint: 'Who influences budget and adoption' }],
      },
      {
        label: 'Owner / Cadence',
        nodeType: 'relationship',
        actions: [{ label: 'Assign relationship owner', hint: 'Internal owner and check-in rhythm' }],
      },
    ],
  },
  'Engagement History': {
    label: 'Engagement History',
    description: 'Past interactions, deal stage, notes, next action',
    relevance: 75,
    color: '#22d3ee',
    branches: [
      {
        label: 'Interaction Timeline',
        nodeType: 'evidence',
        actions: [{ label: 'Log interaction', hint: 'Calls, meetings, emails, and events' }],
      },
      {
        label: 'Deal / Relationship Stage',
        nodeType: 'decision',
        actions: [{ label: 'Move stage', hint: 'Lead, qualified, proposal, closed, or paused' }],
      },
      {
        label: 'Next Action',
        nodeType: 'decision',
        actions: [{ label: 'Set next action', hint: 'Specific step, owner, and due date' }],
      },
      {
        label: 'Follow-up Cadence',
        nodeType: 'metric',
        actions: [{ label: 'Schedule follow-up', hint: 'Next touch date and sequence' }],
      },
    ],
  },
  'Product Delta': {
    label: 'Product Delta',
    description: 'Feature gaps between you and them',
    relevance: 88,
    color: '#38bdf8',
    branches: [
      {
        label: 'Feature Comparison',
        nodeType: 'metric',
        actions: [{ label: 'Create battlecard', hint: 'Feature-by-feature comparison' }],
      },
      {
        label: 'Pricing Delta',
        nodeType: 'metric',
        actions: [{ label: 'Build pricing benchmark', hint: 'Packaging, discounting, and terms' }],
      },
      {
        label: 'Differentiation Narrative',
        nodeType: 'decision',
        actions: [{ label: 'Draft differentiation copy', hint: 'Why your product wins' }],
      },
      {
        label: 'Roadmap Implication',
        nodeType: 'decision',
        actions: [{ label: 'Create roadmap item', hint: 'Build, ignore, or reposition' }],
      },
    ],
  },
  'GTM & Win/Loss': {
    label: 'GTM & Win/Loss',
    description: 'Where you\'ve met in deals, who won, why',
    relevance: 85,
    color: '#a78bfa',
    branches: [
      {
        label: 'Deal Collision Log',
        nodeType: 'evidence',
        actions: [{ label: 'Log competitor deal', hint: 'Deals where both companies appeared' }],
      },
      {
        label: 'Win Reasons',
        nodeType: 'evidence',
        actions: [{ label: 'Add win insight', hint: 'Why you won — add to playbook' }],
      },
      {
        label: 'Loss Reasons',
        nodeType: 'evidence',
        actions: [{ label: 'Create loss review', hint: 'Why you lost and what to fix' }],
      },
      {
        label: 'Messaging Gap',
        nodeType: 'decision',
        actions: [{ label: 'Revise pitch deck', hint: 'Where their story is clearer' }],
      },
    ],
  },
  'Velocity & Threat': {
    label: 'Velocity & Threat',
    description: 'Headcount growth, funding pace, and threat level',
    relevance: 78,
    color: '#34d399',
    branches: [
      {
        label: 'Headcount Growth',
        nodeType: 'signal',
        actions: [{ label: 'Add hiring alert', hint: 'Hiring pace by role and function' }],
      },
      {
        label: 'Funding Velocity',
        nodeType: 'signal',
        actions: [{ label: 'Update threat score', hint: 'Recent funding and investor strength' }],
      },
      {
        label: 'Product Release Velocity',
        nodeType: 'signal',
        actions: [{ label: 'Create release watch', hint: 'Launch frequency and roadmap clues' }],
      },
      {
        label: 'Threat Escalation',
        nodeType: 'decision',
        actions: [{ label: 'Schedule strategy review', hint: 'Escalate to leadership if needed' }],
      },
    ],
  },
  'Buyer Map': {
    label: 'Buyer Map',
    description: 'Economic buyer, champion, blocker',
    relevance: 88,
    color: '#38bdf8',
    branches: [
      {
        label: 'Economic Buyer',
        nodeType: 'relationship',
        actions: [{ label: 'Identify economic buyer', hint: 'Budget owner and final approver' }],
      },
      {
        label: 'Champion',
        nodeType: 'relationship',
        actions: [{ label: 'Activate champion', hint: 'Internal supporter for your solution' }],
      },
      {
        label: 'Blocker',
        nodeType: 'relationship',
        actions: [{ label: 'Prepare blocker strategy', hint: 'Stakeholder likely to resist' }],
      },
      {
        label: 'Stakeholder Map',
        nodeType: 'decision',
        actions: [{ label: 'Build stakeholder map', hint: 'Influence and decision path' }],
      },
    ],
  },
  'Pain & Trigger': {
    label: 'Pain & Trigger',
    description: 'Specific pain, buying window trigger',
    relevance: 85,
    color: '#a78bfa',
    branches: [
      {
        label: 'Pain Hypothesis',
        nodeType: 'decision',
        actions: [{ label: 'Write pain hypothesis', hint: 'Initial assumption about their pain' }],
      },
      {
        label: 'Validated Pain',
        nodeType: 'evidence',
        actions: [{ label: 'Run discovery call', hint: 'Evidence from calls, data, or usage' }],
      },
      {
        label: 'Trigger Event',
        nodeType: 'signal',
        actions: [{ label: 'Add trigger alert', hint: 'Funding, expansion, renewal, or compliance' }],
      },
      {
        label: 'Urgency Level',
        nodeType: 'metric',
        actions: [{ label: 'Create urgency follow-up', hint: 'Low, medium, high, or immediate' }],
      },
    ],
  },
  'Stack Intel / Deal Urgency': {
    label: 'Stack Intel / Deal Urgency',
    description: 'Current tooling, integration fit, and buying window',
    relevance: 78,
    color: '#34d399',
    branches: [
      {
        label: 'Current Tools',
        nodeType: 'information',
        actions: [{ label: 'Map current stack', hint: 'Software, platforms, and manual tools' }],
      },
      {
        label: 'Integration Requirements',
        nodeType: 'metric',
        actions: [{ label: 'Request technical requirements', hint: 'APIs, auth, security, compliance' }],
      },
      {
        label: 'Buying Window',
        nodeType: 'signal',
        actions: [{ label: 'Create deal timeline', hint: 'When they are likely to decide' }],
      },
      {
        label: 'Next Step',
        nodeType: 'decision',
        actions: [{ label: 'Schedule next meeting', hint: 'Demo, proposal, or pilot discussion' }],
      },
    ],
  },
  'Integration Fit': {
    label: 'Integration Fit',
    description: 'API compatibility, data model overlap',
    relevance: 88,
    color: '#38bdf8',
    branches: [
      {
        label: 'API Compatibility',
        nodeType: 'metric',
        actions: [{ label: 'Request API docs', hint: 'APIs, webhooks, and SDK availability' }],
      },
      {
        label: 'Data Model Overlap',
        nodeType: 'metric',
        actions: [{ label: 'Map data model', hint: 'Object and field alignment' }],
      },
      {
        label: 'Workflow Fit',
        nodeType: 'decision',
        actions: [{ label: 'Draw workflow map', hint: 'How workflows connect end-to-end' }],
      },
      {
        label: 'POC Scope',
        nodeType: 'decision',
        actions: [{ label: 'Create integration POC', hint: 'Minimum proof to validate partnership' }],
      },
    ],
  },
  'Value Split': {
    label: 'Value Split',
    description: 'Rev share, referral, white-label model',
    relevance: 85,
    color: '#a78bfa',
    branches: [
      {
        label: 'Revenue Model',
        nodeType: 'decision',
        actions: [{ label: 'Select partnership model', hint: 'Referral, rev share, reseller, or white-label' }],
      },
      {
        label: 'Customer Ownership',
        nodeType: 'decision',
        actions: [{ label: 'Define customer ownership', hint: 'Who owns relationship, billing, support' }],
      },
      {
        label: 'Commercial Terms',
        nodeType: 'decision',
        actions: [{ label: 'Draft term sheet', hint: 'Margins, exclusivity, and minimums' }],
      },
      {
        label: 'Partner Proposal',
        nodeType: 'decision',
        actions: [{ label: 'Send partnership proposal', hint: 'Concise offer to send to partner' }],
      },
    ],
  },
};

/** Short labels for branch node types (side panel + 3D hints). */
export const PLANET_BRANCH_TYPE_LABELS: Record<PlanetBranchNodeType, string> = {
  information: 'Info',
  metric: 'Metric',
  signal: 'Signal',
  relationship: 'People',
  evidence: 'Evidence',
  decision: 'Decision',
};

const DYNAMIC_SETS: Record<CompanyTag, string[]> = {
  competitor: ['Velocity & Threat', 'Product Delta', 'GTM & Win/Loss'],
  potential_client: ['Stack Intel / Deal Urgency', 'Buyer Map', 'Pain & Trigger'],
  partner: ['Product Delta', 'Integration Fit', 'Value Split'],
};

/** 3 dynamic roots when the company has no tag. */
const UNTAGGED_DYNAMIC_SET = ['Buyer Map', 'People & Access', 'Engagement History'] as const;

function expandTemplate(
  companyId: string,
  template: PlanetRootTemplate[],
  prefix: string,
): PlanetRootNode[] {
  return template.map((t, ri) => ({
    ...t,
    id: `${companyId}_${prefix}_root_${ri}`,
    branches: t.branches.map((b, bi) => ({
      id: `${companyId}_${prefix}_branch_${ri}_${bi}`,
      label: b.label,
      nodeType: b.nodeType,
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
    focusHint: 'Identity · Product · Market · Commercial + 3 context roots',
  };
}

function resolveDynamicRootKeys(tag: CompanyTag | undefined): string[] {
  if (tag && DYNAMIC_SETS[tag]) {
    return DYNAMIC_SETS[tag];
  }
  return [...UNTAGGED_DYNAMIC_SET];
}

export function getPlanetRootsForCompany(
  companyId: string,
  companyName: string,
  role: UserPlanetRole,
): CompanyPlanetContext {
  const tag = getTagForCompany(companyId, role);
  const dynamicKeys = resolveDynamicRootKeys(tag);
  const dynamicTemplates = dynamicKeys.map(key => DYNAMIC_NODES[key]);

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

export function getPlanetPathLabels(
  ctx: CompanyPlanetContext,
  rootId: string | null,
  internalPath: string[],
): { rootLabel?: string; internalPathLabels: string[] } {
  if (!rootId) return { internalPathLabels: [] };
  const root = ctx.roots.find(r => r.id === rootId);
  if (!root) return { internalPathLabels: [] };

  const internalPathLabels: string[] = [];
  if (internalPath.length >= 1) {
    const branch = root.branches.find(b => b.id === internalPath[0]);
    if (branch) {
      internalPathLabels.push(branch.label);
      if (internalPath.length >= 2) {
        const action = branch.actions.find(a => a.id === internalPath[1]);
        if (action) internalPathLabels.push(action.label);
      }
    }
  }

  return { rootLabel: root.label, internalPathLabels };
}

export function resolvePlanetRestoreTarget(
  ctx: CompanyPlanetContext,
  saved: Pick<
    PersistedPlanetState,
    'rootPolytopeDeptId' | 'rootPolytopeInternalPath' | 'rootLabel' | 'internalPathLabels'
  >,
): { rootId: string | null; internalPath: string[] } {
  let root =
    (saved.rootPolytopeDeptId
      ? ctx.roots.find(r => r.id === saved.rootPolytopeDeptId)
      : undefined)
    ?? (saved.rootLabel ? ctx.roots.find(r => r.label === saved.rootLabel) : undefined);

  if (!root) {
    return { rootId: null, internalPath: [] };
  }

  const savedPath = saved.rootPolytopeInternalPath ?? [];
  if (savedPath.length === 0) {
    return { rootId: root.id, internalPath: [] };
  }

  let branch = root.branches.find(b => b.id === savedPath[0]);
  const branchLabel = saved.internalPathLabels?.[0];
  if (!branch && branchLabel) {
    branch = root.branches.find(b => b.label === branchLabel);
  }
  if (!branch) {
    return { rootId: root.id, internalPath: [] };
  }

  if (savedPath.length < 2) {
    return { rootId: root.id, internalPath: [branch.id] };
  }

  let action = branch.actions.find(a => a.id === savedPath[1]);
  const actionLabel = saved.internalPathLabels?.[1];
  if (!action && actionLabel) {
    action = branch.actions.find(a => a.label === actionLabel);
  }

  return {
    rootId: root.id,
    internalPath: action ? [branch.id, action.id] : [branch.id],
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
      color: root.color,
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
