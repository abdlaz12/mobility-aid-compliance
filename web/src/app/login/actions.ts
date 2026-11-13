"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
  } catch (e) {
    // A failed login is an AuthError. A successful one throws a redirect, which must be rethrown.
    if (e instanceof AuthError) return { error: "Wrong email or password." };
    throw e;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
