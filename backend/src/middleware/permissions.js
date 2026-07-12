// RBAC matrix — mirrors the Settings & RBAC screen exactly (see roadmap doc,
// "RBAC Matrix (from Screen 8 — build this exactly, it's a scoring signal)").
// 'full' = full CRUD, 'view' = read-only (GET only), 'none' = no access at all.
//
// Maintenance, Dashboard, and Settings are intentionally NOT gated here — the
// roadmap's RBAC matrix only covers Fleet, Drivers, Trips, Fuel/Exp, and
// Analytics, and those three screens are meant to stay open to any
// authenticated user.
export const ROLE_PERMISSIONS = {
  fleet_manager: { fleet: 'full', drivers: 'full', trips: 'none', fuelExp: 'none', analytics: 'full' },
  dispatcher: { fleet: 'view', drivers: 'none', trips: 'full', fuelExp: 'none', analytics: 'none' },
  safety_officer: { fleet: 'none', drivers: 'full', trips: 'view', fuelExp: 'none', analytics: 'none' },
  financial_analyst: { fleet: 'view', drivers: 'none', trips: 'none', fuelExp: 'full', analytics: 'full' },
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Must run after requireAuth (needs req.user.role already set).
export function requirePermission(resource) {
  return (req, res, next) => {
    const level = ROLE_PERMISSIONS[req.user?.role]?.[resource] || 'none';

    if (level === 'none') {
      return res.status(403).json({ message: 'Your role does not have access to this section.' });
    }
    if (level === 'view' && WRITE_METHODS.has(req.method)) {
      return res.status(403).json({ message: 'Your role has read-only access to this section.' });
    }
    next();
  };
}
