import { after, NextResponse } from "next/server";
import { checkBearerKey } from "@/lib/api-key";
import { validateDetectionEvent } from "@/lib/detection-validator";
import { processDetection } from "@/lib/detection-intake";
import { deliverQueued } from "@/lib/notify/queue";
import { handle, readTextLimited } from "@/lib/http";
import { listReviewQueue, requireApiUser } from "@/lib/dal";

/** POST /api/detections: receives one detection event (docs/api.md). */
export async function POST(request: Request) {
  const auth = checkBearerKey(request.headers.get("authorization"));
  if (auth === "missing_config") {
    return NextResponse.json({ error: "Server is missing INTAKE_API_KEY" }, { status: 500 });
  }
  if (auth !== "ok") {
    return NextResponse.json({ error: "Missing or wrong API key" }, { status: 401 });
  }

  // One detection event is well under 1 KiB. 16 KiB leaves room and still stops abuse.
  const text = await readTextLimited(request, 16 * 1024);
  if (text === null) return NextResponse.json({ error: "Body is too large (16 KiB at most)" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body is not valid JSON" }, { status: 400 });
  }

  const result = validateDetectionEvent(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Invalid detection event", details: result.errors }, { status: 400 });
  }

  const r = await processDetection(result.event);
  // Deliver after the response is sent, so notification latency never slows intake (NFR1.1, NFR5.1).
  // Anything that fails here stays queued and is retried by the background loop.
  if (r.created && r.alertLevel) after(() => deliverQueued().catch((e) => console.error("[notify] delivery pass failed:", e instanceof Error ? e.message : e)));
  return NextResponse.json(
    {
      detection_id: r.detectionId,
      duplicate: !r.created,
      needs_review: r.needsReview,
      alert_level: r.alertLevel,
    },
    { status: r.created ? 201 : 200 },
  );
}

/** GET /api/detections?needs_review=true: the review queue (admin, nurse). Session login, not the API key. */
export async function GET(request: Request) {
  const needsReview = new URL(request.url).searchParams.get("needs_review") === "true";
  return handle(async () => {
    const user = await requireApiUser();
    // Only the review queue is exposed for now; other listings would need their own scope rules.
    if (!needsReview) return { detections: [] };
    return { detections: await listReviewQueue(user) };
  });
}
