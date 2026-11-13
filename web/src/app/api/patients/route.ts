import { handle } from "@/lib/http";
import { listPatients, requireApiUser } from "@/lib/dal";

/** GET /api/patients: admin all, nurse assigned, family own (docs/api.md). */
export async function GET() {
  return handle(async () => ({ patients: await listPatients(await requireApiUser()) }));
}
