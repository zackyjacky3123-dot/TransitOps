import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'transitops',
  password: process.env.PGPASSWORD || 'transitops',
  database: process.env.PGDATABASE || 'transitops',
});

export async function query(text, params) {
  return pool.query(text, params);
}
