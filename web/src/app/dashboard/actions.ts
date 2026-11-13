"use server";

import { revalidatePath } from "next/cache";
import { acknowledgeAlert, HttpError, requireUser } from "@/lib/dal";

/** Form action behind the Acknowledge button. Authorisation is checked in acknowledgeAlert, not here. */
export async function acknowledgeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("alertId"));
  if (!Number.isInteger(id)) return;
  try {
    await acknowledgeAlert(user, id);
  } catch (e) {
    // 409 means someone else already acknowledged it; the refreshed list shows that.
    if (!(e instanceof HttpError) || e.status === 401 || e.status === 403 || e.status === 404) throw e;
  }
  revalidatePath("/dashboard");
}
