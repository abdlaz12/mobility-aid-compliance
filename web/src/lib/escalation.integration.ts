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
  const src = path.resolve(process.cwd(), "prisma/dev.db");
  if (!existsSync(src)) throw new Error("prisma/dev.db not found. Run `npx prisma migrate dev` and `npx prisma db seed` first.");
  const dir = mkdtempSync(path.join(os.tmpdir(), "mac-test-"));
  copyFileSync(src, path.join(dir, "test.db"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  const [{ prisma }, { processDetection }, { escalateOverdueAlerts }, { deliverQueued }] = await Promise.all([
    import("./prisma"), import("./detection-intake"), import("./escalation"), import("./notify/queue"),
  ]);
  m = { prisma, processDetection, escalateOverdueAlerts, deliverQueued };
});

// Every test starts from a quiet database: nothing pending, nothing queued, P-0042 admitted.
beforeEach(async () => {
  await m.prisma.notification.deleteMany();
  await m.prisma.alert.updateMany({ data: { status: "closed" } });
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
