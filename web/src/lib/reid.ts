// ReID gallery lifecycle (FR1.3, FR1.4, proposal sections 4.3 and 7).
// The system stores REFERENCES to calibration samples and embeddings (the model service makes them); this module decides
// who may be enrolled, and deletes them when a patient is discharged or withdraws consent. Embeddings identify people,
// so they are never returned to nurses or family, and never included in alert or history responses.
import { prisma } from "@/lib/prisma";

export type Failure = { ok: false; status: 400 | 404 | 409; error: string };
export type SampleInput = { embeddingRef: string; aid: string; isAssisted: boolean };
const fail = (status: Failure["status"], error: string): Failure => ({ ok: false, status, error });

export type Consent = "patient" | "substitute";

/** Record who consented. Only for a patient who is still admitted. */
export async function recordConsent(patientId: number, by: Consent): Promise<{ ok: true } | Failure> {
  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { status: true } });
  if (!p) return fail(404, "Patient not found");
  if (p.status !== "active") return fail(409, "A discharged patient cannot be enrolled. Reactivate the patient first.");
  await prisma.patient.update({ where: { id: patientId }, data: { consentBy: by, consentAt: new Date() } });
  return { ok: true };
}

/** Section 7: when consent is withdrawn the embeddings are deleted too. Returns how many were deleted. */
export async function withdrawConsent(patientId: number): Promise<{ ok: true; deleted: number } | Failure> {
  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!p) return fail(404, "Patient not found");
  const [removed] = await prisma.$transaction([
    prisma.reidProfile.deleteMany({ where: { patientId } }),
    prisma.patient.update({ where: { id: patientId }, data: { consentBy: null, consentAt: null } }),
  ]);
  return { ok: true, deleted: removed.count };
}

/** FR1.3: link a calibration sample to the patient. Needs consent on file and an admitted patient. */
export async function enrolSample(patientId: number, input: SampleInput): Promise<{ ok: true; id: number } | Failure> {
  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { status: true, consentBy: true } });
  if (!p) return fail(404, "Patient not found");
  if (p.status !== "active") return fail(409, "A discharged patient cannot be enrolled. Reactivate the patient first.");
  if (!p.consentBy) return fail(409, "No consent on file. Record consent from the patient or their substitute decision-maker first.");
  const aid = await prisma.mobilityAid.findUnique({ where: { name: input.aid } });
  if (!aid) return fail(400, `Unknown mobility aid "${input.aid}".`);
  const created = await prisma.reidProfile.create({
    data: { patientId, mobilityAidId: aid.id, isAssisted: input.isAssisted, embeddingRef: input.embeddingRef },
  });
  return { ok: true, id: created.id };
}

export async function listSamples(patientId: number) {
  const rows = await prisma.reidProfile.findMany({ where: { patientId }, orderBy: { id: "asc" }, include: { mobilityAid: true } });
  return rows.map((r) => ({ id: r.id, aid: r.mobilityAid?.name ?? null, isAssisted: r.isAssisted, embeddingRef: r.embeddingRef, createdAt: r.createdAt }));
}

/** FR1.4: delete on request. One sample, or all of the patient's. */
export async function deleteSamples(patientId: number, sampleId?: number): Promise<{ ok: true; deleted: number } | Failure> {
  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!p) return fail(404, "Patient not found");
  if (sampleId !== undefined) {
    const { count } = await prisma.reidProfile.deleteMany({ where: { id: sampleId, patientId } });
    return count === 0 ? fail(404, "Sample not found") : { ok: true, deleted: count };
  }
  return { ok: true, deleted: (await prisma.reidProfile.deleteMany({ where: { patientId } })).count };
}

/** Summary for the admin patient page: how many samples, when the last one was added. */
export async function gallerySummary(patientId: number) {
  const [sampleCount, last] = await Promise.all([
    prisma.reidProfile.count({ where: { patientId } }),
    prisma.reidProfile.findFirst({ where: { patientId }, orderBy: { id: "desc" }, select: { createdAt: true } }),
  ]);
  return { sampleCount, lastAddedAt: last?.createdAt ?? null };
}

/**
 * What the model service needs to match people: the samples of admitted patients who consented. A discharged patient
 * or one who withdrew consent has no samples (they were deleted), and is skipped here even if one were left behind.
 */
export async function galleryForModelService() {
  const rows = await prisma.reidProfile.findMany({
    where: { patient: { status: "active", consentBy: { not: null } } },
    orderBy: { id: "asc" },
    include: { patient: { select: { code: true } }, mobilityAid: true },
  });
  return rows.map((r) => ({ patient_code: r.patient.code, embedding_ref: r.embeddingRef, aid: r.mobilityAid?.name ?? null, assisted: r.isAssisted }));
}
