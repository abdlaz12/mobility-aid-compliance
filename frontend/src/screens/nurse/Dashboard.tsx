import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AlertBadge, AlertStatusBadge, Button, Card, EmptyState, LiveIndicator, Notice, PageHeader, SectionHeader, StatusBadge } from "../../components/ui";
import { bySeverity, useData, type AckResult } from "../../data/store";
import type { Alert } from "../../data/types";
import { aidName, greeting, percent, time, when } from "../../lib/format";
import { accent, levelName, stateName, textLink } from "./shared";

type Banner = { tone: "success" | "warning"; title: string; text: string } | null;

function PendingCard({ alert, onAck }: { alert: Alert; onAck: (a: Alert) => void }) {
  const escalated = alert.level === "escalated" || alert.level === "emergency";
  return (
    <li className={`rounded-xl border border-border border-l-4 bg-surface p-4 ${accent[alert.level]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AlertBadge level={levelName(alert.level)} />
        <span className="text-xs text-muted">{time(alert.detection.timestamp)}</span>
      </div>
      <h3 className="mt-3 text-base">
        <Link to={`/alerts/${alert.id}`} className={`${textLink} text-fg`}>{alert.patient.name}</Link>
      </h3>
      <p className="text-xs text-muted">{alert.patient.code} · Room {alert.detection.roomId}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr]">
        <div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-muted">Detected aid</dt><dd className="text-sm font-bold">{aidName(alert.detection.aidLabel)}</dd></div>
        <div className="rounded-lg bg-surface-subtle p-3">
          <dt className="text-xs text-muted">Deadline</dt>
          <dd className="text-sm font-bold">
            {alert.ackDeadline && !escalated ? `Acknowledge before ${time(alert.ackDeadline)}, or it escalates` : alert.ackDeadline ? `Passed at ${time(alert.ackDeadline)}` : "Acknowledge as soon as possible"}
          </dd>
        </div>
      </dl>
      {alert.escalatedAt && <p className="mt-3 rounded-lg bg-escalated-soft px-3 py-2 text-xs font-semibold text-escalated">Escalated {time(alert.escalatedAt)}: nurse and family were notified</p>}
      <Button className="mt-3 w-full" onClick={() => onAck(alert)}>Acknowledge<span className="sr-only"> alert for {alert.patient.name}</span></Button>
    </li>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const data = useData();
  const [banner, setBanner] = useState<Banner>(null);
  if (!user) return null;

  const alerts = data.alertsFor(user);
  const pending = alerts.filter((a) => a.status === "pending").sort(bySeverity);
  const recent = alerts.filter((a) => a.status !== "pending" && a.level !== "info").slice(0, 5);
  const patients = data.patientsFor(user);
  const review = data.reviewFor(user);

  function acknowledge(alert: Alert) {
    const r: AckResult = data.acknowledge(alert.id, user!);
    if (r.ok) setBanner({ tone: "success", title: `${levelName(alert.level)} acknowledged`, text: `${alert.patient.name} was acknowledged at ${time(r.at)}. The dashboard is up to date.` });
    else if (r.reason === "already") setBanner({ tone: "warning", title: "Already acknowledged", text: `${r.by} acknowledged this alert at ${time(r.at)}. Nothing was changed.` });
  }

  return (
    <>
      <PageHeader
        eyebrow={user.role === "admin" ? "Admin dashboard" : "Nurse dashboard"}
        title={`${greeting()}, ${user.name}`}
        description={user.role === "admin" ? "All patients and alerts in real time." : "Assigned patient status and alerts in real time."}
        action={<LiveIndicator updated={data.updatedAt.slice(11, 16)} />}
      />
      {banner && (
        <div className="mb-4 flex items-start gap-2">
          <div className="flex-1"><Notice tone={banner.tone} title={banner.title}>{banner.text}</Notice></div>
          <Button variant="secondary" onClick={() => setBanner(null)} aria-label="Dismiss message">Dismiss</Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <Card className="lg:col-start-1 lg:row-start-1">
          <SectionHeader title="Pending alerts" count={pending.length} />
          {pending.length === 0 ? (
            <EmptyState title="All patients are fine right now.">New alerts will appear here.</EmptyState>
          ) : (
            <ul className="grid gap-3">{pending.map((a) => <PendingCard key={a.id} alert={a} onAck={acknowledge} />)}</ul>
          )}
        </Card>

        <Card className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <SectionHeader title="Patients" count={patients.length} />
          <ul className="grid gap-3">
            {patients.map((p) => (
              <li key={p.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/patients/${p.id}`} className={textLink}>{p.name}</Link>
                  <StatusBadge status={stateName(p.state)} />
                </div>
                <p className="text-xs text-muted">{p.code} · Room {p.room}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                  <div><dt className="text-xs text-muted">Prescribed aid</dt><dd className="text-sm font-bold">{p.prescribedAid ? aidName(p.prescribedAid) : "Not set"}</dd></div>
                  <div><dt className="text-xs text-muted">Last seen</dt><dd className="text-sm font-bold">{p.lastDetection ? `${aidName(p.lastDetection.aidLabel)} · ${time(p.lastDetection.timestamp)}` : "No detections yet"}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-start-1 lg:row-start-2">
          <SectionHeader title="Review queue" description="Low-confidence detections create no alert." count={review.length} />
          {review.length === 0 ? (
            <EmptyState title="Nothing to review.">Detections the system is unsure about will appear here.</EmptyState>
          ) : (
            <ul className="grid gap-3">
              {review.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-bold text-primary" aria-hidden="true">{r.patient?.initials}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">Room {r.roomId} · {aidName(r.aidLabel)}</p>
                    <p className="text-xs text-muted">Aid {percent(r.aidConfidence)} · Identity {percent(r.identityConfidence)}</p>
                    <p className="text-xs text-muted">{time(r.timestamp)}</p>
                  </div>
                  <StatusBadge status="Needs review" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Part A of the gap list: the backend lists every alert, the design only showed the pending ones. */}
        <Card className="lg:col-start-1 lg:row-start-3">
          <SectionHeader title="Recent alerts" description="Alerts that were acknowledged or closed." count={recent.length} />
          {recent.length === 0 ? (
            <EmptyState title="No recent alerts.">Handled alerts will appear here.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
                  <AlertBadge level={levelName(a.level)} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/alerts/${a.id}`} className={`${textLink} text-fg`}>{a.patient.name}</Link>
                    <p className="text-xs text-muted">
                      {a.status === "closed" && a.closedAt ? `Closed ${when(a.closedAt)}` : a.acknowledgedAt ? `Acknowledged by ${a.acknowledgedBy?.name} · ${when(a.acknowledgedAt)}` : ""}
                    </p>
                  </div>
                  <AlertStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
