import { handle } from "@/lib/http";
import { assertRole, HttpError, requireApiUser } from "@/lib/dal";
import { intakeLatency } from "@/lib/metrics";

/** GET /api/metrics/latency?since=<ISO time>&limit=<n>: NFR1.1 latency of intake to notification (admin only). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  return handle(async () => {
    assertRole(await requireApiUser(), ["admin"]);
    const sinceRaw = q.get("since");
    const since = sinceRaw ? new Date(sinceRaw) : undefined;
    if (since && Number.isNaN(since.getTime())) throw new HttpError(400, "since must be an ISO date and time");
    const limitRaw = q.get("limit");
    if (limitRaw !== null && !/^\d{1,5}$/.test(limitRaw)) throw new HttpError(400, "limit must be a whole number up to 99999");
    return intakeLatency({ since, limit: limitRaw ? Number(limitRaw) : undefined });
  });
}
