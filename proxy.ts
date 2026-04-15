// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth"; // adjust path if needed

async function getCurrentUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const user = await verifyAuthToken(token);
    return user;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ public routes (no auth needed)
  const publicRoutes = ["/login", "/signup", "/forgot-password"];
  if (publicRoutes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ✅ ignore next internal + static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") || // remove this line if you want to protect APIs too
    pathname === "/favicon.ico" ||
    pathname.match(/\.(.*)$/) // images/css/js etc
  ) {
    return NextResponse.next();
  }

  const user = await getCurrentUser(req);

  // ✅ if not logged in -> redirect to login
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    // optional: after login come back
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ✅ apply middleware on all routes
export const config = {
  matcher: ["/:path*"],
};
