// Mirrors backend/src/middleware/permissions.js exactly — keep both in sync.
// 'full' = full CRUD, 'view' = read-only, 'none' = no access (hide nav + block route).
export const ROLE_PERMISSIONS = {
  fleet_manager: { fleet: 'full', drivers: 'full', trips: 'none', fuelExp: 'none', analytics: 'full' },
  dispatcher: { fleet: 'view', drivers: 'none', trips: 'full', fuelExp: 'none', analytics: 'none' },
  safety_officer: { fleet: 'none', drivers: 'full', trips: 'view', fuelExp: 'none', analytics: 'none' },
  financial_analyst: { fleet: 'view', drivers: 'none', trips: 'none', fuelExp: 'full', analytics: 'full' },
};

export function getPermission(role, resource) {
  return ROLE_PERMISSIONS[role]?.[resource] || 'none';
}

export function canAccess(role, resource) {
  return getPermission(role, resource) !== 'none';
}

export function canWrite(role, resource) {
  return getPermission(role, resource) === 'full';
}
