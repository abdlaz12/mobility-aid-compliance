// Fake example data only. No real patient names or contact details.
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo-password-1";

async function main() {
  for (const name of ["none", "cane", "crutches", "walker", "wheelchair"]) {
    await prisma.mobilityAid.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const zoneName of ["R-204", "R-205", "H-2"]) {
    await prisma.zone.upsert({ where: { zoneName }, update: {}, create: { zoneName } });
  }

  // Dev-only demo accounts with a shared fake password. Never use these outside local development.
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const demoUser = (name: string, email: string, role: string) =>
    prisma.user.upsert({
      where: { email },
      update: { passwordHash, role, name },
      create: { name, email, role, passwordHash },
    });
  const admin = await demoUser("Demo Admin", "admin@example.test", "admin");
  const nurse = await demoUser("Demo Nurse", "nurse@example.test", "nurse");
  const nurse2 = await demoUser("Demo Nurse 2", "nurse2@example.test", "nurse");
  const family = await demoUser("Demo Family", "family@example.test", "family");
  const family2 = await demoUser("Demo Family 2", "family2@example.test", "family");

  const room204 = await prisma.zone.findUniqueOrThrow({ where: { zoneName: "R-204" } });
  const room205 = await prisma.zone.findUniqueOrThrow({ where: { zoneName: "R-205" } });
  const walker = await prisma.mobilityAid.findUniqueOrThrow({ where: { name: "walker" } });
  const cane = await prisma.mobilityAid.findUniqueOrThrow({ where: { name: "cane" } });

  const patients = [
    { code: "P-0042", name: "Demo Patient A", initials: "A.A.", age: 82, zoneId: room204.id, aidId: walker.id, contacts: [nurse, family] },
    { code: "P-0043", name: "Demo Patient B", initials: "B.B.", age: 79, zoneId: room205.id, aidId: cane.id, contacts: [nurse, nurse2, family2] },
  ];
  for (const p of patients) {
    const patient = await prisma.patient.upsert({
      where: { code: p.code },
      update: {},
      create: { code: p.code, name: p.name, initials: p.initials, age: p.age, zoneId: p.zoneId },
    });
    const hasPrescription = await prisma.prescription.count({ where: { patientId: patient.id } });
    if (!hasPrescription) {
      await prisma.prescription.create({ data: { patientId: patient.id, mobilityAidId: p.aidId } });
    }
    // Replace contacts so re-running the seed gives the same access scope.
    await prisma.patientContact.deleteMany({ where: { patientId: patient.id } });
    for (const user of p.contacts) {
      await prisma.patientContact.create({
        data: { patientId: patient.id, userId: user.id, type: user.role },
      });
    }
  }
  console.log(`seeded: admin ${admin.email}, ${patients.length} patients, demo password "${DEMO_PASSWORD}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
