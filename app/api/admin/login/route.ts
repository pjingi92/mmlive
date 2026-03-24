import { NextResponse } from "next/server";
import crypto from "node:crypto";

const COOKIE_NAME = "admin_auth";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24시간

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createSignedToken(secret: string, expiresAt: number) {
  const payload = {
    role: "admin",
    exp: expiresAt,
  };

  const payloadBase64 = toBase64Url(JSON.stringify(payload));

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest();

  const signatureBase64 = toBase64Url(signature);

  return `${payloadBase64}.${signatureBase64}`;
}

function safeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const password = String(body?.password || "").trim();

    const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
    const sessionSecret = String(process.env.ADMIN_SESSION_SECRET || "").trim();

    if (!adminPassword || !sessionSecret) {
      console.error("[POST /api/admin/login] 필수 환경변수 누락", {
        hasAdminPassword: Boolean(adminPassword),
        hasSessionSecret: Boolean(sessionSecret),
      });

      return NextResponse.json(
        {
          success: false,
          message: "서버 설정 오류가 발생했습니다.",
        },
        { status: 500 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "비밀번호를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    if (!safeEqualString(password, adminPassword)) {
      return NextResponse.json(
        {
          success: false,
          message: "로그인에 실패했습니다.",
        },
        { status: 401 }
      );
    }

    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
    const token = createSignedToken(sessionSecret, expiresAt);

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error: any) {
    console.error("[POST /api/admin/login] 오류:", error);
    console.error("[POST /api/admin/login] 메시지:", error?.message);

    return NextResponse.json(
      {
        success: false,
        message: "관리자 로그인 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}