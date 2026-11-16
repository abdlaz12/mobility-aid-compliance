import { handle, readJson } from "@/lib/http";
import { HttpError, requireApiUser } from "@/lib/dal";
import { getUserAdmin, updateUser } from "@/lib/dal-users";
import { parseUserUpdate } from "@/lib/user-input";

const idOf = (raw: string) => {
  if (!/^\d{1,9}$/.test(raw)) throw new HttpError(404, "User not found");
  return Number(raw);
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => ({ user: await getUserAdmin(await requireApiUser(), idOf(id)) }));
}

/** PATCH /api/users/{id}: change the name or activate or deactivate (admin). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    const userId = idOf(id);
    const parsed = parseUserUpdate(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await updateUser(user, userId, parsed.value);
    return { updated: true };
  });
}
