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
export type SystemRole =
  | 'super_admin'
  | 'founder'
  | 'co_founder'
  | 'admin'
  | 'analyst'
  | 'engineer'
  | 'viewer'
  | 'investor';
export type UserRole = SystemRole;
export type PermissionSet = Record<Action, boolean>;
export type ExpandedPermissions = Record<Module, PermissionSet>;

export type DbBackedRole = SystemRole;

const falseActions = () => ({ read: false, write: false, delete: false });

function expanded(partial: Partial<Record<Module, Partial<Record<Action, boolean>>>>): ExpandedPermissions {
  return Object.fromEntries(
    MODULES.map((module) => [
      module,
      {
        ...falseActions(),
        ...(partial[module] ?? {}),
      },
    ]),
  ) as ExpandedPermissions;
}

export const ACTIONS: Action[] = ['read', 'write', 'delete'];
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

export const ROLE_ORDER: SystemRole[] = [
  'super_admin',
  'founder',
  'co_founder',
  'admin',
  'analyst',
  'engineer',
  'viewer',
  'investor',
];

export const ASSIGNABLE_MEMBER_ROLES: SystemRole[] = [
  'co_founder',
  'admin',
  'analyst',
  'engineer',
  'viewer',
  'investor',
];

export const ROLE_PERMISSIONS: Record<SystemRole, ExpandedPermissions> = {
  super_admin: expanded(Object.fromEntries(MODULES.map((module) => [
    module,
    { read: true, write: true, delete: true },
  ])) as Record<Module, Record<Action, boolean>>),
  founder: expanded({
    twin:       { read: true, write: true },
    strategy:   { read: true, write: true, delete: true },
    analytics:  { read: true, write: true },
    data:       { read: true, write: true },
    benchmarks: { read: true },
    team:       { read: true, write: true, delete: true },
    ecosystem:  { read: true, write: true },
    settings:   { read: true, write: true },
  }),
  co_founder: expanded({
    twin:       { read: true, write: true },
    strategy:   { read: true, write: true, delete: true },
    analytics:  { read: true, write: true },
    data:       { read: true, write: true },
    benchmarks: { read: true },
    team:       { read: true, write: true },
    ecosystem:  { read: true, write: true },
    settings:   { read: true },
  }),
  admin: expanded({
    twin:       { read: true, write: true },
    strategy:   { read: true, write: true },
    analytics:  { read: true, write: true },
    data:       { read: true, write: true },
    benchmarks: { read: true },
    team:       { read: true, write: true },
    ecosystem:  { read: true },
    settings:   { read: true },
  }),
  analyst: expanded({
    twin:       { read: true },
    strategy:   { read: true, write: true },
    analytics:  { read: true, write: true },
    data:       { read: true },
    benchmarks: { read: true },
    team:       { read: true },
    ecosystem:  { read: true },
  }),
  engineer: expanded({
    twin:       { read: true },
    strategy:   { read: true },
    analytics:  { read: true },
    data:       { read: true, write: true },
    benchmarks: { read: true },
    team:       { read: true },
  }),
  viewer: expanded({
    twin:       { read: true },
    strategy:   { read: true },
    analytics:  { read: true },
    data:       { read: true },
    benchmarks: { read: true },
    team:       { read: true },
    ecosystem:  { read: true },
  }),
  investor: expanded({
    twin:       { read: true },
    analytics:  { read: true },
    benchmarks: { read: true },
    team:       { read: true },
  }),
};

export function can(role: SystemRole, module: Module, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.[module]?.[action] ?? false;
}

export const DB_BACKED_ROLES: SystemRole[] = [
  'super_admin',
  'founder',
  'co_founder',
  'admin',
  'analyst',
  'engineer',
  'viewer',
  'investor',
];

export const TEAM_WRITE_ROLES: SystemRole[] = [
  'super_admin',
  'founder',
  'co_founder',
  'admin',
];

export const READ_ONLY_TEAM_ROLES: SystemRole[] = [
  'analyst',
  'engineer',
  'viewer',
  'investor',
];

export const ROUTE_CONTRACTS: Array<{
  path: string;
  module: Module;
  action: Action;
}> = [
  { path: '/twin/strategy',        module: 'strategy',   action: 'read'  },
  { path: '/twin/data',            module: 'data',        action: 'write' },
  { path: '/twin/benchmarks',      module: 'benchmarks',  action: 'read'  },
  { path: '/twin/team',            module: 'team',        action: 'read'  },
  { path: '/twin/analytics',       module: 'analytics',   action: 'read'  },
  { path: '/ecosystem/vc-connect', module: 'ecosystem',   action: 'read'  },
  { path: '/ecosystem/network',    module: 'ecosystem',   action: 'read'  },
  { path: '/settings',             module: 'settings',    action: 'read'  },
];
