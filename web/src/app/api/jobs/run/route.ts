import { NextResponse } from "next/server";
import { checkBearerKey } from "@/lib/api-key";
import { runJobs } from "@/lib/jobs";

/** POST /api/jobs/run: one pass of escalation and delivery. For a cron on hosting without a long-running process. */
export async function POST(request: Request) {
  const auth = checkBearerKey(request.headers.get("authorization"));
  if (auth === "missing_config") return NextResponse.json({ error: "Server is missing INTAKE_API_KEY" }, { status: 500 });
  if (auth !== "ok") return NextResponse.json({ error: "Missing or wrong API key" }, { status: 401 });
  return NextResponse.json(await runJobs());
}
