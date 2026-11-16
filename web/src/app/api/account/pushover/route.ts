import { handle, readJson } from "@/lib/http";
import { HttpError, requireApiUser } from "@/lib/dal";
import { setOwnPushoverKey } from "@/lib/dal-users";
import { parsePushoverKey } from "@/lib/user-input";

/** PUT /api/account/pushover: set or clear your own Pushover user key (any signed-in user). */
export async function PUT(request: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const parsed = parsePushoverKey(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await setOwnPushoverKey(user, parsed.value.key);
    return { configured: parsed.value.key !== null };
  });
}
