# Requirements traceability

Status of each requirement in `docs/requirements.md` (from proposal v3), and which check proves it. Updated 2026-11-19, web system only. Run all the checks with `npm run test:all` in `web/`.

Status: **Done** = implemented and tested. **Partial** = part of it works, the rest is named. **Not started**. **Not applicable** = outside the web system or a policy.

Test names: *unit* = `web/src/lib/*.test.ts`, *integration* = `web/src/lib/escalation.integration.ts`, *access* = `web/scripts/test-access.mjs`, *replay* = `web/scripts/replay-scenarios.mjs`, *latency* = `web/scripts/measure-latency.mjs`.

## Functional requirements
| ID | Status | Evidence and notes |
|---|---|---|
| FR1.1 register a patient | Done | access (patients, caregivers). Consent can be recorded at registration. |
| FR1.2 update prescription and caregivers | Done | access (prescriptions keep history, caregivers replaced) |
| FR1.3 enrol in the ReID gallery | Partial | Backend stores sample references, needs consent, admin only, gallery endpoint for the model service: integration, access. No screen yet. The embeddings come from the model service. |
| FR1.4 deactivate, delete embeddings on request | Done | access (discharge deletes samples, delete one or all, withdrawal), integration |
| FR2.1 intake endpoint | Done | access, generator, latency |
| FR2.2 reject malformed payloads | Done | unit (validator), access (types, lengths, size, future timestamps, non-object bodies) |
| FR2.3 mock generator | Done | `tools/mock-generator`, run by `test:all` |
| FR3.1 compare with prescription | Done | unit, replay |
| FR3.2 low confidence flagged, no alert | Done | unit, replay (including the exact threshold boundary) |
| FR3.3 cooldown | Done | unit, integration (5 cases), replay (one warning per episode) |
| FR3.4 unrecognised people excluded | Done | unit, replay |
| FR4.1 compliant detection is a silent Info entry | Done | unit, access |
| FR4.2 Warning without the prescribed aid | Done | unit, replay |
| FR4.3 Emergency from a fall indication | Done | unit, replay. Only an externally supplied event, as the proposal says. |
| FR4.4 routing by level and caregiver list | Done | integration, unit. Routing is configurable. |
| FR5.1 push to the nurse on a Warning | Partial | Queue, retry and the Pushover adapter are tested (adapter against a simulated service). Not yet tried with a real Pushover account. |
| FR5.2 push to nurse and family on Escalated or Emergency | Partial | As FR5.1 |
| FR5.3 explicit acknowledgement | Partial | Nurse and admin acknowledge. Open question: should family members acknowledge too? (access) |
| FR5.4 unacknowledged Warning escalates | Done | integration (100 of 100 escalate, nothing else does, concurrent runs escalate once), live check of the background loop |
| FR6 audio reminders (stretch) | Not started | |
| FR7 activity recognition (stretch) | Not started | |
| FR8 mobility trends (stretch) | Not started | |
| FR9.1 real-time dashboard | Partial | Dashboard works and refreshes every 15 s. No push channel (Server-Sent Events or Socket.io undecided). |
| FR9.2 role-based access | Done | access (about 130 checks across roles) |
| FR9.3 weekly reports (stretch) | Not started | |
| FR9.4 trend charts (stretch) | Not started | |
| FR10 person segmentation | Not applicable | ML contribution, not in the web system |

## Non-functional requirements
| ID | Status | Evidence and notes |
|---|---|---|
| NFR1.1 intake to notification, p95 at most 5 s | Done, with limits | latency: p95 96 ms over 1,100 notifications on one machine with the log channel. Repeat with Pushover and PostgreSQL on the deployment server. |
| NFR1.2 10 patients at once | Done, with limits | latency: 10 patients at once, p95 96 ms against 16 ms for one patient. Same limits. |
| NFR2.1 no RGB imagery | Done by design | The event schema has no image field; unknown fields are rejected (unit, access). |
| NFR2.2 encryption at rest and in transit | Not started | Needs the deployment setup (HTTPS, database and disk encryption). |
| NFR2.3 server-side roles, 403 | Done | access |
| NFR2.4 Canadian and Ontario privacy law | Not applicable | Policy; see proposal section 7. Consent recording and embedding deletion support it. |
| NFR3.1 four browsers | Not verified | Checked in Chromium only. Redo when the Figma frontend is built. |
| NFR3.2 usable from 375 px | Not verified for the new frontend | Checked for the first interface; redo for the Figma design. |
| NFR3.3 minimal notification content | Done | unit (no full name, room, aid, time, initials and code) |
| NFR4.1 store before notifying | Done | integration, access |
| NFR4.2 queue and retry | Done | integration (retry with backoff, permanent failure, concurrent delivery) |
| NFR5.1 intake decoupled from the notification engine | Partial | Delivery runs after the response from a database queue, not a separate event queue. |
| NFR5.2 settings configurable without redeploy | Done | unit, integration, access (thresholds, cooldown, timeout, routing) |
| NFR6.1 training on DRAC, inference on a Carleton server | Not applicable | Deployment of the ML side |
| NFR6.2 containerised web server | Not started | Dockerfile and a PostgreSQL setup are still to do and need a machine with Docker |
