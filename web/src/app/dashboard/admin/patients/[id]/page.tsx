import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { LevelBadge } from "@/components/level-badge";
import { getPatientDetail, HttpError, listAdminOptions, requireUser } from "@/lib/dal";
import { setContactsAction, setPrescriptionAction, setStatusAction, updateDetailsAction } from "../actions";

export default function PatientAdminPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
const box = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  if (!/^\d{1,9}$/.test(id)) notFound();
  let p;
  try {
    p = await getPatientDetail(user, Number(id));
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  if (!("contacts" in p)) notFound(); // admin always gets the full shape
  const { aids, nurses, families } = await listAdminOptions(user);
  const assigned = new Set(p.contacts.map((c) => c.id));
  const discharged = p.status === "discharged";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/admin/patients" className="text-sm underline">← Patients</Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{p.name} <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">{p.code}</span></h1>
        {discharged ? <LevelBadge level="no_data" label="Discharged" /> : <LevelBadge level="ok" label="Active" />}
      </div>

      <Link href={`/dashboard/patients/${p.id}`} className="text-sm underline">View alert and detection history</Link>

      <section className={box}>
        <h2 className="mb-3 text-lg font-semibold">Details</h2>
        <ActionForm action={updateDetailsAction} submitLabel="Save details">
          <input type="hidden" name="patientId" value={p.id} />
          <Field label="Full name"><input name="name" required maxLength={100} defaultValue={p.name} className={inputCls} /></Field>
          <Field label="Initials"><input name="initials" maxLength={12} defaultValue={p.initials} className={inputCls} /></Field>
          <Field label="Age"><input name="age" inputMode="numeric" maxLength={3} defaultValue={p.age ?? ""} className={inputCls} /></Field>
          <Field label="Room" hint="Leave empty to clear."><input name="room" maxLength={20} defaultValue={p.room ?? ""} className={inputCls} /></Field>
        </ActionForm>
      </section>

      <section className={box}>
        <h2 className="mb-1 text-lg font-semibold">Prescribed aid</h2>
        <p className="mb-3 text-sm">Current: <strong>{p.prescribedAid ?? "not set"}</strong></p>
        <ActionForm action={setPrescriptionAction} submitLabel="Change prescription">
          <input type="hidden" name="patientId" value={p.id} />
          <Field label="New prescribed aid">
            <select name="aid" required defaultValue="" className={inputCls}>
              <option value="" disabled>Choose…</option>
              {aids.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
        </ActionForm>
        <h3 className="mb-1 mt-4 text-sm font-semibold">History</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {p.prescriptions.map((x, i) => (
            <li key={i}>{x.aid} <span className="text-xs text-zinc-600 dark:text-zinc-400">from {fmt(x.validFrom)}{x.validTo ? ` to ${fmt(x.validTo)}` : " (current)"}</span></li>
          ))}
        </ul>
      </section>

      <section className={box}>
        <h2 className="mb-3 text-lg font-semibold">Caregivers</h2>
        <ActionForm action={setContactsAction} submitLabel="Save caregivers">
          <input type="hidden" name="patientId" value={p.id} />
          {[["Nurses", nurses], ["Family members", families]].map(([title, list]) => (
            <fieldset key={title as string} className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{title as string}</legend>
              {(list as typeof nurses).length === 0 && <p className="text-xs text-zinc-600 dark:text-zinc-400">No active users with this role.</p>}
              {(list as typeof nurses).map((u) => (
                <label key={u.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="userIds" value={u.id} defaultChecked={assigned.has(u.id)} className="size-5" />
                  <span>{u.name} <span className="text-xs text-zinc-600 dark:text-zinc-400">{u.email}</span></span>
                </label>
              ))}
            </fieldset>
          ))}
        </ActionForm>
      </section>

      <section className={box}>
        <h2 className="mb-1 text-lg font-semibold">{discharged ? "Reactivate" : "Discharge"}</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {discharged
            ? `Discharged ${p.dischargedAt ? fmt(p.dischargedAt) : ""}. Detections are stored but create no alerts.`
            : "A discharged patient is no longer monitored and creates no alerts. Detections and alert history are kept."}
        </p>
        <ActionForm action={setStatusAction} submitLabel={discharged ? "Reactivate patient" : "Discharge patient"} danger={!discharged}>
          <input type="hidden" name="patientId" value={p.id} />
          <input type="hidden" name="status" value={discharged ? "active" : "discharged"} />
        </ActionForm>
      </section>
    </div>
  );
}
