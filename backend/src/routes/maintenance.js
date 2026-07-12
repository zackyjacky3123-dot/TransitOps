import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const VALID_STATUSES = new Set(['active', 'completed']);
const clean = (value) => typeof value === 'string' ? value.trim() : '';
const recordQuery = `SELECT m.id, m.service_type AS "serviceType", m.cost, m.service_date AS "serviceDate", m.status,
  v.id AS "vehicleId", v.reg_no AS "vehicleRegNo", v.status AS "vehicleStatus"
  FROM maintenance_logs m JOIN vehicles v ON v.id = m.vehicle_id`;

function validation(body) {
  if (!body.vehicleId) return { field: 'vehicleId', message: 'Please select a vehicle.' };
  if (!clean(body.serviceType)) return { field: 'serviceType', message: 'Service type is required.' };
  const cost = Number(body.cost);
  if (!Number.isFinite(cost) || cost < 0) return { field: 'cost', message: 'Cost must be a positive number.' };
  const date = clean(body.serviceDate);
  if (!date || Number.isNaN(Date.parse(`${date}T00:00:00`))) return { field: 'serviceDate', message: 'Please enter a valid service date.' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(`${date}T00:00:00`) > today) return { field: 'serviceDate', message: 'Service date cannot be in the future.' };
  if (!VALID_STATUSES.has(body.status)) return { field: 'status', message: 'Please select a valid service status.' };
  return null;
}

router.get('/vehicles', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, reg_no AS \"regNo\", status FROM vehicles WHERE status <> 'retired' ORDER BY reg_no");
    res.json(rows);
  } catch (err) { console.error('[maintenance/vehicles]', err); res.status(500).json({ message: 'Unable to load vehicles. Please try again.' }); }
});

router.get('/', async (_req, res) => {
  try { const { rows } = await pool.query(`${recordQuery} ORDER BY m.created_at DESC`); res.json(rows); }
  catch (err) { console.error('[maintenance/list]', err); res.status(500).json({ message: 'Unable to load service records. Please try again.' }); }
});

router.post('/', async (req, res) => {
  const issue = validation(req.body || {});
  if (issue) return res.status(400).json(issue);
  const body = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vehicle = await client.query('SELECT id, status FROM vehicles WHERE id = $1 FOR UPDATE', [body.vehicleId]);
    if (!vehicle.rows[0] || vehicle.rows[0].status === 'retired') throw Object.assign(new Error('This vehicle is unavailable for maintenance.'), { status: 409, field: 'vehicleId' });
    if (body.status === 'active') {
      const active = await client.query("SELECT id FROM maintenance_logs WHERE vehicle_id = $1 AND status = 'active' FOR UPDATE", [body.vehicleId]);
      if (active.rows[0]) throw Object.assign(new Error('This vehicle already has an active maintenance record.'), { status: 409, field: 'vehicleId' });
      if (vehicle.rows[0].status !== 'available') throw Object.assign(new Error('Only available vehicles can be moved into maintenance.'), { status: 409, field: 'vehicleId' });
      await client.query("UPDATE vehicles SET status = 'in_shop' WHERE id = $1", [body.vehicleId]);
    }
    const inserted = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, service_type, cost, service_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [body.vehicleId, clean(body.serviceType), Number(body.cost), clean(body.serviceDate), body.status]
    );
    const created = await client.query(`${recordQuery} WHERE m.id = $1`, [inserted.rows[0].id]);
    await client.query('COMMIT'); res.status(201).json(created.rows[0]);
  } catch (err) { await client.query('ROLLBACK'); res.status(err.status || 500).json({ field: err.field, message: err.status ? err.message : 'Unable to save service record. Please try again.' }); }
  finally { client.release(); }
});

router.post('/:id/complete', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const log = await client.query('SELECT * FROM maintenance_logs WHERE id = $1 FOR UPDATE', [req.params.id]);
    const record = log.rows[0];
    if (!record || record.status !== 'active') throw Object.assign(new Error('Only active service records can be completed.'), { status: 409 });
    const vehicle = await client.query('SELECT status FROM vehicles WHERE id = $1 FOR UPDATE', [record.vehicle_id]);
    await client.query("UPDATE maintenance_logs SET status = 'completed' WHERE id = $1", [record.id]);
    if (vehicle.rows[0]?.status !== 'retired') await client.query("UPDATE vehicles SET status = 'available' WHERE id = $1", [record.vehicle_id]);
    const completed = await client.query(`${recordQuery} WHERE m.id = $1`, [record.id]);
    await client.query('COMMIT'); res.json(completed.rows[0]);
  } catch (err) { await client.query('ROLLBACK'); res.status(err.status || 500).json({ message: err.status ? err.message : 'Unable to complete service record. Please try again.' }); }
  finally { client.release(); }
});

export default router;
