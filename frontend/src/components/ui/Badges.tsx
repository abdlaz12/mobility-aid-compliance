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
