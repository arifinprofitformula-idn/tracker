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
