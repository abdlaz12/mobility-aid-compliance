import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateDetection, type ComplianceInput } from "./compliance";
import { validateDetectionEvent } from "./detection-validator";
import { checkBearerKey } from "./api-key";

const T = { identity: 0.6, aid: 0.6 };
const base: ComplianceInput = {
  eventType: "detection", identified: true, patientKnown: true,
  identityConfidence: 0.9, aidLabel: "walker", aidConfidence: 0.95,
  aidKnown: true, prescribedAid: "walker",
};

test("matching aid -> info", () => {
  assert.equal(evaluateDetection(base, T).alertLevel, "info");
});
test("different aid -> warning", () => {
  assert.equal(evaluateDetection({ ...base, aidLabel: "none" }, T).alertLevel, "warning");
});
test("unknown person -> no alert, no review", () => {
  const d = evaluateDetection({ ...base, identified: false, patientKnown: false }, T);
  assert.deepEqual([d.alertLevel, d.needsReview], [null, false]);
});
test("low confidence -> review, no alert", () => {
  const d = evaluateDetection({ ...base, aidConfidence: 0.3, aidLabel: "none" }, T);
  assert.deepEqual([d.alertLevel, d.needsReview], [null, true]);
});
test("patient code not in db -> review", () => {
  assert.equal(evaluateDetection({ ...base, patientKnown: false }, T).needsReview, true);
});
test("fall indication -> emergency", () => {
  assert.equal(evaluateDetection({ ...base, eventType: "fall_indication" }, T).alertLevel, "emergency");
});
test("no prescription -> review", () => {
  assert.equal(evaluateDetection({ ...base, prescribedAid: null }, T).needsReview, true);
});

const ok = {
  event_id: "9b1f2c34-5d6e-4f70-8a91-b2c3d4e5f607", timestamp: "2026-11-03T14:22:05Z",
  room_id: "R-204", person_track_id: "t-17",
  identity: { patient_id: "P-0042", confidence: 0.91 }, aid: { label: "none", confidence: 0.97 },
  event_type: "detection",
};
test("validator accepts the contract example", () => {
  assert.equal(validateDetectionEvent(ok).ok, true);
});
test("validator rejects out-of-range, missing and extra fields", () => {
  assert.equal(validateDetectionEvent({ ...ok, aid: { label: "none", confidence: 1.5 } }).ok, false);
  assert.equal(validateDetectionEvent({ ...ok, event_id: "nope" }).ok, false);
  assert.equal(validateDetectionEvent({ ...ok, extra: 1 }).ok, false);
  const { room_id: _r, ...noRoom } = ok;
  assert.equal(validateDetectionEvent(noRoom).ok, false);
  assert.equal(validateDetectionEvent(null).ok, false);
});
test("api key check", () => {
  assert.equal(checkBearerKey("Bearer s3cret", "s3cret"), "ok");
  assert.equal(checkBearerKey("Bearer wrong", "s3cret"), "unauthorized");
  assert.equal(checkBearerKey(null, "s3cret"), "unauthorized");
  assert.equal(checkBearerKey("Bearer s3cret", ""), "missing_config");
});

import { readFileSync } from "node:fs";
test("web copy of the contract equals contracts/ at the repo root", () => {
  const a = readFileSync(new URL("../../../contracts/detection-event.schema.json", import.meta.url), "utf8");
  const b = readFileSync(new URL("../contracts/detection-event.schema.json", import.meta.url), "utf8");
  assert.equal(b, a, "run `npm run sync-contract`");
});
