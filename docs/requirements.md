# Requirements

Source: project proposal v3. Priority: **M** = must (core), **S** = stretch. Sprint = planned delivery.

## Roles
- **Admin:** manages patients, users, rooms, settings. Sees all patients.
- **Nurse:** sees only assigned patients, receives and acknowledges alerts.
- **Family:** sees only their own patient's status and alert history.

## Functional requirements

### FR1: Patient management
| ID | Requirement | Pri | Sprint |
|---|---|---|---|
| FR1.1 | Register a patient with name, assigned room, prescribed aid, caregiver contacts | M | 1 |
| FR1.2 | Update the prescribed aid and caregiver list at any time | M | 1 |
| FR1.3 | Enrol a patient in the ReID gallery by linking calibration samples, without retraining | M | 2 |
| FR1.4 | Deactivate a discharged patient (keep history); delete embeddings on request | M | 2 |

### FR2: Model output intake
| ID | Requirement | Pri | Sprint |
|---|---|---|---|
| FR2.1 | REST endpoint receives detection events (identity, aid, confidences, room, timestamp) | M | 1 |
| FR2.2 | Malformed or out-of-range payloads are rejected | M | 1 |
| FR2.3 | Mock generator emits events in the real format, including unknown-person and low-confidence cases | M | 1 |

### FR3: Compliance engine
| ID | Requirement | Pri | Sprint |
|---|---|---|---|
| FR3.1 | Compare the detected aid with the patient's current prescription | M | 1 |
| FR3.2 | Detections below a confidence threshold create no alert and are flagged for manual review | M | 1 |
| FR3.3 | Suppress repeated alerts for the same episode within a cooldown | M | 2 |
| FR3.4 | Detections of unrecognised people are excluded from compliance checking | M | 1 |

### FR4: Alert generation
| ID | Requirement | Pri | Sprint |
|---|---|---|---|
| FR4.1 | A compliant detection creates a silent Info log entry | M | 1 |
| FR4.2 | A Warning is created when an enrolled patient moves without the prescribed aid | M | 1 |
| FR4.3 | An Emergency is created when an externally supplied fall-indication event arrives | M | 2 |
| FR4.4 | Alerts are routed by level and the patient's caregiver list | M | 2 |

Levels: **Info** (logged only), **Warning** (assigned nurse, needs acknowledgement), **Escalated** (nurse and family), **Emergency** (nurse and family, from a fall-indication event).

### FR5: Notification and escalation
| ID | Requirement | Pri | Sprint |
|---|---|---|---|
| FR5.1 | Push notification to the assigned nurse on a Warning | M | 2 |
| FR5.2 | Push notifications to nurse and family on Escalated or Emergency | M | 2 |
| FR5.3 | The recipient must explicitly acknowledge | M | 1 |
| FR5.4 | An unacknowledged Warning becomes Escalated after a configurable timeout | M | 2 |

### FR9: Dashboard and reporting
| ID | Requirement | Pri | Sprint |
|---|---|---|---|
| FR9.1 | Real-time dashboard: active patients, compliance status, pending alerts | M | 1 |
| FR9.2 | Role-based access (admin all, nurse assigned, family own patient) | M | 1 |
| FR9.3 | Automated weekly compliance reports | S | |
| FR9.4 | Compliance history and trend charts | S | |

### FR10: Person segmentation (ML contribution, see `ml/`)
FR10.1 separate individual people in frames with 2 to 5 occupants (M). FR10.2 pass each cluster individually to classification and ReID (M).

### Stretch
FR6 audio reminders, FR7 activity recognition, FR8 mobility trends.

## Non-functional requirements
| ID | Requirement |
|---|---|
| NFR1.1 | Intake API to notification channel: at most 5 s at the 95th percentile (excluding model inference time) |
| NFR1.2 | At least 10 patients monitored concurrently without degrading NFR1.1 (tested with the mock generator) |
| NFR2.1 | No RGB imagery is captured, processed or stored in the deployed pipeline |
| NFR2.2 | Patient data and ReID embeddings encrypted at rest and in transit (TLS) |
| NFR2.3 | Role-based access enforced on the server; unauthorised access returns HTTP 403 |
| NFR3.1 | Works in current Chrome, Firefox, Safari and Edge without plugins |
| NFR3.2 | Fully usable on mobile browsers from 375 px width |
| NFR3.3 | Push notifications show room, aid status, time and a patient reference (initials or ID); full name only inside the authenticated dashboard |
| NFR4.1 | Events are stored before notification is attempted |
| NFR4.2 | Undelivered notifications are queued and retried |
| NFR5.1 | Intake API is decoupled from the notification engine by an internal event queue |
| NFR5.2 | Routing rules, thresholds and escalation timeouts are configurable without redeployment |
| NFR6.1 | Model training runs on DRAC (SLURM); inference runs on a Carleton server |
| NFR6.2 | Web server and notification service are containerised (Docker) |
