# Mock generator

Sends detection events to the intake API so the web system can be built and tested before real model output exists. Events follow `contracts/detection-event.schema.json`. No dependencies; Node 18 or newer.

## Run (from the repository root, with `npm run dev` running in `web/`)
```
node tools/mock-generator/generate.mjs all                 # one of each scenario, PASS/FAIL
node tools/mock-generator/generate.mjs noncompliant
node tools/mock-generator/generate.mjs load --count 100 --rate 20
node tools/mock-generator/generate.mjs all --url http://localhost:3002
```
Options: `--url` (default `http://localhost:3000`; use the port `next dev` printed), `--key` (default: env `INTAKE_API_KEY`, else `dev-only-change-me`), `--patient` (default `P-0042`), `--count`, `--rate`.

## Scenarios
| Scenario | Sends | Expected |
|---|---|---|
| `compliant` | aid matches the prescription | 201, info |
| `noncompliant` | a compliant sighting, then a different aid or none | 201 info, then 201 warning |
| `unknown` | unknown person (`patient_id = null`) | 201, no alert |
| `lowconf` | low aid confidence | 201, flagged for review, no alert |
| `duplicate` | the same `event_id` twice | 201 then 200 |
| `fall` | `fall_indication` event | 201, emergency |
| `load` | many events from several patients | latency p50/p95 (NFR1.2) |

`all` and the single scenarios check these expectations and exit with code 1 on a mismatch. Prescriptions are those of the fake seed data (`web/prisma/seed.ts`: P-0042 walker, P-0043 cane), so run `npx prisma db seed` first.

The server raises one warning per episode (`COOLDOWN_MINUTES`, default 5; a compliant sighting ends an episode). That is why `noncompliant` and `duplicate` start with a compliant sighting: it lets you repeat them at any time. Sending `noncompliant` events in a row yourself shows the suppression: only the first raises a warning.
