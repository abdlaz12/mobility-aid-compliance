import { handle, readJson } from "@/lib/http";
import { HttpError, requireApiUser } from "@/lib/dal";
import { changeOwnPassword } from "@/lib/dal-users";
import { parsePasswordChange } from "@/lib/user-input";

/** POST /api/account/password: change your own password (any signed-in user). */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const parsed = parsePasswordChange(await readJson(request), user.email);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await changeOwnPassword(user, parsed.value.currentPassword, parsed.value.newPassword);
    return { changed: true };
  });
}
