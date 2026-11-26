import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ALERTS, CONTACTS, DELIVERIES, DETECTIONS, PATIENTS, mockNow, visiblePatientIds, type AlertRec } from "./mock";
import type { Alert, DeliveryRow, DetectionRow, PatientCard, PatientState, ReviewItem, SessionUser } from "./types";

export type AckResult =
  | { ok: true; at: string }
  | { ok: false; reason: "already"; by: string; at: string }
  | { ok: false; reason: "notfound" };

type Deliveries = (DeliveryRow & { alertId: number })[];

type Data = {
  updatedAt: string;
  patientsFor: (u: SessionUser) => PatientCard[];
  patientFor: (u: SessionUser, id: number) => PatientCard | null;
  alertsFor: (u: SessionUser) => Alert[];
  alertFor: (u: SessionUser, id: number) => Alert | null;
  deliveriesFor: (alertId: number) => DeliveryRow[];
  reviewFor: (u: SessionUser) => ReviewItem[];
  detectionsFor: (u: SessionUser, patientId: number) => DetectionRow[];
  acknowledge: (alertId: number, u: SessionUser) => AckResult;
  /** Prototype only: the next acknowledge of this alert finds that another nurse was faster. */
  armRace: (alertId: number) => void;
};

const Ctx = createContext<Data | null>(null);
const SEVERITY: Record<string, number> = { emergency: 3, escalated: 2, warning: 1, info: 0 };

export function DataProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertRec[]>(ALERTS);
  const [deliveries, setDeliveries] = useState<Deliveries>(DELIVERIES);
  const [updatedAt, setUpdatedAt] = useState(() => mockNow().toISOString());
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const race = useRef(new Set<number>());

  // The background loop of the backend, in miniature: every few seconds a warning past its deadline escalates.
  useEffect(() => {
    const id = setInterval(() => {
      const now = mockNow().toISOString();
      const overdue = alertsRef.current.filter((a) => a.status === "pending" && a.level === "warning" && a.ackDeadline !== null && a.ackDeadline <= now);
      if (overdue.length) {
        const ids = new Set(overdue.map((a) => a.id));
        setAlerts((all) => all.map((a) => (ids.has(a.id) ? { ...a, level: "escalated", escalatedAt: now } : a)));
        setDeliveries((all) => [
          ...all,
          ...overdue.flatMap((a) => CONTACTS[a.patientId]!.map((c) => ({ alertId: a.id, recipient: { name: c.name, role: c.role }, channel: "pushover" as const, status: "queued" as const, attempts: 0, trigger: "escalation" as const }))),
        ]);
      }
      setUpdatedAt(now);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const acknowledge = useCallback((alertId: number, u: SessionUser): AckResult => {
    const rec = alertsRef.current.find((a) => a.id === alertId);
    if (!rec || !visiblePatientIds(u.id, u.role).includes(rec.patientId)) return { ok: false, reason: "notfound" };
    const now = mockNow().toISOString();
    if (race.current.delete(alertId) && rec.status === "pending") {
      // Another nurse got there first: the conflict the backend answers with HTTP 409.
      setAlerts((all) => all.map((a) => (a.id === alertId ? { ...a, status: "acknowledged", acknowledgedAt: now, acknowledgedBy: "Demo Nurse 2" } : a)));
      setDeliveries((all) => all.map((x) => (x.alertId === alertId && x.status === "queued" ? { ...x, status: "skipped" } : x)));
      return { ok: false, reason: "already", by: "Demo Nurse 2", at: now };
    }
    if (rec.status !== "pending") return { ok: false, reason: "already", by: rec.acknowledgedBy ?? "another nurse", at: rec.acknowledgedAt ?? now };
    setAlerts((all) => all.map((a) => (a.id === alertId ? { ...a, status: "acknowledged", acknowledgedAt: now, acknowledgedBy: u.name } : a)));
    // A notification that was still waiting to be sent is skipped once somebody has acknowledged.
    setDeliveries((all) => all.map((x) => (x.alertId === alertId && x.status === "queued" ? { ...x, status: "skipped" } : x)));
    return { ok: true, at: now };
  }, []);

  const value = useMemo<Data>(() => {
    const toAlert = (a: AlertRec): Alert => {
      const p = PATIENTS.find((x) => x.id === a.patientId)!;
      const det = DETECTIONS.find((x) => x.id === a.detectionId)!;
      return {
        id: a.id, level: a.level, status: a.status, createdAt: a.createdAt, ackDeadline: a.ackDeadline, escalatedAt: a.escalatedAt,
        acknowledgedAt: a.acknowledgedAt, closedAt: a.closedAt,
        patient: { id: p.id, code: p.code, name: p.name, initials: p.initials },
        detection: { roomId: det.roomId, aidLabel: det.aidLabel, aidConfidence: det.aidConfidence, timestamp: det.timestamp },
        acknowledgedBy: a.acknowledgedBy ? { name: a.acknowledgedBy } : null,
      };
    };
    const seen = (u: SessionUser) => visiblePatientIds(u.id, u.role);
    const card = (patientId: number): PatientCard => {
      const p = PATIENTS.find((x) => x.id === patientId)!;
      const pending = alerts.filter((a) => a.patientId === patientId && a.status === "pending");
      const worst = pending.reduce<string | null>((w, a) => (w === null || SEVERITY[a.level]! > SEVERITY[w]! ? a.level : w), null);
      const last = DETECTIONS.filter((x) => x.patientId === patientId && !x.needsReview).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      const state: PatientState = (worst as PatientState | null) ?? (last ? "ok" : "no_data");
      return {
        id: p.id, code: p.code, name: p.name, initials: p.initials, room: p.room, prescribedAid: p.prescribedAid, pendingAlerts: pending.length, state,
        lastDetection: last ? { aidLabel: last.aidLabel, roomId: last.roomId, timestamp: last.timestamp } : null,
      };
    };
    return {
      updatedAt,
      patientsFor: (u) => seen(u).map(card),
      patientFor: (u, id) => (seen(u).includes(id) ? card(id) : null),
      alertsFor: (u) => alerts.filter((a) => seen(u).includes(a.patientId)).map(toAlert).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      alertFor: (u, id) => {
        const a = alerts.find((x) => x.id === id);
        return a && seen(u).includes(a.patientId) ? toAlert(a) : null;
      },
      deliveriesFor: (alertId) => deliveries.filter((x) => x.alertId === alertId).map(({ alertId: _drop, ...row }) => row),
      reviewFor: (u) =>
        DETECTIONS.filter((x) => x.needsReview && x.patientId !== null && seen(u).includes(x.patientId))
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .map((x) => {
            const p = PATIENTS.find((y) => y.id === x.patientId)!;
            return { id: x.id, roomId: x.roomId, aidLabel: x.aidLabel, aidConfidence: x.aidConfidence, identityConfidence: x.identityConfidence, timestamp: x.timestamp, patient: { code: p.code, initials: p.initials } };
          }),
      detectionsFor: (u, patientId) => (seen(u).includes(patientId) ? DETECTIONS.filter((x) => x.patientId === patientId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : []),
      acknowledge,
      armRace: (alertId) => void race.current.add(alertId),
    };
  }, [alerts, deliveries, updatedAt, acknowledge]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}

/** Pending alerts first: the most severe, then the newest. */
export const bySeverity = (a: Alert, b: Alert) => SEVERITY[b.level]! - SEVERITY[a.level]! || b.createdAt.localeCompare(a.createdAt);
