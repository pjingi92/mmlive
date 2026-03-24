import { google } from "googleapis";
import crypto from "node:crypto";

const COOKIE_NAME = "admin_auth";

type DiscountSetting = {
  code: string;
  discountPercent: number;
  enabled: boolean;
  startDate: string;
  endDate: string;
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

function normalizeBoolean(value: unknown) {
  const text = String(value || "").trim().toUpperCase();
  return text === "TRUE" || text === "1" || text === "Y" || text === "YES";
}

function normalizeSheetName(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function escapeSheetName(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID가 설정되지 않았습니다.");
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

  return { sheets, spreadsheetId };
}

async function findDiscountSheetName() {
  const { sheets, spreadsheetId } = await getSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetTitles =
    spreadsheet.data.sheets
      ?.map((sheet) => sheet.properties?.title || "")
      .filter(Boolean) || [];

  const foundTitle = sheetTitles.find(
    (title) => normalizeSheetName(title) === "할인설정"
  );

  if (!foundTitle) {
    throw new Error(
      `할인설정 시트를 찾을 수 없습니다. 현재 시트 목록: ${sheetTitles.join(", ")}`
    );
  }

  return foundTitle;
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

    const { sheets, spreadsheetId } = await getSheetsClient();
    const actualSheetName = await findDiscountSheetName();
    const safeSheetName = escapeSheetName(actualSheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${safeSheetName}!A:E`,
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);

    const settings: DiscountSetting[] = dataRows
      .filter((row) => row[0])
      .map((row) => ({
        code: row[0] || "",
        discountPercent: Number(row[1] || 0),
        enabled: normalizeBoolean(row[2]),
        startDate: row[3] || "",
        endDate: row[4] || "",
      }));

    return Response.json({ success: true, settings });
  } catch (error: any) {
    console.error("[GET /api/admin/discount-settings] 오류:", error);
    console.error("[GET /api/admin/discount-settings] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "할인코드 설정 조회 중 오류가 발생했습니다.",
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

    const body = await req.json();
    const settings = Array.isArray(body?.settings) ? body.settings : [];

    if (!settings.length) {
      return Response.json(
        {
          success: false,
          message: "저장할 할인코드 설정이 없습니다.",
        },
        { status: 400 }
      );
    }

    const normalizedSettings: DiscountSetting[] = settings.map((item: any) => ({
      code: String(item?.code || "").trim(),
      discountPercent: Number(item?.discountPercent || 0),
      enabled: !!item?.enabled,
      startDate: String(item?.startDate || "").trim(),
      endDate: String(item?.endDate || "").trim(),
    }));

    const invalidItem = normalizedSettings.find(
      (item) => !item.code || !item.discountPercent
    );

    if (invalidItem) {
      return Response.json(
        {
          success: false,
          message: "할인코드 또는 할인율 정보가 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    const { sheets, spreadsheetId } = await getSheetsClient();
    const actualSheetName = await findDiscountSheetName();
    const safeSheetName = escapeSheetName(actualSheetName);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${safeSheetName}!A2:E`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${safeSheetName}!A2:E${normalizedSettings.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: normalizedSettings.map((item) => [
          item.code,
          item.discountPercent,
          item.enabled ? "TRUE" : "FALSE",
          item.startDate,
          item.endDate,
        ]),
      },
    });

    return Response.json({
      success: true,
      message: "할인코드 설정이 저장되었습니다.",
    });
  } catch (error: any) {
    console.error("[POST /api/admin/discount-settings] 오류:", error);
    console.error("[POST /api/admin/discount-settings] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "할인코드 설정 저장 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}