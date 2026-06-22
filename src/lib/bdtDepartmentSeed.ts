/**
 * BDT department internal trees — 6 root nodes per department:
 * Teams, Projects (7–8), and 4 department-specific branch nodes from
 * Company_Department_Root_Branch_Action_Node_Framework.md
 */
import type { UInternalNode } from './bdtPolytopeData';

type InternalDef = {
  label: string;
  type: UInternalNode['type'];
  score: number;
  memberCount?: number;
  members?: UInternalNode['members'];
  projectDetails?: UInternalNode['projectDetails'];
  owner?: string;
  dueDate?: string;
  status?: UInternalNode['status'];
  output?: string;
  metricImpact?: string;
  dependencies?: string[];
  workflowSteps?: string[];
  interrelatedDepartments?: string[];
  signalDetails?: UInternalNode['signalDetails'];
  decisionDetails?: UInternalNode['decisionDetails'];
  metricDetails?: UInternalNode['metricDetails'];
  actionDetails?: UInternalNode['actionDetails'];
  children?: InternalDef[];
};

type BranchDef = { label: string; score: number; leaves: [InternalDef, InternalDef] };

type DeptSeed = {
  teams: { label: string; score: number; roles: string[]; count: number }[];
  projects: { label: string; score: number; status: string; deadline: string; description: string; budget: string }[];
  branches: BranchDef[];
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
    signalDetails: d.signalDetails,
    decisionDetails: d.decisionDetails,
    metricDetails: d.metricDetails,
    actionDetails: d.actionDetails,
    children: d.children ? buildTree(`${parentId}_d${depth}_${i}`, d.children, depth + 1) : [],
  }));
}

function genMembers(count: number, roles: string[]): UInternalNode['members'] {
  return Array.from({ length: count }).map((_, i) => ({
    name: `Member ${i + 1}`,
    role: roles[i % roles.length],
    avatarUrl: `https://i.pravatar.cc/150?u=bdt${count}${i}`,
  }));
}

function metricLeaf(label: string, name: string, value: number, target: number, unit: string, status: 'healthy' | 'warning' | 'critical' = 'healthy'): InternalDef {
  return {
    label,
    type: 'metric',
    score: 82 + Math.floor(Math.random() * 8),
    owner: 'Metrics Owner',
    status: 'In Progress',
    output: `${name} report`,
    metricImpact: name,
    metricDetails: { name, value, target, unit, trend: value >= target ? 'up' : 'down', status },
    workflowSteps: ['Pull latest data', 'Validate against target', 'Document variance', 'Share with stakeholders'],
  };
}

function signalLeaf(label: string, summary: string, severity: 'low' | 'medium' | 'high' | 'critical', source: string): InternalDef {
  return {
    label,
    type: 'signal',
    score: 78 + Math.floor(Math.random() * 10),
    owner: 'Signal Monitor',
    status: severity === 'critical' || severity === 'high' ? 'Blocked' : 'Open',
    output: 'Signal triage note',
    metricImpact: 'Risk awareness',
    signalDetails: { summary, severity, source, detectedAt: 'Today', suggestedAction: 'Review and assign owner within 24h' },
    workflowSteps: ['Acknowledge signal', 'Assess impact', 'Route to owner', 'Track resolution'],
  };
}

function decisionLeaf(
  label: string,
  question: string,
  options: { id: string; label: string; description: string; impact: string }[],
  recommendation?: string,
): InternalDef {
  return {
    label,
    type: 'decision',
    score: 85 + Math.floor(Math.random() * 8),
    owner: 'Decision Owner',
    status: 'Open',
    output: 'Decision record',
    metricImpact: 'Strategic alignment',
    decisionDetails: { question, context: 'Cross-functional input required before committing resources.', options, recommendation },
    workflowSteps: ['Gather evidence', 'Consult stakeholders', 'Evaluate options', 'Record decision'],
  };
}

function actionLeaf(label: string, verb: string, checklist: string[]): InternalDef {
  return {
    label,
    type: 'action',
    score: 80 + Math.floor(Math.random() * 12),
    owner: 'Action Owner',
    status: 'In Progress',
    output: 'Completed artifact',
    metricImpact: 'Execution velocity',
    actionDetails: { verb, description: `${verb} for ${label}`, checklist },
    workflowSteps: checklist,
  };
}

function branchNode(branch: BranchDef): InternalDef {
  return {
    label: branch.label,
    type: 'branch',
    score: branch.score,
    children: branch.leaves.map(l => ({ ...l, interrelatedDepartments: l.interrelatedDepartments })),
  };
}

const ALL_DEPTS = [
  'dept_engineering', 'dept_product', 'dept_sales', 'dept_marketing',
  'dept_hr', 'dept_finance', 'dept_operations', 'dept_data',
  'dept_design', 'dept_security', 'dept_customer_success', 'dept_legal', 'dept_strategy',
];

function pickRelated(deptId: string, n = 2): string[] {
  const others = ALL_DEPTS.filter(d => d !== deptId);
  return others.slice(0, n);
}

function attachRelated(deptId: string, leaves: InternalDef[]): InternalDef[] {
  return leaves.map((l, i) => ({ ...l, interrelatedDepartments: pickRelated(deptId, 2 + (i % 2)) }));
}

const DEPT_SEEDS: Record<string, DeptSeed> = {
  dept_engineering: {
    teams: [
      { label: 'Backend Team', score: 90, roles: ['Tech Lead', 'Backend Engineer', 'DBA'], count: 5 },
      { label: 'Frontend Team', score: 86, roles: ['Frontend Lead', 'UI Engineer'], count: 4 },
    ],
    projects: [
      { label: 'DB Migrations', score: 76, status: 'In Progress', deadline: 'Q3', description: 'Migrate core database to new cluster with zero-downtime cutover', budget: '$50k' },
      { label: 'Design System v2', score: 88, status: 'Active', deadline: 'Q2', description: 'Universal component library rollout across apps', budget: '$35k' },
      { label: 'API Gateway', score: 82, status: 'Planning', deadline: 'Q4', description: 'Centralized API gateway and rate limiting', budget: '$40k' },
      { label: 'Observability Stack', score: 79, status: 'In Progress', deadline: 'Q3', description: 'Unified logging, metrics, and tracing platform', budget: '$28k' },
      { label: 'Mobile SDK', score: 74, status: 'Active', deadline: 'Q4', description: 'Cross-platform mobile SDK for partners', budget: '$60k' },
      { label: 'Performance Sprint', score: 85, status: 'Active', deadline: 'Q2', description: 'Core web vitals and API latency improvements', budget: '$15k' },
      { label: 'Legacy Decommission', score: 70, status: 'Planning', deadline: '2027', description: 'Retire monolith services safely', budget: '$90k' },
      { label: 'CI/CD Hardening', score: 83, status: 'In Progress', deadline: 'Q3', description: 'Pipeline security gates and deployment automation', budget: '$22k' },
    ],
    branches: [
      {
        label: 'Architecture & System Design',
        score: 85,
        leaves: [
          decisionLeaf('Approve ADR', 'Which service boundary should own billing events?', [
            { id: 'a', label: 'Monolith module', description: 'Keep in core app for speed', impact: 'Lower short-term cost, higher coupling' },
            { id: 'b', label: 'Dedicated billing service', description: 'Extract microservice now', impact: 'Higher upfront cost, cleaner long-term' },
            { id: 'c', label: 'Hybrid event bus', description: 'Async events with shared schema', impact: 'Balanced decoupling and velocity' },
          ], 'c'),
          metricLeaf('Architecture review rate', 'ADR review completion', 92, 95, '%', 'warning'),
        ],
      },
      {
        label: 'Release Engineering',
        score: 80,
        leaves: [
          actionLeaf('Schedule release', 'Deploy', ['Run release checklist', 'Validate staging', 'Deploy to production', 'Monitor error budget']),
          metricLeaf('Deployment frequency', 'Deployments per week', 4, 5, 'releases', 'warning'),
        ],
      },
      {
        label: 'Quality & Testing',
        score: 82,
        leaves: [
          actionLeaf('Triage escaped defect', 'Fix', ['Reproduce issue', 'Root-cause analysis', 'Patch and test', 'Update regression suite']),
          signalLeaf('Regression risk alert', 'Test coverage dropped 8% on payments module after last merge', 'high', 'CI pipeline'),
        ],
      },
      {
        label: 'Reliability & DevOps',
        score: 78,
        leaves: [
          actionLeaf('Investigate incident', 'Resolve', ['Acknowledge alert', 'Form incident channel', 'Mitigate user impact', 'Postmortem']),
          metricLeaf('MTTR', 'Mean time to recovery', 42, 30, 'minutes', 'critical'),
        ],
      },
    ],
  },
  dept_product: {
    teams: [
      { label: 'Product Core', score: 91, roles: ['Product Manager', 'Analyst'], count: 4 },
      { label: 'User Research', score: 89, roles: ['UX Researcher', 'Designer'], count: 3 },
    ],
    projects: [
      { label: 'Q3 Milestones', score: 91, status: 'Planning', deadline: 'Q3', description: 'Quarterly product deliverables and OKR alignment', budget: '$100k' },
      { label: 'Q4 Roadmap', score: 88, status: 'Draft', deadline: 'Q4', description: 'Next-quarter strategic roadmap', budget: '$120k' },
      { label: 'Activation Revamp', score: 86, status: 'Active', deadline: 'Q2', description: 'Improve first-session activation funnel', budget: '$45k' },
      { label: 'Enterprise Tier', score: 84, status: 'In Progress', deadline: 'Q3', description: 'Enterprise feature pack and packaging', budget: '$80k' },
      { label: 'Mobile Parity', score: 79, status: 'Active', deadline: 'Q4', description: 'Feature parity for mobile clients', budget: '$55k' },
      { label: 'Pricing Experiment', score: 82, status: 'Active', deadline: 'Q2', description: 'Test usage-based pricing model', budget: '$20k' },
      { label: 'Voice of Customer Hub', score: 87, status: 'Planning', deadline: 'Q3', description: 'Centralize feedback from CS and sales', budget: '$30k' },
      { label: 'Beta Program', score: 83, status: 'Active', deadline: 'Ongoing', description: 'Early-access customer cohort program', budget: '$25k' },
    ],
    branches: [
      {
        label: 'Roadmap & Prioritization',
        score: 92,
        leaves: [
          decisionLeaf('Prioritize feature', 'Which initiative wins Q3 slot: AI assistant or SSO?', [
            { id: 'ai', label: 'AI assistant', description: 'High differentiation, longer build', impact: 'Revenue upside in enterprise' },
            { id: 'sso', label: 'Enterprise SSO', description: 'Table stakes for deals', impact: 'Unblocks pipeline faster' },
          ], 'sso'),
          actionLeaf('Update roadmap', 'Publish', ['Review inputs', 'Score by impact', 'Publish roadmap update', 'Notify GTM']),
        ],
      },
      {
        label: 'Requirements / PRDs',
        score: 89,
        leaves: [
          actionLeaf('Create PRD', 'Draft', ['Problem statement', 'Acceptance criteria', 'Dependencies', 'Review with eng']),
          metricLeaf('PRD clarity score', 'Requirement clarity index', 78, 85, 'score', 'warning'),
        ],
      },
      {
        label: 'Experimentation & Validation',
        score: 85,
        leaves: [
          actionLeaf('Launch experiment', 'Run', ['Define hypothesis', 'Set success metrics', 'Ship variant', 'Analyze results']),
          signalLeaf('Experiment result signal', 'Variant B shows +12% activation but -3% retention in week 1', 'medium', 'Product analytics'),
        ],
      },
      {
        label: 'Adoption & Retention',
        score: 88,
        leaves: [
          metricLeaf('30-day retention', 'Retention rate', 68, 75, '%', 'warning'),
          actionLeaf('Investigate churn', 'Analyze', ['Pull cohort data', 'Interview churned users', 'Identify drivers', 'Propose fixes']),
        ],
      },
    ],
  },
  dept_sales: {
    teams: [
      { label: 'Enterprise Sales', score: 83, roles: ['Account Executive', 'Sales Engineer'], count: 4 },
      { label: 'SMB Sales', score: 75, roles: ['SDR', 'Account Manager'], count: 5 },
    ],
    projects: [
      { label: 'CRM Migration', score: 65, status: 'In Progress', deadline: 'Q2', description: 'Salesforce migration and data hygiene', budget: '$80k' },
      { label: 'Outbound Playbook', score: 72, status: 'Active', deadline: 'Q2', description: 'Standardized enterprise outbound motion', budget: '$15k' },
      { label: 'Partner Channel', score: 70, status: 'Planning', deadline: 'Q3', description: 'Launch reseller partner program', budget: '$40k' },
      { label: 'Sales Enablement Hub', score: 78, status: 'Active', deadline: 'Q2', description: 'Battlecards, decks, and objection library', budget: '$25k' },
      { label: 'Forecast Model', score: 74, status: 'In Progress', deadline: 'Q3', description: 'Revamp commit vs best-case forecasting', budget: '$10k' },
      { label: 'Territory Rebalance', score: 69, status: 'Planning', deadline: 'Q4', description: 'Re-segment territories by ICP fit', budget: '$5k' },
      { label: 'Win/Loss Program', score: 76, status: 'Active', deadline: 'Ongoing', description: 'Structured win/loss interviews', budget: '$12k' },
      { label: 'Pricing Pilot', score: 71, status: 'Active', deadline: 'Q3', description: 'Test tiered packaging with 10 accounts', budget: '$8k' },
    ],
    branches: [
      {
        label: 'Lead & Account Pipeline',
        score: 75,
        leaves: [
          actionLeaf('Qualify opportunity', 'Update', ['Review discovery notes', 'Update CRM stage', 'Set next step', 'Flag risks']),
          metricLeaf('Pipeline coverage', 'Pipeline vs quota', 2.8, 3.5, 'x', 'warning'),
        ],
      },
      {
        label: 'Discovery & Demo',
        score: 78,
        leaves: [
          actionLeaf('Run discovery call', 'Conduct', ['Prep account research', 'Run call', 'Capture pains', 'Update qualification']),
          signalLeaf('Deal risk signal', 'Champion went silent 14 days; competitor mentioned in last call', 'high', 'CRM activity'),
        ],
      },
      {
        label: 'Proposal & Negotiation',
        score: 76,
        leaves: [
          decisionLeaf('Discount approval', 'Approve 18% discount for 3-year enterprise deal?', [
            { id: 'yes', label: 'Approve 18%', description: 'Close this quarter', impact: 'Hit target, lower margin' },
            { id: 'no', label: 'Hold at 12%', description: 'Protect margin', impact: 'Risk slip to next quarter' },
            { id: 'split', label: 'Approve with services bundle', description: 'Trade discount for services', impact: 'Balanced margin and close rate' },
          ]),
          actionLeaf('Send proposal', 'Deliver', ['Finalize scope', 'Legal review', 'Send proposal', 'Schedule follow-up']),
        ],
      },
      {
        label: 'Forecasting',
        score: 82,
        leaves: [
          metricLeaf('Forecast accuracy', 'Forecast vs actual', 82, 90, '%', 'warning'),
          actionLeaf('Update forecast', 'Commit', ['Review open deals', 'Adjust commit', 'Document slippage', 'Share with leadership']),
        ],
      },
    ],
  },
  dept_marketing: {
    teams: [{ label: 'Brand & Content', score: 80, roles: ['Content Marketer', 'SEO Specialist', 'Designer'], count: 4 }],
    projects: [
      { label: 'Summer Campaign', score: 65, status: 'Active', deadline: 'Aug', description: 'Seasonal demand generation campaign', budget: '$200k' },
      { label: 'Website Refresh', score: 72, status: 'In Progress', deadline: 'Q3', description: 'New positioning and conversion pages', budget: '$45k' },
      { label: 'Content Engine', score: 70, status: 'Active', deadline: 'Q2', description: 'Weekly thought leadership program', budget: '$30k' },
      { label: 'Partner Webinar Series', score: 68, status: 'Planning', deadline: 'Q3', description: 'Co-marketing with integration partners', budget: '$25k' },
      { label: 'ABM Pilot', score: 74, status: 'Active', deadline: 'Q2', description: 'Account-based marketing for top 50 accounts', budget: '$50k' },
      { label: 'Brand Guidelines v3', score: 77, status: 'In Progress', deadline: 'Q2', description: 'Updated visual identity system', budget: '$18k' },
      { label: 'SEO Recovery', score: 66, status: 'Active', deadline: 'Q3', description: 'Recover organic traffic after site migration', budget: '$22k' },
      { label: 'Event Sponsorship', score: 69, status: 'Planning', deadline: 'Q4', description: 'Industry conference presence plan', budget: '$75k' },
    ],
    branches: [
      { label: 'Positioning & Messaging', score: 80, leaves: [actionLeaf('Revise positioning', 'Update', ['Research ICP', 'Draft narrative', 'Test with sales', 'Publish messaging doc']), metricLeaf('Message clarity', 'Sales message fit score', 72, 80, 'score', 'warning')] },
      { label: 'Demand Generation', score: 70, leaves: [actionLeaf('Launch campaign', 'Execute', ['Brief creative', 'Set audiences', 'Launch ads', 'Review performance']), signalLeaf('CAC spike signal', 'Paid search CAC up 22% WoW on branded terms', 'medium', 'Ad platform')] },
      { label: 'Content & Thought Leadership', score: 78, leaves: [actionLeaf('Publish case study', 'Publish', ['Select customer', 'Draft story', 'Legal approval', 'Distribute']), metricLeaf('Content-attributed MQLs', 'MQLs from content', 145, 180, 'leads', 'warning')] },
      { label: 'Marketing Analytics', score: 75, leaves: [metricLeaf('MQL-to-SQL rate', 'Conversion rate', 18, 22, '%', 'warning'), actionLeaf('Analyze funnel drop', 'Investigate', ['Pull funnel data', 'Identify step', 'Hypothesize cause', 'Recommend fix'])] },
    ],
  },
  dept_hr: {
    teams: [{ label: 'Recruitment', score: 88, roles: ['Recruiter', 'Sourcer', 'Coordinator'], count: 3 }],
    projects: [
      { label: 'L&D Programs', score: 84, status: 'Planning', deadline: 'Q4', description: 'Learning paths by role family', budget: '$40k' },
      { label: 'Employer Brand', score: 82, status: 'Active', deadline: 'Q3', description: 'Careers site and culture content refresh', budget: '$35k' },
      { label: 'Performance Cycle', score: 86, status: 'In Progress', deadline: 'Q2', description: 'Mid-year review process rollout', budget: '$12k' },
      { label: 'HRIS Upgrade', score: 78, status: 'Planning', deadline: '2027', description: 'Replace legacy HR information system', budget: '$120k' },
      { label: 'DEI Initiatives', score: 80, status: 'Active', deadline: 'Ongoing', description: 'Inclusive hiring and retention programs', budget: '$25k' },
      { label: 'Manager Training', score: 83, status: 'Active', deadline: 'Q3', description: 'New manager enablement cohorts', budget: '$18k' },
      { label: 'Comp Benchmark', score: 79, status: 'In Progress', deadline: 'Q2', description: 'Annual compensation benchmarking study', budget: '$8k' },
      { label: 'Remote Policy v2', score: 77, status: 'Draft', deadline: 'Q3', description: 'Update hybrid work policy and guidelines', budget: '$5k' },
    ],
    branches: [
      { label: 'Workforce Planning', score: 88, leaves: [decisionLeaf('Open new role', 'Approve Senior PM hire for Q3?', [{ id: 'y', label: 'Approve', description: 'Backlog justifies headcount', impact: 'Capacity for roadmap' }, { id: 'n', label: 'Defer', description: 'Wait for revenue signal', impact: 'Preserve runway' }], 'y'), metricLeaf('Headcount vs plan', 'Plan accuracy', 94, 98, '%')] },
      { label: 'Recruiting Pipeline', score: 85, leaves: [actionLeaf('Schedule interview', 'Coordinate', ['Review resume', 'Schedule panel', 'Send prep materials', 'Collect feedback']), metricLeaf('Time to hire', 'Average days to offer', 38, 30, 'days', 'warning')] },
      { label: 'Onboarding', score: 88, leaves: [actionLeaf('Create onboarding plan', 'Prepare', ['Assign buddy', 'Provision access', 'Schedule week-1', 'Check ramp milestones']), metricLeaf('Time to productivity', 'Ramp days', 45, 35, 'days', 'warning')] },
      { label: 'Engagement & Culture', score: 82, leaves: [signalLeaf('Engagement dip signal', 'Engineering eNPS dropped 12 points in latest pulse', 'medium', 'Pulse survey'), actionLeaf('Run pulse follow-up', 'Facilitate', ['Analyze themes', 'Manager sessions', 'Action plan', 'Communicate back'])] },
    ],
  },
  dept_finance: {
    teams: [{ label: 'FP&A Team', score: 96, roles: ['Financial Analyst', 'Controller'], count: 4 }],
    projects: [
      { label: 'Audit 2026', score: 88, status: 'Preparation', deadline: 'Dec', description: 'Annual financial audit readiness', budget: '$10k' },
      { label: 'Billing Automation', score: 85, status: 'In Progress', deadline: 'Q3', description: 'Automate invoice generation and collections', budget: '$45k' },
      { label: 'Unit Economics Model', score: 90, status: 'Active', deadline: 'Q2', description: 'Refresh CAC/LTV and contribution margin model', budget: '$8k' },
      { label: 'Expense Policy Refresh', score: 82, status: 'Draft', deadline: 'Q2', description: 'Update T&E and procurement thresholds', budget: '$3k' },
      { label: 'Treasury Review', score: 87, status: 'Planning', deadline: 'Q3', description: 'Cash management and FX hedging review', budget: '$5k' },
      { label: 'Board Pack Automation', score: 84, status: 'Active', deadline: 'Q2', description: 'Automate monthly board reporting pack', budget: '$15k' },
      { label: 'Pricing Analysis', score: 86, status: 'In Progress', deadline: 'Q3', description: 'Packaging and discount impact analysis', budget: '$12k' },
      { label: 'SOC2 Cost Model', score: 80, status: 'Planning', deadline: 'Q4', description: 'Compliance investment planning', budget: '$20k' },
    ],
    branches: [
      { label: 'Budgeting & Allocation', score: 92, leaves: [decisionLeaf('Reallocate budget', 'Shift $200k from marketing to product for Q3?', [{ id: 'y', label: 'Reallocate', description: 'Product bottleneck', impact: 'Faster shipping' }, { id: 'n', label: 'Hold', description: 'Pipeline needs leads', impact: 'Protect top-of-funnel' }]), actionLeaf('Review variance', 'Analyze', ['Pull dept actuals', 'Explain variance', 'Recommend actions', 'Update forecast'])] },
      { label: 'Cash & Runway', score: 95, leaves: [metricLeaf('Runway months', 'Cash runway', 14, 18, 'months', 'warning'), signalLeaf('Burn spike signal', 'Monthly burn increased 9% due to cloud and contractor costs', 'high', 'Finance ledger')] },
      { label: 'Accounting & Close', score: 90, leaves: [actionLeaf('Close month', 'Execute', ['Reconcile accounts', 'Review accruals', 'Publish statements', 'Sign off']), metricLeaf('Close cycle time', 'Days to close', 6, 5, 'days', 'warning')] },
      { label: 'Forecasting & Planning', score: 96, leaves: [actionLeaf('Update forecast', 'Model', ['Refresh assumptions', 'Scenario stress test', 'Leadership review', 'Publish']), metricLeaf('Forecast accuracy', 'Revenue forecast error', 6, 5, '%', 'healthy')] },
    ],
  },
  dept_operations: {
    teams: [{ label: 'Logistics Team', score: 62, roles: ['Ops Manager', 'Coordinator'], count: 7 }],
    projects: [
      { label: 'Warehouse Expansion', score: 50, status: 'Delayed', deadline: 'Q4', description: 'Expand fulfillment capacity', budget: '$1M' },
      { label: 'Vendor Scorecard', score: 58, status: 'Active', deadline: 'Q2', description: 'Standardize vendor performance reviews', budget: '$12k' },
      { label: 'SOP Library', score: 60, status: 'In Progress', deadline: 'Q3', description: 'Document core operational procedures', budget: '$20k' },
      { label: 'SLA Dashboard', score: 55, status: 'Planning', deadline: 'Q3', description: 'Real-time SLA monitoring for delivery', budget: '$30k' },
      { label: 'Procurement Portal', score: 57, status: 'Active', deadline: 'Q4', description: 'Self-serve PO and approval workflow', budget: '$45k' },
      { label: 'Quality Audit Program', score: 59, status: 'Active', deadline: 'Q2', description: 'Quarterly QC audits across sites', budget: '$18k' },
      { label: 'Continuity Drill', score: 54, status: 'Planning', deadline: 'Q3', description: 'Business continuity tabletop exercise', budget: '$8k' },
      { label: 'Capacity Model', score: 56, status: 'In Progress', deadline: 'Q2', description: 'Demand-capacity planning model', budget: '$15k' },
    ],
    branches: [
      { label: 'Process Architecture', score: 58, leaves: [actionLeaf('Create SOP', 'Document', ['Map current state', 'Identify bottlenecks', 'Draft SOP', 'Train team']), metricLeaf('SOP coverage', 'Processes documented', 62, 80, '%', 'critical')] },
      { label: 'Procurement & Vendors', score: 62, leaves: [decisionLeaf('Select vendor', 'Choose logistics partner for APAC?', [{ id: 'a', label: 'Vendor A', description: 'Lower cost', impact: 'Slower SLA' }, { id: 'b', label: 'Vendor B', description: 'Premium SLA', impact: 'Higher cost' }], 'b'), actionLeaf('Issue PO', 'Procure', ['Validate need', 'Approve budget', 'Issue PO', 'Track delivery'])] },
      { label: 'Delivery / Fulfillment', score: 59, leaves: [metricLeaf('On-time delivery', 'OTD rate', 91, 95, '%', 'warning'), signalLeaf('Fulfillment delay signal', '3 high-value orders delayed >48h at west hub', 'high', 'WMS')] },
      { label: 'Quality Control', score: 60, leaves: [actionLeaf('Run QC check', 'Inspect', ['Sample batch', 'Record defects', 'Corrective action', 'Update standard']), metricLeaf('Defect rate', 'Defects per 1k units', 4.2, 3, 'defects', 'warning')] },
    ],
  },
  dept_data: {
    teams: [
      { label: 'Data Engineering', score: 80, roles: ['Data Engineer', 'Architect'], count: 5 },
      { label: 'BI & Analytics', score: 75, roles: ['BI Analyst', 'Data Scientist'], count: 3 },
    ],
    projects: [
      { label: 'Dashboard Suite', score: 78, status: 'Active', deadline: 'Q3', description: 'Executive and dept self-serve dashboards', budget: '$30k' },
      { label: 'ML Platform', score: 72, status: 'Planning', deadline: '2027', description: 'Feature store and model serving', budget: '$150k' },
      { label: 'Event Taxonomy', score: 76, status: 'In Progress', deadline: 'Q2', description: 'Standardize product analytics events', budget: '$15k' },
      { label: 'Data Quality Program', score: 74, status: 'Active', deadline: 'Q3', description: 'Automated quality checks on core tables', budget: '$25k' },
      { label: 'Warehouse Migration', score: 70, status: 'Planning', deadline: 'Q4', description: 'Move to next-gen warehouse layer', budget: '$90k' },
      { label: 'Experiment Platform', score: 77, status: 'Active', deadline: 'Q3', description: 'Self-serve A/B testing infrastructure', budget: '$40k' },
      { label: 'Metric Dictionary', score: 79, status: 'In Progress', deadline: 'Q2', description: 'Company-wide KPI definitions and owners', budget: '$10k' },
      { label: 'Privacy Analytics', score: 73, status: 'Planning', deadline: 'Q4', description: 'PII-safe analytics pipelines', budget: '$35k' },
    ],
    branches: [
      { label: 'Data Pipelines & Warehouse', score: 80, leaves: [actionLeaf('Fix pipeline', 'Repair', ['Identify failure', 'Patch transform', 'Backfill data', 'Add monitor']), metricLeaf('Pipeline freshness', 'Max lag', 2.5, 1, 'hours', 'warning')] },
      { label: 'Metric Definitions', score: 75, leaves: [decisionLeaf('Resolve metric dispute', 'Which definition for active user?', [{ id: 'dau', label: 'Daily active', description: 'Any session', impact: 'Higher number' }, { id: 'wau', label: 'Weekly core action', description: 'Key action only', impact: 'Better product signal' }], 'wau'), actionLeaf('Define metric', 'Document', ['Draft logic', 'Stakeholder review', 'Publish dictionary', 'Assign owner'])] },
      { label: 'Dashboards & Reporting', score: 78, leaves: [actionLeaf('Build dashboard', 'Create', ['Gather requirements', 'Model data', 'Build viz', 'Launch']), metricLeaf('Dashboard adoption', 'Weekly active viewers', 42, 60, 'users', 'warning')] },
      { label: 'Insights & Decision Support', score: 80, leaves: [signalLeaf('Anomaly signal', 'Checkout conversion dropped 15% after deploy', 'high', 'Product analytics'), actionLeaf('Publish insight', 'Analyze', ['Deep dive', 'Quantify impact', 'Recommend action', 'Present to stakeholders'])] },
    ],
  },
  dept_design: {
    teams: [
      { label: 'UX Research', score: 90, roles: ['UX Researcher'], count: 3 },
      { label: 'Visual Design', score: 87, roles: ['UI Designer', 'Motion Designer'], count: 4 },
    ],
    projects: [
      { label: 'Prototype Tests', score: 85, status: 'Active', deadline: 'Next Month', description: 'App V2 prototyping and validation', budget: '$5k' },
      { label: 'Icon Library', score: 84, status: 'Completed', deadline: 'Q1', description: 'Custom icon set for product suite', budget: '$10k' },
      { label: 'Design System Audit', score: 86, status: 'In Progress', deadline: 'Q2', description: 'Component consistency and accessibility audit', budget: '$12k' },
      { label: 'Mobile UX Refresh', score: 82, status: 'Active', deadline: 'Q3', description: 'Mobile navigation and layout refresh', budget: '$28k' },
      { label: 'Research Repository', score: 88, status: 'Planning', deadline: 'Q3', description: 'Centralize research insights and clips', budget: '$8k' },
      { label: 'Marketing Rebrand Support', score: 80, status: 'Active', deadline: 'Q2', description: 'Campaign creative and landing templates', budget: '$20k' },
      { label: 'Accessibility Sprint', score: 83, status: 'In Progress', deadline: 'Q2', description: 'WCAG AA remediation on core flows', budget: '$15k' },
      { label: 'Handoff Toolkit', score: 79, status: 'Planning', deadline: 'Q3', description: 'Figma-to-code specs and QA checklist', budget: '$6k' },
    ],
    branches: [
      { label: 'User Research', score: 90, leaves: [actionLeaf('Run usability test', 'Conduct', ['Recruit participants', 'Run sessions', 'Synthesize findings', 'Share insights']), metricLeaf('Research cadence', 'Studies per quarter', 3, 4, 'studies', 'warning')] },
      { label: 'Experience Architecture', score: 88, leaves: [decisionLeaf('Simplify flow', 'Remove step from onboarding?', [{ id: 'y', label: 'Remove step', description: 'Faster activation', impact: 'Less data captured' }, { id: 'n', label: 'Keep step', description: 'Better qualification', impact: 'Higher drop-off' }], 'y'), actionLeaf('Design user flow', 'Map', ['Identify jobs', 'Draft flow', 'Review with PM', 'Prototype'])] },
      { label: 'Design System', score: 92, leaves: [actionLeaf('Create component', 'Build', ['Define spec', 'Design states', 'Document usage', 'Publish']), metricLeaf('Component reuse', 'Reuse rate', 68, 75, '%', 'warning')] },
      { label: 'Design Handoff', score: 86, leaves: [actionLeaf('Prepare handoff', 'Deliver', ['Annotate specs', 'Export assets', 'Walkthrough with eng', 'QA review']), signalLeaf('Implementation mismatch', 'Button spacing inconsistent in checkout on iOS build', 'medium', 'Design QA')] },
    ],
  },
  dept_security: {
    teams: [{ label: 'Cloud Security', score: 78, roles: ['Security Engineer', 'Analyst'], count: 4 }],
    projects: [
      { label: 'Pen Test Cycle', score: 68, status: 'In Progress', deadline: 'Q3', description: 'Annual penetration testing program', budget: '$40k' },
      { label: 'Zero Trust Network', score: 65, status: 'Planning', deadline: 'Q4', description: 'Zero trust architecture rollout', budget: '$200k' },
      { label: 'Phishing Simulation', score: 70, status: 'Active', deadline: 'Ongoing', description: 'Employee phishing awareness program', budget: '$15k' },
      { label: 'SOC2 Type II', score: 72, status: 'In Progress', deadline: 'Q4', description: 'SOC2 audit preparation and evidence', budget: '$80k' },
      { label: 'Secrets Rotation', score: 66, status: 'Active', deadline: 'Q2', description: 'Automate secrets rotation across services', budget: '$25k' },
      { label: 'Vendor Security Reviews', score: 69, status: 'Active', deadline: 'Q3', description: 'Third-party risk assessment backlog', budget: '$12k' },
      { label: 'AppSec Training', score: 71, status: 'Planning', deadline: 'Q2', description: 'Secure coding training for engineers', budget: '$8k' },
      { label: 'Incident Playbooks', score: 67, status: 'In Progress', deadline: 'Q2', description: 'Update IR playbooks and run tabletop', budget: '$10k' },
    ],
    branches: [
      { label: 'Identity & Access', score: 72, leaves: [actionLeaf('Review access', 'Audit', ['Pull access report', 'Identify stale permissions', 'Revoke', 'Document']), metricLeaf('MFA adoption', 'MFA coverage', 94, 100, '%', 'warning')] },
      { label: 'Application Security', score: 70, leaves: [signalLeaf('Critical vulnerability', 'CVE flagged in auth service dependency — patch available', 'critical', 'SAST scanner'), actionLeaf('Patch vulnerability', 'Remediate', ['Assess exposure', 'Apply patch', 'Verify fix', 'Update ticket'])] },
      { label: 'Monitoring & Incident Response', score: 65, leaves: [actionLeaf('Investigate alert', 'Respond', ['Triage severity', 'Contain', 'Eradicate', 'Postmortem']), metricLeaf('MTTD', 'Mean time to detect', 18, 10, 'minutes', 'warning')] },
      { label: 'Compliance Readiness', score: 60, leaves: [decisionLeaf('Release gate', 'Block release until pen test findings resolved?', [{ id: 'block', label: 'Block release', description: 'High severity open', impact: 'Delay launch' }, { id: 'waive', label: 'Waive with exception', description: 'Compensating controls', impact: 'Accept residual risk' }], 'block'), actionLeaf('Collect evidence', 'Document', ['Map control', 'Gather artifacts', 'Review gaps', 'Submit to auditor'])] },
    ],
  },
  dept_customer_success: {
    teams: [{ label: 'Support Ops', score: 80, roles: ['Support Agent', 'CSM'], count: 8 }],
    projects: [
      { label: 'Self-Serve Portal', score: 82, status: 'Active', deadline: 'Q3', description: 'Customer self-service knowledge portal', budget: '$50k' },
      { label: 'Health Score v2', score: 84, status: 'In Progress', deadline: 'Q2', description: 'Predictive customer health model', budget: '$30k' },
      { label: 'QBR Template Pack', score: 80, status: 'Active', deadline: 'Q2', description: 'Standard QBR decks and success plans', budget: '$8k' },
      { label: 'Escalation Playbook', score: 78, status: 'In Progress', deadline: 'Q2', description: 'Executive escalation response process', budget: '$5k' },
      { label: 'Community Launch', score: 76, status: 'Planning', deadline: 'Q4', description: 'Customer community and champions program', budget: '$40k' },
      { label: 'Onboarding Automation', score: 85, status: 'Active', deadline: 'Q3', description: 'Automated onboarding milestones and emails', budget: '$22k' },
      { label: 'NPS Recovery', score: 79, status: 'Active', deadline: 'Q2', description: 'Detractor outreach and save program', budget: '$10k' },
      { label: 'Support AI Assist', score: 81, status: 'Planning', deadline: 'Q4', description: 'AI-assisted ticket triage pilot', budget: '$35k' },
    ],
    branches: [
      { label: 'Customer Onboarding', score: 86, leaves: [actionLeaf('Create success plan', 'Draft', ['Kickoff call', 'Define milestones', 'Assign CSM', 'Confirm activation']), metricLeaf('Time to value', 'Days to first value', 21, 14, 'days', 'warning')] },
      { label: 'Support & Ticketing', score: 80, leaves: [actionLeaf('Resolve ticket', 'Close', ['Triage', 'Reproduce', 'Fix or escalate', 'Confirm with customer']), metricLeaf('First response time', 'Median FRT', 3.2, 2, 'hours', 'warning')] },
      { label: 'Customer Health', score: 84, leaves: [signalLeaf('Churn risk signal', 'Usage down 40% WoW on 3 enterprise accounts', 'high', 'Health score model'), actionLeaf('Trigger intervention', 'Engage', ['Review account', 'Outreach plan', 'Exec sponsor', 'Track save'])] },
      { label: 'Renewals & Expansion', score: 82, leaves: [decisionLeaf('Expansion proposal', 'Offer 20% upsell bundle to at-risk renewals?', [{ id: 'y', label: 'Offer bundle', description: 'Retention lever', impact: 'Lower ARPU short term' }, { id: 'n', label: 'Standard renewal', description: 'Protect price', impact: 'Higher churn risk' }]), actionLeaf('Schedule QBR', 'Book', ['Prep deck', 'Review usage', 'Identify expansion', 'Send follow-up'])] },
    ],
  },
  dept_legal: {
    teams: [{ label: 'Compliance Team', score: 92, roles: ['Legal Counsel', 'Compliance Officer'], count: 3 }],
    projects: [
      { label: 'Data Mapping', score: 86, status: 'Planning', deadline: 'Q4', description: 'Enterprise data mapping for privacy compliance', budget: '$60k' },
      { label: 'MSA Template Refresh', score: 88, status: 'In Progress', deadline: 'Q2', description: 'Update standard customer MSAs', budget: '$12k' },
      { label: 'Policy Training Rollout', score: 85, status: 'Active', deadline: 'Q3', description: 'Company-wide policy awareness training', budget: '$8k' },
      { label: 'IP Portfolio Review', score: 87, status: 'Planning', deadline: 'Q4', description: 'Trademark and patent portfolio audit', budget: '$25k' },
      { label: 'Vendor Contract Cleanup', score: 84, status: 'Active', deadline: 'Q3', description: 'Renegotiate high-risk vendor terms', budget: '$15k' },
      { label: 'Privacy Impact Assessments', score: 83, status: 'In Progress', deadline: 'Q2', description: 'PIA backlog for new features', budget: '$10k' },
      { label: 'Board Governance Pack', score: 89, status: 'Active', deadline: 'Q2', description: 'Board consents and governance records', budget: '$5k' },
      { label: 'Regulatory Watch', score: 82, status: 'Ongoing', deadline: 'Ongoing', description: 'Track regulatory changes affecting product', budget: '$7k' },
    ],
    branches: [
      { label: 'Contracts & Agreements', score: 90, leaves: [actionLeaf('Review contract', 'Redline', ['Initial review', 'Mark risky clauses', 'Negotiate', 'Final approval']), metricLeaf('Contract turnaround', 'Median days', 8, 5, 'days', 'warning')] },
      { label: 'Privacy & Data Protection', score: 88, leaves: [decisionLeaf('Approve DPA', 'Accept customer DPA with custom subprocessors list?', [{ id: 'y', label: 'Accept with addendum', description: 'Close deal', impact: 'Operational overhead' }, { id: 'n', label: 'Reject custom list', description: 'Standard DPA only', impact: 'Deal delay' }]), actionLeaf('Respond to DSAR', 'Process', ['Verify identity', 'Locate data', 'Redact third parties', 'Deliver response'])] },
      { label: 'Corporate Governance', score: 92, leaves: [actionLeaf('Prepare board consent', 'Draft', ['Draft resolution', 'Circulate', 'Collect signatures', 'File']), metricLeaf('Governance completeness', 'Required docs on file', 96, 100, '%')] },
      { label: 'Risk Review & Approvals', score: 89, leaves: [signalLeaf('High-risk deal flag', 'Non-standard liability cap requested on $500k deal', 'high', 'Sales legal queue'), decisionLeaf('Approve exception', 'Allow uncapped liability for strategic logo?', [{ id: 'no', label: 'Deny', description: 'Policy violation', impact: 'Protect company' }, { id: 'yes', label: 'Approve with cap', description: 'Negotiate middle ground', impact: 'Enable close' }], 'yes')] },
    ],
  },
  dept_strategy: {
    teams: [{ label: 'Strategy Team', score: 96, roles: ['Strategist', 'Analyst'], count: 4 }],
    projects: [
      { label: 'M&A Pipeline', score: 91, status: 'Active', deadline: 'Ongoing', description: 'Target screening and diligence tracking', budget: 'Undisclosed' },
      { label: 'Annual Planning', score: 94, status: 'In Progress', deadline: 'Q4', description: 'Next-year strategic plan and budget framing', budget: '$20k' },
      { label: 'Competitive War Room', score: 90, status: 'Active', deadline: 'Q2', description: 'Competitor response playbook updates', budget: '$15k' },
      { label: 'Scenario Planning', score: 92, status: 'Planning', deadline: 'Q3', description: 'Base/upside/downside scenario models', budget: '$12k' },
      { label: 'OKR Cascade', score: 95, status: 'Active', deadline: 'Q2', description: 'Company OKR cascade to departments', budget: '$5k' },
      { label: 'Market Expansion Study', score: 88, status: 'In Progress', deadline: 'Q3', description: 'EU market entry feasibility', budget: '$40k' },
      { label: 'Partnership Pipeline', score: 87, status: 'Active', deadline: 'Ongoing', description: 'Strategic alliance evaluation', budget: '$10k' },
      { label: 'Board Strategy Offsite', score: 93, status: 'Planning', deadline: 'Q3', description: 'Annual leadership strategy offsite', budget: '$35k' },
    ],
    branches: [
      { label: 'OKRs & Priorities', score: 95, leaves: [actionLeaf('Define OKR', 'Set', ['Draft objective', 'Align KRs', 'Dept review', 'Publish']), metricLeaf('OKR achievement', 'Company OKR progress', 72, 80, '%', 'warning')] },
      { label: 'Market Intelligence', score: 93, leaves: [actionLeaf('Publish market memo', 'Write', ['Gather signals', 'Size opportunity', 'Draft memo', 'Review with execs']), signalLeaf('Market shift signal', 'Category leader announced AI-native pivot — win rates may compress', 'medium', 'Market intel')] },
      { label: 'Competitive Strategy', score: 90, leaves: [decisionLeaf('Competitive response', 'Match competitor pricing or differentiate on platform?', [{ id: 'price', label: 'Match pricing', description: 'Defend share', impact: 'Margin pressure' }, { id: 'diff', label: 'Differentiate', description: 'Double down on integrations', impact: 'Slower short-term wins' }], 'diff'), actionLeaf('Update competitor map', 'Refresh', ['Research updates', 'Update battlecards', 'Brief GTM', 'Track wins/losses'])] },
      { label: 'Scenario Planning', score: 92, leaves: [actionLeaf('Create scenario', 'Model', ['Define assumptions', 'Model outcomes', 'Stress test', 'Present to board']), metricLeaf('Scenario coverage', 'Scenarios with plans', 3, 4, 'scenarios', 'warning')] },
    ],
  },
};

const PREFIX_MAP: Record<string, string> = {
  dept_engineering: 'eng',
  dept_product: 'prd',
  dept_sales: 'sal',
  dept_marketing: 'mkt',
  dept_hr: 'hr',
  dept_finance: 'fin',
  dept_operations: 'ops',
  dept_data: 'dat',
  dept_design: 'des',
  dept_security: 'sec',
  dept_customer_success: 'cs',
  dept_legal: 'leg',
  dept_strategy: 'str',
};

export function buildDepartmentInternalNodes(deptId: string): UInternalNode[] {
  const seed = DEPT_SEEDS[deptId];
  const prefix = PREFIX_MAP[deptId] ?? deptId.slice(5, 8);
  if (!seed) return [];

  const teamsNode: InternalDef = {
    label: 'Teams',
    type: 'team',
    score: 85,
    children: seed.teams.map(t => ({
      label: t.label,
      type: 'team' as const,
      score: t.score,
      memberCount: t.count,
      members: genMembers(t.count, t.roles),
      children: [],
    })),
  };

  const projectsNode: InternalDef = {
    label: 'Projects',
    type: 'project',
    score: 82,
    children: seed.projects.map(p => ({
      label: p.label,
      type: 'project' as const,
      score: p.score,
      projectDetails: {
        status: p.status,
        deadline: p.deadline,
        description: p.description,
        budget: p.budget,
      },
      children: [],
    })),
  };

  const branchNodes = seed.branches.map(b => {
    const leaves = attachRelated(deptId, b.leaves);
    return branchNode({ ...b, leaves: leaves as [InternalDef, InternalDef] });
  });

  return buildTree(prefix, [teamsNode, projectsNode, ...branchNodes]);
}

export function getFrameworkDeptIds(): string[] {
  return Object.keys(DEPT_SEEDS);
}
