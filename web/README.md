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
- Cooldown (FR3.3): one warning per episode. Repeats of the same non-compliance within the cooldown (default 10 minutes) raise no new warning; being seen compliant ends the episode. Emergencies are never suppressed.
- Consent and the ReID gallery (FR1.3, FR1.4, proposal section 7), admin only: record who consented (patient or substitute decision-maker), link calibration samples (a reference, the aid state, an "assisted" flag), delete one or all on request. Enrolment needs consent on file and an admitted patient. Embeddings are deleted automatically when a patient is discharged or withdraws consent. The model service reads the gallery from `GET /api/reid/gallery` with the API key. The system stores references only; the embeddings themselves are made by the model service. References never appear in nurse or family views, alerts or history.
- Closing (proposal scenario A, step 5): an alert a nurse already acknowledged is closed, with `closedAt`, when the patient is seen with the prescribed aid again. Alerts nobody acknowledged stay pending, and a fall (emergency) is not closed this way.
- Settings an administrator can change without redeploying (NFR5.2): identity and aid confidence thresholds, cooldown, acknowledgement timeout, and who is notified at each level (routing). Stored in the database; `GET`, `PUT` and `DELETE /api/settings`. Precedence: database, then environment variable, then built-in default (identity threshold 0.8, aid threshold 0.6, cooldown 10, acknowledgement timeout 10 minutes). A new timeout applies to alerts created afterwards. If an old `.env` still sets `IDENTITY_CONFIDENCE_THRESHOLD`, `AID_CONFIDENCE_THRESHOLD`, `ACK_TIMEOUT_MINUTES` or `COOLDOWN_MINUTES`, that value overrides the default; delete the lines to use the defaults.
- User management for admins (`/dashboard/admin/users`): create accounts, rename, deactivate and reactivate, reset a password. The role and the email are fixed after creation.
- Account page for everyone (`/dashboard/account`): change your own password; nurses and family can save their Pushover key.
- Login lock-out: 5 wrong passwords for one account in 15 minutes lock it for the rest of that window (an admin password reset lifts it). Unknown emails count too, so the lock does not reveal which accounts exist.
- Patient history (`/dashboard/patients/{id}`): alerts and detections, newest first. Family see alerts only (no raw detections, no Info log).
- Not built yet: ReID enrolment, a real-time channel (the dashboard refreshes every 15 s), password reset by email, ending a user's open session when their password is reset (deactivate the account to cut access at once), trend charts.

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
npm run test:all            # everything below, from scratch, on a throwaway database (about 20 s)
npm test                    # unit tests (compliance rules, validation, passwords, notification content, limits)
npm run test:coverage       # the same, with a coverage table (unit tests only; the data layer is covered below)
npm run test:integration    # escalation, notification queue and cooldown, on a temporary copy of the database
npm run test:access         # who may see and change what, per role; needs a running server and a seeded database
node ../tools/mock-generator/generate.mjs all    # sends sample detections (see tools/mock-generator)
```
`test:all` also replays 27 scripted scenarios (`scripts/replay-scenarios.mjs`, data in `scripts/scenarios/scripted.json`) and measures latency with 10 patients at once over 1,100 notifications (`scripts/measure-latency.mjs`); both print their report. Replay reports false-positive and false-negative Warning rates and warnings per episode (proposal 6.2). It can also replay recorded model output: `node scripts/replay-scenarios.mjs <url> --events recorded.jsonl`. The latency script needs `LATENCY_PATIENTS` and `LATENCY_ROUNDS` only if you want other sizes.

`test:all` is the one to run before a commit. It generates the Prisma client, type-checks, lints, runs the unit and integration tests, migrates and seeds a temporary database, builds the app into `.next-test` (so a running dev server is not disturbed), starts it on a free port and runs the access tests and the mock generator against it, then cleans up. Options: `-- --dev` (use `next dev` instead of a build), `-- --only=unit,access` (run some stages), `-- --keep` (keep the temporary folder). It needs no setup beyond `npm install` and works on Linux, macOS and Windows.

The same command runs in GitHub Actions on every push to `main` and on pull requests (`.github/workflows/ci.yml`).

`test:access` signs in as each demo user and checks the role and patient-scope rules, including two nurses acknowledging the same alert at once, admin management of patients and users, the login lock-out and hardening of the intake endpoint. Run directly against your development server it leaves a few throwaway accounts and patients behind (`npx prisma migrate reset` cleans up); `test:all` never does.

## What the measurements do and do not show
- **Replay (false-positive and false-negative rates):** the scenarios are written from the rules in the proposal, so 0% means the system does exactly what is specified, including the boundaries (a confidence exactly at the threshold counts as confident). It says nothing about how accurate the models are. Real error rates need recorded model output with known ground truth.
- **Latency (NFR1.1, NFR1.2):** received time to sent time, on one machine, with the `log` channel standing in for Pushover and SQLite as the database. It excludes model inference (as the requirement does) and the real Pushover network call, so repeat it with Pushover and PostgreSQL on the deployment server before quoting it.

## Background jobs
A loop started in `src/instrumentation.ts` runs every 15 s: it escalates overdue warnings, then delivers queued notifications. It assumes one long-running server process (the lab server). On serverless hosting set `BACKGROUND_JOBS=off` and call `POST /api/jobs/run` (header `Authorization: Bearer <INTAKE_API_KEY>`) from a cron instead. To watch it work, start the server with a short deadline: `ACK_TIMEOUT_MINUTES=0.05 npm run dev`, send `node ../tools/mock-generator/generate.mjs noncompliant`, and read the `[notify:log]` lines in the server terminal.

## Notes on login limits
The lock-out counters live in memory: they fit the single server process this project runs on, a restart clears them, and several processes would each count separately. The per-IP limit (30 failures in 15 minutes) trusts the `x-forwarded-for` header, so it is only meaningful behind a proxy that sets it truthfully; the per-account limit does not depend on it.

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
