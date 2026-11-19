// Small helpers shared by the scripts that talk to a running server.
export async function login(base, email = "admin@example.test", password = "demo-password-1") {
  const jar = new Map();
  const absorb = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); } };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const r1 = await fetch(`${base}/api/auth/csrf`); absorb(r1);
  const { csrfToken } = await r1.json();
  const r2 = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
  });
  absorb(r2);
  const get = (path, init = {}) => fetch(`${base}${path}`, { ...init, headers: { ...init.headers, cookie: cookie() } });
  if ((await get("/api/patients")).status !== 200) throw new Error(`Could not sign in as ${email}`);
  return get;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
