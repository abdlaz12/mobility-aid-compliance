// User management (admin) and the signed-in user's own account. Same rules as dal.ts: checked on the server.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { limiters } from "@/lib/attempt-limiter";
import { assertRole, HttpError, type SessionUser } from "@/lib/dal";
import type { NewUser, UserUpdate } from "@/lib/user-input";

// Never select passwordHash or the raw Pushover key.
const SAFE = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } as const;

export async function listUsers(user: SessionUser) {
  assertRole(user, ["admin"]);
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { ...SAFE, _count: { select: { contacts: true } } },
  });
}

export async function getUserAdmin(user: SessionUser, id: number) {
  assertRole(user, ["admin"]);
  const u = await prisma.user.findUnique({ where: { id }, select: { ...SAFE, _count: { select: { contacts: true } } } });
  if (!u) throw new HttpError(404, "User not found");
  return u;
}

export async function createUser(user: SessionUser, input: NewUser) {
  assertRole(user, ["admin"]);
  const passwordHash = await hashPassword(input.password);
  try {
    const u = await prisma.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash }, select: SAFE });
    return u;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, `${input.email} already has an account.`);
    throw e;
  }
}

export async function updateUser(user: SessionUser, id: number, input: UserUpdate) {
  assertRole(user, ["admin"]);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "User not found");
  // Only an active admin can get here, so refusing self-deactivation also means there is always an active admin left.
  if (input.isActive === false && target.id === user.id) throw new HttpError(409, "You cannot deactivate your own account.");
  await prisma.user.update({ where: { id }, data: input });
}

export async function resetPassword(user: SessionUser, id: number, password: string) {
  assertRole(user, ["admin"]);
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw new HttpError(404, "User not found");
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  limiters.email.reset((await prisma.user.findUniqueOrThrow({ where: { id }, select: { email: true } })).email); // lift a lock
}

export async function getOwnAccount(user: SessionUser) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, role: true, pushoverUserKey: true } });
  return { name: u.name, email: u.email, role: u.role, pushoverConfigured: u.pushoverUserKey !== null };
}

export async function changeOwnPassword(user: SessionUser, currentPassword: string, newPassword: string) {
  const key = `pw:${user.id}`;
  // A stolen session must not be able to guess the current password without limit.
  if (limiters.password.isLocked(key)) throw new HttpError(429, "Too many wrong attempts. Wait a few minutes and try again.");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, u.passwordHash))) {
    limiters.password.fail(key);
    throw new HttpError(400, "Your current password is wrong.");
  }
  limiters.password.reset(key);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
}

export async function setOwnPushoverKey(user: SessionUser, key: string | null) {
  await prisma.user.update({ where: { id: user.id }, data: { pushoverUserKey: key } });
}
