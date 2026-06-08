/**
 * Industry OS — Saved Workflows Store
 *
 * Persists user-bookmarked workflow items in localStorage.
 * Items are keyed by a stable UUID and grouped by role → company.
 */

import { useState, useCallback, useEffect } from 'react';
import type { UserPlanetRole } from '../data/companyPlanetRoots';

const STORAGE_KEY = 'industry_os_saved_workflows_v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SavedItemLevel = 'root' | 'branch' | 'action';

export interface SavedWorkflowItem {
  id: string;
  savedAt: string;         // ISO timestamp
  level: SavedItemLevel;   // which level was saved

  // Context
  companyId: string;
  companyName: string;
  role: UserPlanetRole;
  roleLabel: string;

  // Root
  rootId: string;
  rootLabel: string;
  rootColor: string;
  rootDescription?: string;

  // Branch (optional — only when level is 'branch' or 'action')
  branchId?: string;
  branchLabel?: string;

  // Action (optional — only when level is 'action')
  actionId?: string;
  actionLabel?: string;
  actionHint?: string;

  // User note
  note?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `swf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): SavedWorkflowItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedWorkflowItem[];
  } catch {
    return [];
  }
}

function saveToStorage(items: SavedWorkflowItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('workflows_updated'));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

/** Build a stable lookup key for deduplication */
function buildKey(item: Omit<SavedWorkflowItem, 'id' | 'savedAt' | 'note'>): string {
  return [
    item.companyId,
    item.role,
    item.rootId,
    item.branchId ?? '',
    item.actionId ?? '',
  ].join('::');
}

// ── Grouped view helpers ──────────────────────────────────────────────────────

export interface SavedWorkflowGroup {
  role: UserPlanetRole;
  roleLabel: string;
  roleColor: string;
  companies: SavedWorkflowCompanyGroup[];
}

export interface SavedWorkflowCompanyGroup {
  companyId: string;
  companyName: string;
  items: SavedWorkflowItem[];
}

export const ROLE_COLORS: Record<UserPlanetRole, string> = {
  career: '#60a5fa',
  founder: '#f97316',
  investor: '#22d3ee',
};

export const ROLE_ORDER: UserPlanetRole[] = ['career', 'founder', 'investor'];

export function groupSavedItems(items: SavedWorkflowItem[]): SavedWorkflowGroup[] {
  const byRole: Map<UserPlanetRole, Map<string, SavedWorkflowItem[]>> = new Map();

  for (const item of items) {
    if (!byRole.has(item.role)) byRole.set(item.role, new Map());
    const companyMap = byRole.get(item.role)!;
    if (!companyMap.has(item.companyId)) companyMap.set(item.companyId, []);
    companyMap.get(item.companyId)!.push(item);
  }

  return ROLE_ORDER
    .filter(role => byRole.has(role))
    .map(role => {
      const companyMap = byRole.get(role)!;
      const companies: SavedWorkflowCompanyGroup[] = [];
      companyMap.forEach((roleItems, companyId) => {
        companies.push({
          companyId,
          companyName: roleItems[0].companyName,
          items: roleItems.sort(
            (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
          ),
        });
      });
      return {
        role,
        roleLabel: roleItems(role, items),
        roleColor: ROLE_COLORS[role],
        companies: companies.sort((a, b) => a.companyName.localeCompare(b.companyName)),
      };
    });
}

function roleItems(role: UserPlanetRole, items: SavedWorkflowItem[]): string {
  return items.find(i => i.role === role)?.roleLabel ?? role;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSavedWorkflowsReturn {
  items: SavedWorkflowItem[];
  totalCount: number;
  save: (item: Omit<SavedWorkflowItem, 'id' | 'savedAt'>) => SavedWorkflowItem;
  remove: (id: string) => void;
  updateNote: (id: string, note: string) => void;
  has: (lookup: Pick<SavedWorkflowItem, 'companyId' | 'role' | 'rootId'> & { branchId?: string; actionId?: string }) => boolean;
  getId: (lookup: Pick<SavedWorkflowItem, 'companyId' | 'role' | 'rootId'> & { branchId?: string; actionId?: string }) => string | null;
  clear: () => void;
  grouped: SavedWorkflowGroup[];
}

export function useSavedWorkflows(): UseSavedWorkflowsReturn {
  const [items, setItems] = useState<SavedWorkflowItem[]>(() => loadFromStorage());

  useEffect(() => {
    const handleUpdate = () => setItems(loadFromStorage());
    window.addEventListener('workflows_updated', handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) handleUpdate();
    });
    return () => {
      window.removeEventListener('workflows_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const save = useCallback((item: Omit<SavedWorkflowItem, 'id' | 'savedAt'>): SavedWorkflowItem => {
    const lookupKey = buildKey(item);

    setItems(prev => {
      const idx = prev.findIndex(p => buildKey(p) === lookupKey);
      if (idx >= 0) {
        return prev; // already saved — no-op
      }
      const newItem: SavedWorkflowItem = {
        ...item,
        id: generateId(),
        savedAt: new Date().toISOString(),
      };
      const newItems = [newItem, ...prev];
      saveToStorage(newItems);
      return newItems;
    });

    // Return from current storage (synchronous read after setState)
    const current = loadFromStorage();
    return current.find(p => buildKey(p) === lookupKey) ?? { ...item, id: '', savedAt: '' };
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const newItems = prev.filter(p => p.id !== id);
      saveToStorage(newItems);
      return newItems;
    });
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setItems(prev => {
      const newItems = prev.map(p => (p.id === id ? { ...p, note } : p));
      saveToStorage(newItems);
      return newItems;
    });
  }, []);

  const has = useCallback((
    lookup: Pick<SavedWorkflowItem, 'companyId' | 'role' | 'rootId'> & { branchId?: string; actionId?: string }
  ): boolean => {
    const level: SavedItemLevel = lookup.actionId ? 'action' : lookup.branchId ? 'branch' : 'root';
    const key = buildKey({
      companyId: lookup.companyId,
      role: lookup.role,
      roleLabel: '',
      companyName: '',
      rootId: lookup.rootId,
      rootLabel: '',
      rootColor: '',
      level,
      branchId: lookup.branchId,
      actionId: lookup.actionId,
    });
    return items.some(p => buildKey(p) === key);
  }, [items]);

  const getId = useCallback((
    lookup: Pick<SavedWorkflowItem, 'companyId' | 'role' | 'rootId'> & { branchId?: string; actionId?: string }
  ): string | null => {
    const level: SavedItemLevel = lookup.actionId ? 'action' : lookup.branchId ? 'branch' : 'root';
    const key = buildKey({
      companyId: lookup.companyId,
      role: lookup.role,
      roleLabel: '',
      companyName: '',
      rootId: lookup.rootId,
      rootLabel: '',
      rootColor: '',
      level,
      branchId: lookup.branchId,
      actionId: lookup.actionId,
    });
    const item = items.find(p => buildKey(p) === key);
    return item ? item.id : null;
  }, [items]);

  const clear = useCallback(() => {
    saveToStorage([]);
    setItems([]);
  }, []);

  const grouped = groupSavedItems(items);

  return {
    items,
    totalCount: items.length,
    save,
    remove,
    updateNote,
    has,
    getId,
    clear,
    grouped,
  };
}
