# API contract (draft)

Status: draft for Sprint 1. Request and response bodies for the intake follow `contracts/detection-event.schema.json`. All times are UTC (ISO 8601). Errors use standard HTTP status codes with a JSON body `{ "error": "message" }`.

## Authentication
- **Model service to intake:** a shared API key in the `Authorization: Bearer <key>` header. The key lives in an environment variable, never in the repository.
- **Users (dashboard):** session login (Auth.js, cookie). Every endpoint checks the user's role and patient scope on the **server** (admin, nurse, family). No session returns **401**, a role or patient not allowed returns **403**, a missing alert **404**, an alert that is not pending **409**.

## Detection intake
### `POST /api/detections`
Receives one detection event.
- **201** created: the event was stored (it is stored **before** any alert or notification is attempted).
- **200** duplicate: an event with the same `event_id` already exists; nothing is created again.
- **400** the payload does not match the schema (malformed or out-of-range values).
- **401** missing or wrong API key.

Example body: see `contracts/detection-event.schema.json`.

## Patients
| Method and path | Who | Purpose |
|---|---|---|
| `GET /api/patients` | admin (all), nurse (assigned), family (own) | List patients |
| `POST /api/patients` | admin | Register a patient |
| `GET /api/patients/{id}` | as above | Patient detail, current prescription, status |
| `PATCH /api/patients/{id}` | admin | Update details, deactivate (discharge) |
| `POST /api/patients/{id}/prescriptions` | admin | Set a new prescribed aid (closes the previous one) |
| `PUT /api/patients/{id}/contacts` | admin | Assign nurses and family |

## Alerts
| Method and path | Who | Purpose |
|---|---|---|
| `GET /api/alerts?status=pending&level=warning` | nurse, admin, family (own) | List alerts, filterable |
| `GET /api/alerts/{id}` | as above | Alert detail with the detection and notification history |
| `POST /api/alerts/{id}/acknowledge` | nurse, admin | Acknowledge an alert |

## Review queue
### `GET /api/detections?needs_review=true`
Low-confidence detections that produced no alert and are waiting for manual review (admin, nurse).

## Real-time updates
WebSocket (Socket.io), events pushed to the open dashboard:
- `alert.created`
- `alert.updated` (acknowledged, escalated)
- `detection.review` (new item in the review queue)

Clients only receive events for patients they are allowed to see.

## Implemented so far
`POST /api/detections`, `GET /api/detections?needs_review=true`, `GET /api/patients`, `POST /api/patients`, `GET /api/patients/{id}`, `PATCH /api/patients/{id}`, `POST /api/patients/{id}/prescriptions`, `PUT /api/patients/{id}/contacts`, `GET /api/alerts`, `GET /api/alerts/{id}`, `POST /api/alerts/{id}/acknowledge`. `POST /api/jobs/run` (API key): one pass of escalation and notification delivery, for hosting without a long-running process. `GET /api/patients/{id}/history`, `GET` and `POST /api/users`, `GET` and `PATCH /api/users/{id}`, `POST /api/users/{id}/password`, `POST /api/account/password`, `PUT /api/account/pushover`. Not yet: real-time updates.

Users and accounts: `POST /api/users` takes `{name, email, role, password}` (password at least 10 characters) and answers **409** for an email that already has an account. `PATCH /api/users/{id}` changes `name` and `isActive` only; an admin cannot deactivate themselves (**409**). A deactivated user is refused at once, even with an open session. User responses never contain password hashes or Pushover keys. `POST /api/account/password` takes `{currentPassword, newPassword}`; after 5 wrong current passwords it answers **429** for a while. `PUT /api/account/pushover` takes `{key}` (30 letters and digits, empty clears). `GET /api/patients/{id}/history` answers like `GET /api/patients/{id}` (**403** for a patient you may not see) and returns no detections and no Info alerts to family members.

Consent and ReID gallery (admin only; biometric references): consent is set with `POST /api/patients` (`consent`: `patient` or `substitute`, optional) or `PATCH /api/patients/{id}` with `consent`: `patient`, `substitute` or `withdrawn`. `withdrawn` deletes all of the patient's samples and clears the consent. `POST /api/patients/{id}/reid` takes `{embeddingRef, aid, isAssisted?}` and answers **409** without consent on file or for a discharged patient, **400** for a malformed reference (letters, digits and `. _ : / -`, no `..`, 200 characters at most) or an unknown aid. `GET /api/patients/{id}/reid` lists the samples. `DELETE /api/patients/{id}/reid` deletes all of them and `DELETE /api/patients/{id}/reid/{sampleId}` one. Discharging a patient deletes the samples; the consent record and the history stay. `GET /api/patients/{id}` shows `consent` and `reid.sampleCount` to admins only. For the model service: `GET /api/reid/gallery` (Bearer API key) returns `{samples: [{patient_code, embedding_ref, aid, assisted}]}` for admitted patients who consented.

Latency (admin only): `GET /api/metrics/latency?since=<ISO time>&limit=<n>` returns `{count, p50Ms, p95Ms, maxMs, withinTargetPct, targetMs, generatedAt}` for notifications sent because of an incoming detection (received time to sent time, NFR1.1; escalation notifications are excluded). `generatedAt` is the server's clock, for marking "now" in a measurement.

Alert lifecycle: `pending` (waiting for acknowledgement) → `acknowledged` → `closed`. An acknowledged `warning` or `escalated` alert becomes `closed`, with `closedAt` set, when the same patient is next detected with the prescribed aid (an Info entry). Alerts that are still `pending` and `emergency` alerts are not closed by this. Info alerts are born `closed`.

Settings (admin only): `GET /api/settings` returns `{settings, defaults, changed}` (`changed` lists the keys an admin set). `PUT /api/settings` changes some of `identityConfidenceThreshold` and `aidConfidenceThreshold` (0 to 1), `cooldownMinutes` (0 to 1440, 0 turns it off), `ackTimeoutMinutes` (1 to 1440) and `routing` (for `warning`, `escalated` and `emergency`, each a non-empty list of `nurse` and `family`); unknown keys, out-of-range values and an empty route answer **400**. `DELETE /api/settings?keys=cooldownMinutes,routing` returns those keys (all when `keys` is omitted) to the environment value or the default. Changes apply from the next detection.

Cooldown: a detection that repeats an episode which already raised a warning (within `COOLDOWN_MINUTES`, with no compliant sighting since) is stored but raises no new alert; the response has `alert_level: null`.

Escalation and notifications: an alert created as `warning` has an `ackDeadline`; if it is still `pending` at that time its `level` becomes `escalated` and `escalatedAt` is set. `GET /api/alerts/{id}` lists the notifications (channel, status `queued`/`sent`/`failed`/`skipped`, attempts).

Patient management notes: `POST /api/patients` takes `{code, name, initials?, age?, room?, aid}` and answers **409** for a code already used and **400** for invalid input or an unknown aid. `PATCH` changes only the keys sent, including `status: "discharged" | "active"`. `POST .../prescriptions` takes `{aid}`, closes the open prescription and answers **409** if that aid is already current. `PUT .../contacts` takes `{userIds: [...]}` and replaces the whole set; only active nurses and family members can be assigned (**400** otherwise). `GET /api/patients/{id}` returns prescription history and caregivers to admin only; a nurse or family member who is not assigned gets **403**.

## Open questions
- Exact label set of the aid classifier (from the Kirkby models).
- Whether the real-time channel is Socket.io on a separate Node process or Server-Sent Events (see `docs/decisions.md`).
- Pagination and filtering conventions.
