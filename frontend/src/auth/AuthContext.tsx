import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Role, SessionUser } from "../data/types";

// Mock sign-in for the standalone prototype. The real one (Auth.js) replaces this file when the frontend is
// joined to the backend. The accounts and the password are the same fake ones as the backend seed.
export const DEMO_PASSWORD = "demo-password-1";
export const ACCOUNTS: SessionUser[] = [
  { id: 1, name: "Demo Admin", email: "admin@example.test", role: "admin" },
  { id: 2, name: "Demo Nurse", email: "nurse@example.test", role: "nurse" },
  { id: 3, name: "Demo Nurse 2", email: "nurse2@example.test", role: "nurse" },
  { id: 4, name: "Demo Family", email: "family@example.test", role: "family" },
  { id: 5, name: "Demo Family 2", email: "family2@example.test", role: "family" },
];
const MAX_FAILURES = 5; // five wrong passwords lock the account, as in the backend

export type SignInResult = { ok: true; user: SessionUser } | { ok: false; reason: "wrong" | "locked" };
type Auth = {
  user: SessionUser | null;
  signIn: (email: string, password: string) => SignInResult;
  signInAs: (role: Role) => void;
  signOut: () => void;
};

const Ctx = createContext<Auth | null>(null);
const KEY = "mac.session";

function load(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(load);
  const failures = useRef(new Map<string, number>());

  const start = useCallback((u: SessionUser) => {
    try { sessionStorage.setItem(KEY, JSON.stringify(u)); } catch { /* storage may be unavailable */ }
    setUser(u);
  }, []);

  const value = useMemo<Auth>(() => ({
    user,
    signIn(email, password) {
      const key = email.trim().toLowerCase();
      // A locked account refuses even the right password, so a lock never reveals whether a guess was right.
      if ((failures.current.get(key) ?? 0) >= MAX_FAILURES) return { ok: false, reason: "locked" };
      const account = ACCOUNTS.find((a) => a.email === key);
      if (!account || password !== DEMO_PASSWORD) {
        failures.current.set(key, (failures.current.get(key) ?? 0) + 1); // unknown emails count too
        return { ok: false, reason: "wrong" };
      }
      failures.current.delete(key);
      start(account);
      return { ok: true, user: account };
    },
    signInAs(role) {
      start(ACCOUNTS.find((a) => a.role === role)!);
    },
    signOut() {
      try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
      setUser(null);
    },
  }), [user, start]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export const homeFor = (role: Role) => (role === "family" ? "/home" : "/dashboard");
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
