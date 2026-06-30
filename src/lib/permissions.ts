// Roles & Permissions model. Pure (no client deps) so it's usable anywhere.
//
// Roles are Admin / Manager / Rep. The DB stores 'owner' for the top role, so we
// map owner -> admin at the edge (avoids a risky enum/RLS rewrite).
// Permissions resolve from per-role DEFAULTS, overlaid with per-team overrides
// stored in `role_permissions`. Everything is FAIL-OPEN: a feature is allowed
// unless explicitly turned off, so the matrix can never lock a user out by
// omission.

export type RoleKey = 'admin' | 'manager' | 'rep'

export const ROLES: { key: RoleKey; label: string; blurb: string }[] = [
  { key: 'admin',   label: 'Admin',   blurb: 'Full access, including roles & permissions.' },
  { key: 'manager', label: 'Manager', blurb: 'Team oversight, content, and analytics.' },
  { key: 'rep',     label: 'Rep',     blurb: 'A BDR working their own pipeline & learning.' },
]

export function effectiveRole(dbRole: string | null | undefined): RoleKey {
  if (dbRole === 'owner' || dbRole === 'admin') return 'admin'
  if (dbRole === 'manager') return 'manager'
  return 'rep'
}
// What to write back to users.role when assigning a role (keeps DB enum intact).
export function dbRoleFor(role: RoleKey): string {
  return role === 'admin' ? 'owner' : role
}

export interface Feature { key: string; label: string; group: string; scope: 'rep' | 'manager'; href?: string }

export const FEATURES: Feature[] = [
  // Rep-facing
  { key: 'learning',     label: 'Learning Center', group: 'Learn',    scope: 'rep', href: '/train' },
  { key: 'drill',        label: 'Objection Drill', group: 'Learn',    scope: 'rep', href: '/drill' },
  { key: 'partners',     label: 'Partners',        group: 'Sell',     scope: 'rep', href: '/partners' },
  { key: 'analytics',    label: 'Analytics',       group: 'Sell',     scope: 'rep', href: '/analytics' },
  { key: 'commissions',  label: 'Commissions',     group: 'Sell',     scope: 'rep', href: '/commissions' },
  { key: 'notes',        label: 'Notes',           group: 'Focus',    scope: 'rep', href: '/notes' },
  { key: 'time_blocking',label: 'Time Blocks',   group: 'Focus',    scope: 'rep', href: '/schedule' },
  { key: 'tasks',        label: 'Tasks',           group: 'Focus',    scope: 'rep', href: '/tasks' },
  { key: 'wins',         label: 'Wins',            group: 'Engage',   scope: 'rep', href: '/wins' },
  { key: 'coach',        label: 'AI Coach',        group: 'Engage',   scope: 'rep', href: '/coach' },
  { key: 'leaderboard',  label: 'Leaderboard',     group: 'Engage',   scope: 'rep', href: '/leaderboard' },
  { key: 'certificate',  label: 'Progress',        group: 'Engage',   scope: 'rep', href: '/progress' },
  { key: 'resources',    label: 'Resources',       group: 'Engage',   scope: 'rep', href: '/resources' },
  // Manager-facing
  { key: 'mgr_dashboard',   label: 'Dashboard',      group: 'Manager', scope: 'manager', href: '/manager/dashboard' },
  { key: 'mgr_team',        label: 'Team',           group: 'Manager', scope: 'manager', href: '/manager/team' },
  { key: 'mgr_partners',    label: 'Team Partners',  group: 'Manager', scope: 'manager', href: '/manager/partners' },
  { key: 'mgr_rhythm',      label: 'Team Time Blocks', group: 'Manager', scope: 'manager', href: '/manager/rhythm' },
  { key: 'mgr_analytics',   label: 'Team Analytics', group: 'Manager', scope: 'manager', href: '/manager/analytics' },
  { key: 'mgr_broadcast',   label: 'Broadcast',      group: 'Manager', scope: 'manager', href: '/manager/broadcast' },
  { key: 'mgr_resources',   label: 'Manage Resources', group: 'Manager', scope: 'manager', href: '/manager/resources' },
  { key: 'mgr_gamification',label: 'XP Rules',       group: 'Manager', scope: 'manager', href: '/manager/gamification' },
  { key: 'roles',           label: 'Roles & Permissions', group: 'Manager', scope: 'manager', href: '/manager/roles' },
]

export interface Perm { view: boolean; edit: boolean }
export type PermMap = Record<string, Perm>

// Sensible defaults — current behavior preserved (reps keep rep features,
// managers keep manager features). Admins get everything.
export function defaultPerms(role: RoleKey): PermMap {
  const map: PermMap = {}
  for (const f of FEATURES) {
    if (role === 'admin') {
      map[f.key] = { view: true, edit: true }
    } else if (role === 'manager') {
      // Managers: all rep features + manager features; can't EDIT roles (admin-only).
      map[f.key] = { view: true, edit: f.key === 'roles' ? false : true }
    } else {
      // Reps: only rep-scope features; never manager features.
      map[f.key] = f.scope === 'rep' ? { view: true, edit: true } : { view: false, edit: false }
    }
  }
  return map
}

// Overlay per-team overrides onto the role defaults.
export function resolvePerms(role: RoleKey, overrides: { role: string; feature_key: string; can_view: boolean; can_edit: boolean }[]): PermMap {
  const map = defaultPerms(role)
  for (const o of overrides) {
    if (o.role !== role) continue
    if (map[o.feature_key]) map[o.feature_key] = { view: o.can_view, edit: o.can_edit }
  }
  return map
}

// Fail-open accessors: allow unless explicitly denied.
export const canView = (perms: PermMap | null, key: string) => !perms || perms[key]?.view !== false
export const canEdit = (perms: PermMap | null, key: string) => !perms || perms[key]?.edit !== false

// Map a nav href to its feature key (for nav gating).
export function featureForHref(href: string): string | undefined {
  return FEATURES.find(f => f.href === href)?.key
}
