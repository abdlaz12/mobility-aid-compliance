import { handle, readJson } from "@/lib/http";
import { requireApiUser } from "@/lib/dal";
import { changeSettings, readSettings, restoreSettings } from "@/lib/dal-settings";

/** GET /api/settings: current values, the defaults, and which keys an admin changed (admin only). */
export async function GET() {
  return handle(async () => readSettings(await requireApiUser()));
}

/** PUT /api/settings: change some settings; the others stay as they are. Applies to the next detection. */
export async function PUT(request: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    return changeSettings(user, await readJson(request));
  });
}

/** DELETE /api/settings?keys=cooldownMinutes,routing: back to the environment and the defaults (no keys = all). */
export async function DELETE(request: Request) {
  const keys = new URL(request.url).searchParams.get("keys")?.split(",").filter(Boolean);
  return handle(async () => restoreSettings(await requireApiUser(), keys));
}
