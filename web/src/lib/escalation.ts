// FR5.4: a Warning nobody acknowledged by its deadline becomes Escalated, and the family is told too.
import { prisma } from "@/lib/prisma";
import { enqueueForAlert } from "@/lib/notify/queue";

/** Safe to run often and from several processes: each alert escalates once. Returns how many it escalated. */
export async function escalateOverdueAlerts(now: Date = new Date()): Promise<number> {
  // A discharged patient is no longer monitored, so their open warnings are left alone.
  const where = { level: "warning", status: "pending", ackDeadline: { lte: now }, patient: { status: "active" } };
  const overdue = await prisma.alert.findMany({ where, select: { id: true } });
  let escalated = 0;
  for (const { id } of overdue) {
    // The same conditions again, in the update itself: if another run or a nurse got there first, count is 0.
    const { count } = await prisma.alert.updateMany({ where: { ...where, id }, data: { level: "escalated", escalatedAt: now } });
    if (count !== 1) continue;
    escalated++;
    await enqueueForAlert(id, "escalated", "escalation");
  }
  return escalated;
}
