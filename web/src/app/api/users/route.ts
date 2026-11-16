import { handle, readJson } from "@/lib/http";
import { assertRole, HttpError, requireApiUser } from "@/lib/dal";
import { createUser, listUsers } from "@/lib/dal-users";
import { parseNewUser } from "@/lib/user-input";

/** GET /api/users: all accounts (admin). Never includes password hashes. */
export async function GET() {
  return handle(async () => ({ users: await listUsers(await requireApiUser()) }));
}

/** POST /api/users: create an account (admin). */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    assertRole(user, ["admin"]);
    const parsed = parseNewUser(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    return { user: await createUser(user, parsed.value) };
  }, 201);
}
