import { handle } from "@/lib/http";
import { getPatientHistory, HttpError, requireApiUser } from "@/lib/dal";

/** GET /api/patients/{id}/history: alerts and detections of one patient, newest first (family: alerts only, no Info). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "Patient not found");
    return getPatientHistory(user, Number(id));
  });
}
