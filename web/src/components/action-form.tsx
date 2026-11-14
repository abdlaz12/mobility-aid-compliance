"use client";

import { useActionState, useTransition } from "react";

export type FormState = { error?: string; ok?: string } | undefined;

/** A form that runs a server action and shows its error or success message under the button. */
export function ActionForm({
  action, submitLabel, children, danger = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  const [state, formAction, actionPending] = useActionState(action, undefined);
  const [transitioning, startTransition] = useTransition();
  const pending = actionPending || transitioning;
  return (
    // React 19 clears every field after a form action finishes, so a failed validation would wipe what the
    // admin typed. Submitting through onSubmit keeps the values; the server action still does all the work.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-3"
    >
      {children}
      <button
        type="submit" disabled={pending}
        className={`h-11 rounded-md px-4 text-base font-medium disabled:opacity-60 sm:w-fit ${
          danger ? "border border-red-700 text-red-800 dark:border-red-400 dark:text-red-300"
                 : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"}`}
      >
        {pending ? "Saving…" : submitLabel}
      </button>
      {state?.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">✖ {state.error}</p>}
      {state?.ok && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">✔ {state.ok}</p>}
    </form>
  );
}

export const inputCls = "h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-900";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">{hint}</span>}
    </label>
  );
}
