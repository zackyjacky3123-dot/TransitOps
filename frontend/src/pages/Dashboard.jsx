import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiFetch } from '../lib/api.js';

const KPI_DEFS = [
  { key: 'activeVehicles', label: 'Active Vehicles', color: '#3b82f6' },
  { key: 'availableVehicles', label: 'Available Vehicles', color: '#22c55e' },
  { key: 'vehiclesInMaintenance', label: 'Vehicles in Maintenance', color: '#f97316' },
  { key: 'activeTrips', label: 'Active Trips', color: '#3b82f6' },
  { key: 'pendingTrips', label: 'Pending Trips', color: '#9ca3af' },
  { key: 'driversOnDuty', label: 'Drivers on Duty', color: '#22c55e' },
  { key: 'fleetUtilizationPct', label: 'Fleet Utilization (%)', color: '#d97706', suffix: '%' },
];

const BREAKDOWN_COLORS = {
  available: '#22c55e',
  on_trip: '#3b82f6',
  in_shop: '#f97316',
  retired: '#ef4444',
};

const BREAKDOWN_LABELS = {
  available: 'Available',
  on_trip: 'On Trip',
  in_shop: 'In Shop',
  retired: 'Retired',
};

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function Dashboard() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');
  const [region, setRegion] = useState('All');

  const [filterOptions, setFilterOptions] = useState({ types: [], statuses: [], regions: [] });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebouncedValue(search, 300);

  // Load filter dropdown options once.
  useEffect(() => {
    apiFetch('/api/dashboard/filters')
      .then((res) => res.json())
      .then(setFilterOptions)
      .catch(() => {
        /* Filter dropdowns just fall back to "All" if this fails. */
      });
  }, []);

  // Reload summary whenever filters change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (type !== 'All') params.set('type', type);
    if (status !== 'All') params.set('status', status);
    if (region !== 'All') params.set('region', region);
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

    setLoading(true);
    setError('');

    apiFetch(`/api/dashboard/summary?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load dashboard data.');
        return data;
      })
      .then(setSummary)
      .catch((err) => {
        setError(err.message);
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }, [type, status, region, debouncedSearch]);

  const breakdownTotal = summary?.breakdownTotal || 0;

  const breakdownBars = useMemo(() => {
    if (!summary) return [];
    return summary.vehicleStatusBreakdown.map((row) => ({
      ...row,
      pct: breakdownTotal > 0 ? Math.round((row.count / breakdownTotal) * 100) : 0,
    }));
  }, [summary, breakdownTotal]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-400">Fleet-wide KPIs, recent trips, and vehicle status at a glance.</p>

      {/* Filter row */}
      <div className="panel mt-6 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <input
            type="text"
            placeholder="Search trip ID, vehicle, driver, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full"
          />
        </div>

        <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="All">Vehicle Type: All</option>
          {filterOptions.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">Status: All</option>
          {filterOptions.statuses.map((s) => (
            <option key={s} value={s}>
              {BREAKDOWN_LABELS[s] || s}
            </option>
          ))}
        </select>

        <select className="input-field" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="All">Region: All</option>
          {filterOptions.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-status-red/40 bg-status-red/10 px-3 py-2 text-sm text-status-red">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {KPI_DEFS.map((kpi) => (
          <div
            key={kpi.key}
            className="panel p-4 transition-all hover:border-gray-600 hover:shadow-lg hover:shadow-black/20"
            style={{ borderLeft: `3px solid ${kpi.color}` }}
          >
            <p className="text-xs font-medium text-gray-400">{kpi.label}</p>
            {loading || !summary ? (
              <div className="mt-2 h-7 w-16 animate-pulse rounded bg-white/10" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-white">
                {summary.kpis[kpi.key]}{kpi.suffix || ''}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Recent trips + vehicle status */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold text-white">Recent Trips</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-base-border text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Trip ID</th>
                  <th className="pb-2 pr-3 font-medium">Vehicle</th>
                  <th className="pb-2 pr-3 font-medium">Driver</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 font-medium">ETA</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-base-border/60 last:border-0">
                      <td className="py-2.5 pr-3" colSpan={5}>
                        <div className="h-4 w-full animate-pulse rounded bg-white/5" />
                      </td>
                    </tr>
                  ))}
                {!loading && summary?.recentTrips.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon="🚚"
                        title="No trips match the current filters"
                        description="Try adjusting your search or filters, or dispatch a new trip."
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  summary?.recentTrips.map((trip) => (
                    <tr
                      key={trip.id}
                      className="border-b border-base-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="py-2.5 pr-3 font-medium text-gray-200">#{trip.id}</td>
                      <td className="py-2.5 pr-3 text-gray-300">{trip.vehicleRegNo}</td>
                      <td className="py-2.5 pr-3 text-gray-300">{trip.driverName}</td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={trip.status} />
                      </td>
                      <td className="py-2.5 text-gray-400">{trip.eta}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-semibold text-white">Vehicle Status</h2>
          <div className="mt-4 space-y-4">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-6 animate-pulse rounded bg-white/10" />
                  </div>
                  <div className="mt-1.5 h-2 w-full animate-pulse rounded-full bg-white/5" />
                </div>
              ))}
            {!loading && breakdownBars.length === 0 && (
              <EmptyState
                icon="🚗"
                title="No vehicle data yet"
                description="Register a vehicle to see status breakdown here."
              />
            )}
            {!loading &&
              breakdownBars.map((row) => (
                <div key={row.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{BREAKDOWN_LABELS[row.status]}</span>
                    <span className="text-gray-400">{row.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-base-bg">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${row.pct}%`,
                        backgroundColor: BREAKDOWN_COLORS[row.status],
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}