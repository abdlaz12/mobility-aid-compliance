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
`POST /api/detections`, `GET /api/detections?needs_review=true`, `GET /api/patients`, `GET /api/alerts`, `GET /api/alerts/{id}`, `POST /api/alerts/{id}/acknowledge`. Not yet: patient create, update, prescriptions and contacts (admin), real-time updates.

## Open questions
- Exact label set of the aid classifier (from the Kirkby models).
- Whether the real-time channel is Socket.io on a separate Node process or Server-Sent Events (see `docs/decisions.md`).
- Pagination and filtering conventions.
