// Validation for user management and the account page. Same idea as patient-input.ts: one code path for forms and API.
import type { Result } from "./patient-input";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export const PASSWORD_MIN = 10;

export function parseEmail(v: unknown): Result<string> {
  const s = str(v).toLowerCase();
  return s.length <= 254 && EMAIL.test(s) ? ok(s) : fail("Enter a valid email address.");
}

/** Length is what matters most; the maximum bounds the cost of hashing. */
export function parsePassword(v: unknown, email?: string): Result<string> {
  const s = typeof v === "string" ? v : "";
  if (s.length < PASSWORD_MIN) return fail(`Password must be at least ${PASSWORD_MIN} characters.`);
  if (s.length > 200) return fail("Password is too long (200 characters at most).");
  if (email && s.toLowerCase() === email.toLowerCase()) return fail("Password must not be the email address.");
  return ok(s);
}

const parseName = (v: unknown): Result<string> => {
  const s = str(v);
  return s.length >= 1 && s.length <= 100 ? ok(s) : fail("Name is required (up to 100 characters).");
};

export type NewUser = { name: string; email: string; role: "admin" | "nurse" | "family"; password: string };

export function parseNewUser(raw: Record<string, unknown>): Result<NewUser> {
  const name = parseName(raw.name); if (!name.ok) return name;
  const email = parseEmail(raw.email); if (!email.ok) return email;
  if (raw.role !== "admin" && raw.role !== "nurse" && raw.role !== "family") return fail("Choose a role: admin, nurse or family.");
  const password = parsePassword(raw.password, email.value); if (!password.ok) return password;
  return ok({ name: name.value, email: email.value, role: raw.role, password: password.value });
}

export type UserUpdate = { name?: string; isActive?: boolean };

/** Only the keys present are changed. The role and the email are fixed after creation. */
export function parseUserUpdate(raw: Record<string, unknown>): Result<UserUpdate> {
  const out: UserUpdate = {};
  if ("name" in raw) { const r = parseName(raw.name); if (!r.ok) return r; out.name = r.value; }
  if ("isActive" in raw) {
    if (raw.isActive === true || raw.isActive === "true") out.isActive = true;
    else if (raw.isActive === false || raw.isActive === "false") out.isActive = false;
    else return fail("isActive must be true or false.");
  }
  return Object.keys(out).length ? ok(out) : fail("Nothing to update.");
}

export function parsePasswordChange(raw: Record<string, unknown>, email: string): Result<{ currentPassword: string; newPassword: string }> {
  const currentPassword = typeof raw.currentPassword === "string" ? raw.currentPassword : "";
  if (!currentPassword) return fail("Enter your current password.");
  const next = parsePassword(raw.newPassword, email); if (!next.ok) return next;
  if (next.value === currentPassword) return fail("The new password must differ from the current one.");
  return ok({ currentPassword, newPassword: next.value });
}

/** Pushover user keys are 30 letters and digits. Empty clears the key. */
export function parsePushoverKey(raw: Record<string, unknown>): Result<{ key: string | null }> {
  const s = str(raw.key);
  if (s === "") return ok({ key: null });
  return /^[A-Za-z0-9]{30}$/.test(s) ? ok({ key: s }) : fail("A Pushover user key is 30 letters and digits. Copy it from your Pushover dashboard.");
}
