# Tracker System

Mobile-first multi-user PWA for Coach Arifin. Next.js App Router, Prisma, PostgreSQL, server-side sessions, role-based admin.

## Quality gates

```bash
npm test
npm run type-check
npm run lint
npm run build
```

Production uses dedicated `tracker_system` PostgreSQL database and PM2 on port 3500 behind Caddy.

## Local database

This project uses PostgreSQL through Prisma. The local database is stored in `.local/postgres-data` and uses the PostgreSQL binary bundled with Laragon.

```bash
npm install
npm run db:local:up
npm run db:migrate
npm run seed:admin
npm run dev
```

Local app URL: `http://localhost:3500`

Local database URL: `postgresql://tracker:tracker_local_password@localhost:5433/tracker_local?schema=public`

Default local admin:

- Email: `admin@local.test`
- Password: `ChangeMe12345!`

Change `ADMIN_PASSWORD` in `.env` before reseeding if you want a different local password.

Useful database commands:

```bash
npm run db:local:status
npm run db:local:down
npm run db:studio
```
