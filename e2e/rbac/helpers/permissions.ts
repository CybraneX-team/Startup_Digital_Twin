export type Action = 'read' | 'write' | 'delete';
export type Module =
  | 'twin'
  | 'strategy'
  | 'analytics'
  | 'data'
  | 'benchmarks'
  | 'team'
  | 'ecosystem'
  | 'settings';

export type DbBackedRole =
  | 'super_admin'
  | 'founder'
  | 'co_founder'
  | 'admin'
  | 'analyst'
  | 'engineer'
  | 'viewer'
  | 'investor';

export type UiOnlyRole = 'vc';
export type UserRole = DbBackedRole | UiOnlyRole;

type PermissionSet = Partial<Record<Action, boolean>>;
type RolePermissions = Record<string, PermissionSet>;

export const DB_BACKED_ROLES: DbBackedRole[] = [
  'super_admin',
  'founder',
  'co_founder',
  'admin',
  'analyst',
  'engineer',
  'viewer',
  'investor',
];

export const TEAM_WRITE_ROLES: DbBackedRole[] = [
  'super_admin',
  'founder',
  'co_founder',
  'admin',
];

export const READ_ONLY_TEAM_ROLES: DbBackedRole[] = [
  'analyst',
  'engineer',
  'viewer',
  'investor',
];

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

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    '*': { read: true, write: true, delete: true },
  },
  founder: {
    twin: { read: true, write: true, delete: false },
    strategy: { read: true, write: true, delete: true },
    analytics: { read: true, write: true, delete: false },
    data: { read: true, write: true, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: true, delete: true },
    ecosystem: { read: true, write: true, delete: false },
    settings: { read: true, write: true, delete: false },
  },
  co_founder: {
    twin: { read: true, write: true, delete: false },
    strategy: { read: true, write: true, delete: true },
    analytics: { read: true, write: true, delete: false },
    data: { read: true, write: true, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: true, delete: false },
    ecosystem: { read: true, write: true, delete: false },
    settings: { read: true, write: false, delete: false },
  },
  admin: {
    twin: { read: true, write: true, delete: false },
    strategy: { read: true, write: true, delete: false },
    analytics: { read: true, write: true, delete: false },
    data: { read: true, write: true, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: true, delete: false },
    ecosystem: { read: true, write: false, delete: false },
    settings: { read: true, write: false, delete: false },
  },
  analyst: {
    twin: { read: true, write: false, delete: false },
    strategy: { read: true, write: true, delete: false },
    analytics: { read: true, write: true, delete: false },
    data: { read: true, write: false, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: false, delete: false },
    ecosystem: { read: true, write: false, delete: false },
    settings: { read: false, write: false, delete: false },
  },
  engineer: {
    twin: { read: true, write: false, delete: false },
    strategy: { read: true, write: false, delete: false },
    analytics: { read: true, write: false, delete: false },
    data: { read: true, write: true, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: false, delete: false },
    ecosystem: { read: false, write: false, delete: false },
    settings: { read: false, write: false, delete: false },
  },
  viewer: {
    twin: { read: true, write: false, delete: false },
    strategy: { read: true, write: false, delete: false },
    analytics: { read: true, write: false, delete: false },
    data: { read: true, write: false, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: false, delete: false },
    ecosystem: { read: true, write: false, delete: false },
    settings: { read: false, write: false, delete: false },
  },
  investor: {
    twin: { read: true, write: false, delete: false },
    strategy: { read: false, write: false, delete: false },
    analytics: { read: true, write: false, delete: false },
    data: { read: false, write: false, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: false, delete: false },
    ecosystem: { read: false, write: false, delete: false },
    settings: { read: false, write: false, delete: false },
  },
  vc: {
    twin: { read: true, write: false, delete: false },
    strategy: { read: false, write: false, delete: false },
    analytics: { read: true, write: false, delete: false },
    data: { read: false, write: false, delete: false },
    benchmarks: { read: true, write: false, delete: false },
    team: { read: true, write: false, delete: false },
    ecosystem: { read: false, write: false, delete: false },
    settings: { read: false, write: false, delete: false },
  },
};

export const ROUTE_CONTRACTS: Array<{
  path: string;
  module: Module;
  action: Action;
}> = [
  { path: '/twin/strategy', module: 'strategy', action: 'read' },
  { path: '/twin/data', module: 'data', action: 'write' },
  { path: '/twin/benchmarks', module: 'benchmarks', action: 'read' },
  { path: '/twin/team', module: 'team', action: 'read' },
  { path: '/twin/analytics', module: 'analytics', action: 'read' },
  { path: '/ecosystem/vc-connect', module: 'ecosystem', action: 'read' },
  { path: '/ecosystem/network', module: 'ecosystem', action: 'read' },
  { path: '/settings', module: 'settings', action: 'read' },
];

export function can(role: UserRole, module: Module, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms['*']?.[action]) return true;
  return perms[module]?.[action] ?? false;
}
