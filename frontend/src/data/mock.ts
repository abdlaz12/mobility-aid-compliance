// Fake data for the standalone prototype. Everything here is invented (Demo Patient A, P-0042, and so on).
// It follows the same rules as the backend: who may see which patient, escalation after the deadline,
// notifications skipped once an alert is acknowledged.
import type { AlertStatus, DeliveryRow, DetectionRow, Level, Role } from "./types";

// A fixed starting time that then runs forward, so the prototype looks the same every time it is opened.
const START = Date.parse("2026-11-17T14:32:00Z");
const loaded = performance.now();
export const mockNow = () => new Date(START + (performance.now() - loaded));

export type PatientRec = { id: number; code: string; name: string; initials: string; room: string; prescribedAid: string };
export type AlertRec = {
  id: number; patientId: number; level: Level; status: AlertStatus; createdAt: string; ackDeadline: string | null;
  escalatedAt: string | null; acknowledgedAt: string | null; closedAt: string | null; acknowledgedBy: string | null; detectionId: number;
};

export const PATIENTS: PatientRec[] = [
  { id: 1, code: "P-0042", name: "Demo Patient A", initials: "DA", room: "R-204", prescribedAid: "walker" },
  { id: 2, code: "P-0043", name: "Demo Patient B", initials: "DB", room: "R-205", prescribedAid: "cane" },
];

// Same assignments as the backend seed: P-0042 has Demo Nurse and Demo Family; P-0043 has both nurses and Demo Family 2.
export const CONTACTS: Record<number, { name: string; role: "nurse" | "family"; userId: number }[]> = {
  1: [{ name: "Demo Nurse", role: "nurse", userId: 2 }, { name: "Demo Family", role: "family", userId: 4 }],
  2: [{ name: "Demo Nurse", role: "nurse", userId: 2 }, { name: "Demo Nurse 2", role: "nurse", userId: 3 }, { name: "Demo Family 2", role: "family", userId: 5 }],
};

/** Which patients a user may see: admin all, nurse assigned, family own (FR9.2). */
export function visiblePatientIds(userId: number, role: Role): number[] {
  if (role === "admin") return PATIENTS.map((p) => p.id);
  return PATIENTS.filter((p) => CONTACTS[p.id]!.some((c) => c.userId === userId && c.role === role)).map((p) => p.id);
}

const d = (hhmm: string, day = "2026-11-17") => `${day}T${hhmm}:00Z`;

export const DETECTIONS: DetectionRow[] = [
  { id: 1, patientId: 1, roomId: "R-204", aidLabel: "none", aidConfidence: 0.95, identityConfidence: 0.93, timestamp: d("14:20"), needsReview: false },
  { id: 2, patientId: 1, roomId: "R-204", aidLabel: "walker", aidConfidence: 0.97, identityConfidence: 0.94, timestamp: d("14:05"), needsReview: false },
  { id: 3, patientId: 1, roomId: "H-2", aidLabel: "none", aidConfidence: 0.92, identityConfidence: 0.9, timestamp: d("13:40"), needsReview: false },
  { id: 4, patientId: 1, roomId: "R-204", aidLabel: "walker", aidConfidence: 0.96, identityConfidence: 0.95, timestamp: d("12:40"), needsReview: false },
  { id: 5, patientId: 1, roomId: "R-204", aidLabel: "none", aidConfidence: 0.94, identityConfidence: 0.91, timestamp: d("12:10"), needsReview: false },
  { id: 6, patientId: 2, roomId: "R-205", aidLabel: "none", aidConfidence: 0.93, identityConfidence: 0.92, timestamp: d("14:30"), needsReview: false },
  { id: 7, patientId: 2, roomId: "R-205", aidLabel: "cane", aidConfidence: 0.62, identityConfidence: 0.71, timestamp: d("14:18"), needsReview: true },
  { id: 8, patientId: 2, roomId: "R-205", aidLabel: "cane", aidConfidence: 0.96, identityConfidence: 0.93, timestamp: d("14:00"), needsReview: false },
  { id: 9, patientId: 2, roomId: "H-2", aidLabel: "none", aidConfidence: 0.9, identityConfidence: 0.88, timestamp: d("18:04", "2026-11-16"), needsReview: false },
];

export const ALERTS: AlertRec[] = [
  { id: 1, patientId: 1, level: "escalated", status: "pending", createdAt: d("14:20"), ackDeadline: d("14:25"), escalatedAt: d("14:25"), acknowledgedAt: null, closedAt: null, acknowledgedBy: null, detectionId: 1 },
  { id: 2, patientId: 2, level: "warning", status: "pending", createdAt: d("14:30"), ackDeadline: d("14:35"), escalatedAt: null, acknowledgedAt: null, closedAt: null, acknowledgedBy: null, detectionId: 6 },
  { id: 3, patientId: 1, level: "warning", status: "acknowledged", createdAt: d("13:40"), ackDeadline: d("13:45"), escalatedAt: null, acknowledgedAt: d("13:42"), closedAt: null, acknowledgedBy: "Demo Nurse", detectionId: 3 },
  { id: 4, patientId: 1, level: "warning", status: "closed", createdAt: d("12:10"), ackDeadline: d("12:15"), escalatedAt: null, acknowledgedAt: d("12:12"), closedAt: d("12:40"), acknowledgedBy: "Demo Nurse", detectionId: 5 },
  { id: 5, patientId: 2, level: "escalated", status: "closed", createdAt: d("18:04", "2026-11-16"), ackDeadline: d("18:09", "2026-11-16"), escalatedAt: d("18:09", "2026-11-16"), acknowledgedAt: d("18:12", "2026-11-16"), closedAt: d("18:30", "2026-11-16"), acknowledgedBy: "Demo Nurse 2", detectionId: 9 },
];

const sent = (alertId: number, name: string, role: "nurse" | "family", trigger: "intake" | "escalation", status: DeliveryRow["status"] = "sent", attempts = 1): DeliveryRow & { alertId: number } =>
  ({ alertId, recipient: { name, role }, channel: "pushover", status, attempts, trigger });

export const DELIVERIES: (DeliveryRow & { alertId: number })[] = [
  sent(1, "Demo Nurse", "nurse", "intake"),
  sent(1, "Demo Nurse", "nurse", "escalation"),
  sent(1, "Demo Family", "family", "escalation", "failed", 3),
  sent(2, "Demo Nurse", "nurse", "intake"),
  sent(2, "Demo Nurse 2", "nurse", "intake", "queued", 0),
  sent(3, "Demo Nurse", "nurse", "intake"),
  sent(4, "Demo Nurse", "nurse", "intake"),
  sent(5, "Demo Nurse", "nurse", "intake"),
  sent(5, "Demo Nurse 2", "nurse", "intake"),
  sent(5, "Demo Nurse", "nurse", "escalation"),
  sent(5, "Demo Nurse 2", "nurse", "escalation"),
  sent(5, "Demo Family 2", "family", "escalation", "skipped", 0),
];
