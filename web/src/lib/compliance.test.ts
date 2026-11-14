import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateDetection, type ComplianceInput } from "./compliance";
import { validateDetectionEvent } from "./detection-validator";
import { checkBearerKey } from "./api-key";

const T = { identity: 0.6, aid: 0.6 };
const base: ComplianceInput = {
  eventType: "detection", identified: true, patientKnown: true, patientActive: true,
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
test("discharged patient -> no alert, no review", () => {
  for (const eventType of ["detection", "fall_indication"] as const) {
    const d = evaluateDetection({ ...base, patientActive: false, aidLabel: "none", eventType }, T);
    assert.deepEqual([d.alertLevel, d.needsReview], [null, false]);
  }
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
  const noRoom: Record<string, unknown> = { ...ok };
  delete noRoom.room_id;
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

import { hashPassword, verifyPassword } from "./password";
test("password hashing: right password verifies, wrong one and bad formats do not", async () => {
  const h = await hashPassword("correct horse");
  assert.equal(await verifyPassword("correct horse", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.notEqual(h, await hashPassword("correct horse"), "salted: same password, different hash");
  for (const bad of [null, undefined, "", "plain", "scrypt:only-two", "bcrypt:a:b"]) assert.equal(await verifyPassword("x", bad), false);
});


import { parseContacts, parseNewPatient, parsePatientUpdate, makeInitials } from "./patient-input";
test("patient input: valid new patient, derived initials", () => {
  const r = parseNewPatient({ code: "P-0044", name: " Jane Q Doe ", age: "81", room: "R-206", aid: "cane" });
  assert.deepEqual(r, { ok: true, value: { code: "P-0044", name: "Jane Q Doe", initials: "J.Q.D.", age: 81, room: "R-206", aid: "cane" } });
  assert.equal(makeInitials("a b"), "A.B.");
  const empty = parseNewPatient({ code: "P-1", name: "X", age: "", room: "", aid: "none" });
  assert.equal(empty.ok, true);
  if (empty.ok) assert.deepEqual([empty.value.age, empty.value.room], [null, null]);
});
test("patient input: rejects bad code, name, age, room, missing aid", () => {
  const good = { code: "P-0044", name: "Jane", aid: "cane" };
  for (const bad of [{ code: "x" }, { code: "has space" }, { code: "<script>" }, { name: "" }, { name: "x".repeat(101) },
    { age: "200" }, { age: "-1" }, { age: "abc" }, { room: "R 204" }, { room: "../x" }, { aid: "" }]) {
    assert.equal(parseNewPatient({ ...good, ...bad }).ok, false, JSON.stringify(bad));
  }
});
test("patient input: update changes only given keys and validates status", () => {
  assert.deepEqual(parsePatientUpdate({ age: "70" }), { ok: true, value: { age: 70 } });
  assert.deepEqual(parsePatientUpdate({ status: "discharged" }), { ok: true, value: { status: "discharged" } });
  assert.deepEqual(parsePatientUpdate({ room: "" }), { ok: true, value: { room: null } });
  assert.equal(parsePatientUpdate({ status: "deleted" }).ok, false);
  assert.equal(parsePatientUpdate({}).ok, false);
});
test("patient input: contacts must be a list of whole numbers, duplicates removed", () => {
  assert.deepEqual(parseContacts({ userIds: ["2", 3, "2"] }), { ok: true, value: { userIds: [2, 3] } });
  assert.deepEqual(parseContacts({ userIds: [] }), { ok: true, value: { userIds: [] } });
  for (const bad of [{ userIds: "2" }, { userIds: ["a"] }, { userIds: [1.5] }, { userIds: ["1; DROP"] }, {}]) assert.equal(parseContacts(bad).ok, false);
});
