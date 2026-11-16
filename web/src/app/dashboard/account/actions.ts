"use server";

import type { FormState } from "@/components/action-form";
import { HttpError, requireUser } from "@/lib/dal";
import { changeOwnPassword, setOwnPushoverKey } from "@/lib/dal-users";
import { parsePasswordChange, parsePushoverKey } from "@/lib/user-input";

const fields = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const f = fields(fd);
  if (f.newPassword !== f.confirmPassword) return { error: "The two new passwords do not match." };
  const parsed = parsePasswordChange(f, user.email);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await changeOwnPassword(user, parsed.value.currentPassword, parsed.value.newPassword);
  } catch (e) {
    if (e instanceof HttpError) return { error: e.message };
    throw e;
  }
  return { ok: "Password changed." };
}

export async function setPushoverAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parsePushoverKey(fields(fd));
  if (!parsed.ok) return { error: parsed.error };
  await setOwnPushoverKey(user, parsed.value.key);
  return { ok: parsed.value.key ? "Pushover key saved." : "Pushover key removed." };
}
