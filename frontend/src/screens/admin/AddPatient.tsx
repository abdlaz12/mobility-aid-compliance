import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input, PageHeader, Select } from "../../components/ui";
import { AIDS, useAdmin } from "../../data/admin";
import { aidName } from "../../lib/format";
import { textLink } from "../nurse/shared";

const AID_OPTIONS = AIDS.map(aidName);

export function AddPatient() {
  const admin = useAdmin();
  const nav = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const next: Record<string, string> = {};
    if (!v("code")) next.code = "Enter a patient code.";
    if (!v("name")) next.name = "Enter the patient's full name.";
    if (v("age") && (Number(v("age")) < 0 || Number(v("age")) > 120)) next.age = "Enter an age between 0 and 120.";
    if (!v("room")) next.room = "Enter or choose a room.";
    else if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,31}$/.test(v("room"))) next.room = "Use up to 32 letters, digits, spaces, dots, dashes or underscores.";
    if (!v("aid")) next.aid = "Choose the prescribed aid.";
    // The design marks consent as required; the backend only needs it to enrol ReID. The form enforces it (docs/frontend-backlog.md, C).
    if (!v("consent")) next.consent = "Record who gave consent.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const r = admin.addPatient({ code: v("code"), name: v("name"), initials: v("initials"), age: v("age"), room: v("room"), aid: v("aid").toLowerCase(), consentBy: v("consent") as "patient" | "substitute" });
    if (!r.ok) return setErrors({ code: r.error });
    nav(`/admin/patients/${r.id}`);
  }

  return (
    <>
      <Link to="/admin/patients" className={`${textLink} mb-1 text-sm`}>‹ Patients</Link>
      <PageHeader eyebrow="New enrolment" title="Add patient" description="Record identity, care details, and consent before monitoring begins." />
      <Card>
        <form onSubmit={submit} noValidate className="grid gap-6">
          <section className="grid gap-4">
            <div><h2 className="text-lg font-semibold">Patient details</h2><p className="text-sm text-muted">Full names are visible only to signed-in care staff and admins.</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="code" label="Patient code" placeholder="P-0044" hint="Cannot be changed later. Used in detection events and the ReID gallery." error={errors.code} />
              <Input name="name" label="Full name" placeholder="Enter full name" error={errors.name} />
              <Input name="initials" label="Initials (optional)" placeholder="DP" hint="Derived from the name if left blank." maxLength={4} />
              <Input name="age" label="Age (optional)" type="number" inputMode="numeric" placeholder="Enter age" error={errors.age} />
            </div>
          </section>
          <section className="grid gap-4 border-t border-border pt-6">
            <h2 className="text-lg font-semibold">Room and prescribed aid</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input name="room" label="Room" list="known-rooms" placeholder="R-204" autoComplete="off" hint="Pick a known room or type a new one. It is created when you save." error={errors.room} />
                <datalist id="known-rooms">{admin.rooms.map((r) => <option key={r} value={r} />)}</datalist>
              </div>
              <Select name="aid" label="Prescribed aid" options={AID_OPTIONS} error={errors.aid} />
            </div>
          </section>
          <fieldset className="grid gap-3 rounded-xl border border-border-strong bg-primary-soft p-4">
            <legend className="px-2 font-bold">Required consent</legend>
            <p className="text-sm">Consent for monitoring and identification recorded from:</p>
            <div className="flex flex-wrap gap-x-6">
              {[["patient", "Patient"], ["substitute", "Substitute decision-maker"]].map(([value, label]) => (
                <label key={value} className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="radio" name="consent" value={value} className="size-5 accent-[#0b695b]" />{label}</label>
              ))}
            </div>
            {errors.consent && <p role="alert" className="text-xs font-semibold text-emergency">{errors.consent}</p>}
            <p className="text-xs text-muted">The date is recorded automatically. Required before monitoring, identification, or calibration samples can be recorded.</p>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => nav("/admin/patients")}>Cancel</Button>
            <Button type="submit">Add patient</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
