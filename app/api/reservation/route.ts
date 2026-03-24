import nodemailer from "nodemailer";
import { google } from "googleapis";

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

function addHoursToTimeString(time: string, hoursToAdd: number) {
  const [hourText, minuteText] = String(time || "00:00").split(":");
  const baseHour = Number(hourText || 0);
  const minute = Number(minuteText || 0);

  const totalHour = baseHour + hoursToAdd;
  const paddedHour = String(totalHour).padStart(2, "0");
  const paddedMinute = String(minute).padStart(2, "0");

  return `${paddedHour}:${paddedMinute}`;
}

function buildTimeRange(startTime: string, hours: number) {
  const safeHours = Number(hours || 0);
  if (!startTime || safeHours <= 0) return startTime || "";

  const endTime = addHoursToTimeString(startTime, safeHours);
  return `${startTime}~${endTime}`;
}

async function appendReservationToSheet(data: {
  name: string;
  email: string;
  phone: string;
  institutionName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  hours: number;
  camera: number;
  edit: boolean;
  zoom: boolean;
  youtube: boolean;
  pip: boolean;
  intro: boolean;
  request: string;
  total: number;
  discountCode?: string;
}) {
  console.log("[appendReservationToSheet] 시작");

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

  console.log("[appendReservationToSheet] 시트 조회 시작", {
    spreadsheetIdExists: !!spreadsheetId,
    sheetName,
  });

  const getResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });

  const existingRows = getResponse.data.values || [];
  const nextNumber = existingRows.length;
  const reservationNumber = `MM-${String(nextNumber).padStart(4, "0")}`;

  const submittedAt = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });

  const editText = data.edit ? "선택" : "미선택";

  const optionSummary = buildOptionSummary({
    zoom: data.zoom,
    youtube: data.youtube,
    pip: data.pip,
    intro: data.intro,
  });

  const timeRange = buildTimeRange(data.startTime, data.hours);

  console.log("[appendReservationToSheet] 시트 append 직전", {
    reservationNumber,
    submittedAt,
    institutionName: data.institutionName || "",
    editText,
    optionSummary,
    timeRange,
    total: data.total,
    discountCode: data.discountCode || "",
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:R`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          reservationNumber, // A 예약번호
          submittedAt, // B 접수일시
          "대기", // C 상태
          data.name, // D 신청자명
          data.email, // E 이메일
          data.phone, // F 연락처
          data.institutionName || "", // G 기관명
          data.eventName, // H 행사명
          data.eventDate, // I 촬영날짜
          timeRange, // J 시간
          `${data.hours}시간`, // K 촬영시간
          `${data.camera}대`, // L 카메라대수
          editText, // M 편집
          optionSummary, // N 옵션
          `${Number(data.total).toLocaleString()}원`, // O 예상견적(최종금액)
          data.request || "", // P 요청사항
          "", // Q 관리자메모
          data.discountCode || "", // R 할인코드
        ],
      ],
    },
  });

  console.log("[appendReservationToSheet] 시트 저장 완료", {
    reservationNumber,
  });

  return reservationNumber;
}

export async function POST(req: Request) {
  try {
    console.log("[POST /api/reservation] 요청 시작");

    const body = await req.json();

    const {
      name,
      email,
      phone,
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
      total,
      originalTotal,
      discountCode,
      discountPercent,
      discountAmount,
      finalTotal,
      basePrice,
      extraHourPrice,
      cameraPrice,
      editPrice,
      zoomPrice,
      youtubePrice,
      pipPrice,
      introPrice,
    } = body;

    console.log("[POST /api/reservation] body check:", {
      name,
      email,
      phone,
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
      total,
      originalTotal,
      discountCode,
      discountPercent,
      discountAmount,
      finalTotal,
    });

    const customerEmail = normalizeEmail(email);
    const adminEmail = normalizeEmail(process.env.GMAIL_USER);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const safeInstitutionName =
      typeof institutionName === "string" ? institutionName.trim() : "";

    console.log("[POST /api/reservation] env check:", {
      customerEmail,
      adminEmail,
      siteUrl,
      hasGoogleSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasGoogleClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasGooglePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasGmailUser: !!process.env.GMAIL_USER,
      hasGmailAppPassword: !!process.env.GMAIL_APP_PASSWORD,
    });

    if (!isValidSingleEmail(customerEmail)) {
      return Response.json(
        {
          success: false,
          message: "고객 이메일 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    if (!isValidSingleEmail(adminEmail)) {
      return Response.json(
        {
          success: false,
          message: "관리자 이메일 설정이 올바르지 않습니다.",
        },
        { status: 500 }
      );
    }

    if (!siteUrl) {
      return Response.json(
        {
          success: false,
          message:
            "사이트 주소 설정이 없습니다. .env.local의 NEXT_PUBLIC_SITE_URL을 확인해주세요.",
        },
        { status: 500 }
      );
    }

    const optionSummary = buildOptionSummary({
      zoom,
      youtube,
      pip,
      intro,
    });

    const editText = edit ? "신청" : "미신청";

    const safeOriginalTotal = Number(originalTotal || 0);
    const safeDiscountPercent = Number(discountPercent || 0);
    const safeDiscountAmount = Number(discountAmount || 0);
    const safeFinalTotal = Number(finalTotal || total || 0);
    const safeDiscountCode = typeof discountCode === "string" ? discountCode.trim() : "";
    const safeHours = Number(hours || 0);
    const timeRange = buildTimeRange(startTime, safeHours);

    console.log("[POST /api/reservation] 시트 저장 시작");

    const reservationNumber = await appendReservationToSheet({
      name,
      email: customerEmail,
      phone,
      institutionName: safeInstitutionName,
      eventName,
      eventDate,
      startTime,
      hours: safeHours,
      camera,
      edit,
      zoom,
      youtube,
      pip,
      intro,
      request,
      total: safeFinalTotal,
      discountCode: safeDiscountCode,
    });

    const approveUrl = `${siteUrl}/api/reservation-status?no=${reservationNumber}&status=확정`;
    const cancelUrl = `${siteUrl}/api/reservation-status?no=${reservationNumber}&status=취소`;

    console.log("[POST /api/reservation] 메일 전송 준비", {
      reservationNumber,
      approveUrl,
      cancelUrl,
      timeRange,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const discountHtml =
      safeDiscountCode && safeDiscountPercent > 0
        ? `
        <hr />
        <p><strong>할인코드:</strong> ${safeDiscountCode}</p>
        <p><strong>할인율:</strong> ${safeDiscountPercent}%</p>
        <p><strong>할인금액:</strong> ${safeDiscountAmount.toLocaleString()}원</p>
        <p><strong>할인 전 금액:</strong> ${safeOriginalTotal.toLocaleString()}원</p>
        <p><strong>최종 금액:</strong> ${safeFinalTotal.toLocaleString()}원</p>
      `
        : `
        <hr />
        <p><strong>예상 견적:</strong> ${safeFinalTotal.toLocaleString()}원</p>
      `;

    const adminInfo = await transporter.sendMail({
      from: `"무명필름" <${adminEmail}>`,
      to: adminEmail,
      replyTo: customerEmail,
      subject: `[관리자용] ${eventName} / ${reservationNumber}`,
      html: `
        <h2>[무명필름] 새로운 촬영 예약 문의</h2>
        <p><strong>예약번호:</strong> ${reservationNumber}</p>
        <p><strong>신청자명:</strong> ${name}</p>
        <p><strong>이메일:</strong> ${customerEmail}</p>
        <p><strong>연락처:</strong> ${phone}</p>
        <p><strong>기관명:</strong> ${safeInstitutionName || "-"}</p>
        <p><strong>행사명:</strong> ${eventName}</p>
        <p><strong>촬영 날짜:</strong> ${eventDate}</p>
        <p><strong>시간:</strong> ${timeRange}</p>
        <p><strong>촬영 시간:</strong> ${safeHours}시간</p>
        <p><strong>카메라 대수:</strong> ${camera}대</p>
        <p><strong>편집:</strong> ${editText}</p>
        <p><strong>선택 옵션:</strong> ${optionSummary}</p>
        <p><strong>Zoom 송출:</strong> ${zoom ? "신청" : "미신청"}</p>
        <p><strong>YouTube 라이브:</strong> ${youtube ? "신청" : "미신청"}</p>
        <p><strong>PIP 디자인:</strong> ${pip ? "신청" : "미신청"}</p>
        <p><strong>인트로 제작:</strong> ${intro ? "신청" : "미신청"}</p>
        <p><strong>추가 요청사항:</strong><br/>${request || "-"}</p>
        <hr />
        <p><strong>기본 촬영비:</strong> ${Number(basePrice || 0).toLocaleString()}원</p>
        <p><strong>추가 시간 금액:</strong> ${Number(extraHourPrice || 0).toLocaleString()}원</p>
        <p><strong>카메라 추가 금액:</strong> ${Number(cameraPrice || 0).toLocaleString()}원</p>
        <p><strong>편집 금액:</strong> ${Number(editPrice || 0).toLocaleString()}원</p>
        <p><strong>Zoom 금액:</strong> ${Number(zoomPrice || 0).toLocaleString()}원</p>
        <p><strong>YouTube 금액:</strong> ${Number(youtubePrice || 0).toLocaleString()}원</p>
        <p><strong>PIP 금액:</strong> ${Number(pipPrice || 0).toLocaleString()}원</p>
        <p><strong>인트로 금액:</strong> ${Number(introPrice || 0).toLocaleString()}원</p>
        ${discountHtml}

        <hr />
        <p><strong>예약 처리:</strong></p>
        <p style="margin-top: 16px;">
          <a
            href="${approveUrl}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#16a34a;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
              margin-right:10px;
              font-weight:bold;
            "
          >
            예약 확정
          </a>

          <a
            href="${cancelUrl}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#dc2626;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
              font-weight:bold;
            "
          >
            예약 취소
          </a>
        </p>

        <p style="margin-top: 14px; color: #666; font-size: 13px;">
          버튼 클릭 시 구글 시트 상태가 변경되고, 고객에게도 자동 안내 메일이 발송됩니다.
        </p>
      `,
    });

    console.log("[POST /api/reservation] 관리자 메일 전송 완료", {
      accepted: adminInfo.accepted,
      rejected: adminInfo.rejected,
    });

    const customerInfo = await transporter.sendMail({
      from: `"무명필름" <${adminEmail}>`,
      to: customerEmail,
      subject: `[무명필름] 촬영 예약 요청이 접수되었습니다 (${reservationNumber})`,
      html: `
        <h2>예약 요청이 정상적으로 접수되었습니다.</h2>
        <p>안녕하세요, ${name}님.</p>
        <p>무명필름 촬영 예약 요청이 정상적으로 접수되었습니다.</p>
        <p>담당자가 내용을 확인한 뒤 입력하신 연락처 또는 이메일로 회신드리겠습니다.</p>
        <hr />
        <p><strong>예약번호:</strong> ${reservationNumber}</p>
        <p><strong>기관명:</strong> ${safeInstitutionName || "-"}</p>
        <p><strong>행사명:</strong> ${eventName}</p>
        <p><strong>촬영 날짜:</strong> ${eventDate}</p>
        <p><strong>시간:</strong> ${timeRange}</p>
        <p><strong>촬영 시간:</strong> ${safeHours}시간</p>
        <p><strong>카메라 대수:</strong> ${camera}대</p>
        <p><strong>편집:</strong> ${editText}</p>
        <p><strong>선택 옵션:</strong> ${optionSummary}</p>
        <p><strong>Zoom 송출:</strong> ${zoom ? "신청" : "미신청"}</p>
        <p><strong>YouTube 라이브:</strong> ${youtube ? "신청" : "미신청"}</p>
        <p><strong>PIP 디자인:</strong> ${pip ? "신청" : "미신청"}</p>
        <p><strong>인트로 제작:</strong> ${intro ? "신청" : "미신청"}</p>
        <p><strong>추가 요청사항:</strong><br/>${request || "-"}</p>
        ${discountHtml}
        <br />
        <p>감사합니다.</p>
        <p>무명필름</p>
      `,
    });

    console.log("[POST /api/reservation] 고객 메일 전송 완료", {
      accepted: customerInfo.accepted,
      rejected: customerInfo.rejected,
    });

    return Response.json({
      success: true,
      reservationNumber,
      adminAccepted: adminInfo.accepted,
      customerAccepted: customerInfo.accepted,
    });
  } catch (error: any) {
    console.error("[POST /api/reservation] 메일/시트 저장 오류 상세:", error);
    console.error("[POST /api/reservation] 에러 메시지:", error?.message);
    console.error("[POST /api/reservation] 에러 코드:", error?.code);
    console.error("[POST /api/reservation] 에러 스택:", error?.stack);

    return Response.json(
      {
        success: false,
        message: error?.message || "예약 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}