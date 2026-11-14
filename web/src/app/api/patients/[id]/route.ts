import { handle, readJson } from "@/lib/http";
import { getPatientDetail, HttpError, requireApiUser, updatePatient } from "@/lib/dal";
import { parsePatientUpdate } from "@/lib/patient-input";

const idOf = (raw: string) => {
  if (!/^\d{1,9}$/.test(raw)) throw new HttpError(404, "Patient not found");
  return Number(raw);
};

/** GET /api/patients/{id}: patient detail and current prescription (admin also gets history and caregivers). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    return getPatientDetail(user, idOf(id));
  });
}

/** PATCH /api/patients/{id}: update details, discharge or reactivate (admin). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    const patientId = idOf(id);
    const parsed = parsePatientUpdate(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await updatePatient(user, patientId, parsed.value);
    return { updated: true };
  });
}
