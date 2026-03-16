import { google } from "googleapis";

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
    const rowIndex = rows.findIndex((row) => String(row[0] || "").trim() === reservationNumber);

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