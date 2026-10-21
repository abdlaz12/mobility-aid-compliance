# Mock generator (planned)

Sends detection events to the intake API so the web system can be built and tested before real model output exists. Events follow `contracts/detection-event.schema.json`.

## Scenarios to generate
- Compliant patient (aid matches the prescription)
- Non-compliant patient (no aid, or a different aid)
- Unknown person in a hallway (`patient_id = null`)
- Low-confidence detection (flagged for review, no alert)
- Repeated event within the cooldown (alert suppressed)
- Duplicate `event_id` (ignored)
- Several patients at once (load test for NFR1.2)

Planned: a small Node or Python script with command-line options for scenario, patient and rate. Not implemented yet.
