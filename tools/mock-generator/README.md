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
| `noncompliant` | a different aid or none | 201, warning |
| `unknown` | unknown person (`patient_id = null`) | 201, no alert |
| `lowconf` | low aid confidence | 201, flagged for review, no alert |
| `duplicate` | the same `event_id` twice | 201 then 200 |
| `fall` | `fall_indication` event | 201, emergency |
| `load` | many events from several patients | latency p50/p95 (NFR1.2) |

`all` and the single scenarios check these expectations and exit with code 1 on a mismatch. Prescriptions are those of the fake seed data (`web/prisma/seed.ts`: P-0042 walker, P-0043 cane), so run `npx prisma db seed` first.

Not covered yet: repeated events inside a cooldown (the cooldown is Sprint 2).
