// NFR1.1: from the moment the intake API receives a valid detection event to the moment the alert reaches the
// notification channel, at most 5 seconds for the 95th percentile. Escalations are timer driven and not part of it.
import { prisma } from "@/lib/prisma";

export const TARGET_MS = 5000;

/** Nearest-rank percentile of an ascending list. */
export function percentile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return NaN;
  const rank = Math.max(1, Math.ceil(q * sortedAsc.length));
  return sortedAsc[Math.min(rank, sortedAsc.length) - 1];
}

export function summarise(latenciesMs: number[]) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const within = sorted.filter((x) => x <= TARGET_MS).length;
  return {
    count: sorted.length,
    p50Ms: sorted.length ? percentile(sorted, 0.5) : null,
    p95Ms: sorted.length ? percentile(sorted, 0.95) : null,
    maxMs: sorted.length ? sorted[sorted.length - 1] : null,
    withinTargetPct: sorted.length ? Math.round((within / sorted.length) * 1000) / 10 : null,
    targetMs: TARGET_MS,
  };
}

/** Latency of the notifications sent because of an incoming detection, newest first, up to `limit`. */
export async function intakeLatency(opts: { since?: Date; limit?: number } = {}) {
  const rows = await prisma.notification.findMany({
    where: { trigger: "intake", status: "sent", sentAt: { not: null }, ...(opts.since ? { createdAt: { gte: opts.since } } : {}) },
    orderBy: { id: "desc" },
    take: Math.min(opts.limit ?? 5000, 20000),
    select: { sentAt: true, alert: { select: { detection: { select: { receivedAt: true } } } } },
  });
  // generatedAt lets a client mark "now" using the server's clock, so a measurement never depends on two clocks agreeing.
  return { ...summarise(rows.map((r) => r.sentAt!.getTime() - r.alert.detection.receivedAt.getTime()).filter((x) => x >= 0)), generatedAt: new Date().toISOString() };
}
