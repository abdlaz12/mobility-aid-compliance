import Link from "next/link";
import { Suspense } from "react";
import { LevelBadge } from "@/components/level-badge";
import { listAllPatients, requireUser } from "@/lib/dal";
import { redirect } from "next/navigation";

export default function AdminPatientsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  const patients = await listAllPatients(user);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Patients <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">({patients.length})</span></h1>
        <Link href="/dashboard/admin/patients/new" className="inline-flex h-11 items-center rounded-md bg-zinc-900 px-4 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Add patient
        </Link>
      </div>
      {patients.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No patients yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patients.map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/admin/patients/${p.id}`} className="block rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{p.name}</p>
                  {p.status === "discharged" ? <LevelBadge level="no_data" label="Discharged" /> : <LevelBadge level="ok" label="Active" />}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {p.code} · Room {p.zone?.zoneName ?? "not set"} · {p.prescriptions[0]?.mobilityAid.name ?? "no prescription"} · {p._count.contacts} caregiver{p._count.contacts === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
