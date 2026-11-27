import { handle } from "@/lib/http";
import { listRooms, requireApiUser } from "@/lib/dal";

/** GET /api/rooms: known rooms and hallways with how many patients are assigned (admin). */
export async function GET() {
  return handle(async () => listRooms(await requireApiUser()));
}
