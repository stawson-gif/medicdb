import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "med-system-secret-key-change-in-production"
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("med_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/health")
  ) {
    const token = req.cookies.get("med_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/patients/:path*",
    "/api/documents/:path*",
    "/api/files/:path*",
    "/api/templates",
  ],
};
