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
`POST /api/detections`, `GET /api/detections?needs_review=true`, `GET /api/patients`, `POST /api/patients`, `GET /api/patients/{id}`, `PATCH /api/patients/{id}`, `POST /api/patients/{id}/prescriptions`, `PUT /api/patients/{id}/contacts`, `GET /api/alerts`, `GET /api/alerts/{id}`, `POST /api/alerts/{id}/acknowledge`. `POST /api/jobs/run` (API key): one pass of escalation and notification delivery, for hosting without a long-running process. Not yet: real-time updates.

Escalation and notifications: an alert created as `warning` has an `ackDeadline`; if it is still `pending` at that time its `level` becomes `escalated` and `escalatedAt` is set. `GET /api/alerts/{id}` lists the notifications (channel, status `queued`/`sent`/`failed`/`skipped`, attempts).

Patient management notes: `POST /api/patients` takes `{code, name, initials?, age?, room?, aid}` and answers **409** for a code already used and **400** for invalid input or an unknown aid. `PATCH` changes only the keys sent, including `status: "discharged" | "active"`. `POST .../prescriptions` takes `{aid}`, closes the open prescription and answers **409** if that aid is already current. `PUT .../contacts` takes `{userIds: [...]}` and replaces the whole set; only active nurses and family members can be assigned (**400** otherwise). `GET /api/patients/{id}` returns prescription history and caregivers to admin only; a nurse or family member who is not assigned gets **403**.

## Open questions
- Exact label set of the aid classifier (from the Kirkby models).
- Whether the real-time channel is Socket.io on a separate Node process or Server-Sent Events (see `docs/decisions.md`).
- Pagination and filtering conventions.
