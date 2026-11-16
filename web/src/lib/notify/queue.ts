// Notification queue (NFR4.1, NFR4.2, NFR5.1). The alert and its notification rows are stored first;
// delivery happens afterwards and is retried, so a failed push never loses an alert.
import { prisma } from "@/lib/prisma";
import { channelNameFor, defaultChannels, type Channel } from "./channels";
import { buildMessage } from "./message";

export const MAX_ATTEMPTS = 5;

/** Wait before the next try: 30 s, 60 s, 2 min, 4 min (capped at 15 min). */
export const backoffMs = (attempts: number) => Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);

/** FR4.4: a Warning goes to the assigned nurses; Escalated and Emergency also reach the family. */
export const recipientTypes = (level: string): string[] =>
  level === "warning" ? ["nurse"] : level === "escalated" || level === "emergency" ? ["nurse", "family"] : [];

export async function enqueueForAlert(alertId: number, level: string): Promise<number> {
  const types = recipientTypes(level);
  const alert = await prisma.alert.findUnique({ where: { id: alertId }, select: { patientId: true } });
  if (!types.length || !alert) return 0;
  const contacts = await prisma.patientContact.findMany({
    where: { patientId: alert.patientId, type: { in: types }, user: { isActive: true } },
    include: { user: { select: { id: true, pushoverUserKey: true } } },
  });
  for (const c of contacts) {
    await prisma.notification.create({ data: { alertId, userId: c.user.id, channel: channelNameFor(c.user) } });
  }
  return contacts.length;
}

export type DeliveryReport = { sent: number; failed: number; retrying: number; skipped: number; waiting: number };

export async function deliverQueued(opts: { now?: Date; channels?: Record<string, Channel> } = {}): Promise<DeliveryReport> {
  const now = opts.now ?? new Date();
  const channels = opts.channels ?? defaultChannels();
  const report: DeliveryReport = { sent: 0, failed: 0, retrying: 0, skipped: 0, waiting: 0 };
  const queued = await prisma.notification.findMany({
    where: { status: "queued" },
    orderBy: { id: "asc" },
    take: 50,
    include: {
      user: { select: { id: true, pushoverUserKey: true } },
      alert: { include: { patient: { select: { initials: true, code: true } }, detection: { select: { roomId: true, aidLabel: true, timestamp: true } } } },
    },
  });
  for (const n of queued) {
    if (n.lastAttemptAt && now.getTime() - n.lastAttemptAt.getTime() < backoffMs(n.attempts)) { report.waiting++; continue; }
    // Claim the row. If two dispatchers run at once, only one of them wins and sends.
    const claim = await prisma.notification.updateMany({
      where: { id: n.id, status: "queued", attempts: n.attempts },
      data: { attempts: n.attempts + 1, lastAttemptAt: now },
    });
    if (claim.count === 0) continue;
    const finish = (status: string) => prisma.notification.update({ where: { id: n.id }, data: { status } });

    if (n.alert.status !== "pending") { await finish("skipped"); report.skipped++; continue; } // someone already acknowledged it
    const channel = channels[n.channel];
    if (!channel) { await finish("failed"); report.failed++; continue; }
    const result = await channel.send(n.user, buildMessage({
      level: n.alert.level, initials: n.alert.patient.initials, code: n.alert.patient.code,
      roomId: n.alert.detection.roomId, aidLabel: n.alert.detection.aidLabel, timestamp: n.alert.detection.timestamp,
    }));
    if (result.ok) { await finish("sent"); report.sent++; continue; }
    console.warn(`[notify] ${n.channel} delivery failed for notification ${n.id}: ${result.error}`);
    if (!result.retry || n.attempts + 1 >= MAX_ATTEMPTS) { await finish("failed"); report.failed++; } else report.retrying++;
  }
  return report;
}
