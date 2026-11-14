"use client";

import { useActionState, useTransition } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, actionPending] = useActionState(loginAction, undefined);
  const [transitioning, startTransition] = useTransition();
  const pending = actionPending || transitioning;
  return (
    // onSubmit instead of action={...}: React 19 would clear the email field after a failed login.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email" type="email" required autoComplete="username" inputMode="email"
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password" type="password" required autoComplete="current-password"
          className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          ✖ {state.error}
        </p>
      )}
      <button
        type="submit" disabled={pending}
        className="h-11 rounded-md bg-zinc-900 px-4 text-base font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
