import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccess } from '../lib/permissions.js';


const ROLE_LABELS = {
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function SidebarLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = ROLE_LABELS[role] ?? role ?? 'Guest';
  const roleInitials = roleLabel
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen w-full bg-base-bg text-white">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-base-border bg-base-panel">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-base-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
            T
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Transit<span className="text-accent">Ops</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.filter((item) => !item.resource || canAccess(role, item.resource)).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent',
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-base-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogoutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 border-b border-base-border bg-base-panel px-6 py-3">
          <div className="relative w-full max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search vehicles, drivers, trips..."
              className="input-field w-full pl-9"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="badge border-accent/40 bg-accent-soft text-accent">
              {roleLabel} {user?.initials ?? roleInitials}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white ring-2 ring-base-panel">
                {initialsOf(user?.name) || roleInitials}
              </div>
              <span className="text-sm font-medium text-gray-200">
                {user?.name ?? 'Guest User'}
              </span>
            </div>
          </div>
        </header>

        {/* Routed page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* --- Minimal inline icon set (no external icon dependency) --- */
function iconWrap(paths) {
  return function Icon({ className }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
        {paths}
      </svg>
    );
  };
}

const DashboardIcon = iconWrap(
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>
);
const FleetIcon = iconWrap(
  <>
    <path d="M3 16V9a1 1 0 0 1 1-1h9l4 4h3a1 1 0 0 1 1 1v3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </>
);
const DriversIcon = iconWrap(
  <>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
  </>
);
const TripsIcon = iconWrap(
  <>
    <path d="M4 12h16M4 12l4-4M4 12l4 4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="12" r="1.6" />
  </>
);
const MaintenanceIcon = iconWrap(
  <path
    d="M14.7 6.3a3.5 3.5 0 0 1-4.6 4.6L4 17l3 3 6.1-6.1a3.5 3.5 0 0 1 4.6-4.6l-2.3 2.3-2-2 2.3-2.3Z"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);
const FuelIcon = iconWrap(
  <>
    <path d="M6 20V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v14" strokeLinecap="round" />
    <path d="M6 20h8M14 9h2a2 2 0 0 1 2 2v3.5a1.5 1.5 0 0 0 3 0V9l-2-2" strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const AnalyticsIcon = iconWrap(
  <>
    <path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" />
  </>
);
const SettingsIcon = iconWrap(
  <>
    <circle cx="12" cy="12" r="3" />
    <path
      d="M19.4 13.5a7.97 7.97 0 0 0 0-3l2-1.5-2-3.4-2.3.9a8 8 0 0 0-2.6-1.5L14 2h-4l-.5 2a8 8 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a8 8 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 2.6 1.5l.5 2h4l.5-2a8 8 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);
const LogoutIcon = iconWrap(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const SearchIcon = iconWrap(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
  </>
);
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/fleet', label: 'Fleet', icon: FleetIcon, resource: 'fleet' },
  { to: '/drivers', label: 'Drivers', icon: DriversIcon, resource: 'drivers' },
  { to: '/trips', label: 'Trips', icon: TripsIcon, resource: 'trips' },
  { to: '/maintenance', label: 'Maintenance', icon: MaintenanceIcon },
  { to: '/fuel-expenses', label: 'Fuel & Expenses', icon: FuelIcon, resource: 'fuelExp' },
  { to: '/analytics', label: 'Analytics', icon: AnalyticsIcon, resource: 'analytics' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];
