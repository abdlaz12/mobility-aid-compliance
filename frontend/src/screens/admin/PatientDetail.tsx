import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, ConfirmDialog, EmptyState, Icon, Input, Notice, SectionHeader, Select, StatusBadge, Checkbox } from "../../components/ui";
import { AIDS, ROOMS, useAdmin } from "../../data/admin";
import type { PatientAdmin } from "../../data/types";
import { aidName } from "../../lib/format";
import { NotFound } from "../Placeholder";
import { textLink } from "../nurse/shared";

const TABS = ["Details", "Prescribed aid", "Caregivers", "ReID enrolment", "Danger zone"] as const;
type Tab = (typeof TABS)[number];
type Dialog = "delete-all" | "withdraw" | "discharge" | "reactivate" | { sample: number } | null;
const AID_OPTIONS = AIDS.map(aidName);

export function PatientDetail() {
  const { id } = useParams();
  const admin = useAdmin();
  const patient = /^\d+$/.test(id ?? "") ? admin.patient(Number(id)) : null;
  const [tab, setTab] = useState<Tab>("Details");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [alsoDelete, setAlsoDelete] = useState(false);
  const [flash, setFlash] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  if (!patient) return <NotFound />;
  const samples = admin.samples(patient.id);
  const close = () => { setDialog(null); setAlsoDelete(false); };
  const done = (text: string) => { setFlash({ tone: "success", text }); close(); };

  return (
    <>
      <Link to="/admin/patients" className={`${textLink} mb-1 text-sm`}>‹ Patients</Link>
      <Card className="mb-5 flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary" aria-hidden="true">{patient.initials}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Patient record</p>
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <p className="text-sm text-muted">{patient.code} · Room {patient.room ?? "—"} · {patient.prescribedAid ? `${aidName(patient.prescribedAid)} prescribed` : "No aid set"}</p>
        </div>
        <StatusBadge status={patient.status === "active" ? "Active" : "Discharged"} />
      </Card>

      {flash && <div className="mb-5"><Notice tone={flash.tone}>{flash.text}</Notice></div>}

      <div className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start">
        <nav aria-label="Patient sections" className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-2 md:grid">
          {TABS.map((t) => (
            <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => { setTab(t); setFlash(null); }}
              className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-bold ${tab === t ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-subtle"}`}>
              {t}<span className="hidden md:inline" aria-hidden="true">›</span>
            </button>
          ))}
        </nav>

        <Card>
          {tab === "Details" && <DetailsTab patient={patient} key={patient.id} onSaved={() => done("Changes saved.")} />}
          {tab === "Prescribed aid" && <PrescriptionTab patient={patient} onChanged={(aid) => done(`Prescription changed to ${aidName(aid).toLowerCase()}.`)} />}
          {tab === "Caregivers" && <CaregiversTab patient={patient} onSaved={() => done("Caregivers saved.")} />}
          {tab === "ReID enrolment" && (
            <div className="grid gap-5">
              <SectionHeader title="ReID enrolment" description={`${samples.length} calibration sample${samples.length === 1 ? "" : "s"}${patient.reid.lastAddedAt ? `, last added ${patient.reid.lastAddedAt}` : ""}`} />
              <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-4 text-sm"><Icon name="lock" size={18} /><p><strong>Embeddings are biometric data.</strong> They are visible to admins only.</p></div>

              <ConsentPanel patient={patient} onWithdraw={() => setDialog("withdraw")} />
              <UploadPanel patient={patient} onAdded={(n) => done(`${n} calibration sample${n === 1 ? "" : "s"} added.`)} />

              <h3 className="text-base font-semibold">Calibration samples</h3>
              {samples.length === 0 ? (
                <EmptyState title="No calibration samples">Add samples above once consent is recorded.</EmptyState>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {samples.map((s, i) => (
                    <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-2 p-3 md:grid-cols-[6rem_1fr_1fr_1fr_auto]">
                      <strong>Sample {String(samples.length - i).padStart(2, "0")}</strong>
                      <span className="text-sm md:order-none"><span className="text-muted md:sr-only">Aid state: </span>{aidName(s.aid)}</span>
                      <span className="text-sm"><span className="text-muted md:sr-only">Assisted: </span>{s.isAssisted ? "Yes" : "No"}</span>
                      <span className="text-sm"><span className="text-muted md:sr-only">Added: </span>{s.createdAt}</span>
                      <Button variant="secondary" aria-label={`Delete sample ${String(samples.length - i).padStart(2, "0")}`} onClick={() => setDialog({ sample: s.id })} className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">Delete</Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div><strong>Delete all embeddings</strong><p className="text-sm text-muted">Removes all ReID calibration data for this patient.</p></div>
                <Button variant="danger" disabled={samples.length === 0} onClick={() => setDialog("delete-all")}>Delete all embeddings</Button>
              </div>
            </div>
          )}
          {tab === "Danger zone" && (
            <div className="grid gap-4">
              <SectionHeader title="Danger zone" description="These changes affect monitoring and alert delivery." />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="max-w-prose"><h3 className="font-bold">Discharge patient</h3><p className="text-sm text-muted">Keeps the patient’s history, stops monitoring alerts, and offers to delete ReID embeddings.</p></div>
                <Button variant="danger" disabled={patient.status === "discharged"} onClick={() => setDialog("discharge")}>Discharge patient</Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="max-w-prose"><h3 className="font-bold">Reactivate patient</h3><p className="text-sm text-muted">Restarts monitoring and alerts using the current patient settings.</p></div>
                <Button variant="secondary" disabled={patient.status === "active"} onClick={() => setDialog("reactivate")}>Reactivate</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog open={dialog === "delete-all"} title="Delete all embeddings?" confirmLabel="Delete all embeddings" onCancel={close}
        description={`This permanently deletes every ReID embedding and calibration sample for ${patient.name}. Identification will stop until new samples are enrolled. Patient history and alerts are not deleted.`}
        onConfirm={() => { admin.deleteAllSamples(patient.id); done("All embeddings were deleted."); }} />
      <ConfirmDialog open={typeof dialog === "object" && dialog !== null} title="Delete this sample?" confirmLabel="Delete sample" onCancel={close}
        description="This permanently deletes one calibration sample. Other samples are kept."
        onConfirm={() => { if (typeof dialog === "object" && dialog) admin.deleteSample(patient.id, dialog.sample); done("Sample deleted."); }} />
      <ConfirmDialog open={dialog === "withdraw"} title="Withdraw consent?" confirmLabel="Withdraw consent" onCancel={close}
        description={`Monitoring and identification of ${patient.name} will stop until consent is recorded again. This cannot be undone by the system.`}
        onConfirm={() => { admin.withdrawConsent(patient.id, alsoDelete); done(alsoDelete ? "Consent withdrawn and embeddings deleted." : "Consent withdrawn."); }}>
        <Checkbox label="Also permanently delete all ReID embeddings" checked={alsoDelete} onChange={(e) => setAlsoDelete(e.target.checked)} />
      </ConfirmDialog>
      <ConfirmDialog open={dialog === "discharge"} title={`Discharge ${patient.name}?`} confirmLabel="Discharge patient" onCancel={close}
        description="The patient’s history will be kept, monitoring and new alerts will stop, and assigned caregivers will retain access to past alerts."
        onConfirm={() => { admin.discharge(patient.id, alsoDelete); done(alsoDelete ? "Patient discharged and embeddings deleted." : "Patient discharged."); }}>
        <Checkbox label="Also permanently delete all ReID embeddings" checked={alsoDelete} onChange={(e) => setAlsoDelete(e.target.checked)} />
      </ConfirmDialog>
      <ConfirmDialog open={dialog === "reactivate"} title={`Reactivate ${patient.name}?`} confirmLabel="Reactivate patient" danger={false} onCancel={close}
        description="Monitoring and alerts will restart immediately using the current room, prescribed aid, caregiver assignments, and any retained ReID embeddings."
        onConfirm={() => { admin.reactivate(patient.id); done("Patient reactivated."); }} />
    </>
  );

}

function DetailsTab({ patient: p, onSaved }: { patient: PatientAdmin; onSaved: () => void }) {
  const admin = useAdmin();
  const [err, setErr] = useState<Record<string, string>>({});
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    if (!name) return setErr({ name: "Enter the patient's full name." });
    admin.updatePatient(p.id, { name, initials: String(f.get("initials") ?? ""), age: String(f.get("age") ?? ""), room: String(f.get("room") ?? "") });
    onSaved();
  }
  return (
    <form onSubmit={save} noValidate className="grid gap-4">
      <SectionHeader title="Details" description={`Patient code ${p.code} cannot be changed.`} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="name" label="Full name" defaultValue={p.name} error={err.name} />
        <Input name="initials" label="Initials (optional)" defaultValue={p.initials} maxLength={4} />
        <Input name="age" label="Age (optional)" type="number" defaultValue={p.age ?? ""} />
        <Select name="room" label="Room" defaultValue={p.room ?? ""} options={[...new Set([p.room, ...ROOMS].filter((r): r is string => !!r))]} hint={`Current room: ${p.room ?? "none"}`} />
      </div>
      <div className="flex justify-end"><Button type="submit">Save changes</Button></div>
    </form>
  );
}

function PrescriptionTab({ patient: p, onChanged }: { patient: PatientAdmin; onChanged: (aid: string) => void }) {
  const admin = useAdmin();
  const [choice, setChoice] = useState("");
  const [err, setErr] = useState("");
  const current = p.prescriptions.find((r) => r.validTo === null);
  return (
    <div className="grid gap-4">
      <SectionHeader title="Prescribed aid" description="Alerts compare the detected aid with the current prescription." />
      <div className="rounded-xl bg-primary-soft p-4"><p className="text-xs text-muted">Current</p><p className="text-xl font-bold">{p.prescribedAid ? aidName(p.prescribedAid) : "None"}</p>{current && <p className="text-xs text-muted">Since {current.validFrom}</p>}</div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><Select label="Change prescription" options={AID_OPTIONS} value={choice} onChange={(e) => { setChoice(e.target.value); setErr(""); }} error={err} /></div>
        <Button disabled={!choice} onClick={() => { const r = admin.changePrescription(p.id, choice.toLowerCase()); if (r.ok) onChanged(choice); else setErr(r.error); }}>Change prescription</Button>
      </div>
      <h3 className="text-base font-semibold">Prescription history</h3>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {p.prescriptions.map((r, i) => <li key={i} className="flex flex-wrap justify-between gap-2 p-3"><strong>{aidName(r.aid)}</strong><span className="text-sm text-muted">{r.validTo ? `${r.validFrom} to ${r.validTo}` : `${r.validFrom} · Current`}</span></li>)}
      </ul>
    </div>
  );
}

function CaregiversTab({ patient: p, onSaved }: { patient: PatientAdmin; onSaved: () => void }) {
  const admin = useAdmin();
  const [chosen, setChosen] = useState(() => new Set(p.contacts.map((c) => c.id)));
  const [err, setErr] = useState("");
  const assigned = new Set(p.contacts.map((c) => c.id));
  // Inactive people stay listed while they are assigned, so the admin can see and remove them.
  const people = admin.users.filter((u) => u.role !== "admin" && (u.isActive || assigned.has(u.id)));
  const toggle = (uid: number) => setChosen((s) => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  const group = (role: "nurse" | "family", legend: string) => (
    <fieldset className="grid content-start gap-1 rounded-xl border border-border p-3">
      <legend className="px-1 text-sm font-bold">{legend}</legend>
      {people.filter((u) => u.role === role).map((u) => <Checkbox key={u.id} label={u.name} hint={u.isActive ? undefined : "Inactive: remove to save"} checked={chosen.has(u.id)} onChange={() => toggle(u.id)} />)}
    </fieldset>
  );
  return (
    <div className="grid gap-4">
      <SectionHeader title="Caregivers" description="Choose who is assigned to this patient." />
      <div className="grid gap-4 md:grid-cols-2">{group("nurse", "Nurses")}{group("family", "Family members")}</div>
      {err && <Notice tone="warning">{err}</Notice>}
      <div className="flex justify-end"><Button onClick={() => { const r = admin.setCaregivers(p.id, [...chosen]); if (r.ok) onSaved(); else setErr(r.error); }}>Save caregivers</Button></div>
    </div>
  );
}

function ConsentPanel({ patient: p, onWithdraw }: { patient: PatientAdmin; onWithdraw: () => void }) {
  const admin = useAdmin();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
      <div>
        <h3 className="font-bold">Consent</h3>
        <p className="text-sm text-muted">{p.consent ? `Recorded from ${p.consent.by === "patient" ? "the patient" : "a substitute decision-maker"} on ${p.consent.at}.` : "No consent is recorded. Monitoring, identification and calibration samples are stopped."}</p>
      </div>
      {p.consent
        ? <Button variant="danger" onClick={onWithdraw}>Withdraw consent</Button>
        : <Button variant="secondary" onClick={() => admin.recordConsent(p.id, "patient")}>Record consent from patient</Button>}
    </div>
  );
}

function UploadPanel({ patient: p, onAdded }: { patient: PatientAdmin; onAdded: (n: number) => void }) {
  const admin = useAdmin();
  const [aid, setAid] = useState(p.prescribedAid ? aidName(p.prescribedAid) : "None");
  const [assisted, setAssisted] = useState(false);
  const [files, setFiles] = useState(0);
  const [err, setErr] = useState("");
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <div><h3 className="font-bold">Upload calibration samples</h3><p className="text-sm text-muted">Choose the patient’s aid state when each sample was recorded.</p></div>
      <Select label="Current aid state" options={AID_OPTIONS} value={aid} onChange={(e) => setAid(e.target.value)} />
      <Checkbox label="Recorded with a helper (assisted walking)" checked={assisted} onChange={(e) => setAssisted(e.target.checked)} />
      <label className="grid min-h-11 cursor-pointer gap-1 rounded-xl border border-dashed border-border-strong p-4 text-sm">
        <strong>Choose calibration samples</strong>
        <span className="text-muted">{files ? `${files} file${files === 1 ? "" : "s"} chosen` : "No camera images are shown in alerts or notifications."}</span>
        <input type="file" multiple className="sr-only" onChange={(e) => { setFiles(e.target.files?.length ?? 0); setErr(""); }} />
      </label>
      {err && <Notice tone="warning">{err}</Notice>}
      <div><Button disabled={!p.consent} onClick={() => { const r = admin.addSamples(p.id, aid.toLowerCase(), assisted, files); if (r.ok) onAdded(files); else setErr(r.error); }}>Add samples</Button></div>
    </div>
  );
}
