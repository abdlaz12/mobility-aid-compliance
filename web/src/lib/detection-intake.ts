import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { DetectionEvent } from "@/lib/detection-validator";
import { ackDeadlineMinutes, evaluateDetection, readThresholds } from "@/lib/compliance";

export type IntakeResult = {
  created: boolean;
  detectionId: number;
  needsReview: boolean;
  alertLevel: string | null;
  reason: string;
};

/**
 * Store the event first (NFR4.1), then evaluate it and create an alert if needed.
 * A resent event_id is ignored (idempotent intake).
 */
export async function processDetection(e: DetectionEvent): Promise<IntakeResult> {
  const existing = await prisma.detection.findUnique({ where: { eventId: e.event_id } });
  if (existing) {
    return { created: false, detectionId: existing.id, needsReview: existing.needsReview, alertLevel: null, reason: "duplicate" };
  }

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
      identityConfidence: e.identity.confidence,
      aidLabel: e.aid.label,
      aidConfidence: e.aid.confidence,
      aidKnown: aid !== null,
      prescribedAid: prescription?.mobilityAid.name ?? null,
    },
    readThresholds(),
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
    await prisma.alert.create({
      data: {
        patientId: patient.id,
        detectionId: detection.id,
        level: decision.alertLevel,
        // Only a warning waits for acknowledgement and can escalate (FR5.4).
        ackDeadline:
          decision.alertLevel === "warning"
            ? new Date(Date.now() + ackDeadlineMinutes() * 60_000)
            : null,
        status: decision.alertLevel === "info" ? "closed" : "pending",
      },
    });
  }

  return {
    created: true,
    detectionId: detection.id,
    needsReview: decision.needsReview,
    alertLevel: decision.alertLevel,
    reason: decision.reason,
  };
}
