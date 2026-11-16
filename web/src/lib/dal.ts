// Data access layer. Every read or write of patient data goes through here, and the role and
// patient-scope rules are enforced here on the server (NFR2.3). The UI hiding a button is not security.
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { NewPatient, PatientUpdate } from "@/lib/patient-input";

export const ROLES = ["admin", "nurse", "family"] as const;
export type Role = (typeof ROLES)[number];
export type SessionUser = { id: number; name: string; email: string; role: Role };

/** Thrown by data functions; API routes map it to the HTTP status. */
export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 429,
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

// ---------------------------------------------------------------------------------------------
// Patient management (FR1). Admin only, except getPatientDetail which follows the usual scope.
// ---------------------------------------------------------------------------------------------

const ADMIN = ["admin"] as const;

/** All patients including discharged ones, for the admin list. */
export async function listAllPatients(user: SessionUser) {
  assertRole(user, ADMIN);
  return prisma.patient.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }],
    include: {
      zone: true,
      prescriptions: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1, include: { mobilityAid: true } },
      _count: { select: { contacts: true } },
    },
  });
}

/** Patient with prescription. Admin also gets prescription history and caregivers. */
export async function getPatientDetail(user: SessionUser, id: number) {
  const p = await prisma.patient.findFirst({
    where: { id, ...patientScope(user) },
    include: {
      zone: true,
      prescriptions: { orderBy: { validFrom: "desc" }, include: { mobilityAid: true } },
      contacts: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
    },
  });
  if (!p) {
    // Do not tell a nurse or family member whether a patient they cannot see exists.
    const exists = user.role === "admin" ? false : (await prisma.patient.count({ where: { id } })) > 0;
    throw new HttpError(exists ? 403 : 404, exists ? "Not allowed" : "Patient not found");
  }
  const current = p.prescriptions.find((x) => x.validTo === null) ?? null;
  const base = {
    id: p.id, code: p.code, name: p.name, initials: p.initials, age: p.age, status: p.status,
    dischargedAt: p.dischargedAt, room: p.zone?.zoneName ?? null, prescribedAid: current?.mobilityAid.name ?? null,
  };
  if (user.role !== "admin") return base;
  return {
    ...base,
    prescriptions: p.prescriptions.map((x) => ({ aid: x.mobilityAid.name, validFrom: x.validFrom, validTo: x.validTo })),
    contacts: p.contacts.map((c) => ({ type: c.type, ...c.user })),
  };
}

/** Choices for the admin forms. */
export async function listAdminOptions(user: SessionUser) {
  assertRole(user, ADMIN);
  const [aids, users] = await Promise.all([
    prisma.mobilityAid.findMany({ orderBy: { id: "asc" } }),
    prisma.user.findMany({ where: { isActive: true, role: { in: ["nurse", "family"] } }, orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, name: true, email: true, role: true } }),
  ]);
  return { aids: aids.map((a) => a.name), nurses: users.filter((u) => u.role === "nurse"), families: users.filter((u) => u.role === "family") };
}

const roomLink = (room: string) => ({ connectOrCreate: { where: { zoneName: room }, create: { zoneName: room } } });

async function aidId(name: string): Promise<number> {
  const aid = await prisma.mobilityAid.findUnique({ where: { name } });
  if (!aid) throw new HttpError(400, `Unknown mobility aid "${name}".`);
  return aid.id;
}

async function ensurePatient(id: number) {
  const p = await prisma.patient.findUnique({ where: { id } });
  if (!p) throw new HttpError(404, "Patient not found");
  return p;
}

/** FR1.1: register a patient with room and prescribed aid. Caregivers are assigned afterwards. */
export async function createPatient(user: SessionUser, input: NewPatient) {
  assertRole(user, ADMIN);
  const mobilityAidId = await aidId(input.aid);
  try {
    const p = await prisma.patient.create({
      data: {
        code: input.code, name: input.name, initials: input.initials, age: input.age,
        zone: input.room ? roomLink(input.room) : undefined,
        prescriptions: { create: { mobilityAidId } },
      },
    });
    return { id: p.id, code: p.code };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, `Patient code ${input.code} is already used.`);
    throw e;
  }
}

/** FR1.2 and FR1.4: edit details, discharge (history is kept) or reactivate. */
export async function updatePatient(user: SessionUser, id: number, input: PatientUpdate) {
  assertRole(user, ADMIN);
  const current = await ensurePatient(id);
  const data: Prisma.PatientUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.initials !== undefined) data.initials = input.initials;
  if (input.age !== undefined) data.age = input.age;
  if (input.room !== undefined) data.zone = input.room ? roomLink(input.room) : { disconnect: true };
  if (input.status !== undefined && input.status !== current.status) {
    data.status = input.status;
    data.dischargedAt = input.status === "discharged" ? new Date() : null;
  }
  await prisma.patient.update({ where: { id }, data });
}

/** FR1.2: set a new prescribed aid. The previous prescription is closed, not deleted. */
export async function setPrescription(user: SessionUser, id: number, aidName: string) {
  assertRole(user, ADMIN);
  await ensurePatient(id);
  const mobilityAidId = await aidId(aidName);
  await prisma.$transaction(async (tx) => {
    const open = await tx.prescription.findFirst({ where: { patientId: id, validTo: null }, orderBy: { validFrom: "desc" } });
    if (open?.mobilityAidId === mobilityAidId) throw new HttpError(409, `${aidName} is already the current prescription.`);
    const now = new Date();
    await tx.prescription.updateMany({ where: { patientId: id, validTo: null }, data: { validTo: now } });
    await tx.prescription.create({ data: { patientId: id, mobilityAidId, validFrom: now } });
  });
}

/** FR1.1 and FR1.2: replace the nurses and family members assigned to a patient. */
export async function setContacts(user: SessionUser, id: number, userIds: number[]) {
  assertRole(user, ADMIN);
  await ensurePatient(id);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  for (const uid of userIds) {
    const u = users.find((x) => x.id === uid);
    if (!u || !u.isActive || (u.role !== "nurse" && u.role !== "family")) {
      throw new HttpError(400, `User ${uid} cannot be assigned (unknown, inactive, or not a nurse or family member).`);
    }
  }
  await prisma.$transaction([
    prisma.patientContact.deleteMany({ where: { patientId: id } }),
    ...users.map((u) => prisma.patientContact.create({ data: { patientId: id, userId: u.id, type: u.role } })),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Patient history (detections and alerts of one patient).
// ---------------------------------------------------------------------------------------------

/** Detections and alerts of one patient, newest first. Family see alerts only (no raw detections, no Info log). */
export async function getPatientHistory(user: SessionUser, id: number, limit = 50) {
  const patient = await prisma.patient.findFirst({
    where: { id, ...patientScope(user) },
    include: { zone: true, prescriptions: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1, include: { mobilityAid: true } } },
  });
  if (!patient) {
    // Do not reveal to a nurse or family member whether a patient they cannot see exists.
    const exists = user.role === "admin" ? false : (await prisma.patient.count({ where: { id } })) > 0;
    throw new HttpError(exists ? 403 : 404, exists ? "Not allowed" : "Patient not found");
  }
  const family = user.role === "family";
  const [alerts, detections] = await Promise.all([
    prisma.alert.findMany({
      where: { patientId: id, ...(family ? { level: { not: "info" } } : {}) },
      orderBy: { id: "desc" },
      take: limit,
      include: { detection: { select: { roomId: true, aidLabel: true, timestamp: true } }, acknowledgedBy: { select: { name: true } } },
    }),
    family
      ? Promise.resolve([])
      : prisma.detection.findMany({
          where: { patientId: id },
          orderBy: { timestamp: "desc" },
          take: limit,
          select: { id: true, timestamp: true, roomId: true, aidLabel: true, aidConfidence: true, identityConfidence: true, needsReview: true, eventType: true },
        }),
  ]);
  return {
    patient: {
      id: patient.id, code: patient.code, name: patient.name, initials: patient.initials, status: patient.status,
      room: patient.zone?.zoneName ?? null, prescribedAid: patient.prescriptions[0]?.mobilityAid.name ?? null,
    },
    alerts,
    detections,
  };
}
