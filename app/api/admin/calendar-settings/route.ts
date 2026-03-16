import { google } from "googleapis";

type CalendarSettingItem = {
  date: string;
  type: string;
  time: string;
  status: string;
  note: string;
};

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

// 🔧 FIX: 8:00 / 08:00 / 9:00 / 09:00 형식을 모두 HH:mm 으로 통일
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
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = "calendar_settings";

    if (!spreadsheetId) {
      return new Response("GOOGLE_SHEET_ID가 설정되지 않았습니다.", {
        status: 500,
      });
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
        time: normalizeTime(row?.[2] || ""), // 🔧 FIX: 조회 시에도 시간 형식 통일
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

    return new Response(error?.message || "calendar-settings 조회 실패", {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = "calendar_settings";

    if (!spreadsheetId) {
      return new Response("GOOGLE_SHEET_ID가 설정되지 않았습니다.", {
        status: 500,
      });
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
        normalizeTime(String(row?.[2] || "").trim()), // 🔧 FIX: 기존 데이터도 다시 쓸 때 시간 통일
        String(row?.[3] || "").trim(),
        String(row?.[4] || "").trim(),
      ]);

    const newRows = items.map((item: CalendarSettingItem) => [
      date,
      String(item?.type || "").trim(),
      normalizeTime(String(item?.time || "").trim()), // 🔧 FIX: 저장 시 항상 HH:mm 으로 저장
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
      valueInputOption: "RAW", // 🔧 FIX: USER_ENTERED 대신 RAW로 넣어서 08:00 -> 8:00 자동변환 방지
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