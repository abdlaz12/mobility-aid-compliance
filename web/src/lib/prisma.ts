import { PrismaClient } from "@/generated/prisma/client";

// One Prisma client for the whole server process. In development Next.js reloads modules,
// so the client is kept on globalThis to avoid opening a new connection on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
