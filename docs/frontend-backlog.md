# Frontend backlog (parked items)

Written 2026-11-26 while building the standalone frontend from the Figma Make design (see `design/make-snapshot/`). Scope now: the 13 screens of the nurse, family and admin flows. Part A (backend features without a design) is built directly in the frontend following the Foundations page. Parts B and C below are parked until the frontend is merged with the backend.

## B. In the design, not yet in the backend
Status 2026-11-27: delivery recipients are now in the backend API (`GET /api/alerts/{id}`, branch `feature/backend-completion`), `GET /api/rooms` exists, and the model service can enrol samples with `POST /api/reid/enrol`. The Rooms screen is not built (decisions, 2026-11-14: rooms are created by typing them); the admin forms offer known rooms and accept a new one. Calibration upload from the web page waits on pipeline open question 6 (`docs/pipeline.md`).

| Design | Backend today | Work |
|---|---|---|
| Rooms screen with a Room or Hallway type | No API; the rooms table has no type column | New API and one column, with tests |
| Upload of ReID calibration samples (file picker) | Stores a **reference** (text) to a sample, not the file | Decide with the supervisor who turns files into embeddings; then storage and a hand-off to the inference service |
| Delivery status per recipient on the alert detail | `GET /api/alerts/{id}` returns channel and status only, no recipient | Add the recipient (name and role) for nurses and admins; never show other recipients to family |
| Consent "Date recorded" field | The server sets the date itself | Remove the field, or let the API accept a date |
| Stretch screens (audio, activity, trends, weekly report) | Not built | After the core is done |

## C. Wording differences
- The design says "Resolved" (family history) and "Closed" (timeline); the backend status is `closed`. Pick one word for the interface.
- Consent is required in the design's form; the API accepts a patient without consent (it is required only to enrol ReID). Enforce it in the form.
- Defaults in the design's Settings (aid threshold 0.80, acknowledgement timeout 5 min) differ from the backend's (0.6 and 10 min). **The frontend uses the backend's.** Update the Figma Make design to match, or change the backend defaults on purpose.
- The design's discharge dialog offers to delete embeddings as an option; the backend always deletes them on discharge (proposal section 7). The frontend follows the backend (done; consent withdrawal behaves the same way).

## Later checks
- Routing is read-only in the frontend. The backend limits for timeout (1 to 1440) and cooldown (0 to 1440) are enforced in the form; "routing never empty" matters only if routing becomes editable.
- Review queue has no "mark as reviewed" action in either the design or the backend.
- Four browsers (NFR3.1) and 375 px (NFR3.2) once the frontend is integrated.
