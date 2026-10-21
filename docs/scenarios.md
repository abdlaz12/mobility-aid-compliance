# Operating scenarios

Two scenarios show how the system behaves. Both use the detection event schema (`contracts/detection-event.schema.json`). Threshold and timing values are examples and are configurable (NFR5.2).

## Scenario A: an enrolled patient moves without the prescribed aid

Patient P-0042 is prescribed a walker. At 14:22 the patient leaves the room and walks along the corridor without it.

| Step | What happens | Data written |
|---|---|---|
| 1 | The classifier reports "no aid" and ReID matches P-0042 (identity confidence 0.91, above an example threshold of 0.80). The event arrives at the intake API. | `detections`: `patient_id = P-0042`, aid `none`, identity and aid confidences, `needs_review = false` |
| 2 | The compliance engine compares the detected aid with the current prescription (`valid_to` empty). They differ and both confidences are above threshold. | none |
| 3 | A **Warning** is created for the assigned nurse, with an acknowledgement deadline (example: 5 minutes). | `alerts`: `level = warning`, `status = pending`, `ack_deadline` |
| 4 | A push message is sent with minimum content: room, aid status, time, patient initials (never the full name). Failed sends are retried. | `notifications`: channel, `status = sent`, `attempts` |
| 5a | The nurse acknowledges in time. | `alerts`: `status = acknowledged`, `acknowledged_by`, `acknowledged_at` |
| 5b | No one acknowledges before `ack_deadline`: the alert is **escalated** and the family is notified too. | `alerts`: `level = escalated`, `escalated_at`; new `notifications` rows |

**Repeat suppression:** further detections of the same patient without the walker within the cooldown (example: 10 minutes) create no new alerts (FR3.3). One Warning per episode, not one per frame.

## Scenario B: a staff member or doctor walks through a monitored hallway

A nurse, doctor or visitor who is not enrolled as a patient walks along a hallway with a LiDAR. They carry no mobility aid, so a naive system would flag them.

| Step | What happens | Data written |
|---|---|---|
| 1 | ReID finds no enrolled profile above the identity threshold, so the person is **unknown**. | `detections`: `patient_id = NULL`, low identity confidence, `needs_review = false` |
| 2 | Unknown detections are excluded from compliance checking (FR3.4). | none |
| 3 | **No alert and no notification** is created. The detection is kept only for the audit log. | no `alerts` or `notifications` rows |

**Why the hallway causes no false alarm:** zone-based attribution (assume the person is the patient assigned to the room) is a fallback for single-occupant rooms only. A hallway has no assigned patient, so identity depends entirely on ReID.

**The risk:** if ReID wrongly matches a staff member to a patient, a false Warning could be sent. The identity threshold limits this (below it a match is treated as unknown), and borderline matches are flagged `needs_review` instead of alerting.

## Reading the data
- `patient_id = NULL`: an unknown person, no alert.
- `patient_id` set and `needs_review = true`: a low-confidence detection of a known patient, no alert, flagged for a human.

## Test cases for the mock generator
Compliant patient, non-compliant patient, unknown person in a hallway, low-confidence detection, repeated event (same non-compliance within the cooldown), duplicate `event_id`.
