import { google } from "googleapis";
import crypto from "node:crypto";

const COOKIE_NAME = "admin_auth";

const PRICES = {
  base: 600000,
  extraHour: 250000,
  extraCamera: 300000,
  edit: 350000,
  zoom: 200000,
  youtube: 250000,
  pip: 150000,
  intro: 150000,
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

function normalizeSheetName(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function escapeSheetName(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function normalizeBoolean(value: unknown) {
  const text = String(value || "").trim().toUpperCase();
  return text === "TRUE" || text === "1" || text === "Y" || text === "YES";
}

function getTodayKST() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
}

function isDateInRange(today: string, startDate: string, endDate: string) {
  if (!startDate && !endDate) return true;
  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;
  return true;
}

function normalizeTimeString(time: string) {
  const text = String(time || "").trim();
  if (!text) return "";

  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return text;

  const hour = String(Number(match[1] || 0)).padStart(2, "0");
  const minute = String(Number(match[2] || 0)).padStart(2, "0");

  return `${hour}:${minute}`;
}

function addHoursToTimeString(time: string, hoursToAdd: number) {
  const normalized = normalizeTimeString(time);
  const [hourText, minuteText] = String(normalized || "00:00").split(":");
  const baseHour = Number(hourText || 0);
  const minute = Number(minuteText || 0);

  const totalHour = baseHour + hoursToAdd;
  const paddedHour = String(totalHour).padStart(2, "0");
  const paddedMinute = String(minute).padStart(2, "0");

  return `${paddedHour}:${paddedMinute}`;
}

function buildTimeRange(startTime: string, hours: number) {
  const normalizedStartTime = normalizeTimeString(startTime);
  if (!normalizedStartTime) return "";

  const safeHours = Number(hours || 0);
  if (safeHours <= 0) return normalizedStartTime;

  const endTime = addHoursToTimeString(normalizedStartTime, safeHours);
  return `${normalizedStartTime}~${endTime}`;
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

async function findReservationSheetName() {
  const { sheets, spreadsheetId } = await getSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetTitles =
    spreadsheet.data.sheets
      ?.map((sheet) => sheet.properties?.title || "")
      .filter(Boolean) || [];

  const foundTitle = sheetTitles.find(
    (title) => normalizeSheetName(title) === "시트1"
  );

  if (!foundTitle) {
    throw new Error(
      `예약 시트를 찾을 수 없습니다. 현재 시트 목록: ${sheetTitles.join(", ")}`
    );
  }

  return foundTitle;
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

async function getDiscountPercent(discountCode: string) {
  const normalizedCode = String(discountCode || "").trim().toUpperCase();

  if (!normalizedCode) return 0;

  const { sheets, spreadsheetId } = await getSheetsClient();
  const discountSheetName = await findDiscountSheetName();
  const safeSheetName = escapeSheetName(discountSheetName);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${safeSheetName}!A:E`,
  });

  const rows = response.data.values || [];
  const dataRows = rows.slice(1);
  const today = getTodayKST();

  const found = dataRows.find((row) => {
    const code = String(row[0] || "").trim().toUpperCase();
    const percent = Number(row[1] || 0);
    const enabled = normalizeBoolean(row[2]);
    const startDate = String(row[3] || "").trim();
    const endDate = String(row[4] || "").trim();

    return (
      code === normalizedCode &&
      percent > 0 &&
      enabled &&
      isDateInRange(today, startDate, endDate)
    );
  });

  return found ? Number(found[1] || 0) : 0;
}

function buildOptionSummary({
  zoom,
  youtube,
  pip,
  intro,
}: {
  zoom: boolean;
  youtube: boolean;
  pip: boolean;
  intro: boolean;
}) {
  const options = [
    zoom ? "Zoom" : null,
    youtube ? "YouTube" : null,
    pip ? "PIP" : null,
    intro ? "Intro" : null,
  ].filter(Boolean);

  return options.length > 0 ? options.join(", ") : "없음";
}

function calculateFinalTotal({
  hours,
  camera,
  edit,
  zoom,
  youtube,
  pip,
  intro,
  discountPercent,
  manualTotal,
}: {
  hours: number;
  camera: number;
  edit: boolean;
  zoom: boolean;
  youtube: boolean;
  pip: boolean;
  intro: boolean;
  discountPercent: number;
  manualTotal?: number;
}) {
  const extraHourPrice = hours > 1 ? (hours - 1) * PRICES.extraHour : 0;
  const cameraPrice = camera > 1 ? PRICES.extraCamera : 0;
  const editPrice = edit ? PRICES.edit : 0;
  const zoomPrice = zoom ? PRICES.zoom : 0;
  const youtubePrice = youtube ? PRICES.youtube : 0;
  const pipPrice = pip ? PRICES.pip : 0;
  const introPrice = intro ? PRICES.intro : 0;

  const originalTotal =
    PRICES.base +
    extraHourPrice +
    cameraPrice +
    editPrice +
    zoomPrice +
    youtubePrice +
    pipPrice +
    introPrice;

  const discountAmount = Math.floor((originalTotal * discountPercent) / 100);
  const autoFinalTotal = originalTotal - discountAmount;

  const finalTotal =
    typeof manualTotal === "number" && !Number.isNaN(manualTotal) && manualTotal > 0
      ? manualTotal
      : autoFinalTotal;

  return {
    originalTotal,
    discountAmount,
    finalTotal,
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

    const {
      reservationNumber,
      institutionName,
      eventName,
      eventDate,
      startTime,
      hours,
      camera,
      edit,
      zoom,
      youtube,
      pip,
      intro,
      request,
      adminMemo,
      discountCode,
      manualTotal,
    } = body;

    if (!reservationNumber) {
      return Response.json(
        {
          success: false,
          message: "예약번호가 없습니다.",
        },
        { status: 400 }
      );
    }

    const normalizedInstitutionName = String(institutionName || "").trim();
    const normalizedEventName = String(eventName || "").trim();
    const normalizedEventDate = String(eventDate || "").trim();
    const normalizedStartTime = normalizeTimeString(String(startTime || "").trim());

    const normalizedHours = Number(hours || 1);
    const normalizedCamera = Number(camera || 1);
    const normalizedEdit = !!edit;
    const normalizedZoom = !!zoom;
    const normalizedYoutube = !!youtube;
    const normalizedPip = !!pip;
    const normalizedIntro = !!intro;
    const normalizedDiscountCode = String(discountCode || "").trim().toUpperCase();

    const validDiscountPercent = await getDiscountPercent(normalizedDiscountCode);

    const calculated = calculateFinalTotal({
      hours: normalizedHours,
      camera: normalizedCamera,
      edit: normalizedEdit,
      zoom: normalizedZoom,
      youtube: normalizedYoutube,
      pip: normalizedPip,
      intro: normalizedIntro,
      discountPercent: validDiscountPercent,
      manualTotal:
        manualTotal !== undefined && manualTotal !== null && String(manualTotal).trim() !== ""
          ? Number(manualTotal)
          : undefined,
    });

    const { sheets, spreadsheetId } = await getSheetsClient();
    const actualSheetName = await findReservationSheetName();
    const safeSheetName = escapeSheetName(actualSheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${safeSheetName}!A:R`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === reservationNumber);

    if (rowIndex === -1) {
      return Response.json(
        {
          success: false,
          message: "수정할 예약을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    const actualRowNumber = rowIndex + 1;

    const editText = normalizedEdit ? "선택" : "미선택";
    const optionSummary = buildOptionSummary({
      zoom: normalizedZoom,
      youtube: normalizedYoutube,
      pip: normalizedPip,
      intro: normalizedIntro,
    });

    const timeRange = buildTimeRange(normalizedStartTime, normalizedHours);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${safeSheetName}!G${actualRowNumber}:R${actualRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            normalizedInstitutionName || "",
            normalizedEventName || "",
            normalizedEventDate || "",
            timeRange || "",
            `${normalizedHours}시간`,
            `${normalizedCamera}대`,
            editText,
            optionSummary,
            `${Number(calculated.finalTotal).toLocaleString()}원`,
            request || "",
            adminMemo || "",
            validDiscountPercent > 0 ? normalizedDiscountCode : "",
          ],
        ],
      },
    });

    return Response.json({
      success: true,
      message: "예약 정보가 수정되었습니다.",
      pricing: {
        originalTotal: calculated.originalTotal,
        discountPercent: validDiscountPercent,
        discountAmount: calculated.discountAmount,
        finalTotal: calculated.finalTotal,
      },
      saved: {
        institutionName: normalizedInstitutionName,
        eventName: normalizedEventName,
        eventDate: normalizedEventDate,
        time: timeRange,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/admin/reservation-update] 오류:", error);
    console.error("[POST /api/admin/reservation-update] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "예약 수정 저장 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}