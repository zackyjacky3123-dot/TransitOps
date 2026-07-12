import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { requirePermission } from './middleware/permissions.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import driverRoutes from './routes/drivers.js';
import tripRoutes from './routes/trips.js';
import maintenanceRoutes from './routes/maintenance.js';
import financeRoutes from './routes/finance.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import vehicleRoutes from './routes/vehicles.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable', message: err.message });
  }
});

// Login itself must stay open (no token exists yet). Everything else below
// requires a valid JWT issued by /api/auth/login.
app.use('/api/auth', authRoutes);

// Dashboard, Maintenance, and Settings stay open to any authenticated user —
// the RBAC matrix (roadmap Screen 8) only governs the five resources below.
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/maintenance', requireAuth, maintenanceRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

app.use('/api/vehicles', requireAuth, requirePermission('fleet'), vehicleRoutes);
app.use('/api/drivers', requireAuth, requirePermission('drivers'), driverRoutes);
app.use('/api/trips', requireAuth, requirePermission('trips'), tripRoutes);
app.use('/api/finance', requireAuth, requirePermission('fuelExp'), financeRoutes);
app.use('/api/analytics', requireAuth, requirePermission('analytics'), analyticsRoutes);

// Central error handler — always returns a clear, specific message.
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`[server] TransitOps API listening on port ${PORT}`);
});
