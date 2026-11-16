import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { requireUser } from "@/lib/dal";
import { createUserAction } from "../actions";

export default function NewUserPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard/admin/users" className="text-sm underline">← Users</Link>
      <h1 className="text-xl font-semibold">Add user</h1>
      <ActionForm action={createUserAction} submitLabel="Create account">
        <Field label="Full name"><input name="name" required maxLength={100} autoComplete="off" className={inputCls} /></Field>
        <Field label="Email" hint="Used to sign in. It cannot be changed later."><input name="email" type="email" required maxLength={254} autoComplete="off" className={inputCls} /></Field>
        <Field label="Role" hint="Fixed after creation. To change it, deactivate the account and create a new one.">
          <select name="role" required defaultValue="" className={inputCls}>
            <option value="" disabled>Choose…</option>
            <option value="nurse">Nurse</option>
            <option value="family">Family member</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Starting password" hint="At least 10 characters. Tell the person in person; they can change it on their Account page.">
          <input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={inputCls} />
        </Field>
      </ActionForm>
    </div>
  );
}
