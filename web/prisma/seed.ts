// Fake example data only. No real patient names or contact details.
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const name of ["none", "cane", "crutches", "walker", "wheelchair"]) {
    await prisma.mobilityAid.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const zoneName of ["R-204", "R-205", "H-2"]) {
    await prisma.zone.upsert({ where: { zoneName }, update: {}, create: { zoneName } });
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.test" },
    update: {},
    create: { name: "Demo Admin", email: "admin@example.test", role: "admin" },
  });
  const nurse = await prisma.user.upsert({
    where: { email: "nurse@example.test" },
    update: {},
    create: { name: "Demo Nurse", email: "nurse@example.test", role: "nurse" },
  });
  const family = await prisma.user.upsert({
    where: { email: "family@example.test" },
    update: {},
    create: { name: "Demo Family", email: "family@example.test", role: "family" },
  });

  const room204 = await prisma.zone.findUniqueOrThrow({ where: { zoneName: "R-204" } });
  const room205 = await prisma.zone.findUniqueOrThrow({ where: { zoneName: "R-205" } });
  const walker = await prisma.mobilityAid.findUniqueOrThrow({ where: { name: "walker" } });
  const cane = await prisma.mobilityAid.findUniqueOrThrow({ where: { name: "cane" } });

  const patients = [
    { code: "P-0042", name: "Demo Patient A", initials: "A.A.", age: 82, zoneId: room204.id, aidId: walker.id },
    { code: "P-0043", name: "Demo Patient B", initials: "B.B.", age: 79, zoneId: room205.id, aidId: cane.id },
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
    for (const [user, type] of [[nurse, "nurse"], [family, "family"]] as const) {
      await prisma.patientContact.upsert({
        where: { patientId_userId: { patientId: patient.id, userId: user.id } },
        update: {},
        create: { patientId: patient.id, userId: user.id, type },
      });
    }
  }
  console.log(`seeded: admin ${admin.email}, ${patients.length} patients`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
