import { google } from "googleapis";
import nodemailer from "nodemailer";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isValidSingleEmail(value: string) {
  if (!value || value.includes(",") || value.includes(";") || value.includes(" ")) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function addHoursToTimeString(time: string, hoursToAdd: number) {
  const [hourText, minuteText] = String(time || "00:00").split(":");
  const baseHour = Number(hourText || 0);
  const minute = Number(minuteText || 0);

  const totalHour = baseHour + hoursToAdd;
  const paddedHour = String(totalHour).padStart(2, "0");
  const paddedMinute = String(minute).padStart(2, "0");

  return `${paddedHour}:${paddedMinute}`;
}

function parseHoursToNumber(hoursText: string) {
  const matched = String(hoursText || "").match(/\d+/);
  const num = matched ? Number(matched[0]) : 0;
  return num > 0 ? num : 0;
}

function buildTimeRange(startTime: string, hours: number) {
  const safeStartTime = String(startTime || "").trim();
  const safeHours = Number(hours || 0);

  if (!safeStartTime) return "";
  if (safeStartTime.includes("~")) {
    return safeStartTime.replace(/\s+/g, "");
  }
  if (safeHours <= 0) return safeStartTime;

  const endTime = addHoursToTimeString(safeStartTime, safeHours);
  return `${safeStartTime}~${endTime}`;
}

type ReservationStatus =
  | "대기"
  | "확정"
  | "촬영완료"
  | "입금대기"
  | "종료"
  | "취소";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reservationNumber = searchParams.get("no");
    const status = searchParams.get("status") as ReservationStatus | null;

    console.log("[GET /api/reservation-status] 시작", {
      reservationNumber,
      status,
    });

    if (!reservationNumber || !status) {
      return new Response("잘못된 요청입니다.", { status: 400 });
    }

    const allowedStatuses: ReservationStatus[] = [
      "대기",
      "확정",
      "촬영완료",
      "입금대기",
      "종료",
      "취소",
    ];

    if (!allowedStatuses.includes(status)) {
      return new Response("허용되지 않은 상태값입니다.", { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = "시트1";

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID가 설정되지 않았습니다.");
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:Q`,
    });

    const rows = response.data.values || [];

    const rowIndex = rows.findIndex((row) => row[0] === reservationNumber);

    if (rowIndex === -1) {
      return new Response("예약번호를 찾을 수 없습니다.", { status: 404 });
    }

    const row = rows[rowIndex];

    const name = row[3] || "";
    const email = normalizeEmail(row[4] || "");
    const eventName = row[6] || "";
    const eventDate = row[7] || "";
    const rawTimeValue = row[8] || "";
    const hours = row[9] || "";
    const camera = row[10] || "";
    const edit = row[11] || "미선택";
    const options = row[12] || "없음";
    const total = row[13] || "";
    const request = row[14] || "-";

    const hourNumber = parseHoursToNumber(hours);
    const timeRange = buildTimeRange(rawTimeValue, hourNumber);

    if (!isValidSingleEmail(email)) {
      throw new Error("고객 이메일 형식이 올바르지 않습니다.");
    }

    const actualRowNumber = rowIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!C${actualRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[status]],
      },
    });

    console.log("[GET /api/reservation-status] 시트 상태 변경 완료", {
      reservationNumber,
      status,
      actualRowNumber,
      rawTimeValue,
      hours,
      timeRange,
    });

    const shouldSendMail = status === "확정" || status === "취소";

    if (shouldSendMail) {
      const adminEmail = normalizeEmail(process.env.GMAIL_USER);

      if (!isValidSingleEmail(adminEmail)) {
        throw new Error("관리자 이메일 설정이 올바르지 않습니다.");
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      let subject = "";
      let html = "";

      if (status === "확정") {
        subject = `[무명필름] 촬영 예약이 확정되었습니다 (${reservationNumber})`;
        html = `
          <h2>촬영 예약이 확정되었습니다.</h2>
          <p>안녕하세요, ${name}님.</p>
          <p>무명필름 촬영 예약이 확정되었습니다.</p>
          <hr />
          <p><strong>예약번호:</strong> ${reservationNumber}</p>
          <p><strong>행사명:</strong> ${eventName}</p>
          <p><strong>촬영 날짜:</strong> ${eventDate}</p>
          <p><strong>시간:</strong> ${timeRange || rawTimeValue}</p>
          <p><strong>촬영 시간:</strong> ${hours}</p>
          <p><strong>카메라 대수:</strong> ${camera}</p>
          <p><strong>편집:</strong> ${edit}</p>
          <p><strong>추가 옵션:</strong> ${options}</p>
          <p><strong>추가 요청사항:</strong><br/>${request}</p>
          <hr />
          <p><strong>예상 견적:</strong> ${total}</p>
          <br />
          <p>세부 진행 관련 내용은 담당자가 별도로 안내드리겠습니다.</p>
          <p>감사합니다.</p>
          <p>무명필름</p>
        `;
      }

      if (status === "취소") {
        subject = `[무명필름] 촬영 예약이 취소되었습니다 (${reservationNumber})`;
        html = `
          <h2>촬영 예약이 취소되었습니다.</h2>
          <p>안녕하세요, ${name}님.</p>
          <p>내부 일정 확인 결과 해당 예약은 진행이 어려워 취소되었음을 안내드립니다.</p>
          <p>다른 일정으로 촬영을 원하시면 언제든 다시 문의 부탁드립니다.</p>
          <hr />
          <p><strong>예약번호:</strong> ${reservationNumber}</p>
          <p><strong>행사명:</strong> ${eventName}</p>
          <p><strong>촬영 날짜:</strong> ${eventDate}</p>
          <p><strong>시간:</strong> ${timeRange || rawTimeValue}</p>
          <p><strong>촬영 시간:</strong> ${hours}</p>
          <p><strong>카메라 대수:</strong> ${camera}</p>
          <p><strong>편집:</strong> ${edit}</p>
          <p><strong>추가 옵션:</strong> ${options}</p>
          <hr />
          <p><strong>예상 견적:</strong> ${total}</p>
          <br />
          <p>감사합니다.</p>
          <p>무명필름</p>
        `;
      }

      await transporter.sendMail({
        from: `"무명필름" <${adminEmail}>`,
        to: email,
        subject,
        html,
      });

      console.log("[GET /api/reservation-status] 고객 메일 발송 완료", {
        email,
        status,
        timeRange,
      });
    }

    return new Response(
      `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>예약 처리 완료</title>
        </head>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.8;">
          <h2>예약 처리가 완료되었습니다.</h2>
          <p><strong>예약번호:</strong> ${reservationNumber}</p>
          <p><strong>변경 상태:</strong> ${status}</p>
          <p>${
            shouldSendMail
              ? "구글 시트 상태가 업데이트되었고 고객에게도 안내 메일이 발송되었습니다."
              : "구글 시트 상태가 업데이트되었습니다."
          }</p>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  } catch (error: any) {
    console.error("[GET /api/reservation-status] 오류:", error);
    console.error("[GET /api/reservation-status] 메시지:", error?.message);

    return new Response(
      `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>오류</title>
        </head>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.8;">
          <h2>처리 중 오류가 발생했습니다.</h2>
          <p>${error?.message || "잠시 후 다시 시도해주세요."}</p>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  }
}