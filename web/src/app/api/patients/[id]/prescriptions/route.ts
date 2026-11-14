import { handle, readJson } from "@/lib/http";
import { HttpError, requireApiUser, setPrescription } from "@/lib/dal";
import { parsePrescription } from "@/lib/patient-input";

/** POST /api/patients/{id}/prescriptions: set a new prescribed aid, closing the previous one (admin). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "Patient not found");
    const parsed = parsePrescription(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await setPrescription(user, Number(id), parsed.value.aid);
    return { prescribed: parsed.value.aid };
  }, 201);
}
