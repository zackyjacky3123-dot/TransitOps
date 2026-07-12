import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const VALID_STATUSES = new Set(['available', 'on_trip', 'off_duty', 'suspended']);
const PHONE_RE = /^\d{10}$/;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateDriver(body) {
  const licenseNo = cleanText(body.licenseNo);
  const contact = cleanText(body.contact);
  const expiry = cleanText(body.licenseExpiry);
  if (!licenseNo) return { field: 'licenseNo', message: 'License number is required.' };
  if (!expiry) return { field: 'licenseExpiry', message: 'License expiry date is required.' };
  if (Number.isNaN(Date.parse(`${expiry}T00:00:00`))) {
    return { field: 'licenseExpiry', message: 'Enter a valid license expiry date.' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${expiry}T00:00:00`) < today) {
    return { field: 'licenseExpiry', message: 'License expiry date cannot be in the past.' };
  }
  if (!PHONE_RE.test(contact)) return { field: 'contact', message: 'Enter a valid 10-digit contact number.' };
  if (!cleanText(body.name)) return { field: 'name', message: 'Driver name is required.' };
  if (!cleanText(body.licenseCategory)) return { field: 'licenseCategory', message: 'License category is required.' };
  return null;
}

function driverSelect(where = '') {
  return `SELECT id, name, license_no AS "licenseNo", license_category AS "licenseCategory",
    license_expiry AS "licenseExpiry", contact, safety_score AS "safetyScore",
    trip_completion_pct AS "tripCompletionPct", status
    FROM drivers ${where} ORDER BY name`;
}

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(driverSelect());
    res.json(rows);
  } catch (err) {
    console.error('[drivers/list]', err);
    res.status(500).json({ message: 'Unable to load drivers. Please try again.' });
  }
});

// The Trip Dispatcher must use this endpoint: eligibility is enforced by the DB query,
// not merely by hiding unsuitable drivers in the frontend.
router.get('/eligible-for-trip', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      driverSelect("WHERE status = 'available' AND license_expiry >= CURRENT_DATE")
    );
    res.json(rows);
  } catch (err) {
    console.error('[drivers/eligible-for-trip]', err);
    res.status(500).json({ message: 'Unable to load eligible drivers. Please try again.' });
  }
});

router.post('/', async (req, res) => {
  const issue = validateDriver(req.body || {});
  if (issue) return res.status(400).json(issue);
  const body = req.body;
  const safetyScore = body.safetyScore === '' || body.safetyScore == null ? 100 : Number(body.safetyScore);
  const completionPct = body.tripCompletionPct === '' || body.tripCompletionPct == null ? 0 : Number(body.tripCompletionPct);
  if (!Number.isFinite(safetyScore) || safetyScore < 0 || safetyScore > 100) {
    return res.status(400).json({ field: 'safetyScore', message: 'Safety score must be between 0 and 100.' });
  }
  if (!Number.isFinite(completionPct) || completionPct < 0 || completionPct > 100) {
    return res.status(400).json({ field: 'tripCompletionPct', message: 'Trip completion must be between 0 and 100.' });
  }
  try {
    const created = await pool.query(
      `INSERT INTO drivers (name, license_no, license_category, license_expiry, contact, safety_score, trip_completion_pct, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')
       RETURNING id, name, license_no AS "licenseNo", license_category AS "licenseCategory", license_expiry AS "licenseExpiry",
         contact, safety_score AS "safetyScore", trip_completion_pct AS "tripCompletionPct", status`,
      [cleanText(body.name), cleanText(body.licenseNo), cleanText(body.licenseCategory), cleanText(body.licenseExpiry), cleanText(body.contact), safetyScore, completionPct]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ field: 'licenseNo', message: 'A driver with this license number already exists.' });
    }
    console.error('[drivers/create]', err);
    res.status(500).json({ message: 'Unable to add driver. Please try again.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!VALID_STATUSES.has(status)) return res.status(400).json({ field: 'status', message: 'Please select a valid driver status.' });
  try {
    const { rows } = await pool.query(
      `UPDATE drivers SET status = $1 WHERE id = $2
       RETURNING id, name, license_no AS "licenseNo", license_category AS "licenseCategory", license_expiry AS "licenseExpiry",
         contact, safety_score AS "safetyScore", trip_completion_pct AS "tripCompletionPct", status`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Driver not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[drivers/status]', err);
    res.status(500).json({ message: 'Unable to update driver status. Please try again.' });
  }
});

export default router;
