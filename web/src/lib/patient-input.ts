// Validation for the admin screens and the matching API routes. One code path for both: forms pass
// Object.fromEntries(formData), the API passes the parsed JSON body.

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

const CODE = /^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/; // used in events and the ReID gallery, so keep it plain
const ROOM = /^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/; // must match room_id in detection events (R-204, H-2)

export function makeInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 4).map((p) => p[0].toUpperCase() + ".").join("");
}

function parseName(v: unknown): Result<string> {
  const s = str(v);
  return s.length >= 1 && s.length <= 100 ? ok(s) : fail("Name is required (up to 100 characters).");
}
function parseInitials(v: unknown, name: string): Result<string> {
  const s = str(v) || makeInitials(name);
  return s.length >= 1 && s.length <= 12 ? ok(s) : fail("Initials must be 1 to 12 characters.");
}
function parseAge(v: unknown): Result<number | null> {
  const s = str(v);
  if (s === "") return ok(null);
  return /^\d{1,3}$/.test(s) && Number(s) <= 130 ? ok(Number(s)) : fail("Age must be a whole number from 0 to 130.");
}
function parseRoom(v: unknown): Result<string | null> {
  const s = str(v);
  if (s === "") return ok(null);
  return ROOM.test(s) ? ok(s) : fail("Room may use letters, digits and dashes only, up to 20 characters (for example R-204).");
}

export type NewPatient = { code: string; name: string; initials: string; age: number | null; room: string | null; aid: string };

export function parseNewPatient(raw: Record<string, unknown>): Result<NewPatient> {
  const code = str(raw.code);
  if (!CODE.test(code)) return fail("Patient code needs 2 to 20 letters, digits or dashes (for example P-0044).");
  const name = parseName(raw.name); if (!name.ok) return name;
  const initials = parseInitials(raw.initials, name.value); if (!initials.ok) return initials;
  const age = parseAge(raw.age); if (!age.ok) return age;
  const room = parseRoom(raw.room); if (!room.ok) return room;
  const aid = str(raw.aid);
  if (!aid) return fail("Choose the prescribed mobility aid.");
  return ok({ code, name: name.value, initials: initials.value, age: age.value, room: room.value, aid });
}

export type PatientUpdate = { name?: string; initials?: string; age?: number | null; room?: string | null; status?: "active" | "discharged" };

/** Only the keys present in `raw` are changed. */
export function parsePatientUpdate(raw: Record<string, unknown>): Result<PatientUpdate> {
  const out: PatientUpdate = {};
  if ("name" in raw) { const r = parseName(raw.name); if (!r.ok) return r; out.name = r.value; }
  if ("initials" in raw || "name" in raw) {
    const base = out.name ?? "";
    if (str(raw.initials) || base) { const r = parseInitials(raw.initials, base); if (!r.ok) return r; out.initials = r.value; }
  }
  if ("age" in raw) { const r = parseAge(raw.age); if (!r.ok) return r; out.age = r.value; }
  if ("room" in raw) { const r = parseRoom(raw.room); if (!r.ok) return r; out.room = r.value; }
  if ("status" in raw) {
    if (raw.status !== "active" && raw.status !== "discharged") return fail("Status must be active or discharged.");
    out.status = raw.status;
  }
  return Object.keys(out).length ? ok(out) : fail("Nothing to update.");
}

export function parsePrescription(raw: Record<string, unknown>): Result<{ aid: string }> {
  const aid = str(raw.aid);
  return aid ? ok({ aid }) : fail("Choose the prescribed mobility aid.");
}

export function parseContacts(raw: Record<string, unknown>): Result<{ userIds: number[] }> {
  const list = raw.userIds;
  if (!Array.isArray(list)) return fail("userIds must be a list.");
  if (list.length > 30) return fail("Too many caregivers.");
  const ids: number[] = [];
  for (const v of list) {
    const s = str(v);
    if (!/^\d{1,9}$/.test(s)) return fail("userIds must be whole numbers.");
    ids.push(Number(s));
  }
  return ok({ userIds: [...new Set(ids)] });
}
