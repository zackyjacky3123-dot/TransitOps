import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'transitops',
  password: process.env.PGPASSWORD || 'transitops',
  database: process.env.PGDATABASE || 'transitops',
});

const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 2000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPostgres() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('[migrate] Postgres is ready.');
      return;
    } catch (err) {
      console.log(
        `[migrate] Waiting for Postgres (attempt ${attempt}/${MAX_RETRIES})... ${err.code || err.message}`
      );
      await delay(RETRY_DELAY_MS);
    }
  }
  throw new Error('[migrate] Postgres did not become ready in time.');
}

async function runSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  console.log('[migrate] Applying schema.sql ...');
  await pool.query(schemaSql);
  console.log('[migrate] Schema applied.');
}

async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM vehicles');
  if (rows[0].count > 0) {
    console.log('[migrate] Seed data already present, skipping seed.');
    return;
  }

  console.log('[migrate] Seeding demo data ...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vehicles — matches the mockup values exactly
    await client.query(`
      INSERT INTO vehicles (reg_no, name, type, max_capacity_kg, odometer, acquisition_cost, status, region)
      VALUES
        ('VAN-05',   'VAN-05',   'Van',   500.00,   18420.50, 850000.00,  'available', 'West'),
        ('TRUCK-11', 'TRUCK-11', 'Truck', 5000.00,  92310.00, 2600000.00, 'on_trip',   'North'),
        ('MINI-03',  'MINI-03',  'Mini',  1000.00,  41230.75, 420000.00,  'in_shop',   'South'),
        ('VAN-09',   'VAN-09',   'Van',   750.00,   130500.00, 780000.00, 'retired',   'East');
    `);

    // Drivers — matches the mockup values exactly (John: suspended + expired license)
    await client.query(`
      INSERT INTO drivers (name, license_no, license_category, license_expiry, contact, safety_score, trip_completion_pct, status)
      VALUES
        ('Alex',   'DL-ALEX-1001',   'LMV', CURRENT_DATE + INTERVAL '2 years', '9876500001', 97.50, 92.00, 'available'),
        ('John',   'DL-JOHN-1002',   'HMV', CURRENT_DATE - INTERVAL '30 days', '9876500002', 68.00, 54.00, 'suspended'),
        ('Priya',  'DL-PRIYA-1003',  'LMV', CURRENT_DATE + INTERVAL '3 years', '9876500003', 95.00, 88.00, 'on_trip'),
        ('Suresh', 'DL-SURESH-1004', 'HMV', CURRENT_DATE + INTERVAL '1 year',  '9876500004', 91.00, 80.00, 'available');
    `);

    // One demo login per role — password for all seed accounts: "Passw0rd!"
    const passwordHash = await bcrypt.hash('Passw0rd!', 10);
    const users = [
      ['Riya Kapoor', 'riya.kapoor@transitops.demo', 'fleet_manager'],
      ['Dev Sharma', 'dev.sharma@transitops.demo', 'dispatcher'],
      ['Meera Nair', 'meera.nair@transitops.demo', 'safety_officer'],
      ['Arjun Rao', 'arjun.rao@transitops.demo', 'financial_analyst'],
    ];
    for (const [name, email, role] of users) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
        [name, email, passwordHash, role]
      );
    }

    await client.query('COMMIT');
    console.log('[migrate] Seed data inserted.');
    console.log('[migrate] Demo login password for all seeded users: Passw0rd!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  await waitForPostgres();
  await runSchema();
  await seedIfEmpty();
  await pool.end();
  console.log('[migrate] Done.');
}

main().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
