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

/** Accent color for a department/root — prefers explicit color, then domain palette. */
export function getExternalNodeColor(dept: Pick<UExternalNode, 'domain' | 'color'>): string {
  if (dept.color) return dept.color;
  return U_DOMAIN_COLOR[dept.domain] ?? '#8b5cf6';
}

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
  owner?: string;
  progress?: number;
  milestones?: { label: string; done: boolean }[];
  risks?: string[];
}

export interface SignalDetails {
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  detectedAt?: string;
  suggestedAction?: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  impact: string;
}

export interface DecisionDetails {
  question: string;
  context: string;
  options: DecisionOption[];
  recommendation?: string;
}

export interface MetricDetails {
  name: string;
  value: number | string;
  target: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'flat';
  status: 'healthy' | 'warning' | 'critical';
}

export interface ActionDetails {
  verb: string;
  description: string;
  checklist?: string[];
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
  signalDetails?: SignalDetails;
  decisionDetails?: DecisionDetails;
  metricDetails?: MetricDetails;
  actionDetails?: ActionDetails;
}

/** Leaf types that open the BDT action workspace — not team/project/process containers. */
export const BDT_ACTION_LEAF_TYPES = ['metric', 'signal', 'decision', 'action'] as const;

export function isActionLeafNode(node: Pick<UInternalNode, 'type'> | null | undefined): boolean {
  if (!node) return false;
  return (BDT_ACTION_LEAF_TYPES as readonly string[]).includes(node.type);
}

export function isProjectLeafNode(node: Pick<UInternalNode, 'type' | 'projectDetails' | 'children'> | null | undefined): boolean {
  if (!node) return false;
  return node.type === 'project' && !!node.projectDetails && (!node.children || node.children.length === 0);
}

/** Opens BDT action / project workspace */
export function isBdtWorkspaceLeafNode(node: Pick<UInternalNode, 'type' | 'projectDetails' | 'children'> | null | undefined): boolean {
  return isActionLeafNode(node) || isProjectLeafNode(node);
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
  /** Planet root accent — when set, overrides U_DOMAIN_COLOR for visualization. */
  color?: string;
  access?: {
    read: boolean;
    write: boolean;
    delete: boolean;
    manage: boolean;
  };
  /** Transient flag — draft nodes are rendered in-scene but not persisted */
  isDraft?: boolean;
}

/** When access is missing (seed/cache), allow CRUD if the user has global manage rights. */
export function resolveDepartmentWrite(canManage: boolean, dept?: UExternalNode | null): boolean {
  if (!canManage || !dept) return false;
  if (dept.access === undefined) return true;
  return dept.access.write;
}

export function resolveDepartmentDelete(canManage: boolean, dept?: UExternalNode | null): boolean {
  if (!canManage || !dept) return false;
  if (dept.access === undefined) return true;
  return dept.access.delete;
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

import { buildDepartmentInternalNodes } from './bdtDepartmentSeed';

/** Per-department accent colors — Company Department framework §6 */
export const BDT_DEPARTMENT_COLORS: Record<string, string> = {
  dept_strategy: '#F2C94C',
  dept_product: '#6C63FF',
  dept_engineering: '#2F80ED',
  dept_design: '#BB6BD9',
  dept_data: '#56CCF2',
  dept_sales: '#F2994A',
  dept_marketing: '#EB5757',
  dept_customer_success: '#00BFA6',
  dept_hr: '#27AE60',
  dept_finance: '#219653',
  dept_operations: '#2D9CDB',
  dept_security: '#E8A317',
  dept_legal: '#D97706',
};

const DEPT_META: Omit<UExternalNode, 'internalNodes'>[] = [
  { id: 'dept_engineering', label: 'Engineering', domain: 'build', cluster: 'Build', score: 85, color: BDT_DEPARTMENT_COLORS.dept_engineering, metrics: { performance: 91, efficiency: 85, capacity: 78, alignment: 88, risk: 14 } },
  { id: 'dept_product', label: 'Product', domain: 'direction', cluster: 'Direction', score: 91, color: BDT_DEPARTMENT_COLORS.dept_product, metrics: { performance: 93, efficiency: 90, capacity: 85, alignment: 95, risk: 8 } },
  { id: 'dept_sales', label: 'Sales', domain: 'market', cluster: 'Market', score: 78, color: BDT_DEPARTMENT_COLORS.dept_sales, metrics: { performance: 80, efficiency: 74, capacity: 82, alignment: 76, risk: 22 } },
  { id: 'dept_marketing', label: 'Marketing', domain: 'market', cluster: 'Market', score: 72, color: BDT_DEPARTMENT_COLORS.dept_marketing, metrics: { performance: 75, efficiency: 68, capacity: 74, alignment: 72, risk: 26 } },
  { id: 'dept_hr', label: 'People & HR', domain: 'people', cluster: 'People', score: 84, color: BDT_DEPARTMENT_COLORS.dept_hr, metrics: { performance: 86, efficiency: 82, capacity: 80, alignment: 88, risk: 12 } },
  { id: 'dept_finance', label: 'Finance', domain: 'control', cluster: 'Control', score: 93, color: BDT_DEPARTMENT_COLORS.dept_finance, metrics: { performance: 95, efficiency: 92, capacity: 90, alignment: 94, risk: 6 } },
  { id: 'dept_operations', label: 'Operations', domain: 'delivery', cluster: 'Delivery', score: 61, color: BDT_DEPARTMENT_COLORS.dept_operations, metrics: { performance: 63, efficiency: 58, capacity: 65, alignment: 60, risk: 38 } },
  { id: 'dept_data', label: 'Data & Analytics', domain: 'build', cluster: 'Build', score: 76, color: BDT_DEPARTMENT_COLORS.dept_data, metrics: { performance: 78, efficiency: 74, capacity: 72, alignment: 79, risk: 20 } },
  { id: 'dept_design', label: 'Design', domain: 'build', cluster: 'Build', score: 88, color: BDT_DEPARTMENT_COLORS.dept_design, metrics: { performance: 91, efficiency: 87, capacity: 83, alignment: 90, risk: 10 } },
  { id: 'dept_security', label: 'Security', domain: 'control', cluster: 'Control', score: 69, color: BDT_DEPARTMENT_COLORS.dept_security, metrics: { performance: 71, efficiency: 65, capacity: 68, alignment: 73, risk: 32 } },
  { id: 'dept_customer_success', label: 'Customer Success', domain: 'delivery', cluster: 'Delivery', score: 82, color: BDT_DEPARTMENT_COLORS.dept_customer_success, metrics: { performance: 84, efficiency: 80, capacity: 85, alignment: 83, risk: 15 } },
  { id: 'dept_legal', label: 'Legal & Compliance', domain: 'control', cluster: 'Control', score: 89, color: BDT_DEPARTMENT_COLORS.dept_legal, metrics: { performance: 91, efficiency: 88, capacity: 86, alignment: 92, risk: 9 } },
  { id: 'dept_strategy', label: 'Strategy', domain: 'direction', cluster: 'Direction', score: 95, color: BDT_DEPARTMENT_COLORS.dept_strategy, metrics: { performance: 97, efficiency: 94, capacity: 92, alignment: 98, risk: 4 } },
];

/** 13 framework departments with full BDT internal trees (teams, projects, branches, actions). */
export const BDT_FRAMEWORK_DEPARTMENTS: UExternalNode[] = DEPT_META.map(meta => ({
  ...meta,
  internalNodes: buildDepartmentInternalNodes(meta.id),
}));

const DEPARTMENTS = BDT_FRAMEWORK_DEPARTMENTS;

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
