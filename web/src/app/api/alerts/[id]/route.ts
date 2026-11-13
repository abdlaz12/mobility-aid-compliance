import { handle } from "@/lib/http";
import { getAlert, HttpError, requireApiUser } from "@/lib/dal";

/** GET /api/alerts/{id}: alert with its detection and notification history. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    if (!/^\d+$/.test(id)) throw new HttpError(404, "Alert not found");
    return getAlert(user, Number(id));
  });
}
