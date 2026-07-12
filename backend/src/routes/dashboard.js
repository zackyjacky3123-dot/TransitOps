import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Assumed average moving speed used only to compute a display ETA for
// dispatched trips — the schema has no live telemetry, so this is a
// reasonable estimate, not a tracked value.
const ASSUMED_AVG_SPEED_KMPH = 45;

const VEHICLE_STATUSES = ['available', 'on_trip', 'in_shop', 'retired'];
const VALID_VEHICLE_STATUSES = new Set(VEHICLE_STATUSES);

function nullableParam(value) {
  return value && value !== 'All' ? value : null;
}

function computeEta(trip) {
  if (trip.status === 'completed') return 'Completed';
  if (trip.status === 'cancelled') return 'Cancelled';
  if (trip.status === 'draft') return 'Awaiting dispatch';

  if (trip.status === 'dispatched' && trip.dispatched_at && trip.planned_distance_km) {
    const hours = Number(trip.planned_distance_km) / ASSUMED_AVG_SPEED_KMPH;
    const eta = new Date(trip.dispatched_at);
    eta.setMinutes(eta.getMinutes() + Math.round(hours * 60));
    return eta.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return '—';
}

// GET /api/dashboard/filters — distinct values for the filter dropdowns
router.get('/filters', async (_req, res) => {
  try {
    const [{ rows: typeRows }, { rows: regionRows }] = await Promise.all([
      pool.query('SELECT DISTINCT type FROM vehicles ORDER BY type'),
      pool.query('SELECT DISTINCT region FROM vehicles WHERE region IS NOT NULL ORDER BY region'),
    ]);
    res.json({
      types: typeRows.map((r) => r.type),
      statuses: VEHICLE_STATUSES,
      regions: regionRows.map((r) => r.region),
    });
  } catch (err) {
    console.error('[dashboard/filters] error:', err);
    res.status(500).json({ message: 'Unable to load filter options. Please try again.' });
  }
});

// GET /api/dashboard/summary?type=&status=&region=&search=
router.get('/summary', async (req, res) => {
  const type = nullableParam(req.query.type);
  const status = nullableParam(req.query.status);
  const region = nullableParam(req.query.region);
  const search = nullableParam(req.query.search);

  if (status && !VALID_VEHICLE_STATUSES.has(status)) {
    return res.status(400).json({ field: 'status', message: 'Invalid vehicle status filter.' });
  }

  try {
    const vehicleFilterParams = [type, status, region];

    const [vehicleKpiResult, breakdownResult, tripKpiResult, driverKpiResult, recentTripsResult] =
      await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status <> 'retired')  AS active_vehicles,
             COUNT(*) FILTER (WHERE status = 'available')  AS available_vehicles,
             COUNT(*) FILTER (WHERE status = 'in_shop')    AS in_maintenance,
             COUNT(*) FILTER (WHERE status = 'on_trip')    AS on_trip_vehicles
           FROM vehicles
           WHERE ($1::text IS NULL OR type = $1)
             AND ($2::vehicle_status IS NULL OR status = $2::vehicle_status)
             AND ($3::text IS NULL OR region = $3)`,
          vehicleFilterParams
        ),
        pool.query(
          `SELECT status, COUNT(*)::int AS count
           FROM vehicles
           WHERE ($1::text IS NULL OR type = $1)
             AND ($2::text IS NULL OR region = $2)
           GROUP BY status`,
          [type, region]
        ),
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE t.status = 'dispatched') AS active_trips,
             COUNT(*) FILTER (WHERE t.status = 'draft')      AS pending_trips
           FROM trips t
           LEFT JOIN vehicles v ON v.id = t.vehicle_id
           WHERE ($1::text IS NULL OR v.type = $1)
             AND ($2::text IS NULL OR v.region = $2)`,
          [type, region]
        ),
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE status IN ('available', 'on_trip')) AS drivers_on_duty
           FROM drivers`
        ),
        pool.query(
          `SELECT t.id, t.source, t.destination, t.status, t.dispatched_at, t.planned_distance_km,
                  v.reg_no AS vehicle_reg_no, d.name AS driver_name
           FROM trips t
           LEFT JOIN vehicles v ON v.id = t.vehicle_id
           LEFT JOIN drivers d ON d.id = t.driver_id
           WHERE ($1::text IS NULL OR v.type = $1)
             AND ($2::text IS NULL OR v.region = $2)
             AND (
               $3::text IS NULL
               OR v.reg_no ILIKE '%' || $3 || '%'
               OR d.name ILIKE '%' || $3 || '%'
               OR t.source ILIKE '%' || $3 || '%'
               OR t.destination ILIKE '%' || $3 || '%'
               OR CAST(t.id AS TEXT) = $3
             )
           ORDER BY t.created_at DESC
           LIMIT 8`,
          [type, region, search]
        ),
      ]);

    const v = vehicleKpiResult.rows[0];
    const activeVehicles = Number(v.active_vehicles);
    const onTripVehicles = Number(v.on_trip_vehicles);
    const fleetUtilizationPct = activeVehicles > 0 ? Math.round((onTripVehicles / activeVehicles) * 100) : 0;

    const breakdownMap = Object.fromEntries(breakdownResult.rows.map((r) => [r.status, r.count]));
    const vehicleStatusBreakdown = VEHICLE_STATUSES.map((s) => ({
      status: s,
      count: breakdownMap[s] || 0,
    }));
    const breakdownTotal = vehicleStatusBreakdown.reduce((sum, r) => sum + r.count, 0);

    const recentTrips = recentTripsResult.rows.map((t) => ({
      id: t.id,
      vehicleRegNo: t.vehicle_reg_no || 'Unassigned',
      driverName: t.driver_name || 'Unassigned',
      route: `${t.source} → ${t.destination}`,
      status: t.status,
      eta: computeEta(t),
    }));

    res.json({
      kpis: {
        activeVehicles,
        availableVehicles: Number(v.available_vehicles),
        vehiclesInMaintenance: Number(v.in_maintenance),
        activeTrips: Number(tripKpiResult.rows[0].active_trips),
        pendingTrips: Number(tripKpiResult.rows[0].pending_trips),
        driversOnDuty: Number(driverKpiResult.rows[0].drivers_on_duty),
        fleetUtilizationPct,
      },
      vehicleStatusBreakdown,
      breakdownTotal,
      recentTrips,
    });
  } catch (err) {
    console.error('[dashboard/summary] error:', err);
    res.status(500).json({ message: 'Unable to load dashboard data. Please try again.' });
  }
});

export default router;
