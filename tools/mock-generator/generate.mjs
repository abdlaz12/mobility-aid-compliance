#!/usr/bin/env node
// Mock detection generator. Sends events in the format of contracts/detection-event.schema.json
// to POST /api/detections so the web system can be developed and tested without the ML models.
// No dependencies; needs Node 18+ (global fetch). See README.md in this folder.
import { randomUUID } from "node:crypto";

const USAGE = `Usage: node tools/mock-generator/generate.mjs <scenario> [options]

Scenarios:
  all           one of each scenario below, with a PASS/FAIL check (smoke test)
  compliant     patient uses the prescribed aid            -> 201, info
  noncompliant  patient has a different aid / none          -> 201, warning
  unknown       unknown person in the hallway (null id)     -> 201, no alert
  lowconf       low-confidence detection                    -> 201, needs_review
  duplicate     same event_id sent twice                    -> 201 then 200
  fall          fall_indication event                       -> 201, emergency
  load          many events from several patients (NFR1.2); prints latency p95

Options:
  --url <url>        server (default http://localhost:3000)
  --key <key>        API key (default: env INTAKE_API_KEY, else dev-only-change-me)
  --patient <code>   patient code for single scenarios (default P-0042)
  --count <n>        events for "load" (default 50)
  --rate <n>         events per second for "load" (default 10)
`;

// Prescriptions of the seed data (web/prisma/seed.ts). Fake patients only.
const PRESCRIBED = { "P-0042": "walker", "P-0043": "cane" };
const AIDS = ["none", "cane", "crutches", "walker", "wheelchair"];
const ROOM = { "P-0042": "R-204", "P-0043": "R-205" };

function parse(argv) {
  const [scenario, ...rest] = argv;
  const o = { scenario, url: "http://localhost:3000", key: process.env.INTAKE_API_KEY ?? "dev-only-change-me", patient: "P-0042", count: 50, rate: 10 };
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i]?.replace(/^--/, "");
    const v = rest[i + 1];
    if (!(k in o) || k === "scenario" || v === undefined) { console.error(`Bad option: ${rest[i]}\n`); console.error(USAGE); process.exit(2); }
    o[k] = ["count", "rate"].includes(k) ? Number(v) : v;
  }
  return o;
}

function event({ patient, aid, idConf = 0.92, aidConf = 0.95, room, type = "detection", id = randomUUID() }) {
  return {
    event_id: id,
    timestamp: new Date().toISOString(),
    room_id: room ?? ROOM[patient] ?? "H-2",
    person_track_id: `t-${Math.floor(Math.random() * 90) + 10}`,
    identity: { patient_id: patient, confidence: idConf },
    aid: { label: aid, confidence: aidConf },
    event_type: type,
    model_version: "mock-0.1",
  };
}

const wrongAid = (patient) => AIDS.find((a) => a !== PRESCRIBED[patient]) ?? "none";

async function send(o, ev) {
  const t0 = performance.now();
  const res = await fetch(`${o.url}/api/detections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${o.key}` },
    body: JSON.stringify(ev),
  });
  const ms = performance.now() - t0;
  let body = {};
  try { body = await res.json(); } catch { /* non-JSON error page */ }
  return { status: res.status, body, ms };
}

// Each scenario: events to send and the expected [status, alert_level, needs_review] for each.
function scenarios(o) {
  const p = o.patient;
  const dupId = randomUUID();
  return {
    compliant: [[event({ patient: p, aid: PRESCRIBED[p] ?? "walker" }), [201, "info", false]]],
    noncompliant: [[event({ patient: p, aid: wrongAid(p) }), [201, "warning", false]]],
    unknown: [[event({ patient: null, aid: "none", idConf: 0.3, room: "H-2" }), [201, null, false]]],
    lowconf: [[event({ patient: p, aid: wrongAid(p), aidConf: 0.35 }), [201, null, true]]],
    duplicate: [
      [event({ patient: p, aid: wrongAid(p), id: dupId }), [201, "warning", false]],
      [event({ patient: p, aid: wrongAid(p), id: dupId }), [200, null, false]],
    ],
    fall: [[event({ patient: p, aid: "none", type: "fall_indication" }), [201, "emergency", false]]],
  };
}

async function runChecked(o, names) {
  const all = scenarios(o);
  let failed = 0;
  for (const name of names) {
    for (const [ev, [st, lvl, rev]] of all[name]) {
      const r = await send(o, ev);
      const ok = r.status === st && (r.body.alert_level ?? null) === lvl && (r.body.needs_review ?? false) === rev;
      if (!ok) failed++;
      console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(12)} HTTP ${r.status}  alert=${r.body.alert_level ?? "-"}  review=${r.body.needs_review ?? "-"}` +
        (ok ? "" : `   (expected HTTP ${st}, alert=${lvl ?? "-"}, review=${rev})`));
    }
  }
  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exitCode = failed ? 1 : 0;
}

async function load(o) {
  const patients = Object.keys(PRESCRIBED);
  const lat = [];
  let errors = 0;
  const gap = 1000 / o.rate;
  const jobs = [];
  for (let i = 0; i < o.count; i++) {
    const patient = patients[i % patients.length];
    const aid = i % 3 === 0 ? PRESCRIBED[patient] : wrongAid(patient);
    jobs.push(send(o, event({ patient, aid })).then((r) => { lat.push(r.ms); if (r.status !== 201) errors++; }));
    await new Promise((r) => setTimeout(r, gap));
  }
  await Promise.all(jobs);
  lat.sort((a, b) => a - b);
  const p = (q) => lat[Math.min(lat.length - 1, Math.ceil(q * lat.length) - 1)].toFixed(1);
  console.log(`Sent ${o.count} events at ~${o.rate}/s from ${patients.length} patients`);
  console.log(`Errors: ${errors}   Latency ms: p50=${p(0.5)}  p95=${p(0.95)}  max=${lat.at(-1).toFixed(1)}`);
  console.log(`(Intake-to-response only. NFR1.1 targets p95 <= 5000 ms for intake-to-notification.)`);
  process.exitCode = errors ? 1 : 0;
}

const o = parse(process.argv.slice(2));
try {
  if (o.scenario === "all") await runChecked(o, ["compliant", "noncompliant", "unknown", "lowconf", "duplicate", "fall"]);
  else if (o.scenario === "load") await load(o);
  else if (o.scenario && scenarios(o)[o.scenario]) await runChecked(o, [o.scenario]);
  else { console.error(USAGE); process.exitCode = 2; }
} catch (e) {
  console.error(`Could not reach ${o.url}: ${e.cause?.code ?? e.message}. Is "npm run dev" running (check the port)?`);
  process.exitCode = 1;
}
