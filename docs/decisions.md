# Design decisions

Short record of decisions and the reason for each. Date format YYYY-MM-DD.

| Date | Decision | Reason |
|---|---|---|
| 2026-10-21 | **Web app first**, installable as a PWA, not a native app | One codebase for all devices, no app-store process, fits the 12-week plan. A native client (for example React Native) can be added later on the same API. |
| 2026-10-21 | **One repository** with separate folders for web, ML, contracts | One shared event schema, one place for documents. The web system and the ML work are deployed separately. |
| 2026-10-21 | **TypeScript** for web and server, **Python** for ML | Matches the proposal. Only two languages are needed. |
| 2026-10-21 | The only link between web and ML is the **detection event schema** | The web system can be built and tested with a mock generator before real model output exists. |
| 2026-10-21 | **Store the event before notifying** | A failed notification must never lose a detection (NFR4.1). |
| 2026-10-21 | **`event_id` is unique** | Intake is idempotent: a resent event does not create a second alert. |
| 2026-10-21 | **All timestamps in UTC** | Convert to local time only for display. |
| 2026-10-21 | **Notification channel adapter**, Pushover first | Pushover needs no app development. The provider can change without touching alert logic. Only minimum content is sent (initials or ID, never the full name). |
| 2026-10-21 | **Roles enforced on the server** | UI checks alone are not security (NFR2.3). |
| 2026-10-21 | Focus on the **Velodyne Alpha Prime VLS-128**; no other LiDAR comparison | Matches the existing data and the advisor's direction. |
| 2026-10-21 | **SQLite for development, PostgreSQL for deployment**, through Prisma | Work can start without installing a database server. The same schema works on both; only the provider and `DATABASE_URL` change. Docker is only available inside WSL on the development machine. |
| 2026-10-21 | **Prisma pinned to 6.x** | Stable and simple with SQLite. Revisit when moving to PostgreSQL. |
| 2026-10-21 | Fixed vocabularies (role, level, status) stored as **strings validated in code**, not database enums | Keeps the schema portable between SQLite and PostgreSQL. |
| 2026-10-21 | Patients have a **`code`** (for example P-0042); detections keep the raw **`room_id`** and **`aid_label`** from the event | Events refer to patients by code and to rooms and aids by label. Keeping the raw values means nothing is lost when a room or label is not yet in the database. |
| 2026-10-21 | Participant point clouds stay on **lab-controlled Carleton storage**; DRAC only for public or synthetic data | The Calcul Québec terms exclude sensitive information on Narval. To be confirmed with the advisor and the REB protocol. |

| 2026-11-13 | **Auth.js (next-auth v5 beta) with email and password**, JWT session of 8 hours | The candidate named in the open decisions. v5 is the line that supports Next 16. Passwords hashed with scrypt from Node (no extra dependency). |
| 2026-11-13 | **Role and patient scope enforced in one data access layer** (`web/src/lib/dal.ts`); the token holds identity only | Roles are read from the database on each request, so deactivation and reassignment apply at once (NFR2.3). Pages and API routes share the same functions, so they cannot disagree. |
| 2026-11-13 | **Family does not see Info entries**; a nurse sees only assigned patients; low-confidence detections with an unmatched patient code are visible to admin only | Info is the silent log (FR4.1). Unmatched detections have no patient to scope by. |
| 2026-11-13 | **Dashboard refreshes by polling every 15 s** until the real-time channel is decided | Keeps FR9.1 usable without the Socket.io or SSE decision. |
| 2026-11-14 | **Patient code is set once and cannot be edited**; the room is created on the fly if new | The code is the link to detection events and the ReID gallery. Rooms must match `room_id` in events, so typing a new one is faster than a separate rooms screen (still planned). |
| 2026-11-14 | **A caregiver's type (nurse or family) comes from the user's role**, and only active nurses and family members can be assigned | One source of truth; an admin or a deactivated user can never receive a patient's alerts. |
| 2026-11-14 | **Discharge keeps all history; a discharged patient creates no alerts** (detections are still stored) | FR1.4. Deleting ReID embeddings on request is separate and comes with ReID enrolment (Sprint 2). |
| 2026-11-14 | **Admin forms submit through `onSubmit`, not `action`** | React 19 clears every field after a form action finishes, which would wipe the input after a validation error. |
| 2026-11-16 | **Escalation and delivery run in a loop started from `instrumentation.ts`** (every 15 s), with `POST /api/jobs/run` for cron-based hosting | Next.js has no scheduler. The lab runs one server process, so a loop is the simplest thing that works; the endpoint keeps the door open for serverless. Both are safe to run concurrently (each alert escalates once, each notification is claimed before sending). |
| 2026-11-16 | **Notifications are queued, then sent**; failures retry (30 s, 60 s, 2 min, 4 min, then failed); a permanent error (bad key) fails at once; a notification for an alert that was acknowledged meanwhile is skipped | NFR4.1 and NFR4.2: a failed push must never lose a detection or an alert, and nobody should be pinged for something already handled. |
| 2026-11-16 | **Warning goes to nurses; Escalated and Emergency go to nurses and family** | FR4.4. The nurse is told again at escalation on purpose. |
| 2026-11-16 | **Notification text carries room, aid, time, initials and patient code only** | NFR3.3. The message builder is never given the full name, and a test checks it. Pushover priority is capped at 1 because priority 2 needs retry and expire settings. |
| 2026-11-16 | **`log` channel by default, Pushover only when configured** | Nothing leaves the server unless an administrator sets `PUSHOVER_APP_TOKEN` and a user key. |
| 2026-11-16 | **Cooldown ends at the cooldown time or when the patient is seen compliant** (an Info entry after the warning); emergencies are never suppressed | FR3.3. A patient who puts the walker on and takes it off again is a new episode and deserves a new warning. |
| 2026-11-16 | **The role and email of an account are fixed after creation**; to change a role, deactivate and create a new account | Caregiver assignments are typed by role; letting the role change would leave stale assignments behind. |
| 2026-11-16 | **Deactivation is the way to end access**; a password reset does not end an open session | Sessions are JWTs. The user is re-read from the database on every request, so deactivation is immediate. A token version would be needed to cut sessions on password reset. |
| 2026-11-16 | **Login lock-out in memory**: 5 wrong passwords per account and 30 per IP in 15 minutes; unknown emails count too | Fits the single server process. No extra table or dependency. Counting unknown emails keeps the lock from revealing which accounts exist. |
| 2026-11-16 | **Pushover keys are entered by each user** on their Account page, never shown again | Keeps the key out of the admin's hands and out of every response. |
| 2026-11-19 | **Next.js 16.4.6** (patch upgrade); **Prisma stays on 6.x** and its `deepmerge-ts` advisory is accepted for now | The Next advisories were in `use cache`, which the app does not use, but a patch bump costs nothing and makes `next build` exit cleanly. The Prisma advisory is reachable only through the CLI during development and needs a breaking major upgrade; revisit when moving to PostgreSQL. |
| 2026-11-19 | **Settings live in the database; precedence is database, then environment, then default** | NFR5.2 asks for thresholds, timeouts and routing that change without redeploying. Keeping the environment as a fallback means existing `.env` files and the short timeouts used for demos keep working. A stored value that is invalid is ignored rather than trusted. |
| 2026-11-19 | **Routing can never be empty for Warning, Escalated or Emergency**; Info stays a silent log | An admin must not be able to switch off emergency notifications by accident. |
| 2026-11-19 | **Defaults aligned with proposal v3 only where it states them**: cooldown 10 minutes (6.2) and identity threshold 0.80 (4.4). Aid threshold (0.6) and acknowledgement timeout (10 minutes, the proposal's 5 is an example) stay | Avoid changing clinical behaviour without a statement behind it; all of them are editable. |
| 2026-11-19 | **The backend stores references to ReID samples, not embeddings or point clouds**; the model service produces and holds the data | Matches the architecture in proposal 3.5 (inference on a separate service) and keeps biometric data out of the web database. |
| 2026-11-19 | **Embeddings are deleted on discharge and when consent is withdrawn; the consent record and the history stay** | Proposal section 7. Reactivating a patient needs new samples. Consent is optional at registration but required to enrol; the registration form should ask for it. |
| 2026-11-19 | **The model service reads the gallery through `GET /api/reid/gallery` with the shared API key** | One small, auditable path for biometric references, closed to sessions. |
| 2026-11-19 | **Latency is measured from `Detection.receivedAt` to `Notification.sentAt`, for notifications triggered by intake only** | That is the interval NFR1.1 defines. Escalations are timer driven and would swamp the numbers. The load test uses 10 patients and 1,100 notifications (proposal 6.2 asks for at least 1,000). |
| 2026-11-19 | **Scripted scenarios are data (`scripts/scenarios/scripted.json`), boundary cases are built from the live settings** | New cases are added without code; boundaries stay correct when an admin changes a threshold. |
| 2026-11-19 | **One command (`npm run test:all`) runs everything on a throwaway database and a separate build folder** | Nothing touches development data, a running dev server is undisturbed, and CI runs the same thing. |

## Open decisions
- **Real-time channel:** Socket.io on a separate small Node process, or Server-Sent Events. Next.js API routes usually cannot hold long-lived WebSocket connections.
- **Aid label set:** to be taken from the Kirkby classification classes.
- **Hosting of the web system:** same Carleton server as inference, or a separate host.
