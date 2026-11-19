#!/usr/bin/env node
// Measures NFR1.1 and NFR1.2 against a RUNNING server (proposal section 6.2):
//   NFR1.1  event received -> notification sent: 95th percentile at most 5 s (model inference time excluded).
//   NFR1.2  10 patients monitored at once with no degradation of NFR1.1.
// Phase 1 sends events for one patient (baseline). Phase 2 sends them for 10 patients at once. Every event
// starts a new episode, so each one raises a Warning and therefore one notification to measure.
//   node scripts/measure-latency.mjs [baseUrl]      env: INTAKE_API_KEY, LATENCY_PATIENTS (10), LATENCY_ROUNDS (100)
import { randomUUID } from "node:crypto";
import { login, sleep } from "./lib/client.mjs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const KEY = process.env.INTAKE_API_KEY ?? "dev-only-change-me";
const PATIENTS = Number(process.env.LATENCY_PATIENTS ?? 10);
const ROUNDS = Number(process.env.LATENCY_ROUNDS ?? 100);
const TARGET_MS = 5000;

const send = async (patient, aid) => {
  const res = await fetch(`${BASE}/api/detections`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      event_id: randomUUID(), timestamp: new Date().toISOString(), room_id: "R-204", person_track_id: "t-1",
      identity: { patient_id: patient, confidence: 0.95 }, aid: { label: aid, confidence: 0.95 }, event_type: "detection",
    }),
  });
  return res.status === 201;
};

async function main() {
  const admin = await login(BASE);
  const metrics = async (since) => (await admin(`/api/metrics/latency${since ? `?since=${encodeURIComponent(since)}` : "?limit=1"}`)).json();
  const call = (path, method, body) => admin(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  // Set up the patients, each prescribed a walker and assigned to the demo nurse so a notification is queued.
  const nurse = (await (await admin("/api/users")).json()).users.find((u) => u.email === "nurse@example.test");
  if (!nurse) throw new Error("Seed data missing: nurse@example.test");
  const stamp = Date.now().toString(36).toUpperCase();
  const codes = [];
  for (let i = 0; i < PATIENTS; i++) {
    const code = `LT${stamp}${i}`;
    const created = await call("/api/patients", "POST", { code, name: `Latency Test ${i}`, aid: "walker" });
    if (created.status !== 201) throw new Error(`Could not create ${code}: HTTP ${created.status}`);
    const { patient } = await created.json();
    if ((await call(`/api/patients/${patient.id}/contacts`, "PUT", { userIds: [nurse.id] })).status !== 200) throw new Error("Could not assign the nurse");
    codes.push(code);
  }

  async function phase(label, patients, rounds) {
    await sleep(1500); // keep this phase's notifications apart from the previous one
    const since = (await metrics()).generatedAt;
    const expected = patients.length * rounds;
    let failures = 0;
    const t0 = Date.now();
    for (let r = 0; r < rounds; r++) {
      // A compliant sighting ends the previous episode, then the non-compliant detection raises a new Warning.
      const resets = await Promise.all(patients.map((p) => send(p, "walker")));
      const warns = await Promise.all(patients.map((p) => send(p, "none")));
      failures += [...resets, ...warns].filter((ok) => !ok).length;
    }
    const sendSecs = (Date.now() - t0) / 1000;
    let m = await metrics(since);
    for (let i = 0; i < 120 && m.count < expected; i++) { await sleep(500); m = await metrics(since); }
    return { label, patients: patients.length, expected, failures, sendSecs, eventsPerSec: (expected * 2) / sendSecs, ...m };
  }

  const baseline = await phase("1 patient", codes.slice(0, 1), ROUNDS);
  const concurrent = await phase(`${PATIENTS} patients at once`, codes, ROUNDS);

  const row = (r) => `${r.label.padEnd(20)} notifications ${String(r.count).padStart(5)}/${r.expected}   p50 ${String(Math.round(r.p50Ms)).padStart(5)} ms   p95 ${String(Math.round(r.p95Ms)).padStart(5)} ms   max ${String(Math.round(r.maxMs)).padStart(5)} ms   within 5 s ${r.withinTargetPct}%   (${r.eventsPerSec.toFixed(0)} events/s)`;
  console.log(row(baseline));
  console.log(row(concurrent));
  console.log("(received -> sent, model inference time excluded; the log channel stands in for Pushover, so this does not include the Pushover network call)\n");

  const problems = [];
  for (const r of [baseline, concurrent]) {
    if (r.failures) problems.push(`${r.label}: ${r.failures} events were not accepted`);
    if (r.count < r.expected) problems.push(`${r.label}: only ${r.count} of ${r.expected} notifications were sent`);
    if (r.p95Ms > TARGET_MS) problems.push(`${r.label}: p95 ${Math.round(r.p95Ms)} ms is above the ${TARGET_MS} ms target (NFR1.1)`);
  }
  if (concurrent.count + baseline.count < 1000 && ROUNDS * PATIENTS >= 1000) problems.push("fewer than 1000 notifications were measured");
  console.log(problems.length ? problems.map((p) => `FAIL  ${p}`).join("\n") : `PASS  NFR1.1: p95 ${Math.round(concurrent.p95Ms)} ms (target ${TARGET_MS} ms), measured over ${baseline.count + concurrent.count} notifications`);
  if (!problems.length) console.log(`PASS  NFR1.2: ${PATIENTS} patients at once, p95 ${Math.round(concurrent.p95Ms)} ms against ${Math.round(baseline.p95Ms)} ms for one patient`);
  process.exit(problems.length ? 1 : 0);
}
main().catch((e) => { console.error(`Could not measure against ${BASE}: ${e.cause?.code ?? e.message}`); process.exit(2); });
