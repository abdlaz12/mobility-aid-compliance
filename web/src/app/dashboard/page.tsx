import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { LevelBadge } from "@/components/level-badge";
import { listAlerts, listPatients, listReviewQueue, requireUser, type SessionUser } from "@/lib/dal";
import { acknowledgeAction } from "./actions";

const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const staff = user.role !== "family";
  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      {staff ? (
        <>
          <PendingAlerts user={user} />
          <Patients user={user} />
          <ReviewQueue user={user} />
        </>
      ) : (
        <>
          <Patients user={user} />
          <AlertHistory user={user} />
        </>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2 text-lg font-semibold">
        {title}
        {count !== undefined && <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

const card = "rounded-lg border border-zinc-200 p-3 dark:border-zinc-800";
const empty = (t: string) => <p className="text-sm text-zinc-600 dark:text-zinc-400">{t}</p>;

async function PendingAlerts({ user }: { user: SessionUser }) {
  const alerts = await listAlerts(user, { status: "pending" });
  return (
    <Section title="Pending alerts" count={alerts.length}>
      {alerts.length === 0 ? empty("No alerts waiting for acknowledgement.") : (
        <ul className="flex flex-col gap-3">
          {alerts.map((a) => (
            <li key={a.id} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <LevelBadge level={a.level} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{fmt(a.createdAt)}</span>
              </div>
              <p className="mt-2 font-medium"><Link href={`/dashboard/patients/${a.patient.id}`} className="underline-offset-4 hover:underline">{a.patient.name}</Link> <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">({a.patient.code})</span></p>
              <p className="text-sm">Room {a.detection.roomId} · detected: <strong>{a.detection.aidLabel}</strong></p>
              {a.level === "warning" && a.ackDeadline && <p className="text-xs text-zinc-600 dark:text-zinc-400">Acknowledge before {fmt(a.ackDeadline)}, or it escalates</p>}
              {a.escalatedAt && <p className="text-xs font-medium text-orange-800 dark:text-orange-300">Escalated {fmt(a.escalatedAt)}: nurse and family were notified</p>}
              <form action={acknowledgeAction} className="mt-3">
                <input type="hidden" name="alertId" value={a.id} />
                <button type="submit" className="h-11 w-full rounded-md bg-zinc-900 px-4 text-base font-medium text-white sm:w-auto dark:bg-zinc-100 dark:text-zinc-900">
                  Acknowledge
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

async function Patients({ user }: { user: SessionUser }) {
  const patients = await listPatients(user);
  return (
    <Section title={user.role === "family" ? "Your family member" : "Patients"} count={patients.length}>
      {patients.length === 0 ? empty("No patients are assigned to you.") : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {patients.map((p) => (
            <li key={p.id} className={card}>
              <div className="flex items-center justify-between gap-2">
                <Link href={`/dashboard/patients/${p.id}`} className="font-medium underline-offset-4 hover:underline">{p.name}</Link>
                <LevelBadge level={p.state} />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{p.code}{p.room && ` · Room ${p.room}`}</p>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
                <dt className="text-zinc-600 dark:text-zinc-400">Prescribed</dt>
                <dd>{p.prescribedAid ?? "not set"}</dd>
                <dt className="text-zinc-600 dark:text-zinc-400">Last seen</dt>
                <dd>{p.lastDetection ? `${p.lastDetection.aidLabel} (${p.lastDetection.roomId})` : "no detections yet"}</dd>
                {p.lastDetection && (<><dt className="text-zinc-600 dark:text-zinc-400">At</dt><dd>{fmt(p.lastDetection.timestamp)}</dd></>)}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

async function ReviewQueue({ user }: { user: SessionUser }) {
  const items = await listReviewQueue(user);
  return (
    <Section title="Review queue" count={items.length}>
      {items.length === 0 ? empty("No detections need review.") : (
        <ul className="flex flex-col gap-2">
          {items.map((d) => (
            <li key={d.id} className={`${card} text-sm`}>
              <p className="font-medium">
                {d.patient ? d.patient.initials : "Unmatched patient code"} · Room {d.roomId} · {d.aidLabel}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                aid confidence {d.aidConfidence.toFixed(2)} · identity confidence {d.identityConfidence.toFixed(2)} · {fmt(d.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

async function AlertHistory({ user }: { user: SessionUser }) {
  const alerts = await listAlerts(user);
  return (
    <Section title="Alert history" count={alerts.length}>
      {alerts.length === 0 ? empty("No alerts so far.") : (
        <ul className="flex flex-col gap-2">
          {alerts.map((a) => (
            <li key={a.id} className={`${card} text-sm`}>
              <div className="flex items-center justify-between gap-2">
                <LevelBadge level={a.level} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{fmt(a.createdAt)}</span>
              </div>
              <p className="mt-1">Room {a.detection.roomId} · {a.detection.aidLabel} · {a.status}{a.acknowledgedBy && ` by ${a.acknowledgedBy.name}`}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
