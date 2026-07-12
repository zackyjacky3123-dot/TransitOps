-- TransitOps normalized schema
-- Applied exactly as specified: enums, CHECK constraints, foreign keys, indexes.

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('available', 'on_trip', 'in_shop', 'retired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM ('available', 'on_trip', 'off_duty', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('draft', 'dispatched', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_status AS ENUM ('active', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id           SERIAL PRIMARY KEY,
  reg_no       VARCHAR(20) UNIQUE NOT NULL,
  name         VARCHAR(80) NOT NULL,
  type         VARCHAR(30) NOT NULL,
  max_capacity_kg NUMERIC(10,2) NOT NULL CHECK (max_capacity_kg > 0),
  odometer     NUMERIC(10,2) NOT NULL DEFAULT 0,
  acquisition_cost NUMERIC(12,2) NOT NULL,
  status       vehicle_status NOT NULL DEFAULT 'available',
  region       VARCHAR(60),
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(120) NOT NULL,
  license_no       VARCHAR(30) UNIQUE NOT NULL,
  license_category VARCHAR(10) NOT NULL,
  license_expiry   DATE NOT NULL,
  contact          VARCHAR(20) NOT NULL,
  safety_score     NUMERIC(5,2) NOT NULL DEFAULT 100,
  trip_completion_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  status           driver_status NOT NULL DEFAULT 'available',
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id               SERIAL PRIMARY KEY,
  source           VARCHAR(120) NOT NULL,
  destination      VARCHAR(120) NOT NULL,
  vehicle_id       INT REFERENCES vehicles(id),
  driver_id        INT REFERENCES drivers(id),
  cargo_weight_kg  NUMERIC(10,2) NOT NULL CHECK (cargo_weight_kg > 0),
  planned_distance_km NUMERIC(10,2) NOT NULL,
  final_odometer   NUMERIC(10,2),
  fuel_consumed_l  NUMERIC(10,2),
  revenue          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  status           trip_status NOT NULL DEFAULT 'draft',
  dispatched_at    TIMESTAMP,
  completed_at     TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS revenue NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (revenue >= 0);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id           SERIAL PRIMARY KEY,
  vehicle_id   INT NOT NULL REFERENCES vehicles(id),
  service_type VARCHAR(80) NOT NULL,
  cost         NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
  service_date DATE NOT NULL,
  status       maintenance_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fuel_logs (
  id         SERIAL PRIMARY KEY,
  vehicle_id INT NOT NULL REFERENCES vehicles(id),
  log_date   DATE NOT NULL,
  liters     NUMERIC(10,2) NOT NULL CHECK (liters > 0),
  cost       NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id                 SERIAL PRIMARY KEY,
  trip_id            INT REFERENCES trips(id),
  vehicle_id         INT NOT NULL REFERENCES vehicles(id),
  toll               NUMERIC(10,2) NOT NULL DEFAULT 0,
  other              NUMERIC(10,2) NOT NULL DEFAULT 0,
  maintenance_id     INT REFERENCES maintenance_logs(id),
  created_at         TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  depot_name    VARCHAR(120) NOT NULL DEFAULT 'TransitOps Central Depot',
  currency      VARCHAR(40) NOT NULL DEFAULT 'INR (Rs)',
  distance_unit VARCHAR(40) NOT NULL DEFAULT 'Kilometers',
  updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for the lookups the UI actually does
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_logs(vehicle_id);
