import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { DetectionEvent } from "@/lib/detection-validator";
import { evaluateDetection } from "@/lib/compliance";
import { getSettings } from "@/lib/settings";
import { enqueueForAlert } from "@/lib/notify/queue";

export type IntakeResult = {
  created: boolean;
  detectionId: number;
  needsReview: boolean;
  alertLevel: string | null;
  reason: string;
};

/**
 * FR3.3: is this detection part of an episode that already raised a warning? An episode lasts until the
 * cooldown runs out, or until the patient is seen compliant again (an Info entry after the warning).
 */
async function inCooldown(patientId: number, minutes: number): Promise<boolean> {
  if (minutes <= 0) return false;
  const since = new Date(Date.now() - minutes * 60_000);
  const risk = await prisma.alert.findFirst({
    where: { patientId, level: { in: ["warning", "escalated"] }, createdAt: { gte: since } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  if (!risk) return false;
  const resolved = await prisma.alert.findFirst({ where: { patientId, level: "info", id: { gt: risk.id } }, select: { id: true } });
  return resolved === null;
}

/**
 * Store the event first (NFR4.1), then evaluate it and create an alert if needed.
 * A resent event_id is ignored (idempotent intake).
 */
export async function processDetection(e: DetectionEvent): Promise<IntakeResult> {
  const existing = await prisma.detection.findUnique({ where: { eventId: e.event_id } });
  if (existing) {
    return { created: false, detectionId: existing.id, needsReview: existing.needsReview, alertLevel: null, reason: "duplicate" };
  }

  const settings = await getSettings(); // thresholds, cooldown and timeout an admin may have changed
  const [zone, patient, aid] = await Promise.all([
    prisma.zone.findUnique({ where: { zoneName: e.room_id } }),
    e.identity.patient_id ? prisma.patient.findUnique({ where: { code: e.identity.patient_id } }) : null,
    prisma.mobilityAid.findUnique({ where: { name: e.aid.label } }),
  ]);

  const prescription = patient
    ? await prisma.prescription.findFirst({
        where: { patientId: patient.id, validTo: null },
        orderBy: { validFrom: "desc" },
        include: { mobilityAid: true },
      })
    : null;

  const decision = evaluateDetection(
    {
      eventType: e.event_type,
      identified: e.identity.patient_id !== null,
      patientKnown: patient !== null,
      patientActive: patient?.status === "active",
      identityConfidence: e.identity.confidence,
      aidLabel: e.aid.label,
      aidConfidence: e.aid.confidence,
      aidKnown: aid !== null,
      prescribedAid: prescription?.mobilityAid.name ?? null,
      inCooldown: patient ? await inCooldown(patient.id, settings.cooldownMinutes) : false,
    },
    { identity: settings.identityConfidenceThreshold, aid: settings.aidConfidenceThreshold },
  );

  let detection;
  try {
    detection = await prisma.detection.create({
      data: {
        eventId: e.event_id,
        eventType: e.event_type,
        personTrackId: e.person_track_id,
        roomId: e.room_id,
        zoneId: zone?.id ?? null,
        patientId: patient?.id ?? null,
        identityConfidence: e.identity.confidence,
        mobilityAidId: aid?.id ?? null,
        aidLabel: e.aid.label,
        aidConfidence: e.aid.confidence,
        modelVersion: e.model_version ?? null,
        needsReview: decision.needsReview,
        timestamp: new Date(e.timestamp),
      },
    });
  } catch (err) {
    // Two requests with the same event_id raced: treat the loser as a duplicate.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const dup = await prisma.detection.findUniqueOrThrow({ where: { eventId: e.event_id } });
      return { created: false, detectionId: dup.id, needsReview: dup.needsReview, alertLevel: null, reason: "duplicate" };
    }
    throw err;
  }

  // The detection is already stored; a failure below must not lose it.
  if (decision.alertLevel && patient) {
    const alert = await prisma.alert.create({
      data: {
        patientId: patient.id,
        detectionId: detection.id,
        level: decision.alertLevel,
        // Only a warning waits for acknowledgement and can escalate (FR5.4).
        ackDeadline:
          decision.alertLevel === "warning"
            ? new Date(Date.now() + settings.ackTimeoutMinutes * 60_000)
            : null,
        status: decision.alertLevel === "info" ? "closed" : "pending",
      },
    });
    // Queue the notifications. A failure here must not turn an accepted event into an error:
    // the alert is stored and shows on the dashboard.
    try {
      await enqueueForAlert(alert.id, decision.alertLevel);
    } catch (e) {
      console.error("[intake] could not queue notifications:", e instanceof Error ? e.message : e);
    }
  }

  return {
    created: true,
    detectionId: detection.id,
    needsReview: decision.needsReview,
    alertLevel: decision.alertLevel,
    reason: decision.reason,
  };
}
