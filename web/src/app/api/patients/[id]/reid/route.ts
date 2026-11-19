import { handle, readJson } from "@/lib/http";
import { enrolReidSample, HttpError, listReidSamples, removeReidSamples, requireApiUser } from "@/lib/dal";
import { parseReidSample } from "@/lib/patient-input";

type Ctx = { params: Promise<{ id: string }> };
const idOf = (raw: string) => {
  if (!/^\d{1,9}$/.test(raw)) throw new HttpError(404, "Patient not found");
  return Number(raw);
};

/** GET /api/patients/{id}/reid: the patient's calibration samples (admin only; biometric references). */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(async () => listReidSamples(await requireApiUser(), idOf(id)));
}

/** POST /api/patients/{id}/reid: link a calibration sample (needs consent on file and an admitted patient). */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    const patientId = idOf(id);
    const parsed = parseReidSample(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    return enrolReidSample(user, patientId, parsed.value);
  }, 201);
}

/** DELETE /api/patients/{id}/reid: delete all of the patient's samples on request (FR1.4). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(async () => removeReidSamples(await requireApiUser(), idOf(id)));
}
