import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AlertBadge, AlertStatusBadge, Card, EmptyState, Segmented, StatusBadge } from "../../components/ui";
import { useData } from "../../data/store";
import { aidName, percent, time, when } from "../../lib/format";
import { NotFound } from "../Placeholder";
import { levelName, stateName, textLink } from "./shared";

const TABS = ["Alerts", "Detections"] as const;
const th = "px-4 py-3 text-left text-xs font-semibold text-muted";
const td = "px-4 py-3 align-top";

export function PatientPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const data = useData();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Alerts");
  const patient = user && /^\d+$/.test(id ?? "") ? data.patientFor(user, Number(id)) : null;
  if (!user || !patient) return <NotFound />;

  const alerts = data.alertsFor(user).filter((a) => a.patient.id === patient.id && a.level !== "info");
  const detections = data.detectionsFor(user, patient.id);

  return (
    <>
      <Link to="/dashboard" className={`${textLink} mb-1 text-sm`}>‹ Dashboard</Link>
      <Card className="mb-5 flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary" aria-hidden="true">{patient.initials}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Patient profile</p>
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <p className="text-sm text-muted">{patient.code} · Room {patient.room} · Prescribed {patient.prescribedAid ? aidName(patient.prescribedAid).toLowerCase() : "aid not set"}</p>
        </div>
        <StatusBadge status={stateName(patient.state)} />
      </Card>

      <div className="mb-4"><Segmented label="Patient sections" options={TABS} value={tab} onChange={setTab} /></div>

      {tab === "Alerts" &&
        (alerts.length === 0 ? (
          <EmptyState title="No alerts so far.">Alerts for this patient will appear here.</EmptyState>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-subtle"><tr><th scope="col" className={th}>Alert</th><th scope="col" className={th}>Location and aid</th><th scope="col" className={th}>Status</th><th scope="col" className={th}>Acknowledged</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {alerts.map((a) => (
                    <tr key={a.id}>
                      <td className={td}><Link to={`/alerts/${a.id}`} className="grid gap-1 rounded-lg" aria-label={`${levelName(a.level)} alert, ${when(a.createdAt)}`}><span><AlertBadge level={levelName(a.level)} /></span><span className="text-xs text-muted">{when(a.createdAt)}</span></Link></td>
                      <td className={td}>{a.detection.roomId} · {aidName(a.detection.aidLabel)}</td>
                      <td className={td}><AlertStatusBadge status={a.status} /></td>
                      <td className={td}>{a.acknowledgedBy && a.acknowledgedAt ? `${a.acknowledgedBy.name} · ${when(a.acknowledgedAt)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-3 md:hidden">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link to={`/alerts/${a.id}`} className="grid gap-2 rounded-xl border border-border bg-surface p-4" aria-label={`${levelName(a.level)} alert, ${when(a.createdAt)}`}>
                    <span className="flex items-center justify-between gap-2"><AlertBadge level={levelName(a.level)} /><AlertStatusBadge status={a.status} /></span>
                    <span className="text-xs text-muted">{when(a.createdAt)}</span>
                    <span className="text-sm">{a.detection.roomId} · {aidName(a.detection.aidLabel)}</span>
                    <span className="text-xs text-muted">{a.acknowledgedBy && a.acknowledgedAt ? `Acknowledged by ${a.acknowledgedBy.name} · ${when(a.acknowledgedAt)}` : "Not acknowledged yet"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ))}

      {tab === "Detections" &&
        (detections.length === 0 ? (
          <EmptyState title="No detections yet.">Detections of this patient will appear here.</EmptyState>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-subtle"><tr><th scope="col" className={th}>Time</th><th scope="col" className={th}>Location and aid</th><th scope="col" className={th}>Aid confidence</th><th scope="col" className={th}>Identity confidence</th><th scope="col" className={th}>Review</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {detections.map((d) => (
                    <tr key={d.id}>
                      <td className={td}>{when(d.timestamp)}</td>
                      <td className={td}>{d.roomId} · {aidName(d.aidLabel)}</td>
                      <td className={td}>{percent(d.aidConfidence)}</td>
                      <td className={td}>{percent(d.identityConfidence)}</td>
                      <td className={td}>{d.needsReview ? <StatusBadge status="Needs review" /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-3 md:hidden">
              {detections.map((d) => (
                <li key={d.id} className="grid gap-1 rounded-xl border border-border bg-surface p-4">
                  <span className="flex items-center justify-between gap-2"><b>{d.roomId} · {aidName(d.aidLabel)}</b>{d.needsReview && <StatusBadge status="Needs review" />}</span>
                  <span className="text-xs text-muted">{when(d.timestamp)}</span>
                  <span className="text-xs text-muted">Aid {percent(d.aidConfidence)} · Identity {percent(d.identityConfidence)}</span>
                </li>
              ))}
            </ul>
          </>
        ))}
      <p className="sr-only">{time(data.updatedAt)}</p>
    </>
  );
}
