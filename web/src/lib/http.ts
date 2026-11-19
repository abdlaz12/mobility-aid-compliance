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

/**
 * Reads a request body as text but stops at maxBytes. Returns null when the body is larger, so a client
 * cannot make the server buffer an unbounded payload (Content-Length is checked first, then the stream).
 */
export async function readTextLimited(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
