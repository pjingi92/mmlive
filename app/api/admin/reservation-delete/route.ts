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

async function findReservationSheetInfo() {
  const { sheets, spreadsheetId } = await getSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetList = spreadsheet.data.sheets || [];

  const foundSheet = sheetList.find((sheet) => {
    const title = sheet.properties?.title || "";
    return normalizeSheetName(title) === "시트1";
  });

  if (!foundSheet || !foundSheet.properties?.title) {
    const sheetTitles = sheetList
      .map((sheet) => sheet.properties?.title || "")
      .filter(Boolean);

    throw new Error(
      `예약 시트를 찾을 수 없습니다. 현재 시트 목록: ${sheetTitles.join(", ")}`
    );
  }

  return {
    title: foundSheet.properties.title,
    sheetId: foundSheet.properties.sheetId,
  };
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const reservationNumber = String(body?.reservationNumber || "").trim();

    if (!reservationNumber) {
      return Response.json(
        {
          success: false,
          message: "예약번호가 없습니다.",
        },
        { status: 400 }
      );
    }

    const { sheets, spreadsheetId } = await getSheetsClient();
    const { title: actualSheetName, sheetId } = await findReservationSheetInfo();
    const safeSheetName = escapeSheetName(actualSheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${safeSheetName}!A:Q`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(
      (row) => String(row[0] || "").trim() === reservationNumber
    );

    if (rowIndex === -1) {
      return Response.json(
        {
          success: false,
          message: "삭제할 예약을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    const actualRowNumber = rowIndex + 1;

    if (actualRowNumber === 1) {
      return Response.json(
        {
          success: false,
          message: "헤더 행은 삭제할 수 없습니다.",
        },
        { status: 400 }
      );
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: actualRowNumber - 1,
                endIndex: actualRowNumber,
              },
            },
          },
        ],
      },
    });

    return Response.json({
      success: true,
      message: "예약이 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("[POST /api/admin/reservation-delete] 오류:", error);
    console.error("[POST /api/admin/reservation-delete] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "예약 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}