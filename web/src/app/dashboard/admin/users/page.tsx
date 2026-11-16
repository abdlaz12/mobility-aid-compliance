import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LevelBadge } from "@/components/level-badge";
import { requireUser } from "@/lib/dal";
import { listUsers } from "@/lib/dal-users";

export default function UsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  const users = await listUsers(user);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Users <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">({users.length})</span></h1>
        <Link href="/dashboard/admin/users/new" className="inline-flex h-11 items-center rounded-md bg-zinc-900 px-4 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Add user
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id}>
            <Link href={`/dashboard/admin/users/${u.id}`} className="block rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{u.name}</p>
                {u.isActive ? <LevelBadge level="ok" label="Active" /> : <LevelBadge level="no_data" label="Inactive" />}
              </div>
              <p className="break-all text-xs text-zinc-600 dark:text-zinc-400">{u.email} · <span className="capitalize">{u.role}</span>{u.role !== "admin" && ` · ${u._count.contacts} patient${u._count.contacts === 1 ? "" : "s"}`}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
