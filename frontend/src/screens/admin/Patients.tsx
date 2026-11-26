import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader, Segmented, StatusBadge } from "../../components/ui";
import { useAdmin } from "../../data/admin";
import { aidName } from "../../lib/format";
import { textLink } from "../nurse/shared";

const FILTERS = ["Active", "Discharged", "All"] as const;
const th = "px-4 py-3 text-left text-xs font-semibold text-muted";

export function AdminPatients() {
  const { patients } = useAdmin();
  const nav = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Active");
  const [q, setQ] = useState("");
  const rows = useMemo(() => patients.filter((p) =>
    (filter === "All" || p.status === filter.toLowerCase()) &&
    `${p.name} ${p.code} ${p.room ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())), [patients, filter, q]);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Patients" description="Manage enrolled patients, prescriptions, caregivers, and consent." action={<Button size="large" onClick={() => nav("/admin/patients/new")}>Add patient</Button>} />
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-60 flex-1 md:max-w-sm">
          <label htmlFor="patient-search" className="sr-only">Search name, code, or room</label>
          <input id="patient-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, or room" className="min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 placeholder:text-muted" />
        </div>
        <Segmented label="Patient status" options={FILTERS} value={filter} onChange={setFilter} />
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No patients match.">Try another search or filter.</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-subtle"><tr>{["Name", "Code", "Room", "Prescribed aid", "Caregivers", "Status"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2"><Link to={`/admin/patients/${p.id}`} className={textLink}>{p.name}</Link></td>
                    <td className="px-4 py-2">{p.code}</td>
                    <td className="px-4 py-2">{p.room ?? "—"}</td>
                    <td className="px-4 py-2">{p.prescribedAid ? aidName(p.prescribedAid) : "—"}</td>
                    <td className="px-4 py-2">{p.contacts.length}</td>
                    <td className="px-4 py-2"><StatusBadge status={p.status === "active" ? "Active" : "Discharged"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {rows.map((p) => (
              <li key={p.id} className="grid gap-2 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2"><Link to={`/admin/patients/${p.id}`} className={textLink}>{p.name}</Link><StatusBadge status={p.status === "active" ? "Active" : "Discharged"} /></div>
                <p className="text-xs text-muted">{p.code} · Room {p.room ?? "—"} · {p.prescribedAid ? aidName(p.prescribedAid) : "No aid set"} · {p.contacts.length} caregivers</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
