import { Suspense } from "react";
import { logoutAction } from "@/app/login/actions";
import { requireUser } from "@/lib/dal";

async function Header() {
  const user = await requireUser();
  return (
    <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="text-xs capitalize text-zinc-600 dark:text-zinc-400">{user.role}</p>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="h-9 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700">
          Sign out
        </button>
      </form>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<div className="h-[61px] border-b border-zinc-200 dark:border-zinc-800" />}>
        <Header />
      </Suspense>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
