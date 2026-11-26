import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Button, Card, ConfirmDialog, Input, Notice, PageHeader, PasswordInput, SectionHeader, Select, StatusBadge } from "../../components/ui";
import { useAdmin } from "../../data/admin";
import type { Role } from "../../data/types";
import { initialsOf } from "../../auth/AuthContext";
import { NotFound } from "../Placeholder";
import { textLink } from "../nurse/shared";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", nurse: "Nurse", family: "Family" };
const th = "px-4 py-3 text-left text-xs font-semibold text-muted";

export function AdminUsers() {
  const { users } = useAdmin();
  const nav = useNavigate();
  const badge = (active: boolean) => <StatusBadge status={active ? "Active" : "Inactive"} />;
  return (
    <>
      <PageHeader eyebrow="Administration" title="Users" description="Manage access for nurses, family members, and admins." action={<Button size="large" onClick={() => nav("/admin/users/new")}>Add user</Button>} />
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-subtle"><tr>{["Name", "Email", "Role", "Patients", "Status"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2"><Link to={`/admin/users/${u.id}`} className={textLink}>{u.name}</Link></td>
                <td className="px-4 py-2">{u.email}</td><td className="px-4 py-2">{ROLE_LABEL[u.role]}</td><td className="px-4 py-2">{u.patientCount}</td><td className="px-4 py-2">{badge(u.isActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {users.map((u) => (
          <li key={u.id} className="grid gap-1 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2"><Link to={`/admin/users/${u.id}`} className={textLink}>{u.name}</Link>{badge(u.isActive)}</div>
            <p className="text-xs text-muted">{u.email}</p><p className="text-xs text-muted">{ROLE_LABEL[u.role]} · {u.patientCount} patient{u.patientCount === 1 ? "" : "s"}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AddUser() {
  const admin = useAdmin();
  const nav = useNavigate();
  const [err, setErr] = useState<Record<string, string>>({});
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const next: Record<string, string> = {};
    if (!v("name")) next.name = "Enter the person's full name.";
    if (!/^\S+@\S+\.\S+$/.test(v("email"))) next.email = "Enter a valid email address.";
    if (!v("role")) next.role = "Choose a role.";
    if (String(f.get("password") ?? "").length < 10) next.password = "Use at least 10 characters.";
    setErr(next);
    if (Object.keys(next).length) return;
    const r = admin.addUser({ name: v("name"), email: v("email"), role: v("role").toLowerCase() as Role, password: String(f.get("password")) });
    if (!r.ok) return setErr({ email: r.error });
    nav(`/admin/users/${r.id}`);
  }
  return (
    <>
      <Link to="/admin/users" className={`${textLink} mb-1 text-sm`}>‹ Users</Link>
      <PageHeader eyebrow="Access management" title="Add user" description="Create sign-in access and assign a permanent role." />
      <Card className="max-w-3xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="name" label="Name" placeholder="Enter full name" error={err.name} />
            <Input name="email" label="Email" type="email" placeholder="name@example.test" hint="Cannot be changed later. Used to sign in." error={err.email} />
            <Select name="role" label="Role" options={["Nurse", "Family", "Admin"]} placeholder="Select a role" hint="Cannot be changed later." error={err.role} />
            <PasswordInput name="password" label="Starting password" autoComplete="new-password" hint="At least 10 characters." error={err.password} />
          </div>
          <div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={() => nav("/admin/users")}>Cancel</Button><Button type="submit">Add user</Button></div>
        </form>
      </Card>
    </>
  );
}

export function UserDetail() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const admin = useAdmin();
  const person = /^\d+$/.test(id ?? "") ? admin.person(Number(id)) : null;
  const [dialog, setDialog] = useState<"deactivate" | "reset" | null>(null);
  const [flash, setFlash] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  if (!person || !me) return <NotFound />;
  const row = admin.users.find((u) => u.id === person.id)!;

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) return setFlash({ tone: "warning", text: "The name cannot be empty." });
    admin.renameUser(person!.id, name); setFlash({ tone: "success", text: "Name saved." });
  }
  const toggle = (active: boolean) => {
    const r = admin.setActive(person.id, active, me.id);
    setFlash(r.ok ? { tone: "success", text: active ? "User reactivated." : "User deactivated." } : { tone: "warning", text: r.error });
    setDialog(null);
  };

  return (
    <>
      <Link to="/admin/users" className={`${textLink} mb-1 text-sm`}>‹ Users</Link>
      <Card className="mb-5 flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary" aria-hidden="true">{initialsOf(person.name)}</span>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold tracking-wide text-muted uppercase">User account</p><h1 className="text-2xl font-bold tracking-tight">{person.name}</h1><p className="text-sm text-muted">{person.email} · {ROLE_LABEL[person.role]}</p></div>
        <StatusBadge status={person.isActive ? "Active" : "Inactive"} />
      </Card>
      {flash && <div className="mb-5"><Notice tone={flash.tone}>{flash.text}</Notice></div>}
      {temp && <div className="mb-5"><Notice tone="info" title="Temporary password">Share this once: <code className="font-bold">{temp}</code>. The user should change it after signing in.</Notice></div>}

      <div className="grid gap-5">
        <Card>
          <form key={person.name} onSubmit={save} noValidate className="grid gap-4">
            <SectionHeader title="Profile" description="Email and role cannot be changed." />
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="name" label="Name" defaultValue={person.name} />
              <ReadOnly label="Email" value={person.email} /><ReadOnly label="Role" value={ROLE_LABEL[person.role]} /><ReadOnly label="Assigned patients" value={String(row.patientCount)} />
            </div>
            <div className="flex justify-end"><Button type="submit">Save name</Button></div>
          </form>
        </Card>
        <Card>
          <SectionHeader title="Security and access" />
          <div className="divide-y divide-border">
            <div className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">Reset password</p><p className="text-xs text-muted">Replaces the current password with a new temporary starting password.</p></div><Button variant="secondary" onClick={() => setDialog("reset")}>Reset password</Button></div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{person.isActive ? "Deactivate user" : "Reactivate user"}</p><p className="text-xs text-muted">{person.isActive ? "They can no longer sign in and receive no notifications. History is kept." : "They can sign in again and receive notifications."}</p></div>
              {person.isActive ? <Button variant="danger" onClick={() => setDialog("deactivate")}>Deactivate</Button> : <Button variant="secondary" onClick={() => toggle(true)}>Reactivate</Button>}</div>
          </div>
        </Card>
      </div>
      <ConfirmDialog open={dialog === "reset"} title="Reset password?" confirmLabel="Reset password" danger={false} onCancel={() => setDialog(null)}
        description={`${person.name}'s current password stops working. You will see a temporary password once.`} onConfirm={() => { setTemp(admin.resetPassword(person.id)); setDialog(null); setFlash(null); }} />
      <ConfirmDialog open={dialog === "deactivate"} title={`Deactivate ${person.name}?`} confirmLabel="Deactivate" onCancel={() => setDialog(null)}
        description="They can no longer sign in, open sessions end at once, and they receive no notifications. History is kept." onConfirm={() => toggle(false)} />
    </>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-surface-subtle px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="font-bold">{value}</p></div>;
}
