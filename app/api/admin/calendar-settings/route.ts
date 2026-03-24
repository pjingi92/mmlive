import { google } from "googleapis";
import crypto from "node:crypto";

const COOKIE_NAME = "admin_auth";

type CalendarSettingItem = {
  date: string;
  type: string;
  time: string;
  status: string;
  note: string;
};

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

function requireAdmin(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = getCookieValue(cookieHeader, COOKIE_NAME);
  const sessionSecret = String(process.env.ADMIN_SESSION_SECRET || "").trim();

  if (!sessionSecret || !verifySignedToken(token, sessionSecret)) {
    return false;
  }

  return true;
}

function getGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

function normalizeTime(value: string) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text.toLowerCase() === "all") return "all";

  const parts = text.split(":");
  if (parts.length !== 2) return text;

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return text;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    if (!requireAdmin(req)) {
      return Response.json(
        {
          success: false,
          message: "권한이 없습니다. 관리자 로그인 후 다시 시도해주세요.",
        },
        { status: 401 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = "calendar_settings";

    if (!spreadsheetId) {
      return Response.json(
        {
          success: false,
          message: "GOOGLE_SHEET_ID가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const sheets = getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:E`,
    });

    const rows = response.data.values || [];

    const settings = rows
      .filter((row: any[]) => {
        if (!row) return false;
        if (!date) return true;
        return row[0] === date;
      })
      .map((row: any[]) => ({
        date: row?.[0] || "",
        type: row?.[1] || "",
        time: normalizeTime(row?.[2] || ""),
        status: row?.[3] || "",
        note: row?.[4] || "",
      }));

    return Response.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/calendar-settings] 오류:", error);
    console.error("[GET /api/admin/calendar-settings] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "calendar-settings 조회 실패",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!requireAdmin(req)) {
      return Response.json(
        {
          success: false,
          message: "권한이 없습니다. 관리자 로그인 후 다시 시도해주세요.",
        },
        { status: 401 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = "calendar_settings";

    if (!spreadsheetId) {
      return Response.json(
        {
          success: false,
          message: "GOOGLE_SHEET_ID가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const date = String(body?.date || "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!date) {
      return Response.json(
        {
          success: false,
          message: "date가 필요합니다.",
        },
        { status: 400 }
      );
    }

    const sheets = getGoogleSheets();

    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:E`,
    });

    const rows = readResponse.data.values || [];
    const header =
      rows[0] && rows[0].length > 0
        ? rows[0]
        : ["date", "type", "time", "status", "note"];

    const dataRows = rows.slice(1);

    const remainingRows = dataRows
      .filter((row: any[]) => row?.[0] !== date)
      .map((row: any[]) => [
        String(row?.[0] || "").trim(),
        String(row?.[1] || "").trim(),
        normalizeTime(String(row?.[2] || "").trim()),
        String(row?.[3] || "").trim(),
        String(row?.[4] || "").trim(),
      ]);

    const newRows = items.map((item: CalendarSettingItem) => [
      date,
      String(item?.type || "").trim(),
      normalizeTime(String(item?.time || "").trim()),
      String(item?.status || "").trim(),
      String(item?.note || "").trim(),
    ]);

    const finalRows = [header, ...remainingRows, ...newRows];

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:E`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:E${finalRows.length}`,
      valueInputOption: "RAW",
      requestBody: {
        values: finalRows,
      },
    });

    return Response.json({
      success: true,
      message: "calendar-settings 저장 완료",
    });
  } catch (error: any) {
    console.error("[POST /api/admin/calendar-settings] 오류:", error);
    console.error("[POST /api/admin/calendar-settings] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "calendar-settings 저장 실패",
      },
      { status: 500 }
    );
  }
}