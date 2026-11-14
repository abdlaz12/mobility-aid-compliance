import { handle, readJson } from "@/lib/http";
import { HttpError, requireApiUser, setContacts } from "@/lib/dal";
import { parseContacts } from "@/lib/patient-input";

/** PUT /api/patients/{id}/contacts: replace the assigned nurses and family members (admin). */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const user = await requireApiUser();
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "Patient not found");
    const parsed = parseContacts(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await setContacts(user, Number(id), parsed.value.userIds);
    return { contacts: parsed.value.userIds.length };
  });
}
