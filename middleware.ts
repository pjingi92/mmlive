import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // admin-login은 통과
  if (pathname.startsWith("/admin-login")) {
    return NextResponse.next();
  }

  // admin 경로 보호
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("admin_auth")?.value;

    // 쿠키 없으면 로그인 페이지로
    if (!token) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }

    // 있으면 일단 통과 (진짜 검증은 API에서)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};