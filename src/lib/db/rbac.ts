import { api } from '../api';

export type Action = 'read' | 'write' | 'delete';
export type Module =
  | 'twin' | 'strategy' | 'analytics' | 'data'
  | 'benchmarks' | 'team' | 'ecosystem' | 'settings';

export type SystemRole =
  | 'super_admin' | 'founder' | 'co_founder' | 'admin'
  | 'analyst' | 'engineer' | 'viewer' | 'investor';
export type RoleId = string;
export type PermissionSet = Record<Action, boolean>;
export type ExpandedPermissions = Record<Module, PermissionSet>;
export type DepartmentAction = 'read' | 'write' | 'delete' | 'manage';
export type DepartmentAccess = Record<DepartmentAction, boolean>;

export interface RoleDefinition {
  id: RoleId;
  companyId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  isArchived: boolean;
  baseRoleId: RoleId | null;
  permissions: ExpandedPermissions;
  assignable: boolean;
}

export interface DepartmentAccessDepartment {
  id: string;
  label: string;
  access: DepartmentAccess;
}

export interface DepartmentRoleGrant extends DepartmentAccess {
  department_id: string;
  role_id: RoleId;
}

export interface DepartmentMemberGrant extends DepartmentAccess {
  department_id: string;
  member_id: string;
}

export interface DepartmentAccessResponse {
  departments: DepartmentAccessDepartment[];
  roleGrants: DepartmentRoleGrant[];
  memberGrants: DepartmentMemberGrant[];
}

export const MODULES: Module[] = [
  'twin',
  'strategy',
  'analytics',
  'data',
  'benchmarks',
  'team',
  'ecosystem',
  'settings',
];

export const ACTIONS: Action[] = ['read', 'write', 'delete'];
export const DEPARTMENT_ACTIONS: DepartmentAction[] = ['read', 'write', 'delete', 'manage'];

export const SYSTEM_ROLE_ORDER: SystemRole[] = [
  'super_admin',
  'founder',
  'co_founder',
  'admin',
  'analyst',
  'engineer',
  'viewer',
  'investor',
];

export const PROTECTED_SYSTEM_ROLES: SystemRole[] = ['super_admin', 'founder'];

export function emptyPermissions(): ExpandedPermissions {
  return Object.fromEntries(
    MODULES.map((module) => [
      module,
      Object.fromEntries(ACTIONS.map((action) => [action, false])) as PermissionSet,
    ]),
  ) as ExpandedPermissions;
}

export function hasPermission(
  permissions: ExpandedPermissions | null | undefined,
  module: Module,
  action: Action,
): boolean {
  return permissions?.[module]?.[action] ?? false;
}

export function clonePermissions(permissions: ExpandedPermissions): ExpandedPermissions {
  return Object.fromEntries(
    MODULES.map((module) => [module, { ...permissions[module] }]),
  ) as ExpandedPermissions;
}

export function isSystemRole(roleId: RoleId | null | undefined): roleId is SystemRole {
  return Boolean(roleId) && SYSTEM_ROLE_ORDER.includes(roleId as SystemRole);
}

export function isProtectedRole(roleId: RoleId | null | undefined): boolean {
  return Boolean(roleId) && PROTECTED_SYSTEM_ROLES.includes(roleId as SystemRole);
}

export async function fetchRbacRoles(): Promise<RoleDefinition[]> {
  const { roles } = await api.get<{ roles: RoleDefinition[] }>('/api/rbac/roles');
  return roles;
}

export async function createCustomRole(input: {
  name: string;
  description?: string | null;
  sourceRoleId: RoleId;
  permissions: ExpandedPermissions;
}): Promise<RoleDefinition> {
  const { role } = await api.post<{ role: RoleDefinition }>('/api/rbac/roles', input);
  return role;
}

export async function updateCustomRole(
  roleId: RoleId,
  patch: { name?: string; description?: string | null; permissions?: ExpandedPermissions },
): Promise<RoleDefinition> {
  const { role } = await api.patch<{ role: RoleDefinition }>(`/api/rbac/roles/${roleId}`, patch);
  return role;
}

export async function archiveCustomRole(roleId: RoleId): Promise<boolean> {
  await api.post(`/api/rbac/roles/${roleId}/archive`, {});
  return true;
}

export async function fetchDepartmentAccess(): Promise<DepartmentAccessResponse> {
  return api.get<DepartmentAccessResponse>('/api/rbac/department-access');
}

export async function saveDepartmentRoleGrant(departmentId: string, roleId: RoleId, grant: DepartmentAccess): Promise<void> {
  await api.put(`/api/rbac/departments/${departmentId}/role-grants/${roleId}`, grant);
}

export async function deleteDepartmentRoleGrant(departmentId: string, roleId: RoleId): Promise<void> {
  await api.delete(`/api/rbac/departments/${departmentId}/role-grants/${roleId}`);
}

export async function saveDepartmentMemberGrant(departmentId: string, memberId: string, grant: DepartmentAccess): Promise<void> {
  await api.put(`/api/rbac/departments/${departmentId}/member-grants/${memberId}`, grant);
}

export async function deleteDepartmentMemberGrant(departmentId: string, memberId: string): Promise<void> {
  await api.delete(`/api/rbac/departments/${departmentId}/member-grants/${memberId}`);
}
