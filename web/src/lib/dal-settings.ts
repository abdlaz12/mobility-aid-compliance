import { assertRole, HttpError, type SessionUser } from "@/lib/dal";
import { DEFAULTS, getSettings, overriddenKeys, parseSettingsUpdate, resetSettings, saveSettings } from "@/lib/settings";

const KEYS = ["identityConfidenceThreshold", "aidConfidenceThreshold", "cooldownMinutes", "ackTimeoutMinutes", "routing"];

export async function readSettings(user: SessionUser) {
  assertRole(user, ["admin"]);
  return { settings: await getSettings(), defaults: DEFAULTS, changed: await overriddenKeys() };
}

export async function changeSettings(user: SessionUser, raw: Record<string, unknown>) {
  assertRole(user, ["admin"]);
  const parsed = parseSettingsUpdate(raw);
  if (!parsed.ok) throw new HttpError(400, parsed.error);
  await saveSettings(parsed.value, user.id);
  return readSettings(user);
}

/** Back to the environment and the defaults, for the named keys or for all of them. */
export async function restoreSettings(user: SessionUser, keys?: string[]) {
  assertRole(user, ["admin"]);
  if (keys?.some((k) => !KEYS.includes(k))) throw new HttpError(400, "Unknown setting in keys.");
  await resetSettings(keys);
  return readSettings(user);
}
