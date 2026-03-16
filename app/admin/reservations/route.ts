import { google } from "googleapis";

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = "시트1";

    if (!spreadsheetId) {
      return new Response("GOOGLE_SHEET_ID가 설정되지 않았습니다.", {
        status: 500,
      });
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
      range: `${sheetName}!A2:P`,
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
        eventName: row[6] || "",
        eventDate: row[7] || "",
        startTime: row[8] || "",
        hours: row[9] || "",
        camera: row[10] || "",
        edit: row[11] || "미선택",
        options: row[12] || "없음",
        total: row[13] || "",
        request: row[14] || "-",
        adminMemo: row[15] || "",
      }));

    return Response.json({ reservations });
  } catch (error: any) {
    console.error("[GET /api/admin/reservations] 오류:", error);
    console.error("[GET /api/admin/reservations] 메시지:", error?.message);

    return new Response(
      error?.message || "예약 목록 조회 중 오류가 발생했습니다.",
      {
        status: 500,
      }
    );
  }
}