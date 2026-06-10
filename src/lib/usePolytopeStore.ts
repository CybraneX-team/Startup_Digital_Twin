import { create } from 'zustand';
import { U_NODES, U_DOMAIN_COLOR } from './universalPolytopeData';
import type { UExternalNode, UInternalNode, UDomain } from './universalPolytopeData';

/** Twin (/3d) and BDT (/universal) now share the same graph globally. */
export type PolytopeStoreScope = 'twin' | 'bdt';

const SHARED_STORAGE_KEY = 'polytope_departments_bdt_v1';
const FALLBACK_TWIN_KEY = 'polytope_departments_twin_v1';
const LEGACY_STORAGE_KEY = 'polytope_departments_v1';

export type { UExternalNode, UInternalNode, UDomain };
export { U_DOMAIN_COLOR };

const DEFAULT_NODES = U_NODES.filter(n => n.domain !== 'inactive');

function loadFromStorage(): UExternalNode[] | null {
  try {
    let raw = localStorage.getItem(SHARED_STORAGE_KEY);
    if (!raw) raw = localStorage.getItem(FALLBACK_TWIN_KEY);
    if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    
    if (!raw) return null;
    return JSON.parse(raw) as UExternalNode[];
  } catch {
    return null;
  }
}

function saveToStorage(nodes: UExternalNode[]) {
  localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(nodes));
}

function addNodeToTree(nodes: UInternalNode[], path: string[], newNode: UInternalNode): UInternalNode[] {
  if (path.length === 0) {
    return [...nodes, newNode];
  }
  const [head, ...tail] = path;
  return nodes.map(node => {
    if (node.id === head) {
      if (tail.length === 0) {
        return {
          ...node,
          children: [...(node.children ?? []), newNode],
        };
      } else {
        return {
          ...node,
          children: addNodeToTree(node.children ?? [], tail, newNode),
        };
      }
    }
    return node;
  });
}

function updateNodeInTree(nodes: UInternalNode[], nodeId: string, updates: Partial<Omit<UInternalNode, 'id' | 'children'>>): UInternalNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, nodeId, updates),
      };
    }
    return node;
  });
}

function deleteNodeFromTree(nodes: UInternalNode[], nodeId: string): UInternalNode[] {
  const filtered = nodes.filter(node => node.id !== nodeId);
  return filtered.map(node => {
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: deleteNodeFromTree(node.children, nodeId),
      };
    }
    return node;
  });
}

interface PolytopeStoreState {
  departments: UExternalNode[];
  addDepartment: (dept: Omit<UExternalNode, 'id' | 'internalNodes'>) => UExternalNode;
  updateDepartment: (id: string, updates: Partial<Omit<UExternalNode, 'id' | 'internalNodes'>>) => void;
  deleteDepartment: (id: string) => void;
  addNode: (deptId: string, node: Omit<UInternalNode, 'id' | 'children'>, path?: string[]) => UInternalNode;
  updateNode: (deptId: string, nodeId: string, updates: Partial<Omit<UInternalNode, 'id' | 'children'>>) => void;
  deleteNode: (deptId: string, nodeId: string) => void;
  resetToDefaults: () => void;
}

const useGlobalPolytopeStore = create<PolytopeStoreState>((set) => ({
  departments: loadFromStorage() ?? DEFAULT_NODES,

  addDepartment: (dept) => {
    const newDept: UExternalNode = {
      ...dept,
      id: `dept_${Date.now()}`,
      internalNodes: [],
    };
    set((state) => {
      const next = [...state.departments, newDept];
      saveToStorage(next);
      return { departments: next };
    });
    return newDept;
  },

  updateDepartment: (id, updates) => {
    set((state) => {
      const next = state.departments.map(d => d.id === id ? { ...d, ...updates } : d);
      saveToStorage(next);
      return { departments: next };
    });
  },

  deleteDepartment: (id) => {
    set((state) => {
      const next = state.departments.filter(d => d.id !== id);
      saveToStorage(next);
      return { departments: next };
    });
  },

  addNode: (deptId, node, path = []) => {
    const newNode: UInternalNode = {
      ...node,
      id: `node_${Date.now()}`,
      children: [],
    };
    set((state) => {
      const next = state.departments.map(d =>
        d.id === deptId
          ? { ...d, internalNodes: addNodeToTree(d.internalNodes, path, newNode) }
          : d
      );
      saveToStorage(next);
      return { departments: next };
    });
    return newNode;
  },

  updateNode: (deptId, nodeId, updates) => {
    set((state) => {
      const next = state.departments.map(d =>
        d.id === deptId
          ? { ...d, internalNodes: updateNodeInTree(d.internalNodes, nodeId, updates) }
          : d
      );
      saveToStorage(next);
      return { departments: next };
    });
  },

  deleteNode: (deptId, nodeId) => {
    set((state) => {
      const next = state.departments.map(d =>
        d.id === deptId
          ? { ...d, internalNodes: deleteNodeFromTree(d.internalNodes, nodeId) }
          : d
      );
      saveToStorage(next);
      return { departments: next };
    });
  },

  resetToDefaults: () => {
    localStorage.removeItem(SHARED_STORAGE_KEY);
    set({ departments: DEFAULT_NODES });
  },
}));

export function usePolytopeStore(_scope?: PolytopeStoreScope) {
  // We ignore `_scope` now since everything is shared globally!
  return useGlobalPolytopeStore();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === SHARED_STORAGE_KEY) {
      try {
        const next = event.newValue ? JSON.parse(event.newValue) : null;
        if (next) {
          useGlobalPolytopeStore.setState({ departments: next });
        } else {
          useGlobalPolytopeStore.setState({ departments: DEFAULT_NODES });
        }
      } catch (e) {
        console.error('Error syncing polytope store departments from storage event:', e);
      }
    }
  });
}

