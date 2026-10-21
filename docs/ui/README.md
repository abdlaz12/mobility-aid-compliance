# UI sketches

Sketch each screen at low fidelity first (paper, Figma or draw.io) and save the images in this folder. The goal is to decide what each page contains, not how it looks.

## Screens
| Role | Screen | Main content |
|---|---|---|
| All | Login | Email and password |
| Admin | Patient list | All patients, status, room, prescribed aid, search |
| Admin | Add or edit patient | Details, prescription, assigned nurses and family |
| Admin | Users | Create users, set roles |
| Admin | Rooms | Rooms and zones |
| Admin | ReID enrolment | Link calibration samples to a patient (Sprint 2) |
| Admin | Settings | Confidence thresholds, cooldown, escalation timeout |
| Nurse | Dashboard | Assigned patients with compliance status, pending alerts |
| Nurse | Alert detail | Patient, room, time, detected aid, acknowledge button |
| Nurse | Patient history | Past detections and alerts |
| Nurse and admin | Review queue | Low-confidence detections waiting for manual review |
| Family | Patient status | Current status and alert history for one patient |

## Rules for every screen
- Works at 375 px width (mobile first).
- Push notifications and lists show initials or an ID; the full name appears only inside the authenticated dashboard.
- Alert level is shown with text and an icon, not colour alone.

## Files
Add images here as `01-login.png`, `02-nurse-dashboard.png`, and so on.
