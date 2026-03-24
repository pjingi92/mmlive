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

    const settings: CalendarSettingItem[] = rows
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
    console.error("[GET /api/calendar-settings] 오류:", error);
    console.error("[GET /api/calendar-settings] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "calendar-settings 조회 실패",
      },
      { status: 500 }
    );
  }
}