import { api } from '../api';

export interface ActiveNodeKey {
  departmentSourceKey: string;
  level1Label: string;
  branchLabel: string;
}

export interface ActiveNodesResponse {
  active: ActiveNodeKey[];
  erpConnected: boolean;
}

export function fetchActiveBdtNodeKeys() {
  return api.get<ActiveNodesResponse>('/api/bdt/active-nodes');
}

export function activeNodeKeyId(key: Pick<ActiveNodeKey, 'departmentSourceKey' | 'level1Label' | 'branchLabel'>): string {
  return `${key.departmentSourceKey}::${key.level1Label}::${key.branchLabel}`;
}

export function buildActiveKeySet(response: ActiveNodesResponse | null | undefined): Set<string> {
  if (!response) return new Set();
  return new Set(response.active.map(activeNodeKeyId));
}
