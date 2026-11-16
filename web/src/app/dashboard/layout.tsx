import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/app/login/actions";
import { requireUser } from "@/lib/dal";

async function Header() {
  const user = await requireUser();
  const link = "underline-offset-4 hover:underline";
  return (
    <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="text-xs capitalize text-zinc-600 dark:text-zinc-400">{user.role}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="h-9 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700">Sign out</button>
        </form>
      </div>
      <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/dashboard" className={link}>Dashboard</Link>
        {user.role === "admin" && <Link href="/dashboard/admin/patients" className={link}>Patients</Link>}
        {user.role === "admin" && <Link href="/dashboard/admin/users" className={link}>Users</Link>}
        <Link href="/dashboard/account" className={link}>Account</Link>
      </nav>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<div className="h-[85px] border-b border-zinc-200 dark:border-zinc-800" />}>
        <Header />
      </Suspense>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
