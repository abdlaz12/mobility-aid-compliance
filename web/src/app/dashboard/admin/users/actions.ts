"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { HttpError, requireUser } from "@/lib/dal";
import { createUser, resetPassword, updateUser } from "@/lib/dal-users";
import { parseNewUser, parsePassword, parseUserUpdate } from "@/lib/user-input";
import type { Result } from "@/lib/patient-input";

const fields = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
const idOf = (fd: FormData) => Number(fd.get("userId"));

async function run<T>(parsed: Result<T>, op: (v: T) => Promise<unknown>, okMessage: string): Promise<FormState> {
  if (!parsed.ok) return { error: parsed.error };
  try {
    await op(parsed.value);
  } catch (e) {
    if (e instanceof HttpError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard/admin/users");
  return { ok: okMessage };
}

export async function createUserAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseNewUser(fields(fd));
  if (!parsed.ok) return { error: parsed.error };
  let id: number;
  try {
    id = (await createUser(user, parsed.value)).id;
  } catch (e) {
    if (e instanceof HttpError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard/admin/users");
  redirect(`/dashboard/admin/users/${id}`);
}

export async function updateUserNameAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  return run(parseUserUpdate({ name: fields(fd).name }), (v) => updateUser(user, idOf(fd), v), "Name saved.");
}

export async function setUserActiveAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const active = fields(fd).isActive;
  return run(parseUserUpdate({ isActive: active }), (v) => updateUser(user, idOf(fd), v),
    active === "true" ? "Account is active again." : "Account deactivated. They can no longer sign in.");
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  return run(parsePassword(fields(fd).password), (pw) => resetPassword(user, idOf(fd), pw), "Password changed. Tell the user the new password in person.");
}
