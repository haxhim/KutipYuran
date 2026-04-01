import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSION_NAME } from "@/lib/constants";

const protectedPrefixes = ["/app", "/admin", "/api/customers", "/api/billings", "/api/imports", "/api/campaigns", "/api/whatsapp"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(COOKIE_SESSION_NAME)?.value;

  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/api/:path*"],
};

