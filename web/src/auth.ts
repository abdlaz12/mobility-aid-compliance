import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

if (process.env.NODE_ENV === "production" && (process.env.AUTH_SECRET ?? "").startsWith("dev-only")) {
  throw new Error("AUTH_SECRET is still the development placeholder. Set a long random value.");
}

// Compared against when the email is unknown, so a wrong email and a wrong password take similar time.
// Computed lazily on the first login attempt: hashing uses random bytes, and doing that when this
// module is imported would break prerendering ("blocking-prerender-crypto").
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // one shift
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        // Bound the input: password hashing is deliberately expensive.
        if (!email || !password || email.length > 254 || password.length > 200) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
        if (!user || !user.isActive || !user.passwordHash || !ok) return null;
        // Only identity goes into the token. The role is read from the database on every request
        // (src/lib/dal.ts), so a deactivated or re-assigned user loses access immediately.
        return { id: String(user.id), name: user.name, email: user.email };
      },
    }),
  ],
});
