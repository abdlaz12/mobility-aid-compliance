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

## Open decisions
- **Real-time channel:** Socket.io on a separate small Node process, or Server-Sent Events. Next.js API routes usually cannot hold long-lived WebSocket connections.
- **Aid label set:** to be taken from the Kirkby classification classes.
- **Hosting of the web system:** same Carleton server as inference, or a separate host.
