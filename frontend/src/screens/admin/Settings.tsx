import { useState } from "react";
import { AlertBadge, Button, Card, Icon, Input, Notice, PageHeader, SectionHeader } from "../../components/ui";
import { DEFAULT_SETTINGS, useAdmin } from "../../data/admin";
import type { Settings } from "../../data/types";

type Draft = { identity: string; aid: string; cooldown: string; ack: string };
const toDraft = (s: Settings): Draft => ({ identity: s.identityConfidenceThreshold.toFixed(2), aid: s.aidConfidenceThreshold.toFixed(2), cooldown: String(s.cooldownMinutes), ack: String(s.ackTimeoutMinutes) });

export function AdminSettings() {
  const { settings, saveSettings } = useAdmin();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [saved, setSaved] = useState(false);
  const defaults = toDraft(DEFAULT_SETTINGS);
  const stored = toDraft(settings);
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== stored[k]);

  const num = (v: string) => Number(v);
  const errors: Partial<Record<keyof Draft, string>> = {};
  for (const k of ["identity", "aid"] as const) if (!(num(draft[k]) >= 0 && num(draft[k]) <= 1) || draft[k] === "") errors[k] = "Enter a number from 0 to 1.";
  for (const k of ["cooldown", "ack"] as const) if (!Number.isInteger(num(draft[k])) || num(draft[k]) < 1 || num(draft[k]) > 1440) errors[k] = "Enter whole minutes from 1 to 1440.";
  const valid = Object.keys(errors).length === 0;

  const field = (k: keyof Draft, label: string, extra: Record<string, string>, note: string) => {
    const changed = stored[k] !== defaults[k];
    return (
      <div className="grid gap-2">
        <Input label={label} value={draft[k]} onChange={(e) => { setDraft({ ...draft, [k]: e.target.value }); setSaved(false); }} error={errors[k]} hint={`Default ${defaults[k]}${note}${changed ? " · changed from default" : ""}`} inputMode="decimal" {...extra} />
        {draft[k] !== defaults[k] && <div><Button variant="secondary" onClick={() => { setDraft({ ...draft, [k]: defaults[k] }); setSaved(false); }} aria-label={`Reset ${label} to default`}>Reset to default</Button></div>}
      </div>
    );
  };

  const routing: [string, "warning" | "escalated" | "emergency" | "info"][] = [["Info", "info"], ["Warning", "warning"], ["Escalated", "escalated"], ["Emergency", "emergency"]];
  const tell = (level: string, who: "nurse" | "family") => level !== "info" && (settings.routing as Record<string, string[]>)[level]!.includes(who);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings" description="Changes apply immediately without redeploying the website." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {saved && <Notice tone="success">Settings saved.</Notice>}
        <Card>
          <SectionHeader title="Detection thresholds" description="Detections below either threshold go to manual review and create no alert." />
          <div className="grid gap-5 md:grid-cols-2">
            {field("identity", "Identity confidence threshold", {}, "")}
            {field("aid", "Aid confidence threshold", {}, "")}
            {field("cooldown", "Repeat-alert cooldown in minutes", {}, " minutes")}
            {field("ack", "Acknowledgement timeout in minutes", {}, " minutes. Warnings escalate after this time")}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Alert routing" description="Who receives each alert level." />
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-subtle"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted">Level</th><th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted">Assigned nurse</th><th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted">Family</th></tr></thead>
              <tbody className="divide-y divide-border">
                {routing.map(([label, key]) => (
                  <tr key={key}>
                    <th scope="row" className="px-4 py-3 text-left font-normal"><AlertBadge level={label as "Info"} /></th>
                    {(["nurse", "family"] as const).map((who) => (
                      <td key={who} className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 ${tell(key, who) ? "font-semibold text-ok" : "text-muted"}`}><Icon name={tell(key, who) ? "check" : "close"} size={15} />{tell(key, who) ? "Notified" : "Nobody"}</span></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">Routing is fixed by the system and shown here for reference.</p>
        </Card>
        <Card>
          <SectionHeader title="Notification channel" />
          <div className="grid gap-3 md:grid-cols-2">
            {[["Pushover", "Available now", "Active", "check"], ["Web Push", "Planned", "Inactive", "clock"]].map(([n, d, s, i]) => (
              <div key={n} className="flex items-center gap-3 rounded-xl border border-border p-4"><span className="grid size-10 place-items-center rounded-lg bg-surface-subtle" aria-hidden="true"><Icon name={i as "check"} /></span><div className="flex-1"><p className="font-bold">{n}</p><p className="text-xs text-muted">{d}</p></div><span className="text-xs font-bold">{s}</span></div>
            ))}
          </div>
        </Card>
        <Card className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" disabled={JSON.stringify(draft) === JSON.stringify(defaults)} onClick={() => { setDraft(defaults); setSaved(false); }}>Reset all to defaults</Button>
          <Button disabled={!dirty || !valid} onClick={() => { saveSettings({ ...settings, identityConfidenceThreshold: num(draft.identity), aidConfidenceThreshold: num(draft.aid), cooldownMinutes: num(draft.cooldown), ackTimeoutMinutes: num(draft.ack) }); setSaved(true); }}>Save settings</Button>
        </Card>
      </div>
    </>
  );
}
