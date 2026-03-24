import { google } from "googleapis";
import crypto from "node:crypto";

const COOKIE_NAME = "admin_auth";

function toBase64(value: string) {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}

function decodeBase64Url(value: string) {
  const normalized = toBase64(value);
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf-8");
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function verifySignedToken(token: string, secret: string) {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return false;
    }

    const [payloadBase64, signatureBase64] = parts;

    if (!payloadBase64 || !signatureBase64) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest();

    const expectedSignatureBase64 = toBase64Url(expectedSignature);

    const expectedBuffer = Buffer.from(expectedSignatureBase64);
    const actualBuffer = Buffer.from(signatureBase64);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return false;
    }

    const payloadText = decodeBase64Url(payloadBase64);
    const payload = JSON.parse(payloadText);

    if (payload?.role !== "admin") {
      return false;
    }

    if (typeof payload?.exp !== "number") {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getCookieValue(cookieHeader: string, cookieName: string) {
  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(trimmed.slice(cookieName.length + 1));
    }
  }

  return "";
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, COOKIE_NAME);
    const sessionSecret = String(process.env.ADMIN_SESSION_SECRET || "").trim();

    if (!sessionSecret || !verifySignedToken(token, sessionSecret)) {
      return Response.json(
        {
          success: false,
          message: "권한이 없습니다. 관리자 로그인 후 다시 시도해주세요.",
        },
        { status: 401 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = "시트1";

    if (!spreadsheetId) {
      return Response.json(
        {
          success: false,
          message: "GOOGLE_SHEET_ID가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:R`,
    });

    const rows = response.data.values || [];

    const reservations = rows
      .filter((row) => row[0])
      .map((row) => ({
        reservationNumber: row[0] || "",
        submittedAt: row[1] || "",
        status: row[2] || "대기",
        name: row[3] || "",
        email: row[4] || "",
        phone: row[5] || "",
        institutionName: row[6] || "",
        eventName: row[7] || "",
        eventDate: row[8] || "",
        time: row[9] || "",
        hours: row[10] || "",
        camera: row[11] || "",
        edit: row[12] || "미선택",
        options: row[13] || "없음",
        total: row[14] || "",
        request: row[15] || "-",
        adminMemo: row[16] || "",
        discountCode: row[17] || "",
      }));

    return Response.json({
      success: true,
      reservations,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/reservations] 오류:", error);
    console.error("[GET /api/admin/reservations] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "예약 목록 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}