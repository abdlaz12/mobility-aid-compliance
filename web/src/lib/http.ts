import { NextResponse } from "next/server";
import { HttpError } from "@/lib/dal";

/** Runs an API handler and turns HttpError into the JSON error body from docs/api.md. */
export async function handle(fn: () => Promise<unknown>, status = 200) {
  try {
    return NextResponse.json(await fn(), { status });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
