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
    branches: [
      {
        label: 'Corporate Profile',
        actions: [
          { label: 'Basic Info', hint: 'Official name, stage, and sector' },
          { label: 'Location & HQ', hint: 'Registered office & regional hubs' },
          { label: 'Web Presence', hint: 'Official site, socials, and traffic' }
        ]
      },
      {
        label: 'Executive Summary',
        actions: [
          { label: 'Vision & Mission', hint: 'Core purpose and values' },
          { label: 'Brief History', hint: 'Timeline of major milestones' },
          { label: 'Key Verticals', hint: 'Primary industries served' }
        ]
      },
      {
        label: 'Legal & Regulatory',
        actions: [
          { label: 'Incorporation Detail', hint: 'Entity structure and filing status' },
          { label: 'IP & Trademarks', hint: 'Registered patents & marks' }
        ]
      }
    ]
  },
  {
    label: 'Product & Tech',
    description: 'Core offering, differentiators, tech stack, APIs',
    relevance: 95,
    color: '#a78bfa',
    branches: [
      {
        label: 'Core Offering',
        actions: [
          { label: 'Feature Matrix', hint: 'Breakdown of core capabilities' },
          { label: 'Pricing & Packaging', hint: 'Tiers, add-ons, and pricing model' },
          { label: 'Customer Value Prop', hint: 'ROI drivers and benefits' }
        ]
      },
      {
        label: 'Technical Architecture',
        actions: [
          { label: 'Frontend Stack', hint: 'Frameworks, UI libraries, and hosting' },
          { label: 'Backend & Database', hint: 'Languages, servers, and data stores' },
          { label: 'Security & Compliance', hint: 'SOC2, GDPR, and security protocols' }
        ]
      },
      {
        label: 'Integration & APIs',
        actions: [
          { label: 'API Documentation', hint: 'Public endpoints and webhooks' },
          { label: 'Native Integrations', hint: 'Pre-built app connectors' },
          { label: 'SDKs & Dev Tools', hint: 'Developer enablement resources' }
        ]
      }
    ]
  },
  {
    label: 'Market Position',
    description: 'ICP, GTM motion, pricing model, geography',
    relevance: 90,
    color: '#34d399',
    branches: [
      {
        label: 'Target Market & ICP',
        actions: [
          { label: 'Industry Focus', hint: 'Primary and secondary sectors' },
          { label: 'Buyer Personas', hint: 'Profiles of key decision makers' },
          { label: 'Account Demographics', hint: 'Ideal company size, geo, and revenue' }
        ]
      },
      {
        label: 'Go-To-Market (GTM)',
        actions: [
          { label: 'Sales Strategy', hint: 'PLG, enterprise sales, or hybrid' },
          { label: 'Marketing Channels', hint: 'Inbound, outbound, SEO, events' },
          { label: 'Partner Network', hint: 'Channels, resellers, and affiliates' }
        ]
      },
      {
        label: 'Competitive Landscape',
        actions: [
          { label: 'Primary Competitors', hint: 'Direct alternatives in market' },
          { label: 'Key Differentiators', hint: 'Unfair advantages and moats' },
          { label: 'Market Share Analysis', hint: 'Estimated positioning & footprint' }
        ]
      }
    ]
  },
  {
    label: 'Commercial Signals',
    description: 'Funding, revenue range, hiring velocity',
    relevance: 85,
    color: '#fbbf24',
    branches: [
      {
        label: 'Funding & Capital',
        actions: [
          { label: 'Round History', hint: 'Details of past funding rounds' },
          { label: 'Cap Table Overview', hint: 'Major shareholders & share classes' },
          { label: 'Key Investors', hint: 'VCs, angels, and strategic backers' }
        ]
      },
      {
        label: 'Financial Performance',
        actions: [
          { label: 'Revenue Streams', hint: 'ARR, NRR, and services revenue' },
          { label: 'Burn Rate & Runway', hint: 'Capital efficiency metrics' },
          { label: 'Average Contract Value', hint: 'ACV, LTV, and CAC metrics' }
        ]
      },
      {
        label: 'Headcount & Hiring',
        actions: [
          { label: 'Headcount Growth', hint: 'Historical growth trajectory' },
          { label: 'Active Job Openings', hint: 'Current open roles by department' },
          { label: 'Talent Distribution', hint: 'Geographic and functional split' }
        ]
      }
    ]
  },
  {
    label: 'People & Access',
    description: 'Founders, key contacts, warm intro paths',
    relevance: 80,
    color: '#f472b6',
    branches: [
      {
        label: 'Leadership Team',
        actions: [
          { label: 'Founders & C-Suite', hint: 'Profiles of top executives' },
          { label: 'Board & Advisors', hint: 'Independent directors and key advisors' }
        ]
      },
      {
        label: 'Organization Chart',
        actions: [
          { label: 'Department Heads', hint: 'Product, Sales, Engineering leads' },
          { label: 'Key Developers', hint: 'Engineering contributors and architects' }
        ]
      },
      {
        label: 'Network & Intro Paths',
        actions: [
          { label: 'Shared Connections', hint: 'Mutual contacts on LinkedIn/CRM' },
          { label: 'Referral History', hint: 'Past introductions and referrals' },
          { label: 'Warm Intro Plan', hint: 'Strategy to reach key buyers' }
        ]
      }
    ]
  },
  {
    label: 'Engagement History',
    description: 'Past interactions, deal stage, notes, next action',
    relevance: 75,
    color: '#22d3ee',
    branches: [
      {
        label: 'Interaction Timeline',
        actions: [
          { label: 'Meeting Logs', hint: 'Notes and recordings of past calls' },
          { label: 'Email History', hint: 'Sent/received communication history' },
          { label: 'Product Usage Logs', hint: 'Trial metrics and feature adoption' }
        ]
      },
      {
        label: 'Deal Status',
        actions: [
          { label: 'Current Stage', hint: 'Pipeline position and deal value' },
          { label: 'Historical Proposals', hint: 'Sent quotes and contracts' },
          { label: 'Win/Loss Reasons', hint: 'Key factors in winning or losing' }
        ]
      },
      {
        label: 'Collaborative Notes',
        actions: [
          { label: 'Team Comments', hint: 'Internal notes and tags' },
          { label: 'Action Items', hint: 'Assigned tasks and deadlines' }
        ]
      }
    ]
  }
];

const DYNAMIC_NODES: Record<string, PlanetRootTemplate> = {
  'ICP Overlap': {
    label: 'ICP Overlap',
    description: 'How much of their ICP maps to yours / fit',
    relevance: 92,
    color: '#f97316',
    branches: [
      {
        label: 'Profile Fit',
        actions: [
          { label: 'Industry Match', hint: 'Core vertical alignment' },
          { label: 'Size & Scale Fit', hint: 'Company size & revenue tier match' }
        ]
      },
      {
        label: 'Audience Fit',
        actions: [
          { label: 'Persona Alignment', hint: 'Do we target the same buyers?' },
          { label: 'Regional Alignment', hint: 'Geographic market overlap' }
        ]
      },
      {
        label: 'Scoring & Grade',
        actions: [
          { label: 'Overall ICP Score', hint: 'Weighted rating of fit' },
          { label: 'Custom Fit Criteria', hint: 'Specific filters and signals' }
        ]
      }
    ]
  },
  'Product Delta': {
    label: 'Product Delta',
    description: 'Feature gaps between you and them',
    relevance: 88,
    color: '#38bdf8',
    branches: [
      {
        label: 'Core Feature Gap',
        actions: [
          { label: 'Missing Features', hint: 'What they have that we lack' },
          { label: 'Advantage Features', hint: 'What we have that they lack' }
        ]
      },
      {
        label: 'Technology Gap',
        actions: [
          { label: 'Tech Stack Comparison', hint: 'Platforms and architectures' },
          { label: 'Speed & Performance', hint: 'Infrastructure comparative metrics' }
        ]
      },
      {
        label: 'Roadmap Alignment',
        actions: [
          { label: 'Near-Term Gaps', hint: 'Upcoming competitor features' },
          { label: 'Long-Term Gaps', hint: 'Roadmap divergence' }
        ]
      }
    ]
  },
  'GTM & Win/Loss': {
    label: 'GTM & Win/Loss',
    description: 'Where you\'ve met in deals, who won, why',
    relevance: 85,
    color: '#a78bfa',
    branches: [
      {
        label: 'Win/Loss Records',
        actions: [
          { label: 'Won Deals', hint: 'Deals won against this competitor' },
          { label: 'Lost Deals', hint: 'Deals lost to this competitor' }
        ]
      },
      {
        label: 'Competitive Factors',
        actions: [
          { label: 'Price Sensitivity', hint: 'How price impacted the decision' },
          { label: 'Feature Capability', hint: 'How features decided the deal' },
          { label: 'Relationship Factor', hint: 'Influence of sales reps / champions' }
        ]
      },
      {
        label: 'Sales Plays',
        actions: [
          { label: 'De-positioning Playbook', hint: 'How to handle their pitches' },
          { label: 'Common Objections', hint: 'Handling competitor objections' }
        ]
      }
    ]
  },
  'Velocity & Threat': {
    label: 'Velocity & Threat',
    description: 'Headcount growth rate vs yours',
    relevance: 78,
    color: '#34d399',
    branches: [
      {
        label: 'Growth Velocity',
        actions: [
          { label: 'Headcount Growth Rate', hint: 'Percentage growth over 6-12 months' },
          { label: 'Funding Velocity', hint: 'Frequency and size of capital raises' }
        ]
      },
      {
        label: 'Threat Assessment',
        actions: [
          { label: 'Market Expansion Threat', hint: 'Entering our key sectors' },
          { label: 'Talent Poaching', hint: 'Team members hired from our team' }
        ]
      },
      {
        label: 'Market Sentiment',
        actions: [
          { label: 'Social Media Momentum', hint: 'LinkedIn/Twitter follower growth' },
          { label: 'Press & PR Activity', hint: 'Volume of media announcements' }
        ]
      }
    ]
  },
  'Buyer Map': {
    label: 'Buyer Map',
    description: 'Economic buyer, champion, blocker',
    relevance: 88,
    color: '#38bdf8',
    branches: [
      {
        label: 'Decision Makers',
        actions: [
          { label: 'Economic Buyer', hint: 'Budget holder and final approver' },
          { label: 'Technical Sign-off', hint: 'CTO / Security review Lead' }
        ]
      },
      {
        label: 'Influencers',
        actions: [
          { label: 'Core Champion', hint: 'Our champion inside the prospect company' },
          { label: 'Business Users', hint: 'Day-to-day operators' }
        ]
      },
      {
        label: 'Friction Points',
        actions: [
          { label: 'Key Blocker', hint: 'Potential detractors and risk profiles' },
          { label: 'Strategy to Win Blockers', hint: 'Mitigation plan for negative stakeholders' }
        ]
      }
    ]
  },
  'Pain & Trigger': {
    label: 'Pain & Trigger',
    description: 'Specific pain, buying window trigger',
    relevance: 85,
    color: '#a78bfa',
    branches: [
      {
        label: 'Customer Pain Points',
        actions: [
          { label: 'Operational Inefficiencies', hint: 'Bottlenecks and manual effort' },
          { label: 'Financial Cost Pain', hint: 'High maintenance / licensing cost' },
          { label: 'Technical Limitations', hint: 'Legacy tech stack constraints' }
        ]
      },
      {
        label: 'Buying Triggers',
        actions: [
          { label: 'Executive Hires', hint: 'New VP/C-level leader joining' },
          { label: 'Funding Announcement', hint: 'Fresh capital to deploy' },
          { label: 'Compliance Mandates', hint: 'New laws/requirements forcing change' }
        ]
      }
    ]
  },
  'Stack Intel / Deal Urgency': {
    label: 'Stack Intel / Deal Urgency',
    description: 'Current tooling, displacement / Compliance, fundraise',
    relevance: 78,
    color: '#34d399',
    branches: [
      {
        label: 'Software Stack',
        actions: [
          { label: 'Current Tooling', hint: 'Key software currently installed' },
          { label: 'Vendor Spend Estimate', hint: 'Calculated annual spend on stack' }
        ]
      },
      {
        label: 'Displacement Risk',
        actions: [
          { label: 'Contract Expirations', hint: 'Expected renewal/expiration dates' },
          { label: 'Integration Friction', hint: 'Trouble with existing workflows' }
        ]
      },
      {
        label: 'Urgency Drivers',
        actions: [
          { label: 'Security Gaps', hint: 'Known vulnerabilities or compliance needs' },
          { label: 'Scale Limits', hint: 'Current tool crashing under load' }
        ]
      }
    ]
  },
  'Integration Fit': {
    label: 'Integration Fit',
    description: 'API compatibility, data model overlap',
    relevance: 88,
    color: '#38bdf8',
    branches: [
      {
        label: 'Data Model Alignment',
        actions: [
          { label: 'Entity Mapping', hint: 'Matching schema fields and types' },
          { label: 'Sync Frequency', hint: 'Realtime vs batch synchronization' }
        ]
      },
      {
        label: 'Technical Fit',
        actions: [
          { label: 'Authentication Protocol', hint: 'OAuth, SAML, API Key compatibility' },
          { label: 'API Rate Limits', hint: 'Handling volume and throughput limits' }
        ]
      },
      {
        label: 'Effort Estimation',
        actions: [
          { label: 'Core Integration Cost', hint: 'Estimated engineering hours' },
          { label: 'Maintenance Overhead', hint: 'Long-term upkeep cost' }
        ]
      }
    ]
  },
  'Value Split': {
    label: 'Value Split',
    description: 'Rev share, referral, white-label model',
    relevance: 85,
    color: '#a78bfa',
    branches: [
      {
        label: 'Commercial Model',
        actions: [
          { label: 'Revenue Share Scheme', hint: 'Percentage share on co-sell deals' },
          { label: 'Referral Fees', hint: 'One-time bonus for passed leads' },
          { label: 'Wholesale Pricing', hint: 'Discounted reseller rates' }
        ]
      },
      {
        label: 'Partnerships Plan',
        actions: [
          { label: 'Co-Marketing Agreement', hint: 'Joint webinars, press releases, etc.' },
          { label: 'Joint Account Mapping', hint: 'Shared target accounts list' }
        ]
      },
      {
        label: 'Legal Terms',
        actions: [
          { label: 'SLA Agreement', hint: 'Service level requirements' },
          { label: 'Data Sharing Policy', hint: 'Compliance and privacy constraints' }
        ]
      }
    ]
  },
  'Joint Champion / Conflict Risk': {
    label: 'Joint Champion / Conflict Risk',
    description: 'Internal sponsor / Roadmap overlap',
    relevance: 78,
    color: '#34d399',
    branches: [
      {
        label: 'Joint Champion Strategy',
        actions: [
          { label: 'Shared Sponsor Profile', hint: 'Key contact driving partnership' },
          { label: 'Co-selling Strategy', hint: 'Enabling sponsor to pitch both products' }
        ]
      },
      {
        label: 'Product Overlap Risk',
        actions: [
          { label: 'Feature Conflicts', hint: 'Areas where product roadmaps compete' },
          { label: 'Customer Base Overlap', hint: 'Risk of cannibalizing sales' }
        ]
      },
      {
        label: 'Mitigation Plan',
        actions: [
          { label: 'Rules of Engagement', hint: 'Protocol for conflict resolution' },
          { label: 'Product Boundaries', hint: 'Defined API boundaries and scopes' }
        ]
      }
    ]
  }
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
