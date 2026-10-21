# LiDAR-Based Mobility Aid Compliance and Notification System

Research project at Carleton University (CUBIC Lab), advisor **Prof. James R. Green**.

The system receives the output of LiDAR deep learning models (mobility aid classification and person re-identification, by S. Kirkby), compares each detected person's aid with their prescription, and sends tiered alerts to nurses and family caregivers, with acknowledgement and escalation. LiDAR captures 3D point clouds instead of images, so it is more privacy-preserving than cameras.

**Status:** Sprint 1 (foundation). Design phase: requirements, database design, API contract and UI sketches. See `docs/`.

## Two parts of the project
| Part | What | Where |
|---|---|---|
| **Web system** (first priority) | Patient registry, compliance engine, tiered alerts, role-based dashboard | `web/` |
| **ML contribution** | Person segmentation for 2 to 5 people per frame, trained on synthetic scenes composed from single-person VLS-128 data | `ml/` |

The two are connected only through one message format, the detection event (`contracts/detection-event.schema.json`). The web system can be built and tested with a mock generator before any real model output exists.

## Repository layout
```
docs/         requirements, API contract, scenarios, decisions, UI sketches
contracts/    detection event schema (shared by web, mock generator and ML)
web/          Next.js web application (not yet scaffolded)
tools/        mock data generator
ml/           ML work (placeholder, see ml/README.md)
```

## Data policy
- **No participant data, point clouds, patient data or secrets are stored in this repository.** `data/`, `output/`, model weights and `.env` files are git-ignored.
- Example data in the web system is fake.
- Participant point clouds stay on lab-controlled Carleton storage.

## Plan
Sprint 0: setup and approvals. Sprint 1: core schema, mock generator, compliance engine, minimal dashboard. Sprint 2: identity (ReID) and notifications. Sprint 3 to 5: segmentation, refinement, evaluation. Details are in the project proposal (v3).

## Documents
- [Requirements](docs/requirements.md)
- [API contract (draft)](docs/api.md)
- [Database design (DBML)](docs/erd.dbml)
- [Operating scenarios](docs/scenarios.md)
- [Design decisions](docs/decisions.md)
- [UI sketches](docs/ui/README.md)
