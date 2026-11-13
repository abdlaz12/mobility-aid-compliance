import { handle } from "@/lib/http";
import { acknowledgeAlert, HttpError, requireApiUser } from "@/lib/dal";

/** POST /api/alerts/{id}/acknowledge: nurse (assigned) or admin. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    if (!/^\d+$/.test(id)) throw new HttpError(404, "Alert not found");
    await acknowledgeAlert(user, Number(id));
    return { acknowledged: true };
  });
}
