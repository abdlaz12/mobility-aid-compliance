import { handle } from "@/lib/http";
import { HttpError, removeReidSamples, requireApiUser } from "@/lib/dal";

/** DELETE /api/patients/{id}/reid/{sampleId}: delete one sample (admin only). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; sampleId: string }> }) {
  const { id, sampleId } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "Patient not found");
    if (!/^\d{1,9}$/.test(sampleId)) throw new HttpError(404, "Sample not found");
    return removeReidSamples(user, Number(id), Number(sampleId));
  });
}
