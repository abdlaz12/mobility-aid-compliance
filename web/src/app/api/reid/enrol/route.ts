import { NextResponse } from "next/server";
import { checkBearerKey } from "@/lib/api-key";
import { readJson } from "@/lib/http";
import { parseReidSample } from "@/lib/patient-input";
import { enrolSampleByCode } from "@/lib/reid";

/**
 * POST /api/reid/enrol: for the model service (same API key as the intake). After the service has turned calibration
 * samples into an embedding and stored it, it registers the reference here: `{patient_code, embeddingRef, aid, isAssisted?}`.
 * Consent and discharge rules are the same as for an admin, so a service cannot enrol someone who has not consented.
 */
export async function POST(request: Request) {
  const auth = checkBearerKey(request.headers.get("authorization"));
  if (auth === "missing_config") return NextResponse.json({ error: "Server is missing INTAKE_API_KEY" }, { status: 500 });
  if (auth !== "ok") return NextResponse.json({ error: "Missing or wrong API key" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const code = typeof body.patient_code === "string" ? body.patient_code.trim() : "";
  if (!code || code.length > 32) return NextResponse.json({ error: "patient_code is required" }, { status: 400 });
  const parsed = parseReidSample(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const r = await enrolSampleByCode(code, parsed.value);
  return r.ok ? NextResponse.json({ id: r.id }, { status: 201 }) : NextResponse.json({ error: r.error }, { status: r.status });
}
