import { createHash, timingSafeEqual } from "node:crypto";

const sha = (s: string) => createHash("sha256").update(s).digest();

/** "missing_config" means the server has no key set; the endpoint must not accept anything then. */
export function checkBearerKey(
  authorization: string | null,
  expected: string | undefined = process.env.INTAKE_API_KEY,
): "ok" | "unauthorized" | "missing_config" {
  if (!expected) return "missing_config";
  const m = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!m) return "unauthorized";
  return timingSafeEqual(sha(m[1]), sha(expected)) ? "ok" : "unauthorized";
}
