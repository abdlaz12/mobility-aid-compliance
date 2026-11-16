import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { requireUser } from "@/lib/dal";
import { getOwnAccount } from "@/lib/dal-users";
import { changePasswordAction, setPushoverAction } from "./actions";

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
      <Content />
    </Suspense>
  );
}

const box = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

async function Content() {
  const user = await requireUser();
  const account = await getOwnAccount(user);
  const staffOrFamily = account.role !== "admin";
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Your account</h1>
        <p className="break-all text-sm text-zinc-600 dark:text-zinc-400">{account.name} · {account.email} · <span className="capitalize">{account.role}</span></p>
      </div>

      <section className={box}>
        <h2 className="mb-3 text-lg font-semibold">Change password</h2>
        <ActionForm action={changePasswordAction} submitLabel="Change password">
          <Field label="Current password"><input name="currentPassword" type="password" required maxLength={200} autoComplete="current-password" className={inputCls} /></Field>
          <Field label="New password" hint="At least 10 characters."><input name="newPassword" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={inputCls} /></Field>
          <Field label="New password again"><input name="confirmPassword" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={inputCls} /></Field>
        </ActionForm>
      </section>

      {staffOrFamily && (
        <section className={box}>
          <h2 className="mb-1 text-lg font-semibold">Phone notifications (Pushover)</h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            {account.pushoverConfigured ? "A Pushover key is saved." : "No Pushover key yet, so you only see alerts on the dashboard."}{" "}
            Notifications show the room, the aid, the time and the patient&apos;s initials or ID, never the full name. They are sent only if the server has Pushover switched on.
          </p>
          <ActionForm action={setPushoverAction} submitLabel="Save key">
            <Field label="Pushover user key" hint="30 letters and digits, from your Pushover dashboard. Leave empty and save to remove it.">
              <input name="key" maxLength={30} autoComplete="off" spellCheck={false} className={inputCls} />
            </Field>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
