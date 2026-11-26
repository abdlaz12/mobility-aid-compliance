// Shapes of the data, the same as the backend API returns (see docs/api.md), so that replacing the mock
// data with real calls later changes nothing in the screens. Times are ISO strings in UTC.
export type Role = "admin" | "nurse" | "family";
export type SessionUser = { id: number; name: string; email: string; role: Role };

export type Level = "info" | "warning" | "escalated" | "emergency";
export type AlertStatus = "pending" | "acknowledged" | "closed";
export type PatientState = "emergency" | "escalated" | "warning" | "ok" | "no_data";

export type Alert = {
  id: number; level: Level; status: AlertStatus; createdAt: string; ackDeadline: string | null;
  escalatedAt: string | null; acknowledgedAt: string | null; closedAt: string | null;
  patient: { id: number; code: string; name: string; initials: string };
  detection: { roomId: string; aidLabel: string; aidConfidence: number; timestamp: string };
  acknowledgedBy: { name: string } | null;
};
export type PatientCard = {
  id: number; code: string; name: string; initials: string; room: string | null; prescribedAid: string | null;
  pendingAlerts: number; state: PatientState; lastDetection: { aidLabel: string; roomId: string; timestamp: string } | null;
};
export type ReviewItem = {
  id: number; roomId: string; aidLabel: string; aidConfidence: number; identityConfidence: number; timestamp: string;
  patient: { code: string; initials: string } | null;
};
export type Delivery = { channel: "log" | "pushover"; status: "queued" | "sent" | "failed" | "skipped"; attempts: number };
// The backend does not yet say WHO each delivery went to (docs/frontend-backlog.md, B). The design shows it, so the mock has it.
export type DeliveryRow = Delivery & { recipient: { name: string; role: "nurse" | "family" }; trigger: "intake" | "escalation" };
export type DetectionRow = {
  id: number; patientId: number | null; roomId: string; aidLabel: string; aidConfidence: number; identityConfidence: number;
  timestamp: string; needsReview: boolean;
};
export type Settings = {
  identityConfidenceThreshold: number; aidConfidenceThreshold: number; cooldownMinutes: number; ackTimeoutMinutes: number;
  routing: { warning: ("nurse" | "family")[]; escalated: ("nurse" | "family")[]; emergency: ("nurse" | "family")[] };
};
export type UserRow = { id: number; name: string; email: string; role: Role; isActive: boolean; patientCount: number };
export type ReidSample = { id: number; aid: string; isAssisted: boolean; embeddingRef: string; createdAt: string };
export type PatientAdmin = {
  id: number; code: string; name: string; initials: string; age: number | null; status: "active" | "discharged";
  room: string | null; prescribedAid: string | null;
  consent: { by: "patient" | "substitute"; at: string } | null; reid: { sampleCount: number; lastAddedAt: string | null };
  prescriptions: { aid: string; validFrom: string; validTo: string | null }[];
  contacts: { id: number; type: "nurse" | "family"; name: string; email: string }[];
};
