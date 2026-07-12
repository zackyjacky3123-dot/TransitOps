import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const AVG_SPEED_KMPH = 45;

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function positive(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function tripViewQuery(where = '') {
  return `SELECT t.id, t.source, t.destination, t.cargo_weight_kg AS "cargoWeightKg",
    t.planned_distance_km AS "plannedDistanceKm", t.final_odometer AS "finalOdometer",
    t.fuel_consumed_l AS "fuelConsumedL", t.status, t.dispatched_at AS "dispatchedAt",
    t.completed_at AS "completedAt", v.id AS "vehicleId", v.reg_no AS "vehicleRegNo",
    v.odometer AS "vehicleOdometer", d.id AS "driverId", d.name AS "driverName"
    FROM trips t LEFT JOIN vehicles v ON v.id = t.vehicle_id LEFT JOIN drivers d ON d.id = t.driver_id
    ${where} ORDER BY t.created_at DESC`;
}
function validateTrip(body) {
  if (!text(body.source)) return { field: 'source', message: 'Source is required.' };
  if (!text(body.destination)) return { field: 'destination', message: 'Destination is required.' };
  if (!body.vehicleId) return { field: 'vehicleId', message: 'Please select an available vehicle.' };
  if (!body.driverId) return { field: 'driverId', message: 'Please select an eligible driver.' };
  if (!positive(body.cargoWeightKg)) return { field: 'cargoWeightKg', message: 'Cargo weight must be greater than 0.' };
  if (!positive(body.plannedDistanceKm)) return { field: 'plannedDistanceKm', message: 'Planned distance must be greater than 0.' };
  return null;
}
function eta(trip) {
  if (trip.status === 'completed') return 'Completed';
  if (trip.status === 'cancelled') return 'Cancelled';
  if (!trip.dispatchedAt) return 'Awaiting dispatch';
  const arrival = new Date(trip.dispatchedAt);
  arrival.setMinutes(arrival.getMinutes() + Math.round((Number(trip.plannedDistanceKm) / AVG_SPEED_KMPH) * 60));
  return `ETA ${arrival.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`;
}
function present(trip) { return { ...trip, eta: eta(trip) }; }

router.get('/dispatch-options', async (_req, res) => {
  try {
    const [vehicles, drivers] = await Promise.all([
      pool.query(`SELECT id, reg_no AS "regNo", max_capacity_kg AS "maxCapacityKg" FROM vehicles WHERE status = 'available' ORDER BY reg_no`),
      pool.query(`SELECT id, name FROM drivers WHERE status = 'available' AND license_expiry >= CURRENT_DATE ORDER BY name`),
    ]);
    res.json({ vehicles: vehicles.rows, drivers: drivers.rows });
  } catch (err) {
    console.error('[trips/options]', err);
    res.status(500).json({ message: 'Unable to load dispatch options. Please try again.' });
  }
});

router.get('/', async (_req, res) => {
  try { const { rows } = await pool.query(tripViewQuery()); res.json(rows.map(present)); }
  catch (err) { console.error('[trips/list]', err); res.status(500).json({ message: 'Unable to load trips. Please try again.' }); }
});

router.post('/dispatch', async (req, res) => {
  const problem = validateTrip(req.body || {});
  if (problem) return res.status(400).json(problem);
  const body = req.body;
  const cargo = positive(body.cargoWeightKg);
  const distance = positive(body.plannedDistanceKm);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vehicle = await client.query('SELECT id, reg_no, max_capacity_kg, status FROM vehicles WHERE id = $1 FOR UPDATE', [body.vehicleId]);
    if (!vehicle.rows[0] || vehicle.rows[0].status !== 'available') throw Object.assign(new Error('The selected vehicle is no longer available.'), { status: 409, field: 'vehicleId' });
    if (cargo > Number(vehicle.rows[0].max_capacity_kg)) {
      throw Object.assign(new Error(`Vehicle Capacity: ${vehicle.rows[0].max_capacity_kg} kg / Cargo Weight: ${cargo} kg / ✗ Capacity exceeded by ${(cargo - Number(vehicle.rows[0].max_capacity_kg)).toFixed(2)} kg — dispatch blocked`), { status: 400, field: 'cargoWeightKg' });
    }
    const driver = await client.query("SELECT id, status, license_expiry FROM drivers WHERE id = $1 FOR UPDATE", [body.driverId]);
    if (!driver.rows[0] || driver.rows[0].status !== 'available' || new Date(driver.rows[0].license_expiry) < new Date(new Date().toDateString())) {
      throw Object.assign(new Error('The selected driver is no longer eligible for trip assignment.'), { status: 409, field: 'driverId' });
    }
    const inserted = await client.query(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, status, dispatched_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'dispatched', NOW()) RETURNING id`,
      [text(body.source), text(body.destination), body.vehicleId, body.driverId, cargo, distance]
    );
    await client.query("UPDATE vehicles SET status = 'on_trip' WHERE id = $1", [body.vehicleId]);
    await client.query("UPDATE drivers SET status = 'on_trip' WHERE id = $1", [body.driverId]);
    const created = await client.query(tripViewQuery('WHERE t.id = $1'), [inserted.rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json(present(created.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ field: err.field, message: err.status ? err.message : 'Unable to dispatch trip. Please try again.' });
  } finally { client.release(); }
});

router.post('/:id/complete', async (req, res) => {
  const finalOdometer = positive(req.body?.finalOdometer);
  const fuelConsumed = positive(req.body?.fuelConsumedL);
  const fuelPrice = positive(req.body?.fuelPricePerL);
  if (!finalOdometer) return res.status(400).json({ field: 'finalOdometer', message: 'Final odometer must be greater than 0.' });
  if (!fuelConsumed) return res.status(400).json({ field: 'fuelConsumedL', message: 'Fuel consumed must be greater than 0.' });
  if (!fuelPrice) return res.status(400).json({ field: 'fuelPricePerL', message: 'Fuel price per litre must be greater than 0.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const trip = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [req.params.id]);
    const record = trip.rows[0];
    if (!record || record.status !== 'dispatched') throw Object.assign(new Error('Only dispatched trips can be completed.'), { status: 409 });
    const vehicle = await client.query('SELECT odometer FROM vehicles WHERE id = $1 FOR UPDATE', [record.vehicle_id]);
    if (finalOdometer < Number(vehicle.rows[0].odometer)) throw Object.assign(new Error('Final odometer cannot be lower than the current vehicle odometer.'), { status: 400, field: 'finalOdometer' });
    await client.query("UPDATE trips SET status = 'completed', final_odometer = $1, fuel_consumed_l = $2, completed_at = NOW() WHERE id = $3", [finalOdometer, fuelConsumed, record.id]);
    await client.query('INSERT INTO fuel_logs (vehicle_id, log_date, liters, cost) VALUES ($1, CURRENT_DATE, $2, $3)', [record.vehicle_id, fuelConsumed, fuelConsumed * fuelPrice]);
    await client.query("UPDATE vehicles SET status = 'available', odometer = $1 WHERE id = $2", [finalOdometer, record.vehicle_id]);
    await client.query("UPDATE drivers SET status = 'available' WHERE id = $1", [record.driver_id]);
    const result = await client.query(tripViewQuery('WHERE t.id = $1'), [record.id]);
    await client.query('COMMIT'); res.json(present(result.rows[0]));
  } catch (err) { await client.query('ROLLBACK'); res.status(err.status || 500).json({ field: err.field, message: err.status ? err.message : 'Unable to complete trip. Please try again.' }); }
  finally { client.release(); }
});

router.post('/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const trip = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [req.params.id]);
    const record = trip.rows[0];
    if (!record || record.status !== 'dispatched') throw Object.assign(new Error('Only dispatched trips can be cancelled.'), { status: 409 });
    await client.query("UPDATE trips SET status = 'cancelled' WHERE id = $1", [record.id]);
    await client.query("UPDATE vehicles SET status = 'available' WHERE id = $1 AND status = 'on_trip'", [record.vehicle_id]);
    await client.query("UPDATE drivers SET status = 'available' WHERE id = $1 AND status = 'on_trip'", [record.driver_id]);
    const result = await client.query(tripViewQuery('WHERE t.id = $1'), [record.id]);
    await client.query('COMMIT'); res.json(present(result.rows[0]));
  } catch (err) { await client.query('ROLLBACK'); res.status(err.status || 500).json({ message: err.status ? err.message : 'Unable to cancel trip. Please try again.' }); }
  finally { client.release(); }
});

export default router;
