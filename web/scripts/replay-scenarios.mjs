#!/usr/bin/env node
// Replays scripted scenarios (proposal section 6.2) against a RUNNING server and reports how well the alerts match
// what should have happened: false-positive and false-negative Warning rates, and warnings per episode (alarm fatigue).
//   node scripts/replay-scenarios.mjs [baseUrl]            (env: INTAKE_API_KEY, default dev-only-change-me)
//   node scripts/replay-scenarios.mjs [baseUrl] --events recorded.jsonl
//       replays recorded model output (one JSON event per line, timestamps kept) and prints what the system did with it.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { login } from "./lib/client.mjs";

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3000";
const KEY = process.env.INTAKE_API_KEY ?? "dev-only-change-me";
const eventsFile = args.includes("--events") ? args[args.indexOf("--events") + 1] : null;
const PRESCRIBED = { "P-0042": "walker", "P-0043": "cane" };

const send = async (event) => {
  const res = await fetch(`${BASE}/api/detections`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify(event) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, alert: body.alert_level ?? null, review: body.needs_review ?? false };
};
const make = (s) => ({
  event_id: randomUUID(),
  timestamp: s.timestamp ?? new Date().toISOString(),
  room_id: s.patient === "P-0043" ? "R-205" : "R-204",
  person_track_id: "t-1",
  identity: { patient_id: s.patient ?? null, confidence: s.identityConfidence ?? 0.95 },
  aid: { label: s.aid, confidence: s.aidConfidence ?? 0.95 },
  event_type: s.type ?? "detection",
});

async function replayRecorded(file) {
  const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim());
  const counts = new Map();
  let rejected = 0;
  for (const line of lines) {
    const r = await send(JSON.parse(line));
    if (r.status !== 201 && r.status !== 200) { rejected++; continue; }
    const key = r.alert ?? (r.review ? "review" : "no alert");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  console.log(`Replayed ${lines.length} recorded events (${rejected} rejected)`);
  for (const [k, v] of [...counts].sort()) console.log(`  ${k.padEnd(10)} ${v}`);
}

async function main() {
  if (eventsFile) return replayRecorded(eventsFile);
  const admin = await login(BASE);
  const { settings } = await (await admin("/api/settings")).json();
  const { groups } = JSON.parse(readFileSync(new URL("./scenarios/scripted.json", import.meta.url), "utf8"));

  // Boundary cases depend on the thresholds in force, so they are built from the live settings.
  const r2 = (x) => Number(x.toFixed(2));
  const boundary = (name, patient, key, value, expect) => ({ name, steps: [{ patient, reset: true }, { patient, aid: "none", [key]: value, expect }] });
  const it = settings.identityConfidenceThreshold, at = settings.aidConfidenceThreshold;
  groups.push(
    boundary(`boundary: identity confidence exactly at the threshold (${it}) counts as confident`, "P-0042", "identityConfidence", it, { alert: "warning" }),
    boundary(`boundary: aid confidence exactly at the threshold (${at}) counts as confident`, "P-0043", "aidConfidence", at, { alert: "warning" }),
  );
  if (it >= 0.01) groups.push(boundary(`boundary: identity confidence just below the threshold (${r2(it - 0.01)}) goes to review`, "P-0042", "identityConfidence", r2(it - 0.01), { alert: null, review: true }));
  if (at >= 0.01) groups.push(boundary(`boundary: aid confidence just below the threshold (${r2(at - 0.01)}) goes to review`, "P-0043", "aidConfidence", r2(at - 0.01), { alert: null, review: true }));

  let mismatches = 0;
  const m = { tp: 0, fn: 0, fp: 0, tn: 0 };
  let maxWarningsPerEpisode = 0;
  console.log(`Replaying ${groups.length} scripted scenarios against ${BASE} (identity threshold ${it}, aid threshold ${at}, cooldown ${settings.cooldownMinutes} min)\n`);

  for (const g of groups) {
    const problems = [];
    let warnings = 0;
    for (const step of g.steps) {
      if (step.reset) { // a compliant sighting ends any earlier episode for this patient
        const r = await send(make({ patient: step.patient, aid: PRESCRIBED[step.patient] }));
        if (r.status !== 201 || r.alert !== "info") problems.push(`reset for ${step.patient} answered HTTP ${r.status} alert ${r.alert}`);
        continue;
      }
      for (let i = 0; i < (step.repeat ?? 1); i++) {
        const r = await send(make(step));
        const wantAlert = step.expect.alert, wantReview = step.expect.review ?? false;
        if (r.status !== 201 || r.alert !== wantAlert || r.review !== wantReview) {
          problems.push(`${step.patient ?? "unknown person"} / ${step.aid}: got HTTP ${r.status}, alert ${r.alert}, review ${r.review}; expected alert ${wantAlert}, review ${wantReview}`);
        }
        if (r.alert === "warning") warnings++;
        // Confusion matrix for Warnings: positive = a warning should be raised.
        if (wantAlert === "warning") { if (r.alert === "warning") m.tp++; else m.fn++; }
        else if (r.alert === "warning") m.fp++; else m.tn++;
      }
    }
    if (g.episode) maxWarningsPerEpisode = Math.max(maxWarningsPerEpisode, warnings);
    if (problems.length) mismatches++;
    console.log(`${problems.length ? "FAIL" : "PASS"}  ${g.name}`);
    for (const p of problems) console.log(`        ${p}`);
  }

  const pct = (a, b) => (b === 0 ? "n/a" : `${((a / b) * 100).toFixed(1)}%`);
  console.log("\nWarning alerts (positive = a warning should be raised)");
  console.log(`  true positives ${m.tp}   false negatives ${m.fn}   false positives ${m.fp}   true negatives ${m.tn}`);
  console.log(`  false-negative rate ${pct(m.fn, m.fn + m.tp)}   false-positive rate ${pct(m.fp, m.fp + m.tn)}   accuracy ${pct(m.tp + m.tn, m.tp + m.tn + m.fp + m.fn)}`);
  console.log(`  most warnings in one continuous episode: ${maxWarningsPerEpisode} (target: at most 1)`);
  const failed = mismatches > 0 || m.fn > 0 || m.fp > 0 || maxWarningsPerEpisode > 1;
  console.log(failed ? `\n${mismatches} scenario(s) did not match` : "\nAll scenarios matched");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(`Could not replay against ${BASE}: ${e.cause?.code ?? e.message}`); process.exit(2); });
