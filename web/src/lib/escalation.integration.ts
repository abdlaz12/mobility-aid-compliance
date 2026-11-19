// Integration test for escalation and the notification queue, against a TEMPORARY COPY of the dev database
// (your real data is untouched). Needs `npx prisma migrate dev` and `npx prisma db seed` to have run once.
//   npm run test:integration
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import type { Channel, Delivery } from "./notify/channels";
import type { Message } from "./notify/message";

type Mods = {
  reid: typeof import("./reid");
  prisma: typeof import("./prisma").prisma;
  processDetection: typeof import("./detection-intake").processDetection;
  escalateOverdueAlerts: typeof import("./escalation").escalateOverdueAlerts;
  deliverQueued: typeof import("./notify/queue").deliverQueued;
};
let m: Mods;
const PAST = () => new Date(Date.now() - 60_000);

const ev = (patient: string, aid: string, type: "detection" | "fall_indication" = "detection") => ({
  event_id: randomUUID(), timestamp: new Date().toISOString(), room_id: "R-204", person_track_id: "t-1",
  identity: { patient_id: patient, confidence: 0.95 }, aid: { label: aid, confidence: 0.95 }, event_type: type,
});

/** A channel that records what it was asked to send. */
function recorder(result: Delivery = { ok: true }) {
  const sent: { to: number; msg: Message }[] = [];
  const channel: Channel = { name: "log", async send(to, msg) { sent.push({ to: to.id, msg }); return result; } };
  return { sent, channels: { log: channel } };
}

/** Creates a fresh warning for P-0042 (nurse and family are assigned in the seed) and returns its alert id. */
async function newWarning() {
  const r = await m.processDetection(ev("P-0042", "none"));
  assert.equal(r.alertLevel, "warning");
  return (await m.prisma.alert.findFirstOrThrow({ where: { detectionId: r.detectionId } })).id;
}
const notes = (alertId: number) => m.prisma.notification.findMany({ where: { alertId }, include: { user: true }, orderBy: { id: "asc" } });
const emailsOf = (list: { user: { email: string } }[]) => list.map((n) => n.user.email).sort();

before(async () => {
  // Copy the database named by DATABASE_URL when it is an absolute file path (the test runner passes a freshly
  // migrated one); otherwise the development database.
  const fromEnv = process.env.DATABASE_URL?.startsWith("file:") ? process.env.DATABASE_URL.slice("file:".length) : "";
  const src = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), "prisma/dev.db");
  if (!existsSync(src)) throw new Error(`${src} not found. Run \`npx prisma migrate dev\` and \`npx prisma db seed\` first.`);
  const dir = mkdtempSync(path.join(os.tmpdir(), "mac-test-"));
  copyFileSync(src, path.join(dir, "test.db"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.COOLDOWN_MINUTES = "0"; // the tests below create several warnings for one patient; cooldown has its own tests
  const [{ prisma }, { processDetection }, { escalateOverdueAlerts }, { deliverQueued }, reid] = await Promise.all([
    import("./prisma"), import("./detection-intake"), import("./escalation"), import("./notify/queue"), import("./reid"),
  ]);
  m = { prisma, processDetection, escalateOverdueAlerts, deliverQueued, reid };
});

// Every test starts from a quiet database: no alerts, nothing queued, patients admitted.
beforeEach(async () => {
  await m.prisma.notification.deleteMany();
  await m.prisma.setting.deleteMany(); // every test starts from the defaults and the environment
  await m.prisma.alert.deleteMany(); // old alerts would count as part of an episode (cooldown)
  await m.prisma.patient.updateMany({ data: { status: "active" } });
});

test("a warning queues a notification for the assigned nurse only, with no full name in the message", async () => {
  const id = await newWarning();
  assert.deepEqual(emailsOf(await notes(id)), ["nurse@example.test"]);
  const rec = recorder();
  const report = await m.deliverQueued({ channels: rec.channels });
  assert.equal(report.sent, 1);
  assert.match(rec.sent[0].msg.title, /Warning: A\.A\. \(P-0042\)/);
  assert.ok(!JSON.stringify(rec.sent[0].msg).includes("Demo Patient"));
  assert.equal((await notes(id))[0].status, "sent");
});

test("an unacknowledged warning past its deadline escalates once and then notifies nurse and family", async () => {
  const id = await newWarning();
  await m.deliverQueued({ channels: recorder().channels }); // the first notification, already sent
  await m.prisma.alert.update({ where: { id }, data: { ackDeadline: PAST() } });
  assert.equal(await m.escalateOverdueAlerts(), 1);
  const alert = await m.prisma.alert.findUniqueOrThrow({ where: { id } });
  assert.deepEqual([alert.level, alert.status, alert.escalatedAt !== null], ["escalated", "pending", true]);
  const rec = recorder();
  await m.deliverQueued({ channels: rec.channels });
  assert.deepEqual(rec.sent.map((s) => s.msg.title.split(":")[0]), ["ESCALATED", "ESCALATED"]);
  assert.deepEqual(emailsOf(await notes(id)), ["family@example.test", "nurse@example.test", "nurse@example.test"]);
  assert.ok((await notes(id)).every((n) => n.status === "sent"));
  assert.equal(await m.escalateOverdueAlerts(), 0, "running again escalates nothing");
});

test("a warning that is not overdue is left alone", async () => {
  const id = await newWarning();
  assert.equal(await m.escalateOverdueAlerts(), 0);
  assert.equal((await m.prisma.alert.findUniqueOrThrow({ where: { id } })).level, "warning");
});

test("a warning acknowledged before the deadline never escalates, and its queued notification is skipped", async () => {
  const id = await newWarning();
  await m.prisma.alert.update({ where: { id }, data: { status: "acknowledged", ackDeadline: PAST() } });
  assert.equal(await m.escalateOverdueAlerts(), 0);
  const rec = recorder();
  const report = await m.deliverQueued({ channels: rec.channels });
  assert.deepEqual([report.skipped, rec.sent.length], [1, 0]);
  assert.equal((await notes(id))[0].status, "skipped");
});

test("an overdue warning of a discharged patient does not escalate", async () => {
  const id = await newWarning();
  await m.prisma.alert.update({ where: { id }, data: { ackDeadline: PAST() } });
  await m.prisma.patient.update({ where: { code: "P-0042" }, data: { status: "discharged" } });
  assert.equal(await m.escalateOverdueAlerts(), 0);
  await m.prisma.patient.update({ where: { code: "P-0042" }, data: { status: "active" } });
  await m.prisma.alert.update({ where: { id }, data: { status: "closed" } }); // leave nothing overdue behind
});

test("a fall indication queues nurse and family at once", async () => {
  const r = await m.processDetection(ev("P-0042", "none", "fall_indication"));
  assert.equal(r.alertLevel, "emergency");
  const alert = await m.prisma.alert.findFirstOrThrow({ where: { detectionId: r.detectionId } });
  assert.deepEqual(emailsOf(await notes(alert.id)), ["family@example.test", "nurse@example.test"]);
  await m.prisma.alert.update({ where: { id: alert.id }, data: { status: "closed" } });
});

test("a failed delivery is retried with backoff, and gives up after the last attempt", async () => {
  const id = await newWarning();
  const t0 = new Date();
  const fail = recorder({ ok: false, retry: true, error: "down" });
  assert.equal((await m.deliverQueued({ now: t0, channels: fail.channels })).retrying, 1);
  assert.equal((await m.deliverQueued({ now: new Date(t0.getTime() + 5_000), channels: fail.channels })).waiting, 1, "too early to retry");
  assert.equal(fail.sent.length, 1);
  assert.equal((await m.deliverQueued({ now: new Date(t0.getTime() + 31_000), channels: fail.channels })).retrying, 1);
  const n = (await notes(id))[0];
  assert.deepEqual([n.status, n.attempts], ["queued", 2]);
  // later attempts, each after the backoff, until the cap
  let t = t0.getTime() + 31_000;
  for (let i = 0; i < 3; i++) { t += 20 * 60_000; await m.deliverQueued({ now: new Date(t), channels: fail.channels }); }
  const last = (await notes(id))[0];
  assert.deepEqual([last.status, last.attempts], ["failed", 5]);
  await m.prisma.alert.update({ where: { id }, data: { status: "closed" } });
});

test("a permanent failure is not retried, and a later success still delivers", async () => {
  const id = await newWarning();
  const report = await m.deliverQueued({ channels: recorder({ ok: false, retry: false, error: "bad key" }).channels });
  assert.deepEqual([report.failed, report.retrying], [1, 0]);
  assert.equal((await notes(id))[0].status, "failed");
  await m.prisma.alert.update({ where: { id }, data: { status: "closed" } });
});

test("two escalation runs at the same moment escalate an alert exactly once", async () => {
  const id = await newWarning();
  await m.prisma.alert.update({ where: { id }, data: { ackDeadline: PAST() } });
  const [a, b] = await Promise.all([m.escalateOverdueAlerts(), m.escalateOverdueAlerts()]);
  assert.equal(a + b, 1);
  assert.equal((await notes(id)).length, 3, "1 from the warning (nurse) + 2 from the escalation (nurse, family)");
  await m.prisma.alert.update({ where: { id }, data: { status: "closed" } });
});

test("two deliveries at the same moment send each notification once", async () => {
  const id = await newWarning();
  const rec = recorder();
  await Promise.all([m.deliverQueued({ channels: rec.channels }), m.deliverQueued({ channels: rec.channels })]);
  assert.equal(rec.sent.length, 1);
  assert.equal((await notes(id))[0].attempts, 1);
  await m.prisma.alert.update({ where: { id }, data: { status: "closed" } });
});


// ---- Cooldown (FR3.3) ---------------------------------------------------------------------------------
async function withCooldown<T>(minutes: string, fn: () => Promise<T>): Promise<T> {
  const before = process.env.COOLDOWN_MINUTES;
  process.env.COOLDOWN_MINUTES = minutes;
  try { return await fn(); } finally { process.env.COOLDOWN_MINUTES = before; }
}
const level = async (patient: string, aid: string, type: "detection" | "fall_indication" = "detection") =>
  (await m.processDetection(ev(patient, aid, type))).alertLevel;

test("cooldown: the second warning of the same episode is suppressed, the detection is still stored", () => withCooldown("5", async () => {
  const before = await m.prisma.detection.count();
  assert.equal(await level("P-0042", "none"), "warning");
  assert.equal(await level("P-0042", "none"), null);
  assert.equal(await level("P-0042", "none"), null);
  assert.equal(await m.prisma.detection.count(), before + 3);
  assert.equal(await m.prisma.alert.count({ where: { level: "warning", status: "pending" } }), 1);
}));

test("cooldown: being seen compliant ends the episode, so the next non-compliance warns again", () => withCooldown("5", async () => {
  assert.equal(await level("P-0042", "none"), "warning");
  assert.equal(await level("P-0042", "walker"), "info");
  assert.equal(await level("P-0042", "none"), "warning");
}));

test("cooldown: after it runs out a new warning is raised, and it is per patient", () => withCooldown("5", async () => {
  assert.equal(await level("P-0042", "none"), "warning");
  assert.equal(await level("P-0043", "none"), "warning", "another patient is not affected");
  await m.prisma.alert.updateMany({ data: { createdAt: new Date(Date.now() - 6 * 60_000) } });
  assert.equal(await level("P-0042", "none"), "warning");
}));

test("cooldown: an escalated alert still counts as the same episode", () => withCooldown("5", async () => {
  assert.equal(await level("P-0042", "none"), "warning");
  await m.prisma.alert.updateMany({ where: { level: "warning" }, data: { ackDeadline: PAST() } });
  assert.equal(await m.escalateOverdueAlerts(), 1);
  assert.equal(await level("P-0042", "none"), null);
}));

test("cooldown: emergencies are never suppressed, and 0 turns the cooldown off", async () => {
  await withCooldown("5", async () => {
    assert.equal(await level("P-0042", "none"), "warning");
    assert.equal(await level("P-0042", "none", "fall_indication"), "emergency");
    assert.equal(await level("P-0042", "none", "fall_indication"), "emergency");
  });
  await withCooldown("0", async () => {
    assert.equal(await level("P-0043", "none"), "warning");
    assert.equal(await level("P-0043", "none"), "warning");
  });
});


// ---- Settings stored in the database (NFR5.2) ----------------------------------------------------------
const setSetting = (key: string, value: unknown) =>
  m.prisma.setting.upsert({ where: { key }, update: { value: JSON.stringify(value) }, create: { key, value: JSON.stringify(value) } });

test("settings: a raised identity threshold sends a detection to review, and deleting it restores the default", async () => {
  await setSetting("identityConfidenceThreshold", 0.99);
  const strict = await m.processDetection(ev("P-0042", "none")); // identity confidence 0.95 < 0.99
  assert.deepEqual([strict.alertLevel, strict.needsReview], [null, true]);
  await m.prisma.setting.deleteMany();
  assert.equal((await m.processDetection(ev("P-0042", "none"))).alertLevel, "warning");
});

test("settings: the database cooldown beats the environment", () => withCooldown("0", async () => {
  await setSetting("cooldownMinutes", 5);
  assert.equal(await level("P-0042", "none"), "warning");
  assert.equal(await level("P-0042", "none"), null, "suppressed although the environment says 0");
}));

test("settings: the acknowledgement timeout sets the deadline of new warnings", async () => {
  await setSetting("ackTimeoutMinutes", 3);
  const r = await m.processDetection(ev("P-0042", "none"));
  const alert = await m.prisma.alert.findFirstOrThrow({ where: { detectionId: r.detectionId } });
  const minutes = (alert.ackDeadline!.getTime() - alert.createdAt.getTime()) / 60_000;
  assert.ok(minutes > 2.9 && minutes < 3.1, `deadline was ${minutes} minutes after creation`);
});

test("settings: routing decides who is told, here the family already on a Warning", async () => {
  await setSetting("routing", { warning: ["nurse", "family"], escalated: ["nurse", "family"], emergency: ["nurse", "family"] });
  const r = await m.processDetection(ev("P-0042", "none"));
  const alert = await m.prisma.alert.findFirstOrThrow({ where: { detectionId: r.detectionId } });
  assert.deepEqual(emailsOf(await notes(alert.id)), ["family@example.test", "nurse@example.test"]);
});

test("settings: a routing that reaches only the family never reaches the nurse", async () => {
  await setSetting("routing", { warning: ["family"], escalated: ["family"], emergency: ["family"] });
  const r = await m.processDetection(ev("P-0042", "none"));
  const alert = await m.prisma.alert.findFirstOrThrow({ where: { detectionId: r.detectionId } });
  assert.deepEqual(emailsOf(await notes(alert.id)), ["family@example.test"]);
});

test("settings: a corrupt stored value is ignored and the default applies", async () => {
  await m.prisma.setting.create({ data: { key: "routing", value: "{not json" } });
  await m.prisma.setting.create({ data: { key: "cooldownMinutes", value: "\"soon\"" } });
  const r = await m.processDetection(ev("P-0042", "none"));
  const alert = await m.prisma.alert.findFirstOrThrow({ where: { detectionId: r.detectionId } });
  assert.deepEqual(emailsOf(await notes(alert.id)), ["nurse@example.test"], "default routing: nurse only on a warning");
});


// ---- Closing acknowledged alerts when the patient is seen with the aid again ---------------------------
const alertOf = async (detectionId: number) => m.prisma.alert.findFirstOrThrow({ where: { detectionId } });
const warningFor = async (patient: string, status?: string) => {
  const r = await m.processDetection(ev(patient, "none"));
  const a = await alertOf(r.detectionId);
  if (status) await m.prisma.alert.update({ where: { id: a.id }, data: { status } });
  return a.id;
};
const get = (id: number) => m.prisma.alert.findUniqueOrThrow({ where: { id } });

test("closing: an acknowledged warning closes, with the time, when the patient is seen with the walker", async () => {
  const id = await warningFor("P-0042", "acknowledged");
  assert.equal((await m.processDetection(ev("P-0042", "walker"))).alertLevel, "info");
  const a = await get(id);
  assert.deepEqual([a.status, a.closedAt !== null], ["closed", true]);
});

test("closing: an acknowledged escalated alert closes too", async () => {
  const id = await warningFor("P-0042");
  await m.prisma.alert.update({ where: { id }, data: { level: "escalated", status: "acknowledged" } });
  await m.processDetection(ev("P-0042", "walker"));
  assert.equal((await get(id)).status, "closed");
});

test("closing: an alert nobody acknowledged stays pending (acknowledgement is mandatory)", async () => {
  const id = await warningFor("P-0042");
  await m.processDetection(ev("P-0042", "walker"));
  const a = await get(id);
  assert.deepEqual([a.status, a.closedAt], ["pending", null]);
});

test("closing: an emergency is not closed by a compliant sighting", async () => {
  const r = await m.processDetection(ev("P-0042", "none", "fall_indication"));
  const a = await alertOf(r.detectionId);
  await m.prisma.alert.update({ where: { id: a.id }, data: { status: "acknowledged" } });
  await m.processDetection(ev("P-0042", "walker"));
  assert.equal((await get(a.id)).status, "acknowledged");
});

test("closing: only that patient's alerts close", async () => {
  const mine = await warningFor("P-0042", "acknowledged");
  const other = await warningFor("P-0043", "acknowledged");
  await m.processDetection(ev("P-0042", "walker"));
  assert.deepEqual([(await get(mine)).status, (await get(other)).status], ["closed", "acknowledged"]);
});

test("closing: a wrong aid or a low-confidence sighting does not close anything", async () => {
  const id = await warningFor("P-0042", "acknowledged");
  await m.processDetection(ev("P-0042", "cane")); // compliant would be walker
  const weak = { ...ev("P-0042", "walker"), aid: { label: "walker", confidence: 0.2 } };
  assert.equal((await m.processDetection(weak)).needsReview, true);
  assert.equal((await get(id)).status, "acknowledged");
});

test("closing: after it closed, the next non-compliance is a new episode with a new warning", () => withCooldown("10", async () => {
  assert.equal(await level("P-0042", "none"), "warning");
  await m.prisma.alert.updateMany({ data: { status: "acknowledged" } });
  assert.equal(await level("P-0042", "walker"), "info");
  assert.equal(await level("P-0042", "none"), "warning");
}));


// ---- ReID enrolment and consent (FR1.3, FR1.4, proposal section 7) ---------------------------------------
let serial = 0;
async function newPatient(over: { status?: string; consent?: string | null } = {}) {
  const code = `R-${Date.now().toString(36)}-${++serial}`;
  return m.prisma.patient.create({
    data: { code, name: "Test", initials: "T.", status: over.status ?? "active", consentBy: over.consent === undefined ? null : over.consent, consentAt: over.consent ? new Date() : null },
  });
}
const sample = (n = 1, aid = "walker", isAssisted = false) => ({ embeddingRef: `ref/${n}`, aid, isAssisted });

test("reid: enrolment needs consent on file", async () => {
  const p = await newPatient();
  const refused = await m.reid.enrolSample(p.id, sample());
  assert.deepEqual([refused.ok, !refused.ok && refused.status], [false, 409]);
  assert.deepEqual(await m.reid.recordConsent(p.id, "substitute"), { ok: true });
  assert.equal((await m.reid.enrolSample(p.id, sample())).ok, true);
  assert.equal((await m.prisma.patient.findUniqueOrThrow({ where: { id: p.id } })).consentBy, "substitute");
});

test("reid: a discharged patient can neither consent nor be enrolled", async () => {
  const p = await newPatient({ status: "discharged", consent: "patient" });
  const e = await m.reid.enrolSample(p.id, sample());
  const c = await m.reid.recordConsent(p.id, "patient");
  assert.deepEqual([e.ok, !e.ok && e.status, c.ok, !c.ok && c.status], [false, 409, false, 409]);
});

test("reid: unknown patient is 404, unknown aid is 400, the assisted flag and aid state are kept", async () => {
  const p = await newPatient({ consent: "patient" });
  const none = await m.reid.enrolSample(99999999, sample());
  const bad = await m.reid.enrolSample(p.id, sample(1, "jetpack"));
  assert.deepEqual([!none.ok && none.status, !bad.ok && bad.status], [404, 400]);
  await m.reid.enrolSample(p.id, sample(1, "none", true));
  await m.reid.enrolSample(p.id, sample(2, "walker", false));
  const list = await m.reid.listSamples(p.id);
  assert.deepEqual(list.map((x) => [x.embeddingRef, x.aid, x.isAssisted]), [["ref/1", "none", true], ["ref/2", "walker", false]]);
  const summary = await m.reid.gallerySummary(p.id);
  assert.deepEqual([summary.sampleCount, summary.lastAddedAt !== null], [2, true]);
});

test("reid: delete one sample (only the patient's own) or all of them", async () => {
  const a = await newPatient({ consent: "patient" }), b = await newPatient({ consent: "patient" });
  const s1 = await m.reid.enrolSample(a.id, sample(1)), s2 = await m.reid.enrolSample(a.id, sample(2));
  const sb = await m.reid.enrolSample(b.id, sample(3));
  assert.ok(s1.ok && s2.ok && sb.ok);
  const wrong = await m.reid.deleteSamples(a.id, (sb as { id: number }).id);
  assert.deepEqual([wrong.ok, !wrong.ok && wrong.status], [false, 404], "another patient's sample cannot be deleted through this patient");
  assert.deepEqual(await m.reid.deleteSamples(a.id, (s1 as { id: number }).id), { ok: true, deleted: 1 });
  assert.deepEqual(await m.reid.deleteSamples(a.id), { ok: true, deleted: 1 });
  assert.equal((await m.reid.listSamples(b.id)).length, 1, "the other patient is untouched");
  assert.deepEqual(await m.reid.deleteSamples(a.id), { ok: true, deleted: 0 }, "deleting nothing is fine");
});

test("reid: withdrawing consent deletes every sample and clears the consent", async () => {
  const p = await newPatient({ consent: "patient" });
  await m.reid.enrolSample(p.id, sample(1)); await m.reid.enrolSample(p.id, sample(2));
  assert.deepEqual(await m.reid.withdrawConsent(p.id), { ok: true, deleted: 2 });
  const after = await m.prisma.patient.findUniqueOrThrow({ where: { id: p.id } });
  assert.deepEqual([after.consentBy, after.consentAt, (await m.reid.listSamples(p.id)).length], [null, null, 0]);
  const again = await m.reid.enrolSample(p.id, sample());
  assert.deepEqual([again.ok, !again.ok && again.status], [false, 409], "enrolling needs fresh consent");
});

test("reid: the model-service gallery lists only admitted, consenting patients", async () => {
  const ok = await newPatient({ consent: "patient" }), gone = await newPatient({ consent: "patient" }), none = await newPatient({ consent: "patient" });
  for (const p of [ok, gone, none]) await m.reid.enrolSample(p.id, sample(p.id, "walker", true));
  // Belt and braces: even if a sample were left behind, these two must not be offered to the model service.
  await m.prisma.patient.update({ where: { id: gone.id }, data: { status: "discharged" } });
  await m.prisma.patient.update({ where: { id: none.id }, data: { consentBy: null } });
  const codes = (await m.reid.galleryForModelService()).map((g) => g.patient_code);
  assert.ok(codes.includes(ok.code));
  assert.ok(!codes.includes(gone.code) && !codes.includes(none.code));
  const mine = (await m.reid.galleryForModelService()).find((g) => g.patient_code === ok.code)!;
  assert.deepEqual([mine.embedding_ref, mine.aid, mine.assisted], [`ref/${ok.id}`, "walker", true]);
});
