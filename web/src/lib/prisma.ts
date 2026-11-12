import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

// The Prisma CLI resolves a relative SQLite path ("file:./dev.db") from the prisma/ folder, but the
// running Next.js server resolves it from its working directory. Resolve it the CLI's way so both
// use the same database file.
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) return url;
  const file = url.slice("file:".length);
  return path.isAbsolute(file) ? url : `file:${path.resolve(process.cwd(), "prisma", file)}`;
}

// One Prisma client for the whole server process. In development Next.js reloads modules,
// so the client is kept on globalThis to avoid opening a new connection on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
