import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "li" }) {
  return <Tag className={`rounded-xl border border-border bg-surface p-4 shadow-card md:p-5 ${className}`}>{children}</Tag>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold tracking-wide text-primary uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionHeader({ title, description, count, action }: { title: string; description?: string; count?: number; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-fg">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {action}
        {count !== undefined && <span className="rounded-lg bg-surface-subtle px-2 py-0.5 text-xs font-bold text-muted" aria-label={`${count} items`}>{count}</span>}
      </div>
    </div>
  );
}

const noticeStyle = {
  info: { icon: "info", cls: "border-border bg-primary-soft text-fg" },
  success: { icon: "check", cls: "border-border bg-ok-soft text-fg" },
  error: { icon: "close", cls: "border-emergency bg-emergency-soft text-fg" },
  warning: { icon: "alert", cls: "border-warning bg-warning-soft text-fg" },
} as const satisfies Record<string, { icon: IconName; cls: string }>;

/** A message with an icon and words (never colour alone). Errors use role="alert" so a screen reader announces them. */
export function Notice({ tone = "info", title, children }: { tone?: keyof typeof noticeStyle; title?: string; children?: ReactNode }) {
  const s = noticeStyle[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${s.cls}`}>
      <span className="mt-0.5 shrink-0"><Icon name={s.icon} size={18} /></span>
      <div>{title && <p className="font-bold">{title}</p>}{children && <p className={title ? "text-muted" : ""}>{children}</p>}</div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border-strong px-4 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-ok-soft text-ok"><Icon name="check" size={20} /></span>
      <p className="font-bold text-fg">{title}</p>
      {children && <p className="text-sm text-muted">{children}</p>}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-surface p-4" role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-surface-subtle" style={{ width: `${92 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-xl bg-surface-subtle p-1">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}
          className={`min-h-11 rounded-lg px-3 text-xs font-semibold whitespace-nowrap md:min-h-9 ${value === o ? "bg-surface text-fg shadow-sm" : "text-muted"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function LiveIndicator({ paused = false, updated }: { paused?: boolean; updated?: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-surface px-2.5 text-xs font-semibold whitespace-nowrap text-muted">
      <span className={`size-[7px] rounded-full ${paused ? "bg-info" : "bg-ok shadow-[0_0_0_3px_color-mix(in_srgb,var(--ok)_18%,transparent)]"}`} aria-hidden="true" />
      {paused ? "Live updates paused" : `Live · updated ${updated ?? "14:22"}`}
    </span>
  );
}
