# Frontend backlog (parked items)

Written 2026-11-26 while building the standalone frontend from the Figma Make design (see `design/make-snapshot/`). Scope now: the 13 screens of the nurse, family and admin flows. Part A (backend features without a design) is built directly in the frontend following the Foundations page. Parts B and C below are parked until the frontend is merged with the backend.

## B. In the design, not yet in the backend
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
- Defaults in the design's Settings (aid threshold 0.80, acknowledgement timeout 5 min) differ from the backend's (0.6 and 10 min). Decide and align before integration.
- The design's discharge dialog offers to delete embeddings as an option; the backend always deletes them on discharge (proposal section 7). The frontend follows the backend.

## Later checks
- Settings error states for the backend limits (acknowledgement timeout 1 to 1440, cooldown 0 to 1440, routing never empty for warning, escalated and emergency).
- Review queue has no "mark as reviewed" action in either the design or the backend.
- Four browsers (NFR3.1) and 375 px (NFR3.2) once the frontend is integrated.
