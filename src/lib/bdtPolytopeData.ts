// ─────────────────────────────────────────────────────────────────────────────
// Universal Polytope Data — Real Departments with Health Scores & Workflows
// ─────────────────────────────────────────────────────────────────────────────

export type UDomain = 'direction' | 'build' | 'delivery' | 'market' | 'control' | 'people' | 'inactive';

export const U_DOMAIN_COLOR: Record<UDomain, string> = {
  direction: '#fde047',
  build:     '#8b5cf6',
  delivery:  '#06b6d4',
  market:    '#f97316',
  control:   '#10b981',
  people:    '#0ea5e9',
  inactive:  '#334155',
};

export interface TeamMember {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface ProjectDetails {
  description?: string;
  status?: string;
  deadline?: string;
  budget?: string;
}

export interface UInternalNode {
  id: string;
  label: string;
  type: 'team' | 'process' | 'project' | 'resource' | 'decision' | 'risk' | 'metric' | 'branch' | 'action' | 'signal';
  score: number;
  children?: UInternalNode[];
  memberCount?: number;
  members?: TeamMember[];
  projectDetails?: ProjectDetails;
  owner?: string;
  dueDate?: string;
  status?: 'Open' | 'In Progress' | 'Blocked' | 'Completed';
  output?: string;
  metricImpact?: string;
  dependencies?: string[];
  workflowSteps?: string[];
  interrelatedDepartments?: string[];
}

export interface UExternalNode {
  id: string;
  label: string;
  domain: UDomain;
  cluster: string;
  score: number;
  metrics: {
    performance: number;
    efficiency: number;
    capacity: number;
    alignment: number;
    risk: number;
  };
  internalNodes: UInternalNode[];
  access?: {
    read: boolean;
    write: boolean;
    delete: boolean;
    manage: boolean;
  };
  /** Transient flag — draft nodes are rendered in-scene but not persisted */
  isDraft?: boolean;
}

const POLYTOPE_TARGETS = [12, 20, 30, 42, 56, 72, 90, 110, 132];

export function resolvePolytopeNodeCount(deptCount: number): {
  totalNodes: number;
  inactiveCount: number;
} {
  const minTotal = deptCount + 4;
  const target = POLYTOPE_TARGETS.find(t => t >= minTotal) ??
    Math.ceil(minTotal / 12) * 12;
  return { totalNodes: target, inactiveCount: target - deptCount };
}

type InternalDef = { 
  label: string; 
  type: UInternalNode['type']; 
  score: number; 
  memberCount?: number;
  members?: TeamMember[];
  projectDetails?: ProjectDetails;
  owner?: string;
  dueDate?: string;
  status?: UInternalNode['status'];
  output?: string;
  metricImpact?: string;
  dependencies?: string[];
  workflowSteps?: string[];
  interrelatedDepartments?: string[];
  children?: InternalDef[] 
};

function buildTree(parentId: string, defs: InternalDef[], depth = 1): UInternalNode[] {
  return defs.map((d, i) => ({
    id: `${parentId}_d${depth}_${i}`,
    label: d.label,
    type: d.type,
    score: d.score,
    memberCount: d.memberCount,
    members: d.members,
    projectDetails: d.projectDetails,
    owner: d.owner,
    dueDate: d.dueDate,
    status: d.status,
    output: d.output,
    metricImpact: d.metricImpact,
    dependencies: d.dependencies,
    workflowSteps: d.workflowSteps,
    interrelatedDepartments: d.interrelatedDepartments,
    children: d.children ? buildTree(`${parentId}_d${depth}_${i}`, d.children, depth + 1) : [],
  }));
}

function genMembers(count: number, roles: string[]): TeamMember[] {
  return Array.from({ length: count }).map((_, i) => ({
    name: `Member ${i + 1}`,
    role: roles[i % roles.length],
    avatarUrl: `https://i.pravatar.cc/150?u=user${Math.random()}`
  }));
}

const ALL_DEPTS = [
  'dept_engineering', 'dept_product', 'dept_sales', 'dept_marketing',
  'dept_hr', 'dept_finance', 'dept_operations', 'dept_data',
  'dept_design', 'dept_security', 'dept_customer_success', 'dept_legal', 'dept_strategy'
];

function getRandomDepts(currentDept, count) {
  const others = ALL_DEPTS.filter(d => d !== currentDept);
  const picked = [];
  for(let i=0; i<count; i++) {
    const idx = Math.floor(Math.random() * others.length);
    picked.push(others[idx]);
    others.splice(idx, 1);
  }
  return picked;
}

// 8 leaf nodes per department: 2 metric, 2 signal, 2 decision, 2 action
function injectLeaves(deptId, branches) {
  const leavesToDistribute = [
    { type: 'metric',   label: 'Key KPI Metric' },
    { type: 'decision', label: 'Approve Strategy' },
    { type: 'signal',   label: 'Anomaly Alert' },
    { type: 'action',   label: 'Execute Plan' },
    { type: 'metric',   label: 'Performance Rate' },
    { type: 'action',   label: 'Deploy Changes' },
    { type: 'signal',   label: 'Competitor Intel' },
    { type: 'decision', label: 'Vendor Selection' }
  ];

  let leafIdx = 0;
  branches.forEach(branch => {
    // 2 leaves per branch
    branch.children = [
      {
        ...leavesToDistribute[leafIdx],
        score: 85 + Math.floor(Math.random() * 10),
        owner: 'Domain Lead',
        status: 'In Progress',
        output: 'Deliverable',
        metricImpact: 'Efficiency',
        workflowSteps: ['Define objective', 'Gather cross-team context', 'Draft execution plan', 'Review & approve', 'Publish results'],
        interrelatedDepartments: getRandomDepts(deptId, 2)
      },
      {
        ...leavesToDistribute[leafIdx + 1],
        score: 85 + Math.floor(Math.random() * 10),
        owner: 'Domain Manager',
        status: 'Open',
        output: 'Report',
        metricImpact: 'Quality',
        workflowSteps: ['Investigate signal/data', 'Formulate options', 'Consult interrelated depts', 'Make decision/action'],
        interrelatedDepartments: getRandomDepts(deptId, 2)
      }
    ];
    leafIdx += 2;
  });
  return branches;
}

const DEPARTMENTS: UExternalNode[] = [
  {
    id: 'dept_engineering', label: 'Engineering', domain: 'build', cluster: 'Build', score: 85,
    metrics: { performance: 91, efficiency: 85, capacity: 78, alignment: 88, risk: 14 },
    internalNodes: buildTree('eng', [
      { label: 'Teams', type: 'team', score: 88, children: [
        { label: 'Backend Team', type: 'team', score: 90, memberCount: 5, members: genMembers(5, ['Lead', 'Backend Dev', 'DBA']), children: []},
      ]},
      { label: 'Projects', type: 'project', score: 84, children: [
        { label: 'DB Migrations', type: 'project', score: 76, projectDetails: { status: 'In Progress', deadline: 'Q3', description: 'Migrating core database to new cluster', budget: '$50k' }, children: [] },
      ]},
      ...injectLeaves('dept_engineering', [
        { label: 'Architecture', type: 'branch', score: 85 },
        { label: 'Pipeline', type: 'branch', score: 80 },
        { label: 'Releases', type: 'branch', score: 78 },
        { label: 'Quality', type: 'branch', score: 82 }
      ])
    ]),
  },
  {
    id: 'dept_product', label: 'Product', domain: 'direction', cluster: 'Direction', score: 91,
    metrics: { performance: 93, efficiency: 90, capacity: 85, alignment: 95, risk: 8 },
    internalNodes: buildTree('prd', [
      { label: 'Teams', type: 'team', score: 89, children: [
        { label: 'User Research', type: 'team', score: 89, memberCount: 4, members: genMembers(4, ['UX Researcher', 'Analyst']), children: []}
      ]},
      { label: 'Projects', type: 'project', score: 90, children: [
        { label: 'Q3 Milestones', type: 'project', score: 91, projectDetails: { status: 'Planning', deadline: 'Q3', description: 'Key deliverables', budget: '$100k' }, children: [] },
      ]},
      ...injectLeaves('dept_product', [
        { label: 'Vision', type: 'branch', score: 94 },
        { label: 'Problems', type: 'branch', score: 89 },
        { label: 'Roadmap', type: 'branch', score: 92 },
        { label: 'Experiments', type: 'branch', score: 85 }
      ])
    ]),
  },
  {
    id: 'dept_sales', label: 'Sales', domain: 'market', cluster: 'Market', score: 78,
    metrics: { performance: 80, efficiency: 74, capacity: 82, alignment: 76, risk: 22 },
    internalNodes: buildTree('sal', [
      { label: 'Teams', type: 'team', score: 79, children: [
        { label: 'Enterprise', type: 'team', score: 83, memberCount: 3, members: genMembers(3, ['Account Exec', 'Rep']), children: []},
      ]},
      { label: 'Projects', type: 'project', score: 70, children: [
        { label: 'CRM Move', type: 'project', score: 65, projectDetails: { status: 'In Progress', deadline: 'Q2', description: 'CRM', budget: '$80k' }, children: [] }
      ]},
      ...injectLeaves('dept_sales', [
        { label: 'Pipeline', type: 'branch', score: 75 },
        { label: 'Prospecting', type: 'branch', score: 72 },
        { label: 'Discovery', type: 'branch', score: 78 },
        { label: 'Forecasting', type: 'branch', score: 82 }
      ])
    ]),
  },
  {
    id: 'dept_marketing', label: 'Marketing', domain: 'market', cluster: 'Market', score: 72,
    metrics: { performance: 75, efficiency: 68, capacity: 74, alignment: 72, risk: 26 },
    internalNodes: buildTree('mkt', [
      { label: 'Teams', type: 'team', score: 78, children: [
        { label: 'Content', type: 'team', score: 80, memberCount: 4, members: genMembers(4, ['Marketer', 'SEO']), children: []}
      ]},
      { label: 'Projects', type: 'project', score: 68, children: [
        { label: 'Campaign', type: 'project', score: 65, projectDetails: { status: 'Active', deadline: 'Aug', description: 'Ads', budget: '$200k' }, children: [] }
      ]},
      ...injectLeaves('dept_marketing', [
        { label: 'Brand', type: 'branch', score: 80 },
        { label: 'Content', type: 'branch', score: 78 },
        { label: 'Demand Gen', type: 'branch', score: 70 },
        { label: 'Analytics', type: 'branch', score: 75 }
      ])
    ]),
  },
  {
    id: 'dept_hr', label: 'People & HR', domain: 'people', cluster: 'People', score: 84,
    metrics: { performance: 86, efficiency: 82, capacity: 80, alignment: 88, risk: 12 },
    internalNodes: buildTree('hr', [
      { label: 'Teams', type: 'team', score: 85, children: [
        { label: 'Recruitment', type: 'team', score: 88, memberCount: 3, members: genMembers(3, ['Recruiter', 'Sourcer']), children: []}
      ]},
      { label: 'Projects', type: 'project', score: 84, children: [
        { label: 'L&D Programs', type: 'project', score: 84, projectDetails: { status: 'Planning', deadline: 'Q4', description: 'L&D', budget: '$40k' }, children: []}
      ]},
      ...injectLeaves('dept_hr', [
        { label: 'Planning', type: 'branch', score: 88 },
        { label: 'Recruiting', type: 'branch', score: 85 },
        { label: 'Onboarding', type: 'branch', score: 88 },
        { label: 'Engagement', type: 'branch', score: 82 }
      ])
    ]),
  },
  {
    id: 'dept_finance', label: 'Finance', domain: 'control', cluster: 'Control', score: 93,
    metrics: { performance: 95, efficiency: 92, capacity: 90, alignment: 94, risk: 6 },
    internalNodes: buildTree('fin', [
      { label: 'Teams', type: 'team', score: 93, children: [
        { label: 'FP&A Team', type: 'team', score: 96, memberCount: 4, members: genMembers(4, ['Analyst', 'Controller']), children: []}
      ]},
      { label: 'Projects', type: 'project', score: 90, children: [
        { label: 'Audit 2026', type: 'project', score: 88, projectDetails: { status: 'Prep', deadline: 'Dec', description: 'Audit', budget: '$10k' }, children: [] }
      ]},
      ...injectLeaves('dept_finance', [
        { label: 'Budgeting', type: 'branch', score: 92 },
        { label: 'Cash flow', type: 'branch', score: 95 },
        { label: 'Accounting', type: 'branch', score: 90 },
        { label: 'Reporting', type: 'branch', score: 96 }
      ])
    ]),
  },
  {
    id: 'dept_operations', label: 'Operations', domain: 'delivery', cluster: 'Delivery', score: 61,
    metrics: { performance: 63, efficiency: 58, capacity: 65, alignment: 60, risk: 38 },
    internalNodes: buildTree('ops', [
      { label: 'Teams', type: 'team', score: 61, children: [
        { label: 'Logistics', type: 'team', score: 62, memberCount: 7, members: genMembers(7, ['Manager']), children: []}
      ]},
      { label: 'Projects', type: 'project', score: 55, children: [
        { label: 'Warehouse Exp', type: 'project', score: 50, projectDetails: { status: 'Delayed', deadline: 'Q4', description: 'Exp', budget: '$1M' }, children: [] }
      ]},
      ...injectLeaves('dept_operations', [
        { label: 'Capacity', type: 'branch', score: 58 },
        { label: 'Procurement', type: 'branch', score: 62 },
        { label: 'Delivery', type: 'branch', score: 59 },
        { label: 'Facilities', type: 'branch', score: 70 }
      ])
    ]),
  },
  {
    id: 'dept_data', label: 'Data', domain: 'build', cluster: 'Build', score: 76,
    metrics: { performance: 78, efficiency: 74, capacity: 72, alignment: 79, risk: 20 },
    internalNodes: buildTree('dat', [
      { label: 'Teams', type: 'team', score: 77, children: [
        { label: 'Data Eng', type: 'team', score: 80, memberCount: 5, members: genMembers(5, ['Data Engineer']), children: []},
      ]},
      { label: 'Projects', type: 'project', score: 75, children: [
        { label: 'Dashboard Suite', type: 'project', score: 78, projectDetails: { status: 'Active', deadline: 'Q3', description: 'Dash', budget: '$30k' }, children: [] },
      ]},
      ...injectLeaves('dept_data', [
        { label: 'Pipelines', type: 'branch', score: 80 },
        { label: 'Metrics', type: 'branch', score: 75 },
        { label: 'Insights', type: 'branch', score: 80 },
        { label: 'Governance', type: 'branch', score: 68 }
      ])
    ]),
  },
  {
    id: 'dept_design', label: 'Design', domain: 'build', cluster: 'Build', score: 88,
    metrics: { performance: 91, efficiency: 87, capacity: 83, alignment: 90, risk: 10 },
    internalNodes: buildTree('des', [
      { label: 'Teams', type: 'team', score: 88, children: [
        { label: 'UX Research', type: 'team', score: 90, memberCount: 3, members: genMembers(3, ['UX Researcher']), children: []},
      ]},
      { label: 'Projects', type: 'project', score: 85, children: [
        { label: 'Prototype Tests', type: 'project', score: 85, projectDetails: { status: 'Active', deadline: 'Next Month', description: 'V2', budget: '$5k' }, children: [] },
      ]},
      ...injectLeaves('dept_design', [
        { label: 'Research', type: 'branch', score: 90 },
        { label: 'Architecture', type: 'branch', score: 88 },
        { label: 'Design System', type: 'branch', score: 92 },
        { label: 'Prototyping', type: 'branch', score: 86 }
      ])
    ]),
  },
  {
    id: 'dept_security', label: 'Security', domain: 'control', cluster: 'Control', score: 69,
    metrics: { performance: 71, efficiency: 65, capacity: 68, alignment: 73, risk: 32 },
    internalNodes: buildTree('sec', [
      { label: 'Teams', type: 'team', score: 75, children: [
        { label: 'Cloud Sec', type: 'team', score: 78, memberCount: 4, members: genMembers(4, ['Sec Engineer']), children: []}
      ]},
      { label: 'Projects', type: 'project', score: 68, children: [
        { label: 'Pen Test', type: 'project', score: 68, projectDetails: { status: 'In Progress', deadline: 'Q3', description: 'Test', budget: '$40k' }, children: [] },
      ]},
      ...injectLeaves('dept_security', [
        { label: 'Identity', type: 'branch', score: 72 },
        { label: 'AppSec', type: 'branch', score: 70 },
        { label: 'Incident Resp', type: 'branch', score: 65 },
        { label: 'Compliance', type: 'branch', score: 60 }
      ])
    ]),
  },
  {
    id: 'dept_customer_success', label: 'Customer Success', domain: 'delivery', cluster: 'Delivery', score: 82,
    metrics: { performance: 84, efficiency: 80, capacity: 85, alignment: 83, risk: 15 },
    internalNodes: buildTree('cs', [
      { label: 'Teams', type: 'team', score: 80, children: [
        { label: 'Support Ops', type: 'team', score: 80, memberCount: 8, members: genMembers(8, ['Support Agent']), children: []}
      ]},
      { label: 'Projects', type: 'project', score: 85, children: [
        { label: 'Self-Serve', type: 'project', score: 82, projectDetails: { status: 'Active', deadline: 'Q3', description: 'Portal', budget: '$50k' }, children: [] },
      ]},
      ...injectLeaves('dept_customer_success', [
        { label: 'Onboarding', type: 'branch', score: 86 },
        { label: 'Support', type: 'branch', score: 80 },
        { label: 'Renewals', type: 'branch', score: 82 },
        { label: 'Feedback', type: 'branch', score: 88 }
      ])
    ]),
  },
  {
    id: 'dept_legal', label: 'Legal', domain: 'control', cluster: 'Control', score: 89,
    metrics: { performance: 91, efficiency: 88, capacity: 86, alignment: 92, risk: 9 },
    internalNodes: buildTree('leg', [
      { label: 'Teams', type: 'team', score: 90, children: [
        { label: 'Compliance', type: 'team', score: 92, memberCount: 3, members: genMembers(3, ['Counsel']), children: [] }
      ]},
      { label: 'Projects', type: 'project', score: 86, children: [
        { label: 'Data Mapping', type: 'project', score: 86, projectDetails: { status: 'Planning', deadline: 'Q4', description: 'Privacy', budget: '$60k' }, children: [] },
      ]},
      ...injectLeaves('dept_legal', [
        { label: 'Contracts', type: 'branch', score: 90 },
        { label: 'Privacy', type: 'branch', score: 88 },
        { label: 'Governance', type: 'branch', score: 92 },
        { label: 'IP Mgmt', type: 'branch', score: 89 }
      ])
    ]),
  },
  {
    id: 'dept_strategy', label: 'Strategy', domain: 'direction', cluster: 'Direction', score: 95,
    metrics: { performance: 97, efficiency: 94, capacity: 92, alignment: 98, risk: 4 },
    internalNodes: buildTree('str', [
      { label: 'Teams', type: 'team', score: 95, children: [
        { label: 'Strategy Team', type: 'team', score: 96, memberCount: 4, members: genMembers(4, ['Strategist']), children: [] }
      ]},
      { label: 'Projects', type: 'project', score: 91, children: [
        { label: 'M&A Pipeline', type: 'project', score: 91, projectDetails: { status: 'Active', deadline: 'Ongoing', description: 'M&A', budget: 'Undisclosed' }, children: [] },
      ]},
      ...injectLeaves('dept_strategy', [
        { label: 'Vision', type: 'branch', score: 96 },
        { label: 'OKRs', type: 'branch', score: 95 },
        { label: 'Market Intel', type: 'branch', score: 93 },
        { label: 'Rhythm', type: 'branch', score: 96 }
      ])
    ]),
  },
];

const ACTIVE_DEPT_COUNT = DEPARTMENTS.length;
const { totalNodes, inactiveCount } = resolvePolytopeNodeCount(ACTIVE_DEPT_COUNT);

const inactiveNodes: UExternalNode[] = Array.from({ length: inactiveCount }).map((_, i) => ({
  id: `node_inactive_${i}`,
  label: `Node ${i + 1}`,
  domain: 'inactive' as UDomain,
  cluster: 'None',
  score: 0,
  metrics: { performance: 0, efficiency: 0, capacity: 0, alignment: 0, risk: 0 },
  internalNodes: [],
}));

export const U_NODES: UExternalNode[] = (() => {
  const result: UExternalNode[] = [];
  let ai = 0, ii = 0;
  const ratio = inactiveCount / ACTIVE_DEPT_COUNT;
  let inactiveAcc = 0;
  for (let total = 0; total < totalNodes; total++) {
    inactiveAcc += ratio;
    if (ii < inactiveCount && inactiveAcc >= 1) {
      result.push(inactiveNodes[ii++]);
      inactiveAcc -= 1;
    } else if (ai < ACTIVE_DEPT_COUNT) {
      result.push(DEPARTMENTS[ai++]);
    } else {
      result.push(inactiveNodes[ii++]);
    }
  }
  return result;
})();
