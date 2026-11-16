# Web application

Next.js (App Router, TypeScript, Tailwind) with Prisma and SQLite for development. See `docs/decisions.md` for the reasons behind each choice.

## Current state
- Next.js scaffolded (`create-next-app`, `src/` layout, import alias `@/*`).
- Database schema in `prisma/schema.prisma` (from `docs/erd.dbml`), first migration applied, seed script with **fake** data (3 users, 2 patients, 5 aids, 3 rooms).
- Detection intake (`POST /api/detections`) and the compliance engine (`src/lib/compliance.ts`).
- Login (Auth.js, email and password) with roles admin, nurse, family, enforced on the server in `src/lib/dal.ts`.
- Dashboard at `/dashboard`: pending alerts with Acknowledge, patient status, review queue (staff) or status and alert history (family). Mobile first (375 px).
- Admin screens under `/dashboard/admin/patients` (FR1): add a patient, edit details, change the prescribed aid (history is kept), assign nurses and family members, discharge and reactivate.
- Escalation (FR5.4): a Warning not acknowledged by its deadline (`ACK_TIMEOUT_MINUTES`, default 10) becomes Escalated, once, and the family is notified as well.
- Notifications (FR5.1, FR5.2, NFR4): stored in a queue first, delivered afterwards with retry and backoff. The `log` channel (server log) is the default; Pushover is used for a user who has a `pushoverUserKey` when `PUSHOVER_APP_TOKEN` is set. Only room, aid status, time and initials/ID are sent, never a full name.
- Not built yet: user management screens (including setting a Pushover key), patient history page, ReID enrolment, the cooldown for repeated alerts, a real-time channel (the dashboard refreshes every 15 s).

## Run it (PowerShell, in this folder, not WSL)
```
npm install
copy .env.example .env
npx prisma migrate dev      # creates the SQLite database and the Prisma client
npx prisma db seed          # loads the fake example data and demo accounts
npm run dev                 # http://localhost:3000 (Next prints another port if 3000 is busy)
```

## Demo accounts (development only)
All use the fake password `demo-password-1`. They exist only after `npx prisma db seed`.

| Email | Role | Sees |
|---|---|---|
| admin@example.test | admin | all patients, review queue |
| nurse@example.test | nurse | P-0042 and P-0043 |
| nurse2@example.test | nurse | P-0043 only |
| family@example.test | family | P-0042 only |
| family2@example.test | family | P-0043 only |

## Tests
```
npm test                    # unit tests (compliance rules, validator, passwords)
npm run test:integration    # escalation and the notification queue, on a temporary copy of the database
npm run test:access         # who may see and acknowledge what; needs the server running + seeded DB
node ../tools/mock-generator/generate.mjs all    # sends sample detections (see tools/mock-generator)
```
`test:access` signs in as each demo user and checks the role and patient-scope rules, including two nurses acknowledging the same alert at once, and the admin patient management (create, prescriptions, caregivers, discharge). It can be run repeatedly, but each run leaves a test patient (`T-...`) behind. To start clean: `npx prisma migrate reset` (drops the database, applies migrations and runs the seed).
Useful: `npx prisma studio` opens a browser view of the database.

## Notes
- **Prisma is pinned to 6.x** (`prisma` and `@prisma/client`), which is stable and simple with SQLite. Moving to PostgreSQL later means changing the provider in `schema.prisma` and `DATABASE_URL`.
- The generated Prisma client (`src/generated/`) and the local database (`*.db`) are git-ignored, so run `npx prisma migrate dev` after cloning.
- Fixed vocabularies (role, level, status) are plain strings in the schema and are validated in code, to keep SQLite and PostgreSQL both working.
- `npm audit` reports high-severity warnings in the lint tooling chain (`eslint-config-next`). They are in development tools only. Do not run `npm audit fix --force`: it would downgrade the toolchain.
- Run `npm` and `node` from Windows only, not from WSL, so `node_modules` stays one platform.

## Background jobs
A loop started in `src/instrumentation.ts` runs every 15 s: it escalates overdue warnings, then delivers queued notifications. It assumes one long-running server process (the lab server). On serverless hosting set `BACKGROUND_JOBS=off` and call `POST /api/jobs/run` (header `Authorization: Bearer <INTAKE_API_KEY>`) from a cron instead. To watch it work, start the server with a short deadline: `ACK_TIMEOUT_MINUTES=0.05 npm run dev`, send `node ../tools/mock-generator/generate.mjs noncompliant`, and read the `[notify:log]` lines in the server terminal.

## Authentication notes
- `AUTH_SECRET` signs the session. Generate one with `npx auth secret`. The app refuses to start in production while it is the `dev-only` placeholder. Behind a proxy or on your own host set `AUTH_TRUST_HOST=true`.
- The session token holds only the identity. The role and active flag are read from the database on every request, so deactivating a user takes effect immediately.
- `src/proxy.ts` only redirects visitors without a session cookie to `/login`. It is not a security check. Real checks live in `src/lib/dal.ts`.
- With Cache Components, anything that reads the session or the database must sit inside `<Suspense>`, and `getSessionUser` calls `connection()` first (see the comment there).
- Not done yet: login rate limiting, password reset, user management screens (create users by seed or SQL for now).

## Rules
- Fake example data only. No real patient names.
- Secrets in `.env` (git-ignored); `.env.example` has names only.
- Check roles on the server, not only in the UI.
- Store each event before attempting any notification.
