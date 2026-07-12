import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [totals, utilization, monthly, vehicles] = await Promise.all([
      pool.query(`SELECT COALESCE((SELECT SUM(cost) FROM fuel_logs),0) AS "fuelCost", COALESCE((SELECT SUM(cost) FROM maintenance_logs),0) AS "maintenanceCost", COALESCE((SELECT SUM(liters) FROM fuel_logs),0) AS "fuelLiters", COALESCE((SELECT SUM(planned_distance_km) FROM trips WHERE status='completed'),0) AS distance, COALESCE((SELECT SUM(revenue) FROM trips WHERE status='completed'),0) AS revenue, COALESCE((SELECT SUM(acquisition_cost) FROM vehicles),0) AS "acquisitionCost"`),
      pool.query("SELECT COUNT(*) FILTER (WHERE status <> 'retired') AS active, COUNT(*) FILTER (WHERE status = 'on_trip') AS moving FROM vehicles"),
      pool.query(`WITH months AS (SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '6 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month) SELECT to_char(months.month, 'Mon') AS month, COALESCE(SUM(t.revenue),0) AS revenue FROM months LEFT JOIN trips t ON date_trunc('month', t.completed_at) = months.month AND t.status='completed' GROUP BY months.month ORDER BY months.month`),
      pool.query(`SELECT v.id, v.reg_no AS "regNo", COALESCE(f.cost,0)+COALESCE(m.cost,0) AS cost FROM vehicles v LEFT JOIN (SELECT vehicle_id, SUM(cost) AS cost FROM fuel_logs GROUP BY vehicle_id) f ON f.vehicle_id=v.id LEFT JOIN (SELECT vehicle_id, SUM(cost) AS cost FROM maintenance_logs GROUP BY vehicle_id) m ON m.vehicle_id=v.id ORDER BY cost DESC, v.reg_no LIMIT 5`),
    ]);
    const t = totals.rows[0]; const fuelCost = Number(t.fuelCost); const maintenanceCost = Number(t.maintenanceCost); const revenue = Number(t.revenue); const acquisition = Number(t.acquisitionCost); const liters = Number(t.fuelLiters); const distance = Number(t.distance);
    const active = Number(utilization.rows[0].active); const moving = Number(utilization.rows[0].moving);
    res.json({ kpis: { fuelEfficiency: liters ? distance / liters : 0, fleetUtilization: active ? (moving / active) * 100 : 0, operationalCost: fuelCost + maintenanceCost, roi: acquisition ? ((revenue - (fuelCost + maintenanceCost)) / acquisition) * 100 : 0 }, monthlyRevenue: monthly.rows.map((row) => ({ ...row, revenue: Number(row.revenue) })), costliestVehicles: vehicles.rows.map((row) => ({ ...row, cost: Number(row.cost) })) });
  } catch (err) { console.error('[analytics]', err); res.status(500).json({ message: 'Unable to load analytics. Please try again.' }); }
});
export default router;
