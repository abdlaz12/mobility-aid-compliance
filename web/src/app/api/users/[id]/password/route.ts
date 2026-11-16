import { handle, readJson } from "@/lib/http";
import { assertRole, HttpError, requireApiUser } from "@/lib/dal";
import { resetPassword } from "@/lib/dal-users";
import { parsePassword } from "@/lib/user-input";

/** POST /api/users/{id}/password: set a new password for a user (admin). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    assertRole(user, ["admin"]);
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "User not found");
    const parsed = parsePassword((await readJson(request)).password);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await resetPassword(user, Number(id), parsed.value);
    return { reset: true };
  });
}
