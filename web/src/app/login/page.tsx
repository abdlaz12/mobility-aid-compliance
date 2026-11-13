import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Mobility Aid Compliance</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Sign in to view patients and alerts.</p>
      </div>
      <LoginForm />
    </main>
  );
}
