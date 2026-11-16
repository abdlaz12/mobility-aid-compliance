import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { LevelBadge } from "@/components/level-badge";
import { HttpError, requireUser } from "@/lib/dal";
import { getUserAdmin } from "@/lib/dal-users";
import { resetPasswordAction, setUserActiveAction, updateUserNameAction } from "../actions";

export default function UserAdminPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

const box = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  if (me.role !== "admin") redirect("/dashboard");
  if (!/^\d{1,9}$/.test(id)) notFound();
  let u;
  try {
    u = await getUserAdmin(me, Number(id));
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const isMe = u.id === me.id;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/admin/users" className="text-sm underline">← Users</Link>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{u.name}</h1>
          <p className="break-all text-xs text-zinc-600 dark:text-zinc-400">{u.email} · <span className="capitalize">{u.role}</span>{isMe && " · you"}</p>
        </div>
        {u.isActive ? <LevelBadge level="ok" label="Active" /> : <LevelBadge level="no_data" label="Inactive" />}
      </div>

      <section className={box}>
        <h2 className="mb-3 text-lg font-semibold">Name</h2>
        <ActionForm action={updateUserNameAction} submitLabel="Save name">
          <input type="hidden" name="userId" value={u.id} />
          <Field label="Full name"><input name="name" required maxLength={100} defaultValue={u.name} className={inputCls} /></Field>
        </ActionForm>
      </section>

      <section className={box}>
        <h2 className="mb-1 text-lg font-semibold">Reset password</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">Use this when someone forgot their password. An open session stays signed in until it expires; deactivate the account to cut it off at once.</p>
        <ActionForm action={resetPasswordAction} submitLabel="Set new password">
          <input type="hidden" name="userId" value={u.id} />
          <Field label="New password" hint="At least 10 characters."><input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={inputCls} /></Field>
        </ActionForm>
      </section>

      <section className={box}>
        <h2 className="mb-1 text-lg font-semibold">{u.isActive ? "Deactivate" : "Reactivate"}</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {u.isActive
            ? "A deactivated user cannot sign in and receives no notifications. Their history and patient assignments are kept."
            : "The user can sign in again."}
          {isMe && " You cannot deactivate your own account."}
        </p>
        <ActionForm action={setUserActiveAction} submitLabel={u.isActive ? "Deactivate account" : "Reactivate account"} danger={u.isActive}>
          <input type="hidden" name="userId" value={u.id} />
          <input type="hidden" name="isActive" value={u.isActive ? "false" : "true"} />
        </ActionForm>
      </section>
    </div>
  );
}
