import { handle } from "@/lib/http";
import { listAlerts, requireApiUser } from "@/lib/dal";

/** GET /api/alerts?status=pending&level=warning */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  return handle(async () => ({
    alerts: await listAlerts(await requireApiUser(), {
      status: q.get("status") ?? undefined,
      level: q.get("level") ?? undefined,
    }),
  }));
}
