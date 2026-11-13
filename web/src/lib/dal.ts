// Data access layer. Every read or write of patient data goes through here, and the role and
// patient-scope rules are enforced here on the server (NFR2.3). The UI hiding a button is not security.
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const ROLES = ["admin", "nurse", "family"] as const;
export type Role = (typeof ROLES)[number];
export type SessionUser = { id: number; name: string; email: string; role: Role };

/** Thrown by data functions; API routes map it to the HTTP status. */
export class HttpError extends Error {
  constructor(
    public status: 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

const isRole = (r: string): r is Role => (ROLES as readonly string[]).includes(r);

/** The signed-in user, re-read from the database so deactivation and role changes apply at once. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Wait for a real request first. auth() creates random values (CSRF token), which Next refuses
  // to do while prerendering with cacheComponents ("blocking-prerender-crypto").
  await connection();
  const email = (await auth())?.user?.email;
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !u.isActive || !isRole(u.role)) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role };
});

/** For pages and server actions: no session means go to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For API routes: no session means 401. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

export function assertRole(user: SessionUser, allowed: readonly Role[]) {
  if (!allowed.includes(user.role)) throw new HttpError(403, "Not allowed for your role");
}

/** Which patients a user may see: admin all, nurse assigned, family their own patient (FR9.2). */
export function patientScope(user: SessionUser): Prisma.PatientWhereInput {
  if (user.role === "admin") return {};
  return { contacts: { some: { userId: user.id, type: user.role } } };
}

export type PatientState = "emergency" | "escalated" | "warning" | "ok" | "no_data";

const SEVERITY = ["emergency", "escalated", "warning"] as const;

export async function listPatients(user: SessionUser) {
  const patients = await prisma.patient.findMany({
    where: { status: "active", ...patientScope(user) },
    orderBy: { code: "asc" },
    include: {
      zone: true,
      prescriptions: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1, include: { mobilityAid: true } },
      detections: { where: { needsReview: false }, orderBy: { timestamp: "desc" }, take: 1 },
      alerts: { where: { status: "pending" }, select: { level: true } },
    },
  });
  return patients.map((p) => {
    const pending = p.alerts.map((a) => a.level);
    const worst = SEVERITY.find((l) => pending.includes(l));
    const last = p.detections[0] ?? null;
    const state: PatientState = worst ?? (last ? "ok" : "no_data");
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      initials: p.initials,
      room: p.zone?.zoneName ?? null,
      prescribedAid: p.prescriptions[0]?.mobilityAid.name ?? null,
      lastDetection: last && { aidLabel: last.aidLabel, roomId: last.roomId, timestamp: last.timestamp },
      pendingAlerts: pending.length,
      state,
    };
  });
}

export async function listAlerts(user: SessionUser, filter: { status?: string; level?: string } = {}) {
  const where: Prisma.AlertWhereInput = { patient: patientScope(user) };
  if (filter.status) where.status = filter.status;
  // Info entries are the silent log (FR4.1). Family only sees alerts that needed attention.
  if (filter.level) where.level = filter.level;
  if (user.role === "family") where.level = filter.level && filter.level !== "info" ? filter.level : { not: "info" };
  return prisma.alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      patient: { select: { id: true, code: true, name: true, initials: true } },
      detection: { select: { roomId: true, aidLabel: true, aidConfidence: true, timestamp: true } },
      acknowledgedBy: { select: { name: true } },
    },
  });
}

export async function getAlert(user: SessionUser, id: number) {
  const alert = await prisma.alert.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, code: true, name: true, initials: true } },
      detection: true,
      notifications: { select: { channel: true, status: true, attempts: true, lastAttemptAt: true } },
    },
  });
  if (!alert) throw new HttpError(404, "Alert not found");
  const inScope = await prisma.patient.count({ where: { id: alert.patientId, ...patientScope(user) } });
  if (!inScope || (user.role === "family" && alert.level === "info")) throw new HttpError(403, "Not allowed");
  return alert;
}

/** Low-confidence detections waiting for manual review (FR3.2). Admin and nurse only. */
export async function listReviewQueue(user: SessionUser) {
  assertRole(user, ["admin", "nurse"]);
  return prisma.detection.findMany({
    // Detections whose patient code is not in the database have no patient, so only admin sees those.
    where: { needsReview: true, ...(user.role === "admin" ? {} : { patient: patientScope(user) }) },
    orderBy: { timestamp: "desc" },
    take: 100,
    include: { patient: { select: { code: true, initials: true } } },
  });
}

/** FR5.3: the recipient explicitly acknowledges. Admin, or a nurse assigned to the patient. */
export async function acknowledgeAlert(user: SessionUser, alertId: number): Promise<void> {
  assertRole(user, ["admin", "nurse"]);
  const alert = await prisma.alert.findUnique({ where: { id: alertId }, select: { id: true, patientId: true } });
  if (!alert) throw new HttpError(404, "Alert not found");
  const inScope = await prisma.patient.count({ where: { id: alert.patientId, ...patientScope(user) } });
  if (!inScope) throw new HttpError(403, "Not assigned to this patient");
  // Conditional update: two nurses pressing the button at once cannot both succeed.
  const { count } = await prisma.alert.updateMany({
    where: { id: alertId, status: "pending" },
    data: { status: "acknowledged", acknowledgedById: user.id, acknowledgedAt: new Date() },
  });
  if (count === 0) throw new HttpError(409, "Alert is not pending");
}
