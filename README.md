# TransitOps

Fleet operations platform scaffold — React + Vite + Tailwind frontend, Node/Express
backend, PostgreSQL database. Dark theme by default (background `#0a0a0a`, panels
`#141414` / `#2a2a2a` borders, amber accent `#d97706`).

## Structure

```
transitops/
├── frontend/          React + Vite + Tailwind
│   └── src/
│       ├── layouts/SidebarLayout.jsx   Logo, nav, top search bar, avatar, role badge
│       ├── pages/                      One page per route
│       ├── context/AuthContext.jsx     Session/role state
│       └── components/                 ProtectedRoute, shared UI
├── backend/           Node + Express + PostgreSQL
│   ├── src/
│   │   ├── index.js                    App entry, health check
│   │   ├── db.js                       pg connection pool
│   │   └── routes/auth.js              Login: bcrypt + lockout-after-5
│   └── db/
│       ├── schema.sql                  Exact schema — enums, CHECKs, FKs, indexes
│       └── migrate.js                  Waits for Postgres, applies schema, seeds data
└── docker-compose.yml  postgres → backend (migrate + start) → frontend
```

## Routes

`/login` `/dashboard` `/fleet` `/drivers` `/trips` `/maintenance`
`/fuel-expenses` `/analytics` `/settings`

All routes except `/login` are behind `ProtectedRoute` and render inside
`SidebarLayout`.

## Running with Docker Compose

```bash
docker compose up --build
```

- Postgres starts first; `backend` waits on `condition: service_healthy` before
  it starts, and `migrate.js` additionally retries the DB connection itself
  before running `schema.sql` — so it's safe even without the healthcheck.
- Backend runs `npm run migrate && npm start`, applying the schema and seeding
  demo data (vehicles, drivers, one login per role) if the tables are empty.
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Postgres: localhost:5432 (`transitops` / `transitops`)

## Demo logins

Seeded one user per role, password `Passw0rd!` for all:

| Email | Role |
|---|---|
| riya.kapoor@transitops.demo | Fleet Manager |
| dev.sharma@transitops.demo | Dispatcher |
| meera.nair@transitops.demo | Safety Officer |
| arjun.rao@transitops.demo | Financial Analyst |

## Running locally without Docker

```bash
# Postgres must be running locally with a `transitops` db/user, or point
# backend/.env at your own instance.
cd backend && cp .env.example .env && npm install && npm run migrate && npm run dev

cd frontend && npm install && npm run dev
```

## Notes

- `schema.sql` matches the spec's enums, `CHECK` constraints, foreign keys, and
  indexes exactly; `CREATE TYPE` statements are wrapped in `DO $$ ... EXCEPTION
  WHEN duplicate_object$$` blocks so migrations stay idempotent on container
  restarts, without changing the table/column definitions.
- This scaffold ships the sidebar shell, routing, auth (login + bcrypt +
  5-attempt lockout), and DB layer. The eight feature screens (Dashboard,
  Fleet, Drivers, Trips, Maintenance, Fuel & Expenses, Analytics, Settings)
  are wired into routing as placeholders, ready for their own build passes.
