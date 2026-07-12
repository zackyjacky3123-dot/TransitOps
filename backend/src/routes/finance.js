import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const clean = (value) => typeof value === 'string' ? value.trim() : '';
const asId = (value) => value && /^\d+$/.test(String(value)) ? Number(value) : null;
const today = () => new Date().toISOString().slice(0, 10);
function dateIssue(date) { return !date || Number.isNaN(Date.parse(`${date}T00:00:00`)) ? 'Please enter a valid date.' : date > today() ? 'Date cannot be in the future.' : null; }

router.get('/options', async (_req, res) => {
  try {
    const [vehicles, trips, maintenance] = await Promise.all([
      pool.query("SELECT id, reg_no AS \"regNo\" FROM vehicles WHERE status <> 'retired' ORDER BY reg_no"),
      pool.query('SELECT t.id, t.source, t.destination, v.reg_no AS "vehicleRegNo" FROM trips t JOIN vehicles v ON v.id = t.vehicle_id ORDER BY t.created_at DESC'),
      pool.query("SELECT m.id, m.service_type AS \"serviceType\", v.reg_no AS \"vehicleRegNo\" FROM maintenance_logs m JOIN vehicles v ON v.id = m.vehicle_id ORDER BY m.created_at DESC"),
    ]);
    res.json({ vehicles: vehicles.rows, trips: trips.rows, maintenance: maintenance.rows });
  } catch (err) { console.error('[finance/options]', err); res.status(500).json({ message: 'Unable to load financial form options. Please try again.' }); }
});

router.get('/fuel-logs', async (req, res) => {
  const vehicleId = asId(req.query.vehicleId);
  try {
    const { rows } = await pool.query(`SELECT f.id, f.log_date AS "logDate", f.liters, f.cost, v.id AS "vehicleId", v.reg_no AS "vehicleRegNo" FROM fuel_logs f JOIN vehicles v ON v.id = f.vehicle_id WHERE ($1::int IS NULL OR f.vehicle_id = $1) ORDER BY f.log_date DESC, f.id DESC`, [vehicleId]);
    res.json(rows);
  } catch (err) { console.error('[finance/fuel-list]', err); res.status(500).json({ message: 'Unable to load fuel logs. Please try again.' }); }
});

router.post('/fuel-logs', async (req, res) => {
  const body = req.body || {}; const vehicleId = asId(body.vehicleId); const liters = Number(body.liters); const cost = Number(body.cost); const logDate = clean(body.logDate);
  if (!vehicleId) return res.status(400).json({ field: 'vehicleId', message: 'Please select a vehicle.' });
  if (!Number.isFinite(liters) || liters <= 0) return res.status(400).json({ field: 'liters', message: 'Liters must be greater than 0.' });
  if (!Number.isFinite(cost) || cost < 0) return res.status(400).json({ field: 'cost', message: 'Cost must be a positive number.' });
  const issue = dateIssue(logDate); if (issue) return res.status(400).json({ field: 'logDate', message: issue });
  try {
    const vehicle = await pool.query("SELECT id FROM vehicles WHERE id = $1 AND status <> 'retired'", [vehicleId]);
    if (!vehicle.rows[0]) return res.status(400).json({ field: 'vehicleId', message: 'Please select a vehicle.' });
    const { rows } = await pool.query(`INSERT INTO fuel_logs (vehicle_id, log_date, liters, cost) VALUES ($1,$2,$3,$4) RETURNING id, log_date AS "logDate", liters, cost`, [vehicleId, logDate, liters, cost]);
    const result = await pool.query('SELECT f.id, f.log_date AS "logDate", f.liters, f.cost, v.id AS "vehicleId", v.reg_no AS "vehicleRegNo" FROM fuel_logs f JOIN vehicles v ON v.id=f.vehicle_id WHERE f.id=$1', [rows[0].id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error('[finance/fuel-create]', err); res.status(500).json({ message: 'Unable to save fuel log. Please try again.' }); }
});

router.get('/expenses', async (req, res) => {
  const vehicleId = asId(req.query.vehicleId);
  try {
    const { rows } = await pool.query(`SELECT e.id, e.toll, e.other, (e.toll + e.other) AS total, v.id AS "vehicleId", v.reg_no AS "vehicleRegNo", t.id AS "tripId", t.status AS "tripStatus", m.id AS "maintenanceId", m.service_type AS "maintenanceService" FROM expenses e JOIN vehicles v ON v.id=e.vehicle_id LEFT JOIN trips t ON t.id=e.trip_id LEFT JOIN maintenance_logs m ON m.id=e.maintenance_id WHERE ($1::int IS NULL OR e.vehicle_id=$1) ORDER BY e.created_at DESC`, [vehicleId]);
    res.json(rows);
  } catch (err) { console.error('[finance/expenses-list]', err); res.status(500).json({ message: 'Unable to load expenses. Please try again.' }); }
});

router.post('/expenses', async (req, res) => {
  const body = req.body || {}; const vehicleId = asId(body.vehicleId); const tripId = asId(body.tripId); const maintenanceId = asId(body.maintenanceId); const toll = Number(body.toll || 0); const other = Number(body.other || 0);
  if (!vehicleId) return res.status(400).json({ field: 'vehicleId', message: 'Please select a vehicle.' });
  if (!Number.isFinite(toll) || toll < 0 || !Number.isFinite(other) || other < 0) return res.status(400).json({ field: 'cost', message: 'Cost must be a positive number.' });
  try {
    const { rows } = await pool.query('INSERT INTO expenses (trip_id, vehicle_id, toll, other, maintenance_id) VALUES ($1,$2,$3,$4,$5) RETURNING id', [tripId, vehicleId, toll, other, maintenanceId]);
    const result = await pool.query(`SELECT e.id, e.toll, e.other, (e.toll + e.other) AS total, v.id AS "vehicleId", v.reg_no AS "vehicleRegNo", t.id AS "tripId", t.status AS "tripStatus", m.id AS "maintenanceId", m.service_type AS "maintenanceService" FROM expenses e JOIN vehicles v ON v.id=e.vehicle_id LEFT JOIN trips t ON t.id=e.trip_id LEFT JOIN maintenance_logs m ON m.id=e.maintenance_id WHERE e.id=$1`, [rows[0].id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { if (err.code === '23503') return res.status(400).json({ message: 'Select a valid linked record.' }); console.error('[finance/expense-create]', err); res.status(500).json({ message: 'Unable to save expense. Please try again.' }); }
});

router.get('/summary', async (req, res) => {
  const vehicleId = asId(req.query.vehicleId);
  try {
    const [fuel, maintenance] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(cost),0) AS total FROM fuel_logs WHERE ($1::int IS NULL OR vehicle_id=$1)', [vehicleId]),
      pool.query('SELECT COALESCE(SUM(cost),0) AS total FROM maintenance_logs WHERE ($1::int IS NULL OR vehicle_id=$1)', [vehicleId]),
    ]);
    const fuelCost = Number(fuel.rows[0].total); const maintenanceCost = Number(maintenance.rows[0].total);
    res.json({ fuelCost, maintenanceCost, totalOperationalCost: fuelCost + maintenanceCost });
  } catch (err) { console.error('[finance/summary]', err); res.status(500).json({ message: 'Unable to calculate operational cost. Please try again.' }); }
});

export default router;
