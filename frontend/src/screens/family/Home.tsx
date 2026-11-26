import { useAuth } from "../../auth/AuthContext";
import { AlertBadge, AlertStatusBadge, Card, EmptyState, Icon, LiveIndicator, PageHeader, SectionHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/store";
import type { Alert, PatientCard } from "../../data/types";
import { aidName, time, when } from "../../lib/format";
import { levelName, stateName } from "../nurse/shared";

/** One plain sentence about what happened. Family never sees detector numbers or staff names. */
function whatHappened(a: Alert, patient: PatientCard) {
  const aid = (patient.prescribedAid ?? "aid").toLowerCase();
  if (a.level === "emergency") return `A possible fall was reported for ${patient.name}.`;
  if (a.detection.aidLabel === "none") return `${patient.name} was not using the ${aid}.`;
  return `${patient.name} was using a ${a.detection.aidLabel} instead of the ${aid}.`;
}

/** Words for the state of an alert, written for a reader who is not on the care team. */
function progress(a: Alert) {
  if (a.status === "closed") return { badge: <StatusBadge status="Resolved" />, note: "Acknowledged by a nurse" };
  if (a.status === "acknowledged") return { badge: <AlertStatusBadge status="acknowledged" />, note: "Acknowledged by a nurse" };
  return { badge: <AlertStatusBadge status="pending" />, note: "Waiting for a nurse to respond", waiting: true };
}

function StatusCard({ patient, pending }: { patient: PatientCard; pending: Alert | undefined }) {
  const aid = (patient.prescribedAid ?? "aid").toLowerCase();
  const attention = Boolean(pending);
  const last = patient.lastDetection;
  return (
    <Card as="article" className={attention ? "border-warning" : ""}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary" aria-hidden="true">{patient.initials}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">{patient.name}</h2>
          <p className="text-sm text-muted">Room {patient.room}</p>
        </div>
        {pending ? <AlertBadge level={levelName(pending.level)} /> : <StatusBadge status={stateName(patient.state)} />}
      </div>

      <div className={`mt-4 flex items-start gap-3 rounded-xl p-4 ${attention ? "bg-warning-soft" : "bg-ok-soft"}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface" aria-hidden="true"><Icon name={attention ? "alert" : "check"} size={22} /></span>
        <div>
          <p className="text-lg font-bold">
            {pending
              ? pending.detection.aidLabel === "none"
                ? `Needs attention: not using the ${aid} at ${time(pending.detection.timestamp).replace(" UTC", "")}`
                : `Needs attention: not using the ${aid} as prescribed`
              : last ? `Using the ${aid} as prescribed` : "No recent information"}
          </p>
          <p className="text-sm">{pending ? "The care team has been notified." : last ? "Everything looks as expected right now." : "We have not seen your family member yet today."}</p>
        </div>
      </div>

      <dl className="mt-4 grid border-t border-border pt-4 sm:grid-cols-2 sm:divide-x sm:divide-border">
        <div className="py-2 sm:pr-4"><dt className="text-xs text-muted">Last seen</dt><dd className="font-bold">{last ? time(last.timestamp) : "—"}</dd></div>
        <div className="border-t border-border py-2 sm:border-t-0 sm:pl-4"><dt className="text-xs text-muted">Prescribed aid</dt><dd className="font-bold">{patient.prescribedAid ? aidName(patient.prescribedAid) : "Not set"}</dd></div>
      </dl>
    </Card>
  );
}

const MEANINGS = [
  { level: "Warning", text: "The prescribed aid was not being used, so a nurse was told." },
  { level: "Escalated", text: "A nurse did not respond in time, so family was also told." },
  { level: "Emergency", text: "A possible fall was reported, so a nurse and family were told." },
] as const;

export function FamilyHome() {
  const { user } = useAuth();
  const data = useData();
  if (!user) return null;
  const patients = data.patientsFor(user);
  // Family is told about warnings and above, never about low-level information.
  const alerts = data.alertsFor(user).filter((a) => a.level !== "info");

  return (
    <>
      <PageHeader eyebrow="Family home" title={`Hello, ${user.name}`} description="A simple update about your family member." action={<LiveIndicator updated={time(data.updatedAt).replace(" UTC", "")} />} />
      <div className="grid gap-5">
        {patients.length === 0 ? (
          <EmptyState title="No patient is linked to your account yet.">Please ask the care home to link your family member.</EmptyState>
        ) : (
          patients.map((p) => <StatusCard key={p.id} patient={p} pending={alerts.filter((a) => a.patient.id === p.id && a.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]} />)
        )}

        <Card>
          <SectionHeader title="Alert history" description="Important updates shared with you and the care team." />
          {alerts.length === 0 ? (
            <EmptyState title="No alerts so far.">Updates that need attention will appear here.</EmptyState>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {alerts.map((a) => {
                const p = progress(a);
                const patient = patients.find((x) => x.id === a.patient.id)!;
                return (
                  <li key={a.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] md:items-center">
                    <div className="flex items-center justify-between gap-2 md:grid md:justify-start">
                      <AlertBadge level={levelName(a.level)} />
                      <span className="text-xs text-muted md:mt-1">{when(a.createdAt)}</span>
                    </div>
                    <div>
                      <p className="font-bold">{a.detection.roomId} · {aidName(a.detection.aidLabel)}</p>
                      <p className="text-sm text-muted">{whatHappened(a, patient)}</p>
                      <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${"waiting" in p ? "text-muted" : "text-ok"}`}><Icon name={"waiting" in p ? "clock" : "check"} size={15} />{p.note}</p>
                    </div>
                    <span className="md:justify-self-end">{p.badge}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card as="div">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden="true"><Icon name="info" /></span>
            <div>
              <h2 className="text-lg font-semibold">What do these alerts mean?</h2>
              <p className="text-sm text-muted">These words show how quickly the care team needs to respond.</p>
            </div>
          </div>
          <ul className="grid gap-3 md:grid-cols-3">
            {MEANINGS.map((m) => (
              <li key={m.level} className="grid content-start gap-2 rounded-xl border border-border p-4">
                <span><AlertBadge level={m.level} /></span>
                <p className="text-sm text-muted">{m.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs font-semibold text-muted"><Icon name="eyeOff" size={16} />No camera images are captured.</p>
        </Card>
      </div>
    </>
  );
}
