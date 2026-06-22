/**
 * BDT onboarding — catalog selection and company graph bootstrap.
 * Uses framework seed data only (not twin / Industry OS).
 */
import { api } from './api';
import { primeBdtDepartmentCache, primeTwinDepartmentCache } from './usePolytopeStore';
import {
  BDT_FRAMEWORK_DEPARTMENTS,
  BDT_DEPARTMENT_COLORS,
  getExternalNodeColor,
  resolvePolytopeNodeCount,
  type UDomain,
  type UExternalNode,
} from './bdtPolytopeData';

export const BDT_CACHE_KEY = 'polytope_departments_bdt_v5';

export type BdtCatalogEntry = {
  id: string;
  label: string;
  domain: UDomain;
  cluster: string;
  color: string;
  description: string;
};

export type CustomDepartmentEntry = {
  id: string;
  label: string;
  color: string;
  selected: boolean;
};

const CUSTOM_DEPT_PALETTE = ['#A78BFA', '#F472B6', '#38BDF8', '#4ADE80', '#FB923C', '#C084FC', '#2DD4BF'];

export function getDepartmentColor(deptId: string, fallbackDomain?: UDomain): string {
  if (BDT_DEPARTMENT_COLORS[deptId]) return BDT_DEPARTMENT_COLORS[deptId];
  const dept = BDT_FRAMEWORK_DEPARTMENTS.find(d => d.id === deptId);
  if (dept) return getExternalNodeColor(dept);
  return fallbackDomain ? getExternalNodeColor({ domain: fallbackDomain }) : '#94A3B8';
}

/** Chip styles: unselected = neutral + color dot; selected = that department's accent only */
export function getDepartmentChipStyle(color: string, selected: boolean): {
  background: string;
  color: string;
  border: string;
} {
  if (!selected) {
    return {
      background: '#161618',
      color: '#6B6B6B',
      border: '1px solid rgba(255,255,255,0.06)',
    };
  }
  return {
    background: `${color}1A`,
    color,
    border: `1px solid ${color}66`,
  };
}

export function pickCustomDepartmentColor(index: number): string {
  return CUSTOM_DEPT_PALETTE[index % CUSTOM_DEPT_PALETTE.length];
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'department';
}

export function createCustomDepartmentEntry(label: string, index: number, selected = true): CustomDepartmentEntry {
  const id = `custom_${Date.now()}_${index}_${slugify(label)}`;
  return {
    id,
    label: label.trim(),
    color: pickCustomDepartmentColor(index),
    selected,
  };
}

const CLUSTER_BLURB: Record<string, string> = {
  Build: 'Product creation & engineering',
  Direction: 'Strategy & product direction',
  Market: 'Revenue & market motion',
  People: 'Talent & culture',
  Control: 'Finance, legal & security',
  Delivery: 'Operations & customer delivery',
};

/** Labels from legacy AI onboarding → framework department ids */
const LABEL_ALIASES: Record<string, string> = {
  'product management': 'dept_product',
  'customer support': 'dept_customer_success',
  'customer success': 'dept_customer_success',
  'finance & hr': 'dept_finance',
  'finance and hr': 'dept_finance',
  'hr': 'dept_hr',
  'people': 'dept_hr',
  'people & hr': 'dept_hr',
  'legal': 'dept_legal',
  'legal & compliance': 'dept_legal',
  'risk & compliance': 'dept_security',
  'data': 'dept_data',
  'data & analytics': 'dept_data',
  'analytics': 'dept_data',
  'growth': 'dept_marketing',
};

export function getBdtCatalog(): BdtCatalogEntry[] {
  return BDT_FRAMEWORK_DEPARTMENTS.map(d => ({
    id: d.id,
    label: d.label,
    domain: d.domain,
    cluster: d.cluster,
    color: getExternalNodeColor(d),
    description: CLUSTER_BLURB[d.cluster] ?? d.cluster,
  }));
}

export function getDefaultSelectedCatalogIds(): string[] {
  return [];
}

export function matchCatalogDepartmentId(label: string): string | null {
  const norm = label.toLowerCase().trim();
  if (!norm) return null;
  if (LABEL_ALIASES[norm]) return LABEL_ALIASES[norm];

  const exact = BDT_FRAMEWORK_DEPARTMENTS.find(d => d.label.toLowerCase() === norm);
  if (exact) return exact.id;

  const partial = BDT_FRAMEWORK_DEPARTMENTS.find(d => {
    const dl = d.label.toLowerCase();
    return dl.includes(norm) || norm.includes(dl);
  });
  return partial?.id ?? null;
}

export function mapSuggestedLabelsToCatalogIds(labels: string[]): string[] {
  const ids = new Set<string>();
  for (const label of labels) {
    const id = matchCatalogDepartmentId(label);
    if (id) ids.add(id);
    if (label.toLowerCase().includes('finance') && label.toLowerCase().includes('hr')) {
      ids.add('dept_finance');
      ids.add('dept_hr');
    }
  }
  return Array.from(ids);
}

function cloneDepartment(dept: UExternalNode): UExternalNode {
  return JSON.parse(JSON.stringify(dept)) as UExternalNode;
}

function createCustomDepartment(entry: CustomDepartmentEntry, index: number): UExternalNode {
  const id = `dept_custom_${index}_${slugify(entry.label)}`;
  return {
    id,
    label: entry.label,
    domain: 'delivery',
    cluster: 'Custom',
    color: entry.color,
    score: 75,
    metrics: { performance: 75, efficiency: 75, capacity: 75, alignment: 75, risk: 25 },
    internalNodes: [],
  };
}

/**
 * Build active BDT departments (with internal trees) from onboarding selection.
 */
export function buildBdtDepartmentsForOnboarding(
  selectedCatalogIds: string[],
  customDepartments: CustomDepartmentEntry[] = [],
): UExternalNode[] {
  const active: UExternalNode[] = [];

  for (const id of selectedCatalogIds) {
    const dept = BDT_FRAMEWORK_DEPARTMENTS.find(d => d.id === id);
    if (dept) active.push(cloneDepartment(dept));
  }

  customDepartments
    .filter(c => c.selected)
    .forEach((entry, i) => {
      const trimmed = entry.label.trim();
      if (!trimmed) return;
      const existing = matchCatalogDepartmentId(trimmed);
      if (existing && active.some(d => d.id === existing)) return;
      if (existing) {
        const dept = BDT_FRAMEWORK_DEPARTMENTS.find(d => d.id === existing);
        if (dept) active.push(cloneDepartment(dept));
        return;
      }
      active.push(createCustomDepartment(entry, i));
    });

  return active;
}

/**
 * Polytope shell: selected active departments + inactive mesh placeholders.
 */
export function buildBdtPolytopeNodes(activeDepartments: UExternalNode[]): UExternalNode[] {
  const { totalNodes, inactiveCount } = resolvePolytopeNodeCount(activeDepartments.length);
  const inactiveNodes: UExternalNode[] = Array.from({ length: inactiveCount }).map((_, i) => ({
    id: `node_inactive_${i}`,
    label: `Node ${i + 1}`,
    domain: 'inactive' as UDomain,
    cluster: 'None',
    score: 0,
    metrics: { performance: 0, efficiency: 0, capacity: 0, alignment: 0, risk: 0 },
    internalNodes: [],
  }));

  const result: UExternalNode[] = [];
  let ai = 0;
  let ii = 0;
  const ratio = activeDepartments.length > 0 ? inactiveCount / activeDepartments.length : 0;
  let inactiveAcc = 0;

  for (let total = 0; total < totalNodes; total++) {
    inactiveAcc += ratio;
    if (ii < inactiveCount && inactiveAcc >= 1) {
      result.push(inactiveNodes[ii++]);
      inactiveAcc -= 1;
    } else if (ai < activeDepartments.length) {
      result.push(activeDepartments[ai++]);
    } else if (ii < inactiveCount) {
      result.push(inactiveNodes[ii++]);
    }
  }

  return result;
}

export function primeBdtLocalCache(departments: UExternalNode[]): void {
  primeBdtDepartmentCache(departments);
  primeTwinDepartmentCache(departments);
}

function mergeDepartmentFromSelection(saved: UExternalNode, source: UExternalNode): UExternalNode {
  return {
    ...saved,
    color: saved.color ?? source.color,
    domain: saved.domain ?? source.domain,
    cluster: saved.cluster ?? source.cluster,
    internalNodes: saved.internalNodes?.length ? saved.internalNodes : source.internalNodes,
  };
}

function mergeDepartmentsWithSelection(
  saved: UExternalNode[],
  selection: UExternalNode[],
): UExternalNode[] {
  return saved.map(dept => {
    const match =
      selection.find(s => s.id === dept.id) ??
      selection.find(s => s.label.toLowerCase() === dept.label.toLowerCase());
    return match ? mergeDepartmentFromSelection(dept, match) : dept;
  });
}

/**
 * Persist selected BDT structure to backend (replace company departments) and local cache.
 */
export async function importBdtDepartmentsForCompany(
  departments: UExternalNode[],
): Promise<UExternalNode[]> {
  const activeOnly = departments.filter(d => d.domain !== 'inactive');

  try {
    const response = await api.post<{ departments: UExternalNode[] }>('/api/departments/import', {
      departments: activeOnly,
      mode: 'replace',
    });
    // If backend returns a full default seed, keep only what the user selected
    const saved = response.departments ?? [];
    const savedActive = saved.filter(d => d.domain !== 'inactive');
    const final =
      savedActive.length > activeOnly.length
        ? activeOnly
        : savedActive.length > 0
          ? mergeDepartmentsWithSelection(savedActive, activeOnly)
          : activeOnly;
    primeBdtLocalCache(final);
    return final;
  } catch (err) {
    console.error('[bdt-onboarding] import failed, using local cache', err);
    primeBdtLocalCache(activeOnly);
    return activeOnly;
  }
}

export function enrichDepartmentFromFramework(dept: UExternalNode): UExternalNode {
  const seed = BDT_FRAMEWORK_DEPARTMENTS.find(
    d => d.id === dept.id || d.label.toLowerCase() === dept.label.toLowerCase(),
  );
  if (!seed) return dept;
  return {
    ...dept,
    color: dept.color ?? seed.color,
    domain: dept.domain ?? seed.domain,
    cluster: dept.cluster ?? seed.cluster,
  };
}
