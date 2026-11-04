import { NextResponse, type NextRequest } from "next/server";

// Stops other websites open in your browser from changing data on this local site.
export function proxy(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") return NextResponse.next();

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Requests from other sites are not allowed." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
