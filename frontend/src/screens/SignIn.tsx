import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth/AuthContext";
import { Button, Icon, Input, Notice, PasswordInput } from "../components/ui";
import type { Role } from "../data/types";

const shortcuts: { role: Role; label: string }[] = [
  { role: "nurse", label: "Nurse" },
  { role: "family", label: "Family" },
  { role: "admin", label: "Admin" },
];

export function SignIn() {
  const { user, signIn, signInAs } = useAuth();
  const [error, setError] = useState<"wrong" | "locked" | null>(null);
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = signIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
    setError(result.ok ? null : result.reason);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="grid w-full max-w-[920px] items-center gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <span className="mb-4 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary"><Icon name="lock" size={22} /></span>
          <p className="mb-2 text-xs font-bold tracking-wide text-primary uppercase">Secure care access</p>
          <h1 className="text-3xl font-medium tracking-tight text-fg md:text-4xl">Welcome back</h1>
          <p className="mt-2 text-muted">Sign in to Mobility Aid Compliance.</p>
        </div>

        <div className="grid gap-4">
          <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-card" noValidate>
            {error === "wrong" && <Notice tone="error">Wrong email or password.</Notice>}
            {error === "locked" && <Notice tone="error" title="Too many failed attempts.">Wait about 15 minutes and try again.</Notice>}
            <Input label="Email" name="email" type="email" autoComplete="username" placeholder="name@carehome.org" required />
            <PasswordInput label="Password" name="password" autoComplete="current-password" placeholder="Enter your password" required />
            <Button type="submit" size="large">Sign in</Button>
            <p className="flex items-center justify-center gap-2 text-xs text-muted"><Icon name="eyeOff" size={15} />No camera images are captured.</p>
          </form>

          {/* Prototype helper only. It is removed when the frontend is joined to the backend. */}
          <section aria-label="Prototype shortcuts" className="rounded-xl border border-dashed border-border-strong p-3 text-xs text-muted">
            <p className="mb-2 font-semibold">Prototype shortcuts: continue as a demo user (password for the form: demo-password-1)</p>
            <div className="flex flex-wrap gap-2">
              {shortcuts.map((s) => (
                <Button key={s.role} variant="secondary" onClick={() => signInAs(s.role)}>{s.label}</Button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
