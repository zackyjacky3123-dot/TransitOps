import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, reg_no AS "regNo", name, type, max_capacity_kg AS "maxCapacityKg", odometer, acquisition_cost AS "acquisitionCost", status, region FROM vehicles ORDER BY reg_no`);
    res.json(rows);
  } catch (err) { console.error('[vehicles/list]', err); res.status(500).json({ message: 'Unable to load vehicle registry. Please try again.' }); }
});
export default router;
