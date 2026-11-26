import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AlertBadge, Button, Card, DeliveryBadge, Icon, Notice, SectionHeader } from "../../components/ui";
import { useData } from "../../data/store";
import type { Alert, DeliveryRow } from "../../data/types";
import { aidName, time } from "../../lib/format";
import { NotFound } from "../Placeholder";
import { levelName, textLink } from "./shared";

type StepState = "done" | "future" | "skipped";
type Step = { title: string; detail: string; at: string | null; state: StepState };

function stepsFor(a: Alert, deliveries: DeliveryRow[]): Step[] {
  const firstWave = [...new Set(deliveries.filter((d) => d.trigger === "intake").map((d) => d.recipient.name))].join(", ");
  const escalated = a.escalatedAt !== null;
  return [
    { title: "Detected", detail: `${aidName(a.detection.aidLabel)} · Room ${a.detection.roomId}`, at: a.detection.timestamp, state: "done" },
    { title: "Notified", detail: firstWave || "No one was assigned", at: a.createdAt, state: "done" },
    escalated
      ? { title: "Escalated", detail: "Nurse and family notified", at: a.escalatedAt, state: "done" }
      : a.status === "pending"
        ? { title: "Escalated", detail: a.ackDeadline ? `If nobody acknowledges before ${time(a.ackDeadline)}` : "If nobody acknowledges in time", at: null, state: "future" }
        : { title: "Escalated", detail: "Not needed: acknowledged in time", at: null, state: "skipped" },
    a.acknowledgedAt
      ? { title: "Acknowledged", detail: `by ${a.acknowledgedBy?.name ?? "a nurse"}`, at: a.acknowledgedAt, state: "done" }
      : { title: "Acknowledged", detail: "Waiting for a nurse", at: null, state: "future" },
    a.closedAt
      ? { title: "Closed", detail: "Patient seen with the prescribed aid", at: a.closedAt, state: "done" }
      : { title: "Closed", detail: "Waiting for the prescribed aid to be seen", at: null, state: "future" },
  ];
}

function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-border-strong" aria-hidden="true" />}
          <span className={`grid size-9 shrink-0 place-items-center rounded-full ${s.state === "done" ? "bg-ok-soft text-ok" : "bg-surface-subtle text-muted"}`}>
            <Icon name={s.state === "future" ? "clock" : "check"} size={16} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col md:flex-row md:justify-between md:gap-4">
            <div>
              <p className={`font-bold ${s.state === "skipped" ? "text-muted" : ""}`}>{s.title}</p>
              <p className="text-xs text-muted">{s.detail}</p>
            </div>
            <p className="text-xs text-muted md:pt-0.5">{s.at ? time(s.at) : "—"}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AlertDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const data = useData();
  const [notice, setNotice] = useState<ReactNode>(null);
  const alert = user && /^\d+$/.test(id ?? "") ? data.alertFor(user, Number(id)) : null;
  // An alert of a patient you may not see looks exactly like one that does not exist.
  if (!user || !alert) return <NotFound />;

  const deliveries = data.deliveriesFor(alert.id);
  const pending = alert.status === "pending";

  function acknowledge() {
    const r = data.acknowledge(alert!.id, user!);
    if (r.ok) setNotice(<Notice tone="success" title="Acknowledged">You acknowledged this alert at {time(r.at)}.</Notice>);
    else if (r.reason === "already") setNotice(<Notice tone="warning" title="Already acknowledged">{r.by} acknowledged this alert at {time(r.at)}. Nothing was changed.</Notice>);
  }

  return (
    <>
      <Link to="/dashboard" className={`${textLink} mb-1 text-sm`}>‹ Dashboard</Link>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <span><AlertBadge level={levelName(alert.level)} /></span>
          <h1 className="text-2xl font-bold tracking-tight">Mobility aid alert</h1>
          <p className="text-sm text-muted">
            <Link to={`/patients/${alert.patient.id}`} className="underline underline-offset-4">{alert.patient.name}</Link> · {alert.patient.code} · Room {alert.detection.roomId}
          </p>
        </div>
        {pending && <Button size="large" onClick={acknowledge} className="w-full md:w-auto">Acknowledge</Button>}
      </header>

      {(notice || !pending) && (
        <div className="mb-5">
          {notice ?? (
            <Notice tone="info" title={alert.status === "closed" ? "This alert is closed" : "This alert was acknowledged"}>
              {alert.acknowledgedBy ? `${alert.acknowledgedBy.name} acknowledged it at ${time(alert.acknowledgedAt!)}.` : ""}
            </Notice>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        <Card><SectionHeader title="Timeline" /><Timeline steps={stepsFor(alert, deliveries)} /></Card>
        <Card>
          <SectionHeader title="Delivery status" />
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted">No notifications were sent for this alert.</p>
          ) : (
            <ul className="divide-y divide-border">
              {deliveries.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-bold">{d.recipient.name}</p>
                    <p className="text-xs text-muted">{d.recipient.role === "nurse" ? "Nurse" : "Family"} · {d.trigger === "escalation" ? "Escalation" : "First alert"}{d.status === "failed" ? ` · ${d.attempts} attempts` : ""}</p>
                  </div>
                  <DeliveryBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Prototype only: makes the "someone was faster" state reachable. It is removed when the frontend joins the backend. */}
      {pending && (
        <details className="mt-6 rounded-xl border border-dashed border-border-strong p-3 text-xs text-muted">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Prototype tools</summary>
          <Button variant="secondary" onClick={() => { data.armRace(alert.id); setNotice(<Notice tone="info">Armed: the next Acknowledge will find that another nurse was faster.</Notice>); }}>
            Simulate: another nurse acknowledges first
          </Button>
        </details>
      )}
    </>
  );
}
