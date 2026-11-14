import { handle, readJson } from "@/lib/http";
import { createPatient, HttpError, listPatients, requireApiUser } from "@/lib/dal";
import { parseNewPatient } from "@/lib/patient-input";

/** GET /api/patients: admin all, nurse assigned, family own (active patients). */
export async function GET() {
  return handle(async () => ({ patients: await listPatients(await requireApiUser()) }));
}

/** POST /api/patients: register a patient (admin). */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    if (user.role !== "admin") throw new HttpError(403, "Not allowed for your role");
    const parsed = parseNewPatient(await readJson(request));
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    return { patient: await createPatient(user, parsed.value) };
  }, 201);
}
