import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { U_NODES, U_DOMAIN_COLOR } from './universalPolytopeData';
import type { UExternalNode, UInternalNode, UDomain } from './universalPolytopeData';

const STORAGE_KEY = 'polytope_departments_v1';

export type { UExternalNode, UInternalNode, UDomain };
export { U_DOMAIN_COLOR };

function loadFromStorage(): UExternalNode[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UExternalNode[];
  } catch {
    return null;
  }
}

function saveToStorage(nodes: UExternalNode[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
}

const DEFAULT_NODES = U_NODES.filter(n => n.domain !== 'inactive');

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

export function usePolytopeStore() {
  const location = useLocation();

  const [departments, setDepartments] = useState<UExternalNode[]>(() => {
    return loadFromStorage() ?? DEFAULT_NODES;
  });

  useEffect(() => {
    const latest = loadFromStorage() ?? DEFAULT_NODES;
    setDepartments(latest);
  }, [location.pathname]);

  const persist = useCallback((next: UExternalNode[]) => {
    setDepartments(next);
    saveToStorage(next);
  }, []);

  // ── Department CRUD ────────────────────────────────────────────────────────

  const addDepartment = useCallback((dept: Omit<UExternalNode, 'id' | 'internalNodes'>) => {
    const newDept: UExternalNode = {
      ...dept,
      id: `dept_${Date.now()}`,
      internalNodes: [],
    };
    persist([...departments, newDept]);
    return newDept;
  }, [departments, persist]);

  const updateDepartment = useCallback((id: string, updates: Partial<Omit<UExternalNode, 'id' | 'internalNodes'>>) => {
    persist(departments.map(d => d.id === id ? { ...d, ...updates } : d));
  }, [departments, persist]);

  const deleteDepartment = useCallback((id: string) => {
    persist(departments.filter(d => d.id !== id));
  }, [departments, persist]);

  // ── Internal Node CRUD ─────────────────────────────────────────────────────

  const addNode = useCallback((deptId: string, node: Omit<UInternalNode, 'id' | 'children'>, path: string[] = []) => {
    const newNode: UInternalNode = {
      ...node,
      id: `node_${Date.now()}`,
      children: [],
    };
    persist(departments.map(d =>
      d.id === deptId
        ? { ...d, internalNodes: addNodeToTree(d.internalNodes, path, newNode) }
        : d
    ));
    return newNode;
  }, [departments, persist]);

  const updateNode = useCallback((deptId: string, nodeId: string, updates: Partial<Omit<UInternalNode, 'id' | 'children'>>) => {
    persist(departments.map(d =>
      d.id === deptId
        ? { ...d, internalNodes: updateNodeInTree(d.internalNodes, nodeId, updates) }
        : d
    ));
  }, [departments, persist]);

  const deleteNode = useCallback((deptId: string, nodeId: string) => {
    persist(departments.map(d =>
      d.id === deptId
        ? { ...d, internalNodes: deleteNodeFromTree(d.internalNodes, nodeId) }
        : d
    ));
  }, [departments, persist]);

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDepartments(DEFAULT_NODES);
  }, []);

  return {
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addNode,
    updateNode,
    deleteNode,
    resetToDefaults,
  };
}
