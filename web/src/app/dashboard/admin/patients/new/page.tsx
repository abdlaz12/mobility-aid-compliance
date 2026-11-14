import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { listAdminOptions, requireUser } from "@/lib/dal";
import { createPatientAction } from "../actions";

export default function NewPatientPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  const { aids } = await listAdminOptions(user);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard/admin/patients" className="text-sm underline">← Patients</Link>
      <h1 className="text-xl font-semibold">Add patient</h1>
      <ActionForm action={createPatientAction} submitLabel="Add patient">
        <Field label="Patient code" hint="The reference used in detection events and the ReID gallery, for example P-0044. It cannot be changed later.">
          <input name="code" required maxLength={20} className={inputCls} />
        </Field>
        <Field label="Full name"><input name="name" required maxLength={100} className={inputCls} /></Field>
        <Field label="Initials" hint="Shown in notifications instead of the name. Leave empty to derive them from the name.">
          <input name="initials" maxLength={12} className={inputCls} />
        </Field>
        <Field label="Age (optional)"><input name="age" inputMode="numeric" maxLength={3} className={inputCls} /></Field>
        <Field label="Room (optional)" hint="Matches room_id in events, for example R-204. A new room is created if it does not exist.">
          <input name="room" maxLength={20} className={inputCls} />
        </Field>
        <Field label="Prescribed mobility aid">
          <select name="aid" required defaultValue="" className={inputCls}>
            <option value="" disabled>Choose…</option>
            {aids.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
      </ActionForm>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">After saving you can assign nurses and family members.</p>
    </div>
  );
}
