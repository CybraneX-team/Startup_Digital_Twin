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
