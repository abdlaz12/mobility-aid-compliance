import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "@/contracts/detection-event.schema.json";

// The source of truth is contracts/detection-event.schema.json at the repo root. Next.js cannot import
// files outside web/, so src/contracts/ holds a copy: run `npm run sync-contract` after changing it
// (a test fails if the two differ).
// Intake validates against that exact file, so changing the contract changes the validator.

export type DetectionEvent = {
  event_id: string;
  timestamp: string;
  room_id: string;
  person_track_id: string;
  identity: { patient_id: string | null; confidence: number };
  aid: { label: string; confidence: number };
  event_type: "detection" | "fall_indication";
  model_version?: string;
};

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile<DetectionEvent>(schema);

export type ValidationResult =
  | { ok: true; event: DetectionEvent }
  | { ok: false; errors: string[] };

/** Events may be replays of recorded data (past timestamps are fine), but not from the future. */
export const MAX_FUTURE_MS = 10 * 60_000;

export function validateDetectionEvent(payload: unknown, now: number = Date.now()): ValidationResult {
  if (validate(payload)) {
    if (Date.parse(payload.timestamp) > now + MAX_FUTURE_MS) {
      return { ok: false, errors: ["/timestamp is more than 10 minutes in the future"] };
    }
    return { ok: true, event: payload };
  }
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "(body)"} ${e.message ?? "is invalid"}`,
  );
  return { ok: false, errors };
}
