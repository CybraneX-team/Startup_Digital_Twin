import type { UserRole } from '../supabase';

/* ──────────────────────────────────────────────────
   Module → action permission matrix
   Mirrors the JSONB stored in the `roles` table
────────────────────────────────────────────────── */
export type Action = 'read' | 'write' | 'delete';
export type Module =
  | 'twin' | 'strategy' | 'analytics' | 'data'
  | 'benchmarks' | 'team' | 'ecosystem' | 'settings';

type PermissionSet = Partial<Record<Action, boolean>>;
type RolePermissions = Record<string, PermissionSet>;  // module or '*'

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    '*': { read: true, write: true, delete: true },
  },
  founder: {
    twin:       { read: true,  write: true,  delete: false },
    strategy:   { read: true,  write: true,  delete: true  },
    analytics:  { read: true,  write: true,  delete: false },
    data:       { read: true,  write: true,  delete: false },
    benchmarks: { read: true,  write: false, delete: false },
    team:       { read: true,  write: true,  delete: true  },
    ecosystem:  { read: true,  write: true,  delete: false },
    settings:   { read: true,  write: true,  delete: false },
  },
  co_founder: {
    twin:       { read: true,  write: true,  delete: false },
    strategy:   { read: true,  write: true,  delete: true  },
    analytics:  { read: true,  write: true,  delete: false },
    data:       { read: true,  write: true,  delete: false },
    benchmarks: { read: true,  write: false, delete: false },
    team:       { read: true,  write: true,  delete: false },
    ecosystem:  { read: true,  write: true,  delete: false },
    settings:   { read: true,  write: false, delete: false },
  },
  admin: {
    twin:       { read: true,  write: true,  delete: false },
    strategy:   { read: true,  write: true,  delete: false },
    analytics:  { read: true,  write: true,  delete: false },
    data:       { read: true,  write: true,  delete: false },
    benchmarks: { read: true,  write: false, delete: false },
    team:       { read: true,  write: true,  delete: false },
    ecosystem:  { read: true,  write: false, delete: false },
    settings:   { read: true,  write: false, delete: false },
  },
  analyst: {
    twin:       { read: true,  write: false, delete: false },
    strategy:   { read: true,  write: true,  delete: false },
    analytics:  { read: true,  write: true,  delete: false },
    data:       { read: true,  write: false, delete: false },
    benchmarks: { read: true,  write: false, delete: false },
    team:       { read: true,  write: false, delete: false },
    ecosystem:  { read: true,  write: false, delete: false },
    settings:   { read: false, write: false, delete: false },
  },
  engineer: {
    twin:       { read: true,  write: false, delete: false },
    strategy:   { read: true,  write: false, delete: false },
    analytics:  { read: true,  write: false, delete: false },
    data:       { read: true,  write: true,  delete: false },
    benchmarks: { read: true,  write: false, delete: false },
    team:       { read: true,  write: false, delete: false },
    ecosystem:  { read: false, write: false, delete: false },
    settings:   { read: false, write: false, delete: false },
  },
  viewer: {
    twin:       { read: true,  write: false, delete: false },
    strategy:   { read: true,  write: false, delete: false },
    analytics:  { read: true,  write: false, delete: false },
    data:       { read: true,  write: false, delete: false },
    benchmarks: { read: true,  write: false, delete: false },
    team:       { read: true,  write: false, delete: false },
    ecosystem:  { read: true,  write: false, delete: false },
    settings:   { read: false, write: false, delete: false },
  },
  investor: {
    twin:       { read: true,  write: false, delete: false },
    strategy:   { read: false, write: false, delete: false },
    analytics:  { read: true,  write: false, delete: false },
    data:       { read: false, write: false, delete: false },
    benchmarks: { read: true,  write: false, delete: false },
    team:       { read: true,  write: false, delete: false },
    ecosystem:  { read: false, write: false, delete: false },
    settings:   { read: false, write: false, delete: false },
  },
};

/* ──────────────────────────────────────────────────
   Core permission check
────────────────────────────────────────────────── */
export function can(role: UserRole, module: Module, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  // super_admin wildcard
  if (perms['*']?.[action]) return true;
  return perms[module]?.[action] ?? false;
}

/* ──────────────────────────────────────────────────
   Convenience helpers
────────────────────────────────────────────────── */
export const canRead   = (role: UserRole, module: Module) => can(role, module, 'read');
export const canWrite  = (role: UserRole, module: Module) => can(role, module, 'write');
export const canDelete = (role: UserRole, module: Module) => can(role, module, 'delete');

/** Returns true for roles with any write capability (used to show edit UI) */
export function isEditor(role: UserRole): boolean {
  return ['super_admin', 'founder', 'co_founder', 'admin', 'analyst', 'engineer'].includes(role);
}

/** Returns true for roles that can manage team members */
export function canManageTeam(role: UserRole): boolean {
  return can(role, 'team', 'write');
}

/** Returns true for roles that can modify company-level settings */
export function canManageSettings(role: UserRole): boolean {
  return can(role, 'settings', 'write');
}

/** Full permissions map for a role — useful for passing to UI */
export function getPermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role] ?? {};
}
