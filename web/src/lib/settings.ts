// Settings an administrator can change without redeploying (NFR5.2).
// Precedence for every value: the database row, then the environment variable, then the built-in default.
import { prisma } from "@/lib/prisma";
import type { Result } from "@/lib/patient-input";

export type Recipient = "nurse" | "family";
export type Routing = { warning: Recipient[]; escalated: Recipient[]; emergency: Recipient[] };
export type Settings = {
  identityConfidenceThreshold: number;
  aidConfidenceThreshold: number;
  cooldownMinutes: number;
  ackTimeoutMinutes: number;
  routing: Routing;
};

// Proposal v3: identity threshold example 0.80 (section 4.4), cooldown default 10 minutes (section 6.2).
export const DEFAULTS: Settings = {
  identityConfidenceThreshold: 0.8,
  aidConfidenceThreshold: 0.6,
  cooldownMinutes: 10,
  ackTimeoutMinutes: 10,
  routing: { warning: ["nurse"], escalated: ["nurse", "family"], emergency: ["nurse", "family"] },
};

const ENV_NAMES: Partial<Record<keyof Settings, string>> = {
  identityConfidenceThreshold: "IDENTITY_CONFIDENCE_THRESHOLD",
  aidConfidenceThreshold: "AID_CONFIDENCE_THRESHOLD",
  cooldownMinutes: "COOLDOWN_MINUTES",
  ackTimeoutMinutes: "ACK_TIMEOUT_MINUTES",
};

type Env = Record<string, string | undefined>;
const RECIPIENTS: readonly Recipient[] = ["nurse", "family"];
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The limits the API enforces. The environment is trusted more loosely (a short timeout is handy for demos). */
const RANGES = {
  identityConfidenceThreshold: { min: 0, max: 1, label: "Identity confidence threshold" },
  aidConfidenceThreshold: { min: 0, max: 1, label: "Aid confidence threshold" },
  cooldownMinutes: { min: 0, max: 1440, label: "Cooldown (minutes, 0 turns it off)" },
  ackTimeoutMinutes: { min: 1, max: 1440, label: "Acknowledgement timeout (minutes)" },
} as const;

function validRouting(v: unknown): v is Routing {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  const keys = Object.keys(r).sort().join(",");
  if (keys !== "emergency,escalated,warning") return false;
  return (["warning", "escalated", "emergency"] as const).every((level) => {
    const list = r[level];
    return Array.isArray(list) && list.length > 0 && new Set(list).size === list.length && list.every((x) => RECIPIENTS.includes(x as Recipient));
  });
}

/** Pure: combine database rows, the environment and the defaults. Bad stored values are skipped, not trusted. */
export function resolveSettings(rows: { key: string; value: string }[], env: Env = process.env): Settings {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out: Settings = { ...DEFAULTS, routing: { ...DEFAULTS.routing } };
  for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
    const fromDb = stored.has(key) ? safeJson(stored.get(key)!) : undefined;
    const raw = env[ENV_NAMES[key] ?? ""];
    const fromEnv = raw !== undefined && raw !== "" ? Number(raw) : undefined;
    const { min, max } = RANGES[key];
    if (isNumber(fromDb) && fromDb >= min && fromDb <= max) out[key] = fromDb;
    else if (isNumber(fromEnv) && fromEnv >= 0) out[key] = fromEnv;
  }
  const routing = stored.has("routing") ? safeJson(stored.get("routing")!) : undefined;
  if (validRouting(routing)) out.routing = routing;
  return out;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return undefined; }
}

/** Read the current settings. One small query per call, so a change applies at once, in every process. */
export async function getSettings(): Promise<Settings> {
  return resolveSettings(await prisma.setting.findMany({ select: { key: true, value: true } }));
}

/** Which keys have a database value, i.e. were changed by an administrator. */
export async function overriddenKeys(): Promise<string[]> {
  return (await prisma.setting.findMany({ select: { key: true } })).map((r) => r.key).sort();
}

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Validate an update body. Only known keys; every value inside its range. */
export function parseSettingsUpdate(raw: Record<string, unknown>): Result<Partial<Settings>> {
  const out: Partial<Settings> = {};
  const known = new Set<string>([...Object.keys(RANGES), "routing"]);
  for (const key of Object.keys(raw)) if (!known.has(key)) return fail(`Unknown setting "${key}".`);
  if (Object.keys(raw).length === 0) return fail("Nothing to update.");
  for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
    if (!(key in raw)) continue;
    const v = raw[key];
    const { min, max, label } = RANGES[key];
    if (!isNumber(v) || v < min || v > max) return fail(`${label} must be a number from ${min} to ${max}.`);
    out[key] = v;
  }
  if ("routing" in raw) {
    if (!validRouting(raw.routing)) {
      return fail('Routing must list who is notified for "warning", "escalated" and "emergency", each with at least one of "nurse" and "family".');
    }
    out.routing = raw.routing;
  }
  return { ok: true, value: out };
}

export async function saveSettings(update: Partial<Settings>, userId: number): Promise<void> {
  await prisma.$transaction(
    Object.entries(update).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: JSON.stringify(value), updatedById: userId },
        create: { key, value: JSON.stringify(value), updatedById: userId },
      }),
    ),
  );
}

/** Remove the database values, so the environment and the defaults apply again. No keys = all of them. */
export async function resetSettings(keys?: string[]): Promise<void> {
  await prisma.setting.deleteMany(keys?.length ? { where: { key: { in: keys } } } : undefined);
}
