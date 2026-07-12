import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const clean = (value) => typeof value === 'string' ? value.trim() : '';

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING RETURNING *`);
    if (rows[0]) return res.json({ depotName: rows[0].depot_name, currency: rows[0].currency, distanceUnit: rows[0].distance_unit });
    const current = await pool.query('SELECT depot_name, currency, distance_unit FROM app_settings WHERE id = 1');
    res.json({ depotName: current.rows[0].depot_name, currency: current.rows[0].currency, distanceUnit: current.rows[0].distance_unit });
  } catch (err) { console.error('[settings/get]', err); res.status(500).json({ message: 'Unable to load settings. Please try again.' }); }
});

router.put('/', async (req, res) => {
  const depotName = clean(req.body?.depotName); const currency = clean(req.body?.currency); const distanceUnit = clean(req.body?.distanceUnit);
  if (!depotName) return res.status(400).json({ field: 'depotName', message: 'Depot name is required.' });
  if (!currency) return res.status(400).json({ field: 'currency', message: 'Currency is required.' });
  if (!distanceUnit) return res.status(400).json({ field: 'distanceUnit', message: 'Distance unit is required.' });
  try {
    const { rows } = await pool.query(`INSERT INTO app_settings (id, depot_name, currency, distance_unit) VALUES (1,$1,$2,$3) ON CONFLICT (id) DO UPDATE SET depot_name=EXCLUDED.depot_name, currency=EXCLUDED.currency, distance_unit=EXCLUDED.distance_unit, updated_at=NOW() RETURNING depot_name, currency, distance_unit`, [depotName, currency, distanceUnit]);
    res.json({ depotName: rows[0].depot_name, currency: rows[0].currency, distanceUnit: rows[0].distance_unit });
  } catch (err) { console.error('[settings/update]', err); res.status(500).json({ message: 'Unable to save settings. Please try again.' }); }
});

export default router;
