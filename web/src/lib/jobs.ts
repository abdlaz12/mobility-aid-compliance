import { deliverQueued, type DeliveryReport } from "@/lib/notify/queue";
import { escalateOverdueAlerts } from "@/lib/escalation";

/** One pass of the background work: escalate overdue warnings, then deliver queued notifications. */
export async function runJobs(now: Date = new Date()): Promise<{ escalated: number; delivery: DeliveryReport }> {
  const escalated = await escalateOverdueAlerts(now);
  const delivery = await deliverQueued({ now });
  return { escalated, delivery };
}
