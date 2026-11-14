import { NextResponse } from "next/server";
import { HttpError } from "@/lib/dal";

/** Runs an API handler and turns HttpError into the JSON error body from docs/api.md. */
/** Reads a JSON object body; anything else is a 400. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch { /* fall through */ }
  throw new HttpError(400, "Body must be a JSON object");
}

export async function handle(fn: () => Promise<unknown>, status = 200) {
  try {
    return NextResponse.json(await fn(), { status });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
