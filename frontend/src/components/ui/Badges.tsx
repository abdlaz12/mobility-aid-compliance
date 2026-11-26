import { Icon, type IconName } from "./Icon";

export type AlertLevel = "Info" | "Warning" | "Escalated" | "Emergency";
export type Status =
  | "OK" | "No data" | "Active" | "Inactive" | "Discharged" | "Needs review"
  | "Warning" | "Escalated" | "Emergency" | "Resolved";

// An alert level is always an icon AND a word AND a colour, never colour alone.
const levelStyle: Record<AlertLevel, { icon: IconName; cls: string }> = {
  Info: { icon: "info", cls: "bg-info-soft text-info" },
  Warning: { icon: "alert", cls: "bg-warning-soft text-warning" },
  Escalated: { icon: "escalated", cls: "bg-escalated-soft text-escalated" },
  Emergency: { icon: "close", cls: "bg-emergency-soft text-emergency" },
};

const base = "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold whitespace-nowrap";

export function AlertBadge({ level }: { level: AlertLevel }) {
  const s = levelStyle[level];
  return (
    <span className={`${base} ${s.cls}`}>
      <Icon name={s.icon} size={15} />
      {level}
    </span>
  );
}

const statusStyle: Record<Status, string> = {
  OK: "bg-ok-soft text-ok",
  Active: "bg-ok-soft text-ok",
  Resolved: "bg-ok-soft text-ok",
  "Needs review": "bg-warning-soft text-warning",
  Warning: "bg-warning-soft text-warning",
  Escalated: "bg-escalated-soft text-escalated",
  Emergency: "bg-emergency-soft text-emergency",
  "No data": "bg-info-soft text-info",
  Inactive: "bg-info-soft text-info",
  Discharged: "bg-info-soft text-info",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`${base} ${statusStyle[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}

// Delivery of a notification. The Make design reused the patient status badges here (Active, Inactive, Emergency, No data)
// for Sent, Queued, Failed and Skipped; each state now has its own word, with a colour that means the same thing.
export type DeliveryStatus = "sent" | "queued" | "failed" | "skipped";
const deliveryStyle: Record<DeliveryStatus, { label: string; cls: string }> = {
  sent: { label: "Sent", cls: "bg-ok-soft text-ok" },
  queued: { label: "Queued", cls: "bg-info-soft text-info" },
  failed: { label: "Failed", cls: "bg-emergency-soft text-emergency" },
  skipped: { label: "Skipped", cls: "bg-info-soft text-info" },
};
export function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  const d = deliveryStyle[status];
  return (
    <span className={`${base} ${d.cls}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {d.label}
    </span>
  );
}

// The life of an alert: Pending (needs someone), Acknowledged (someone has it), Closed (the patient is seen with the aid again).
export type AlertStatusName = "pending" | "acknowledged" | "closed";
const alertStatusStyle: Record<AlertStatusName, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-warning-soft text-warning" },
  acknowledged: { label: "Acknowledged", cls: "bg-info-soft text-info" },
  closed: { label: "Closed", cls: "bg-ok-soft text-ok" },
};
export function AlertStatusBadge({ status }: { status: AlertStatusName }) {
  const d = alertStatusStyle[status];
  return (
    <span className={`${base} ${d.cls}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {d.label}
    </span>
  );
}
