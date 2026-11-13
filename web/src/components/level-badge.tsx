// Alert level shown with an icon AND text, never colour alone (docs/ui/README.md).
const LEVELS: Record<string, { icon: string; label: string; cls: string }> = {
  info: { icon: "ⓘ", label: "Info", cls: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" },
  warning: { icon: "⚠", label: "Warning", cls: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  escalated: { icon: "▲", label: "Escalated", cls: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200" },
  emergency: { icon: "✖", label: "Emergency", cls: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" },
  ok: { icon: "✔", label: "OK", cls: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200" },
  no_data: { icon: "…", label: "No data", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

export function LevelBadge({ level }: { level: string }) {
  const l = LEVELS[level] ?? { icon: "?", label: level, cls: LEVELS.info.cls };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${l.cls}`}>
      <span aria-hidden>{l.icon}</span>
      {l.label}
    </span>
  );
}
