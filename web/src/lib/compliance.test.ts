import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateDetection, type ComplianceInput } from "./compliance";
import { validateDetectionEvent } from "./detection-validator";
import { checkBearerKey } from "./api-key";

const T = { identity: 0.6, aid: 0.6 };
const base: ComplianceInput = {
  eventType: "detection", identified: true, patientKnown: true, patientActive: true,
  identityConfidence: 0.9, aidLabel: "walker", aidConfidence: 0.95,
  aidKnown: true, prescribedAid: "walker", inCooldown: false,
};

test("matching aid -> info", () => {
  assert.equal(evaluateDetection(base, T).alertLevel, "info");
});
test("different aid -> warning", () => {
  assert.equal(evaluateDetection({ ...base, aidLabel: "none" }, T).alertLevel, "warning");
});
test("repeat within the cooldown -> no new warning; matching aid and emergencies are not suppressed", () => {
  const d = evaluateDetection({ ...base, aidLabel: "none", inCooldown: true }, T);
  assert.deepEqual([d.alertLevel, d.needsReview], [null, false]);
  assert.equal(evaluateDetection({ ...base, inCooldown: true }, T).alertLevel, "info");
  assert.equal(evaluateDetection({ ...base, eventType: "fall_indication", inCooldown: true }, T).alertLevel, "emergency");
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


import { parseConsent, parseContacts, parseNewPatient, parsePatientUpdate, parseReidSample, makeInitials } from "./patient-input";
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


import { AttemptLimiter } from "./attempt-limiter";
test("attempt limiter: locks after max failures, unlocks when they age out, reset clears, keys are independent", () => {
  let t = 0;
  const lim = new AttemptLimiter(3, 1000, () => t);
  for (let i = 0; i < 2; i++) lim.fail("a");
  assert.equal(lim.isLocked("a"), false);
  lim.fail("a");
  assert.equal(lim.isLocked("a"), true);
  assert.equal(lim.isLocked("b"), false);
  assert.equal(lim.retryAfterMs("a"), 1000);
  t = 600; assert.equal(lim.retryAfterMs("a"), 400);
  t = 1001; assert.equal(lim.isLocked("a"), false, "failures age out of the window");
  t = 2000; for (let i = 0; i < 3; i++) lim.fail("a");
  assert.equal(lim.isLocked("a"), true);
  lim.reset("a");
  assert.equal(lim.isLocked("a"), false);
});
test("attempt limiter: failures spread over time never lock", () => {
  let t = 0;
  const lim = new AttemptLimiter(3, 1000, () => t);
  for (let i = 0; i < 20; i++) { lim.fail("a"); t += 600; assert.equal(lim.isLocked("a"), false); }
});


import { parseEmail, parseNewUser, parsePassword, parsePasswordChange, parsePushoverKey, parseUserUpdate } from "./user-input";
test("user input: valid new user, email lowercased", () => {
  const r = parseNewUser({ name: " Ann Nurse ", email: " Ann@Example.TEST ", role: "nurse", password: "correct horse" });
  assert.deepEqual(r, { ok: true, value: { name: "Ann Nurse", email: "ann@example.test", role: "nurse", password: "correct horse" } });
});
test("user input: rejects bad email, short or long password, password equal to email, bad role, empty name", () => {
  const good = { name: "Ann", email: "ann@example.test", role: "nurse", password: "correct horse" };
  for (const bad of [{ email: "nope" }, { email: "a b@x.org" }, { email: "x@y" }, { password: "short" }, { password: "x".repeat(201) },
    { password: "ann@example.test" }, { role: "superuser" }, { role: "" }, { name: "" }]) {
    assert.equal(parseNewUser({ ...good, ...bad }).ok, false, JSON.stringify(bad));
  }
  assert.equal(parseEmail("x".repeat(250) + "@a.org").ok, false);
  assert.equal(parsePassword("a".repeat(10)).ok, true);
});
test("user input: update accepts name and isActive (boolean or form string), nothing else", () => {
  assert.deepEqual(parseUserUpdate({ isActive: "false" }), { ok: true, value: { isActive: false } });
  assert.deepEqual(parseUserUpdate({ isActive: true, name: "B" }), { ok: true, value: { isActive: true, name: "B" } });
  assert.equal(parseUserUpdate({ isActive: "maybe" }).ok, false);
  assert.equal(parseUserUpdate({ role: "admin" }).ok, false, "the role cannot be changed");
  assert.equal(parseUserUpdate({}).ok, false);
});
test("user input: password change needs the current one and a different new one", () => {
  assert.equal(parsePasswordChange({ currentPassword: "old password!", newPassword: "new password!" }, "a@b.org").ok, true);
  assert.equal(parsePasswordChange({ currentPassword: "", newPassword: "new password!" }, "a@b.org").ok, false);
  assert.equal(parsePasswordChange({ currentPassword: "same password", newPassword: "same password" }, "a@b.org").ok, false);
  assert.equal(parsePasswordChange({ currentPassword: "x", newPassword: "short" }, "a@b.org").ok, false);
});
test("user input: pushover key is 30 letters and digits, empty clears", () => {
  assert.deepEqual(parsePushoverKey({ key: "" }), { ok: true, value: { key: null } });
  assert.equal(parsePushoverKey({ key: "a".repeat(30) }).ok, true);
  for (const bad of ["a".repeat(29), "a".repeat(31), "a".repeat(29) + "!", "<script>"]) assert.equal(parsePushoverKey({ key: bad }).ok, false);
});


import { readTextLimited } from "./http";
test("validator: length limits and future timestamps", () => {
  const e = (o: object) => validateDetectionEvent({ ...ok, ...o });
  assert.equal(e({ room_id: "R".repeat(33) }).ok, false);
  assert.equal(e({ room_id: "R".repeat(32) }).ok, true);
  assert.equal(e({ room_id: "" }).ok, false);
  assert.equal(e({ person_track_id: "t".repeat(65) }).ok, false);
  assert.equal(e({ identity: { patient_id: "P".repeat(33), confidence: 0.9 } }).ok, false);
  assert.equal(e({ aid: { label: "x".repeat(33), confidence: 0.9 } }).ok, false);
  assert.equal(e({ aid: { label: "", confidence: 0.9 } }).ok, false);
  assert.equal(e({ model_version: "v".repeat(65) }).ok, false);
  const now = Date.parse("2026-11-03T14:22:05Z");
  assert.equal(validateDetectionEvent(ok, now).ok, true, "a recorded replay in the past is fine");
  assert.equal(validateDetectionEvent({ ...ok, timestamp: "2026-11-03T14:31:00Z" }, now).ok, true, "9 minutes ahead is tolerated (clock drift)");
  assert.equal(validateDetectionEvent({ ...ok, timestamp: "2026-11-03T14:33:00Z" }, now).ok, false, "11 minutes ahead is refused");
  assert.equal(validateDetectionEvent({ ...ok, timestamp: "2099-01-01T00:00:00Z" }, now).ok, false);
});
test("readTextLimited: reads small bodies, refuses large ones, with and without Content-Length", async () => {
  const req = (body: string, headers: Record<string, string> = {}) => new Request("http://x/", { method: "POST", body, headers });
  assert.equal(await readTextLimited(req("hello"), 10), "hello");
  assert.equal(await readTextLimited(req("x".repeat(11)), 10), null, "over the limit");
  assert.equal(await readTextLimited(req("x".repeat(10)), 10), "x".repeat(10), "exactly at the limit");
  assert.equal(await readTextLimited(req("tiny", { "content-length": "999999" }), 10), null, "declared size is checked first");
  const streamed = new Request("http://x/", { method: "POST", body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("x".repeat(6))); c.enqueue(new TextEncoder().encode("x".repeat(6))); c.close(); } }), duplex: "half" } as RequestInit);
  assert.equal(await readTextLimited(streamed, 10), null, "a streamed body without Content-Length is cut off too");
  assert.equal(await readTextLimited(new Request("http://x/"), 10), "", "no body");
});


import { DEFAULTS, parseSettingsUpdate, resolveSettings } from "./settings";
const row = (key: string, value: unknown) => ({ key, value: JSON.stringify(value) });
test("settings: defaults follow proposal v3 (cooldown 10, identity threshold 0.80)", () => {
  const s = resolveSettings([], {});
  assert.deepEqual([s.cooldownMinutes, s.identityConfidenceThreshold, s.aidConfidenceThreshold, s.ackTimeoutMinutes], [10, 0.8, 0.6, 10]);
  assert.deepEqual(s.routing, DEFAULTS.routing);
});
test("settings: database beats environment, environment beats default", () => {
  const env = { COOLDOWN_MINUTES: "3", ACK_TIMEOUT_MINUTES: "0.05" };
  assert.equal(resolveSettings([], env).cooldownMinutes, 3);
  assert.equal(resolveSettings([row("cooldownMinutes", 7)], env).cooldownMinutes, 7);
  assert.equal(resolveSettings([], env).ackTimeoutMinutes, 0.05, "the environment may use a short timeout for demos");
  assert.equal(resolveSettings([row("cooldownMinutes", 0)], env).cooldownMinutes, 0, "0 is a real value, not 'unset'");
});
test("settings: junk in the environment or the database never wins", () => {
  assert.equal(resolveSettings([], { COOLDOWN_MINUTES: "abc" }).cooldownMinutes, 10);
  assert.equal(resolveSettings([], { COOLDOWN_MINUTES: "-4" }).cooldownMinutes, 10);
  assert.equal(resolveSettings([{ key: "cooldownMinutes", value: "not json" }], {}).cooldownMinutes, 10);
  assert.equal(resolveSettings([row("cooldownMinutes", "7")], {}).cooldownMinutes, 10, "a string is not a number");
  assert.equal(resolveSettings([row("identityConfidenceThreshold", 5)], {}).identityConfidenceThreshold, 0.8, "out of range");
  assert.deepEqual(resolveSettings([row("routing", { warning: [], escalated: ["nurse"], emergency: ["nurse"] })], {}).routing, DEFAULTS.routing, "an empty route is never accepted");
  assert.deepEqual(resolveSettings([{ key: "routing", value: "{" }], {}).routing, DEFAULTS.routing);
});
test("settings update: accepts values in range, rejects the rest", () => {
  assert.deepEqual(parseSettingsUpdate({ cooldownMinutes: 5, identityConfidenceThreshold: 0.9 }), { ok: true, value: { cooldownMinutes: 5, identityConfidenceThreshold: 0.9 } });
  for (const bad of [{ cooldownMinutes: -1 }, { cooldownMinutes: 1441 }, { cooldownMinutes: "5" }, { cooldownMinutes: null }, { cooldownMinutes: Infinity },
    { identityConfidenceThreshold: 1.1 }, { aidConfidenceThreshold: -0.1 }, { ackTimeoutMinutes: 0 }, { ackTimeoutMinutes: 0.5 }, { nope: 1 }, {}]) {
    assert.equal(parseSettingsUpdate(bad as Record<string, unknown>).ok, false, JSON.stringify(bad));
  }
  assert.equal(parseSettingsUpdate({ cooldownMinutes: 0 }).ok, true);
});
test("settings update: routing needs all three levels, each with at least one valid recipient", () => {
  const good = { warning: ["nurse"], escalated: ["nurse", "family"], emergency: ["family", "nurse"] };
  assert.equal(parseSettingsUpdate({ routing: good }).ok, true);
  for (const bad of [{ ...good, emergency: [] }, { ...good, warning: ["admin"] }, { ...good, warning: ["nurse", "nurse"] }, { warning: ["nurse"], escalated: ["nurse"] },
    { ...good, info: ["nurse"] }, { ...good, warning: "nurse" }, "nurse", null, []]) {
    assert.equal(parseSettingsUpdate({ routing: bad }).ok, false, JSON.stringify(bad));
  }
});


test("consent: patient or substitute at registration; withdrawn only when changing a patient", () => {
  const base = { code: "P-0050", name: "Jane", aid: "cane" };
  assert.deepEqual(parseNewPatient({ ...base, consent: "substitute" }).ok && (parseNewPatient({ ...base, consent: "substitute" }) as { value: { consent?: string } }).value.consent, "substitute");
  assert.equal((parseNewPatient(base) as { value: { consent?: string } }).value.consent, undefined, "consent is optional at registration");
  assert.equal(parseNewPatient({ ...base, consent: "withdrawn" }).ok, false, "cannot register as withdrawn");
  assert.equal(parseNewPatient({ ...base, consent: "yes" }).ok, false);
  assert.deepEqual(parsePatientUpdate({ consent: "withdrawn" }), { ok: true, value: { consent: "withdrawn" } });
  assert.deepEqual(parsePatientUpdate({ consent: "patient" }), { ok: true, value: { consent: "patient" } });
  assert.equal(parsePatientUpdate({ consent: "maybe" }).ok, false);
  assert.equal(parseConsent("patient", false).ok, true);
});
test("ReID sample: a plain reference, an aid state and an assisted flag", () => {
  assert.deepEqual(parseReidSample({ embeddingRef: "reid/P-0042/sample-1.npy", aid: "walker", isAssisted: true }), { ok: true, value: { embeddingRef: "reid/P-0042/sample-1.npy", aid: "walker", isAssisted: true } });
  assert.deepEqual(parseReidSample({ embeddingRef: "s1", aid: "none" }), { ok: true, value: { embeddingRef: "s1", aid: "none", isAssisted: false } }, "assisted defaults to false");
  assert.equal((parseReidSample({ embeddingRef: "s1", aid: "none", isAssisted: "true" }) as { value: { isAssisted: boolean } }).value.isAssisted, true, "form strings work");
  for (const bad of [{ embeddingRef: "" }, { embeddingRef: "../secret" }, { embeddingRef: "a/../../b" }, { embeddingRef: "-leading" }, { embeddingRef: "has space" },
    { embeddingRef: "x".repeat(201) }, { embeddingRef: "<script>" }, { embeddingRef: "ok", aid: "" }, { embeddingRef: "ok", aid: "none", isAssisted: "maybe" }]) {
    assert.equal(parseReidSample({ aid: "none", ...bad }).ok, false, JSON.stringify(bad));
  }
});
