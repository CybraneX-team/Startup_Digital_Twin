import { create } from 'zustand';
import { U_NODES as BDT_SEED_NODES } from './bdtPolytopeData';
import type { UExternalNode, UInternalNode, UDomain } from './bdtPolytopeData';
import { U_DOMAIN_COLOR } from './bdtPolytopeData';
import { api } from './api';

/** Twin (/3d) and BDT (/universal) share one canonical company graph from the backend. */
export type PolytopeStoreScope = 'twin' | 'bdt';

const CACHE_STORAGE_KEY = 'polytope_departments_bdt_v2';
const LEGACY_STORAGE_KEY = 'polytope_departments_v1';

export type { UExternalNode, UInternalNode, UDomain };
export { U_DOMAIN_COLOR };

const DEFAULT_DEPARTMENTS = BDT_SEED_NODES.filter(n => n.domain !== 'inactive');

function persistCache(departments: UExternalNode[]) {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(departments));
  } catch (err) {
    console.warn('[departments] cache write failed', err);
  }
}

function loadCachedDepartments(): UExternalNode[] | null {
  try {
    let raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UExternalNode[];

    const onboardingRaw = localStorage.getItem('onboarding_departments');
    if (!onboardingRaw) return null;
    const selectedNames = JSON.parse(onboardingRaw);
    if (!Array.isArray(selectedNames) || selectedNames.length === 0) return null;

    const domains: UDomain[] = ['build', 'delivery', 'market', 'control', 'people', 'direction'];
    return selectedNames
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .map((name, index) => {
        const matched = DEFAULT_DEPARTMENTS.find(n =>
          n.label.toLowerCase() === name.toLowerCase() ||
          n.label.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(n.label.toLowerCase())
        );
        if (matched) return matched;
        const domain = domains[index % domains.length];
        return {
          id: `local_${index}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          label: name,
          domain,
          cluster: domain.charAt(0).toUpperCase() + domain.slice(1),
          score: 80,
          metrics: { performance: 80, efficiency: 80, capacity: 80, alignment: 80, risk: 20 },
          internalNodes: [],
        };
      });
  } catch (err) {
    console.error('Failed to load cached departments', err);
    return null;
  }
}

function addNodeToTree(nodes: UInternalNode[], path: string[], newNode: UInternalNode): UInternalNode[] {
  if (path.length === 0) return [...nodes, newNode];
  const [head, ...tail] = path;
  return nodes.map(node =>
    node.id === head
      ? { ...node, children: addNodeToTree(node.children ?? [], tail, newNode) }
      : node
  );
}

function updateNodeInTree(nodes: UInternalNode[], nodeId: string, updates: Partial<Omit<UInternalNode, 'id' | 'children'>>): UInternalNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) return { ...node, ...updates };
    if (node.children?.length) {
      return { ...node, children: updateNodeInTree(node.children, nodeId, updates) };
    }
    return node;
  });
}

function deleteNodeFromTree(nodes: UInternalNode[], nodeId: string): UInternalNode[] {
  return nodes
    .filter(node => node.id !== nodeId)
    .map(node => node.children?.length
      ? { ...node, children: deleteNodeFromTree(node.children, nodeId) }
      : node
    );
}

function findPathParentNodeId(dept: UExternalNode | undefined, path: string[]): string | undefined {
  if (!dept || path.length === 0) return undefined;
  return path[path.length - 1];
}

function flattenNodes(nodes: UInternalNode[]): UInternalNode[] {
  return nodes.flatMap(node => [node, ...flattenNodes(node.children ?? [])]);
}

export interface PolytopeStoreState {
  departments: UExternalNode[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  loadDepartments: () => Promise<void>;
  addDepartment: (dept: Omit<UExternalNode, 'id' | 'internalNodes'>) => Promise<UExternalNode>;
  updateDepartment: (id: string, updates: Partial<Omit<UExternalNode, 'id' | 'internalNodes'>>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addNode: (deptId: string, node: Omit<UInternalNode, 'id' | 'children'>, path?: string[]) => Promise<UInternalNode>;
  updateNode: (deptId: string, nodeId: string, updates: Partial<Omit<UInternalNode, 'id' | 'children'>>) => Promise<void>;
  deleteNode: (deptId: string, nodeId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const useGlobalPolytopeStore = create<PolytopeStoreState>((set, get) => ({
  departments: loadCachedDepartments() ?? DEFAULT_DEPARTMENTS,
  loading: false,
  loaded: false,
  error: null,

  loadDepartments: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const response = await api.get<{ departments: UExternalNode[] }>('/api/departments');
      const departments = response.departments ?? [];
      persistCache(departments);
      set({ departments, loading: false, loaded: true, error: null });
    } catch (err) {
      console.error('[departments] load failed', err);
      const cached = loadCachedDepartments();
      const fallback = cached ?? (get().departments.length ? get().departments : DEFAULT_DEPARTMENTS);
      set({
        departments: fallback,
        loading: false,
        loaded: true,
        error: err instanceof Error ? err.message : 'Failed to load departments',
      });
    }
  },

  addDepartment: async (dept) => {
    const optimistic: UExternalNode = {
      ...dept,
      id: `pending_dept_${Date.now()}`,
      internalNodes: [],
    };
    set(state => ({ departments: [...state.departments, optimistic] }));
    try {
      const response = await api.post<{ department: UExternalNode }>('/api/departments', dept);
      const saved = response.department;
      set(state => {
        const next = state.departments.map(d => d.id === optimistic.id ? saved : d);
        persistCache(next);
        return { departments: next };
      });
      return saved;
    } catch (err) {
      set(state => ({ departments: state.departments.filter(d => d.id !== optimistic.id) }));
      throw err;
    }
  },

  updateDepartment: async (id, updates) => {
    const previous = get().departments;
    set(state => ({ departments: state.departments.map(d => d.id === id ? { ...d, ...updates } : d) }));
    try {
      const response = await api.patch<{ department: UExternalNode }>(`/api/departments/${id}`, updates);
      set(state => {
        const next = state.departments.map(d => d.id === id ? response.department : d);
        persistCache(next);
        return { departments: next };
      });
    } catch (err) {
      set({ departments: previous });
      throw err;
    }
  },

  deleteDepartment: async (id) => {
    const previous = get().departments;
    set(state => ({ departments: state.departments.filter(d => d.id !== id) }));
    try {
      await api.delete(`/api/departments/${id}`);
      persistCache(get().departments);
    } catch (err) {
      set({ departments: previous });
      throw err;
    }
  },

  addNode: async (deptId, node, path = []) => {
    const dept = get().departments.find(d => d.id === deptId);
    const optimistic: UInternalNode = { ...node, id: `pending_node_${Date.now()}`, children: [] };
    set(state => ({
      departments: state.departments.map(d =>
        d.id === deptId ? { ...d, internalNodes: addNodeToTree(d.internalNodes, path, optimistic) } : d
      ),
    }));

    try {
      const response = await api.post<{ departments: UExternalNode[] }>(`/api/departments/${deptId}/nodes`, {
        ...node,
        parentNodeId: findPathParentNodeId(dept, path),
      });
      persistCache(response.departments);
      set({ departments: response.departments });
      const savedDept = response.departments.find(d => d.id === deptId);
      return flattenNodes(savedDept?.internalNodes ?? []).find(n => n.label === node.label && n.type === node.type) ?? optimistic;
    } catch (err) {
      set(state => ({
        departments: state.departments.map(d =>
          d.id === deptId ? { ...d, internalNodes: deleteNodeFromTree(d.internalNodes, optimistic.id) } : d
        ),
      }));
      throw err;
    }
  },

  updateNode: async (deptId, nodeId, updates) => {
    const previous = get().departments;
    const currentNode = flattenNodes(previous.find(d => d.id === deptId)?.internalNodes ?? []).find(n => n.id === nodeId);
    const payload = currentNode ? { ...currentNode, ...updates } : updates;
    set(state => ({
      departments: state.departments.map(d =>
        d.id === deptId ? { ...d, internalNodes: updateNodeInTree(d.internalNodes, nodeId, updates) } : d
      ),
    }));
    try {
      const response = await api.patch<{ departments: UExternalNode[] }>(`/api/departments/nodes/${nodeId}`, payload);
      persistCache(response.departments);
      set({ departments: response.departments });
    } catch (err) {
      set({ departments: previous });
      throw err;
    }
  },

  deleteNode: async (deptId, nodeId) => {
    const previous = get().departments;
    set(state => ({
      departments: state.departments.map(d =>
        d.id === deptId ? { ...d, internalNodes: deleteNodeFromTree(d.internalNodes, nodeId) } : d
      ),
    }));
    try {
      await api.delete(`/api/departments/nodes/${nodeId}`);
      persistCache(get().departments);
    } catch (err) {
      set({ departments: previous });
      throw err;
    }
  },

  resetToDefaults: async () => {
    const localDrafts = loadCachedDepartments();
    const response = await api.post<{ departments: UExternalNode[] }>('/api/departments/import', {
      departments: localDrafts ?? DEFAULT_DEPARTMENTS,
    });
    const departments = response.departments ?? [];
    persistCache(departments);
    set({ departments });
  },
}));

/** Scope is kept for call-site clarity; twin and BDT read the same backend graph. */
export function usePolytopeStore(_scope?: PolytopeStoreScope) {
  return useGlobalPolytopeStore();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CACHE_STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) return;
    try {
      const next = event.newValue ? JSON.parse(event.newValue) : null;
      useGlobalPolytopeStore.setState({ departments: next ?? DEFAULT_DEPARTMENTS });
    } catch (e) {
      console.error('Error syncing department cache:', e);
    }
  });
}
