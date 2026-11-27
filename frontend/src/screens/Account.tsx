import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Icon, Input, Notice, PageHeader, PasswordInput, SectionHeader } from "../components/ui";

const ROLE = { admin: "Admin", nurse: "Nurse", family: "Family" } as const;

export function Account() {
  const { user, changePassword, pushoverKey, savePushoverKey } = useAuth();
  const [pw, setPw] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [key, setKey] = useState(pushoverKey);
  const [keyNote, setKeyNote] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  if (!user) return null;

  function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const current = String(f.get("current") ?? ""), next = String(f.get("next") ?? ""), again = String(f.get("again") ?? "");
    const err: Record<string, string> = {};
    if (!current) err.current = "Enter your current password.";
    if (next.length < 10) err.next = "Use at least 10 characters.";
    if (again !== next) err.again = "The two new passwords do not match.";
    setErrors(err);
    setPw(null);
    if (Object.keys(err).length) return;
    const r = changePassword(current, next);
    if (r === "ok") { form.reset(); setPw({ tone: "success", text: "Your password was changed." }); }
    else if (r === "locked") setPw({ tone: "warning", text: "Too many wrong attempts. Try again later." });
    else setErrors({ current: "That is not your current password." });
  }

  const valid = key === "" || /^[A-Za-z0-9]{30}$/.test(key);

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={`${ROLE[user.role]} account`} title="Account" description="Manage your password and notification connection." />
      <div className="grid gap-5">
        <Card>
          <form onSubmit={submitPassword} noValidate className="grid gap-4">
            <SectionHeader title="Change password" />
            {pw && <Notice tone={pw.tone}>{pw.text}</Notice>}
            <PasswordInput name="current" label="Current password" autoComplete="current-password" error={errors.current} />
            <PasswordInput name="next" label="New password" autoComplete="new-password" hint="At least 10 characters." error={errors.next} />
            <PasswordInput name="again" label="Repeat new password" autoComplete="new-password" error={errors.again} />
            <div className="flex justify-end"><Button type="submit">Change password</Button></div>
          </form>
        </Card>

        {user.role !== "admin" && (
          <Card>
            <form onSubmit={(e) => { e.preventDefault(); setKeyNote(savePushoverKey(key) ? { tone: "success", text: key ? "Pushover key saved." : "Pushover key removed." } : { tone: "warning", text: "A Pushover key has 30 letters and digits." }); }} noValidate className="grid gap-4">
              <SectionHeader title="Pushover notifications" description="Connect Pushover to receive alerts on your device." />
              <div className="flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-xs"><Icon name="eyeOff" size={16} /><p>Notifications include only room, aid status, time, and patient initials or ID. No camera images are captured.</p></div>
              {keyNote && <Notice tone={keyNote.tone}>{keyNote.text}</Notice>}
              <Input label="30-character Pushover user key" value={key} onChange={(e) => { setKey(e.target.value.trim()); setKeyNote(null); }} placeholder="Enter your Pushover key" maxLength={30} autoComplete="off" spellCheck={false}
                hint={`${key.length}/30 characters${pushoverKey ? " · a key is saved. Clear the field and save to remove it" : ""}`} error={key && !valid && key.length === 30 ? "Use letters and digits only." : undefined} />
              <div><Button type="submit" disabled={key === pushoverKey || !valid}>Save key</Button></div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
