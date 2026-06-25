/**
 * Normalize department payloads between the BDT frontend and REST API.
 * Keeps stable framework ids (dept_engineering) for trails and interrelated links.
 */
import {
  BDT_FRAMEWORK_DEPARTMENTS,
  BDT_DEPARTMENT_COLORS,
  type UExternalNode,
  type UInternalNode,
} from './bdtPolytopeData';

export type ApiDepartment = UExternalNode & { source_key?: string };

function resolveFrameworkId(dept: ApiDepartment): string {
  if (dept.source_key?.startsWith('dept_')) return dept.source_key;
  if (dept.id.startsWith('dept_')) return dept.id;
  const norm = dept.label.toLowerCase().trim();
  const match =
    BDT_FRAMEWORK_DEPARTMENTS.find(d => d.id === dept.id) ??
    BDT_FRAMEWORK_DEPARTMENTS.find(d => d.label.toLowerCase().trim() === norm);
  return match?.id ?? dept.id;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const next = { ...obj };
  for (const key of Object.keys(next)) {
    if (next[key] === undefined) delete next[key];
  }
  return next;
}

function serializeInternalNode(node: UInternalNode): Record<string, unknown> {
  const members =
    node.type === 'team'
      ? (node.members ?? []).filter(m => Boolean(m.companyMemberId))
      : node.members;
  return stripUndefined({
    id: node.id,
    label: node.label,
    type: node.type,
    score: node.score,
    memberCount: node.type === 'team' ? (members?.length ?? 0) : node.memberCount,
    members: members?.length ? members : undefined,
    projectDetails: node.projectDetails,
    owner: node.owner,
    dueDate: node.dueDate,
    status: node.status,
    output: node.output,
    metricImpact: node.metricImpact,
    dependencies: node.dependencies,
    workflowSteps: node.workflowSteps,
    interrelatedDepartments: node.interrelatedDepartments,
    signalDetails: node.signalDetails,
    decisionDetails: node.decisionDetails,
    metricDetails: node.metricDetails,
    actionDetails: node.actionDetails,
    children: (node.children ?? []).map(serializeInternalNode),
  });
}

/** POST /api/departments/import body — includes source_key for stable ids. */
export function serializeDepartmentsForImport(departments: UExternalNode[]): Record<string, unknown>[] {
  return departments.map(dept =>
    stripUndefined({
      id: dept.id,
      source_key: dept.id.startsWith('dept_') ? dept.id : undefined,
      label: dept.label,
      domain: dept.domain,
      cluster: dept.cluster,
      color: dept.color ?? BDT_DEPARTMENT_COLORS[dept.id],
      score: dept.score,
      metrics: dept.metrics,
      internalNodes: (dept.internalNodes ?? []).map(serializeInternalNode),
    }),
  );
}

/** GET /api/departments — map API rows back to framework ids; no seed hydration. */
export function normalizeDepartmentFromApi(dept: ApiDepartment): UExternalNode {
  const id = resolveFrameworkId(dept);
  return {
    ...dept,
    id,
    color: dept.color ?? BDT_DEPARTMENT_COLORS[id],
  };
}

export function normalizeDepartmentsFromApi(departments: ApiDepartment[]): UExternalNode[] {
  return departments.map(normalizeDepartmentFromApi);
}
