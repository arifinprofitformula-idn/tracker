# Production acceptance matrix

## Authentication
- Registration validates email, password length, and duplicate email.
- Password stored only as strong one-way hash.
- Login rotates a random session; raw session token never stored in DB.
- Session cookie is HttpOnly, Secure in production, SameSite=Lax, bounded expiry.
- Logout revokes server-side session.
- Disabled user cannot log in or keep using an existing session.
- Authentication endpoints are rate limited.

## Authorization
- Anonymous API access returns 401.
- User cannot read or mutate another user's tracker, checks, or notes.
- Non-admin cannot access admin routes.
- Admin can list users, change status/role with guardrails.
- State-changing routes reject foreign Origin with 403.

## Tracker behavior
- Default tracker exists for new users.
- User can create, rename, and manage trackers and activities.
- User can toggle a daily check and persist notes/start date.
- Completion, perfect days, streak, phase progress, strongest/weakest are correct.
- Deleted tracker data cascades only within owner's records.

## PWA and performance
- Valid manifest and 192/512 icons.
- Service worker registered and served with no-cache.
- Offline fallback loads.
- Dashboard is default authenticated destination.
- Mobile viewport has no page-level horizontal overflow.
- Initial document and critical assets use compression and sane caching.

## Production
- Dedicated PostgreSQL DB and restricted app role.
- PM2 has one process on port 3500.
- Caddy config validates before reload.
- HTTPS certificate valid for tracker.arvadigital.my.id.
- Security headers present.
- Health endpoint works without exposing secrets.
- Register/login/create/toggle/note/admin flow verified live.
- Test accounts and data removed after verification.
