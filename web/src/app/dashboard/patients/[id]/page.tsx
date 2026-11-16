import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LevelBadge } from "@/components/level-badge";
import { getPatientHistory, HttpError, requireUser } from "@/lib/dal";

export default function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
const card = "rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800";
const muted = "text-xs text-zinc-600 dark:text-zinc-400";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!/^\d{1,9}$/.test(id)) notFound();
  let h;
  try {
    h = await getPatientHistory(user, Number(id));
  } catch (e) {
    // A patient you may not see looks the same as one that does not exist.
    if (e instanceof HttpError && (e.status === 403 || e.status === 404)) notFound();
    throw e;
  }
  const { patient: p, alerts, detections } = h;
  const staff = user.role !== "family";
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="text-sm underline">← Dashboard</Link>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{p.name}</h1>
          <p className={muted}>{p.code} · Room {p.room ?? "not set"} · prescribed: {p.prescribedAid ?? "not set"}</p>
        </div>
        {p.status === "discharged" ? <LevelBadge level="no_data" label="Discharged" /> : <LevelBadge level="ok" label="Active" />}
      </div>
      {user.role === "admin" && <Link href={`/dashboard/admin/patients/${p.id}`} className="text-sm underline">Edit patient</Link>}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Alerts <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">({alerts.length}, latest 50)</span></h2>
        {alerts.length === 0 ? <p className={muted}>No alerts.</p> : (
          <ul className="flex flex-col gap-2">
            {alerts.map((a) => (
              <li key={a.id} className={card}>
                <div className="flex items-center justify-between gap-2">
                  <LevelBadge level={a.level} />
                  <span className={muted}>{fmt(a.createdAt)}</span>
                </div>
                <p className="mt-1">Room {a.detection.roomId} · {a.detection.aidLabel} · <strong>{a.status}</strong>{a.acknowledgedBy && ` by ${a.acknowledgedBy.name}`}</p>
                {a.escalatedAt && <p className={muted}>Escalated {fmt(a.escalatedAt)}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {staff && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Detections <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">({detections.length}, latest 50)</span></h2>
          {detections.length === 0 ? <p className={muted}>No detections yet.</p> : (
            <ul className="flex flex-col gap-2">
              {detections.map((d) => (
                <li key={d.id} className={card}>
                  <div className="flex items-center justify-between gap-2">
                    <span>Room {d.roomId} · <strong>{d.aidLabel}</strong>{d.eventType === "fall_indication" && " · fall indication"}</span>
                    {d.needsReview && <LevelBadge level="warning" label="Needs review" />}
                  </div>
                  <p className={muted}>aid confidence {d.aidConfidence.toFixed(2)} · identity confidence {d.identityConfidence.toFixed(2)} · {fmt(d.timestamp)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
