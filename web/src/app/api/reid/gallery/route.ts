import { NextResponse } from "next/server";
import { checkBearerKey } from "@/lib/api-key";
import { galleryForModelService } from "@/lib/reid";

/**
 * GET /api/reid/gallery: for the model service (same API key as the intake). Lists the calibration samples of admitted
 * patients who consented, so the service knows whom it may recognise. Deleted samples never appear here.
 */
export async function GET(request: Request) {
  const auth = checkBearerKey(request.headers.get("authorization"));
  if (auth === "missing_config") return NextResponse.json({ error: "Server is missing INTAKE_API_KEY" }, { status: 500 });
  if (auth !== "ok") return NextResponse.json({ error: "Missing or wrong API key" }, { status: 401 });
  return NextResponse.json({ samples: await galleryForModelService() });
}
