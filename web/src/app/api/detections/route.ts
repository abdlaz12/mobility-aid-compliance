import { NextResponse } from "next/server";
import { checkBearerKey } from "@/lib/api-key";
import { validateDetectionEvent } from "@/lib/detection-validator";
import { processDetection } from "@/lib/detection-intake";
import { handle } from "@/lib/http";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body is not valid JSON" }, { status: 400 });
  }

  const result = validateDetectionEvent(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Invalid detection event", details: result.errors }, { status: 400 });
  }

  const r = await processDetection(result.event);
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
