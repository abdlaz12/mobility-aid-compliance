import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Convenience only: send visitors without a session cookie to the login page with a proper redirect.
// This does NOT verify the session. Real checks (valid session, active user, role, patient scope)
// happen in src/lib/dal.ts on every page and API call.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  if (SESSION_COOKIES.some((name) => request.cookies.has(name))) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = { matcher: ["/dashboard/:path*"] };
