import { google } from "googleapis";

type DiscountSetting = {
  code: string;
  discountPercent: number;
  enabled: boolean;
  startDate: string;
  endDate: string;
};

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

export async function GET() {
  try {
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