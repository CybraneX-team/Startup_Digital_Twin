import { api } from '../api';
import {
  getRoleLabel,
  type CompanyPlanetContext,
  type PlanetActionNode,
  type PlanetBranchNode,
  type PlanetBranchNodeType,
  type PlanetCitation,
  type PlanetRootNode,
  type UserPlanetRole,
} from '../../data/companyPlanetRoots';

export type ReferenceCompanyStatus = 'pending' | 'running' | 'ready' | 'failed';

export interface ReferenceCompany {
  id: string;
  workspaceCompanyId: string;
  industryId: string | null;
  subdomainId: string | null;
  name: string | null;
  sourceUrl: string;
  canonicalUrl: string | null;
  description: string | null;
  status: ReferenceCompanyStatus;
  lastError: string | null;
  generatedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
}

export interface ReferenceCompanyJob {
  id: string;
  referenceCompanyId: string;
  companyId: string;
  kind: 'generate' | 'refresh';
  status: 'pending' | 'running' | 'complete' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  lockedUntil?: string | null;
  lockedBy?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ReferenceCompanyNode {
  id: string;
  parentNodeId: string | null;
  kind: 'root' | 'branch' | 'action';
  label: string;
  summary: string | null;
  nodeType: PlanetBranchNodeType | null;
  relevance: number;
  confidence: number;
  color: string | null;
  sortOrder: number;
  metadata: Record<string, unknown>;
  sources: PlanetCitation[];
}

export interface ReferenceCompanyDetail {
  company: ReferenceCompany;
  nodes: ReferenceCompanyNode[];
  sources: PlanetCitation[];
  job: ReferenceCompanyJob | null;
}

export async function listReferenceCompanies(subdomainId?: string): Promise<ReferenceCompany[]> {
  const suffix = subdomainId ? `?subdomainId=${encodeURIComponent(subdomainId)}` : '';
  const { companies } = await api.get<{ companies: ReferenceCompany[] }>(`/api/reference-companies${suffix}`);
  return companies;
}

export async function createReferenceCompany(input: {
  url: string;
  subdomainId: string;
}): Promise<{ company: ReferenceCompany; job: ReferenceCompanyJob }> {
  return api.post<{ company: ReferenceCompany; job: ReferenceCompanyJob }>('/api/reference-companies', {
    url: input.url,
    subdomainId: input.subdomainId,
  });
}

export async function getReferenceCompany(id: string): Promise<ReferenceCompanyDetail> {
  return api.get<ReferenceCompanyDetail>(`/api/reference-companies/${id}`);
}

export async function refreshReferenceCompany(id: string): Promise<{ company: ReferenceCompany; job: ReferenceCompanyJob }> {
  return api.post<{ company: ReferenceCompany; job: ReferenceCompanyJob }>(`/api/reference-companies/${id}/refresh`, {});
}

export async function deleteReferenceCompany(id: string): Promise<void> {
  await api.delete<{ ok: true }>(`/api/reference-companies/${id}`);
}

function childNodes(nodes: ReferenceCompanyNode[], parentId: string): ReferenceCompanyNode[] {
  return nodes
    .filter(node => node.parentNodeId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function referenceCompanyDetailToPlanetContext(
  detail: ReferenceCompanyDetail,
  role: UserPlanetRole,
): CompanyPlanetContext {
  const roots = detail.nodes
    .filter(node => node.kind === 'root')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((rootNode): PlanetRootNode => {
      const branches: PlanetBranchNode[] = childNodes(detail.nodes, rootNode.id)
        .filter(node => node.kind === 'branch')
        .map((branchNode): PlanetBranchNode => {
          const actions: PlanetActionNode[] = childNodes(detail.nodes, branchNode.id)
            .filter(node => node.kind === 'action')
            .map(actionNode => ({
              id: actionNode.id,
              label: actionNode.label,
              summary: actionNode.summary,
              hint: typeof actionNode.metadata?.hint === 'string'
                ? actionNode.metadata.hint
                : actionNode.summary,
              confidence: actionNode.confidence,
              nextSteps: Array.isArray(actionNode.metadata?.nextSteps)
                ? actionNode.metadata.nextSteps.filter((step): step is string => typeof step === 'string')
                : [],
              sources: actionNode.sources,
            }));

          return {
            id: branchNode.id,
            label: branchNode.label,
            summary: branchNode.summary,
            nodeType: branchNode.nodeType ?? 'information',
            relevance: branchNode.relevance,
            confidence: branchNode.confidence,
            sources: branchNode.sources,
            actions,
          };
        });

      return {
        id: rootNode.id,
        label: rootNode.label,
        description: rootNode.summary ?? '',
        relevance: rootNode.relevance,
        confidence: rootNode.confidence,
        color: rootNode.color ?? '#C1AEFF',
        sources: rootNode.sources,
        branches,
      };
    });

  return {
    companyId: `ref-${detail.company.id}`,
    referenceCompanyId: detail.company.id,
    companyName: detail.company.name || 'Reference company',
    role,
    roleLabel: getRoleLabel(role),
    roots,
    status: detail.company.status,
    lastError: detail.company.lastError,
    sourceUrl: detail.company.sourceUrl,
    canonicalUrl: detail.company.canonicalUrl,
    generatedAt: detail.company.generatedAt,
    job: detail.job,
  };
}

export function pendingReferenceCompanyToPlanetContext(
  company: ReferenceCompany,
  role: UserPlanetRole,
  job?: ReferenceCompanyJob | null,
): CompanyPlanetContext {
  return {
    companyId: `ref-${company.id}`,
    referenceCompanyId: company.id,
    companyName: company.name || 'Reference company',
    role,
    roleLabel: getRoleLabel(role),
    roots: [],
    status: company.status,
    lastError: company.lastError,
    sourceUrl: company.sourceUrl,
    canonicalUrl: company.canonicalUrl,
    generatedAt: company.generatedAt,
    job: job ?? null,
  };
}
