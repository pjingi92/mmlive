import nodemailer from "nodemailer";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs/promises";
import path from "path";
import crypto from "node:crypto";

const COOKIE_NAME = "admin_auth";

type DocumentLineItem = {
  name: string;
  amount: string | number;
};

type SendEstimateBody = {
  to: string;
  reservationNumber?: string;
  institutionName?: string;
  issueDate?: string;
  recipientName?: string;
  items?: DocumentLineItem[];
  manualTotal?: string | number;
  includeStamp?: boolean;
  discountCode?: string;
  discountPercent?: string | number;
  discountAmount?: string | number;
  finalTotal?: string | number;
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseMoney(value: string | number | undefined) {
  if (typeof value === "number") return value;
  return Number(String(value || "").replace(/[^\d-]/g, "")) || 0;
}

function parsePercent(value: string | number | undefined) {
  if (typeof value === "number") return value;
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}

function formatWon(value: number) {
  return `${Number(value || 0).toLocaleString()}원`;
}

function getSafeItems(items: DocumentLineItem[]) {
  return items
    .map((item) => ({
      name: String(item?.name || "").trim(),
      amount: parseMoney(item?.amount),
    }))
    .filter((item) => item.name);
}

function getTodayFileDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${month}${day}`;
}

async function getStampDataUrl() {
  try {
    const stampPath = path.join(process.cwd(), "public", "stamp.png");
    const file = await fs.readFile(stampPath);
    return `data:image/png;base64,${file.toString("base64")}`;
  } catch (error) {
    console.warn("[send-estimate] stamp.png를 찾지 못했습니다.");
    return "";
  }
}

function buildEstimateHtml({
  reservationNumber,
  institutionName,
  issueDate,
  items,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  includeStamp,
  stampDataUrl,
}: {
  reservationNumber: string;
  institutionName: string;
  issueDate: string;
  items: { name: string; amount: number }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  includeStamp: boolean;
  stampDataUrl: string;
}) {
  const companyName = "무명필름";
  const companyOwner = "문성민";
  const companyBizNo = "347-19-00482";
  const companyAddress = "서울 강서구 공항대로 213 905호";
  const companyBusinessType = "서비스";
  const companyBusinessItem = "영상제작";
  const companyPhone = "010-6821-7172";

  const safeInstitutionName = institutionName || "-";
  const hasDiscount = discountPercent > 0 || discountAmount > 0;

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td class="td">${escapeHtml(item.name)}</td>
          <td class="td center">1건</td>
          <td class="td right">${formatWon(item.amount)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <style>
          @page {
            size: A4;
            margin: 22mm 16mm 18mm 16mm;
          }

          body {
            font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif;
            color: #111;
            margin: 0;
            font-size: 13px;
            line-height: 1.55;
            -webkit-font-smoothing: antialiased;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .page {
            width: 100%;
          }

          .title {
            text-align: center;
            font-size: 30px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 18px;
          }

          .top-row {
            display: table;
            width: 100%;
            margin-bottom: 16px;
          }

          .top-left,
          .top-right {
            display: table-cell;
            vertical-align: top;
          }

          .top-right {
            text-align: right;
            font-size: 13px;
          }

          .recipient-box {
            border: 1px solid #9a9a9a;
            padding: 10px 12px;
            margin-bottom: 14px;
            font-size: 15px;
            font-weight: 700;
            background: #fff;
          }

          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            table-layout: fixed;
          }

          .meta-table th,
          .meta-table td {
            border: 1px solid #9a9a9a;
            padding: 8px 10px;
            font-size: 12px;
            vertical-align: middle;
          }

          .meta-table th {
            background: #e9e9e9;
            text-align: center;
            width: 16%;
            font-weight: 700;
          }

          .meta-table td {
            width: 34%;
            background: #fff;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            table-layout: fixed;
          }

          .items-table th,
          .items-table td {
            border: 1px solid #9a9a9a;
            padding: 9px 10px;
            font-size: 12px;
            background: #fff;
          }

          .items-table th {
            background: #e9e9e9;
            font-weight: 700;
            text-align: center;
          }

          .td.center {
            text-align: center;
          }

          .td.right {
            text-align: right;
          }

          .summary-box {
            width: 360px;
            margin-left: auto;
            margin-top: 16px;
            border: 1px solid #9a9a9a;
            background: #fff;
          }

          .summary-row {
            display: table;
            width: 100%;
            border-top: 1px solid #9a9a9a;
          }

          .summary-row:first-child {
            border-top: none;
          }

          .summary-label,
          .summary-value {
            display: table-cell;
            padding: 10px 12px;
            font-size: 14px;
            vertical-align: middle;
          }

          .summary-label {
            background: #e9e9e9;
            font-weight: 700;
            width: 42%;
          }

          .summary-value {
            text-align: right;
            font-weight: 700;
            background: #fff;
          }

          .discount-negative {
            color: #c33d3d;
          }

          .bottom-area {
            margin-top: 40px;
            min-height: 110px;
          }

          .bottom-text {
            font-size: 14px;
            margin-bottom: 20px;
          }

          .supplier-sign {
            margin-top: 22px;
          }

          .sign-wrapper {
            display: inline-block;
            text-align: left;
            font-size: 14px;
            line-height: 1.8;
          }

          .company-name {
            margin-bottom: 4px;
          }

          .sign-row {
            position: relative;
            white-space: nowrap;
          }

          .name {
            display: inline-block;
            position: relative;
            padding-right: 54px;
          }

          .stamp-on-sign {
            position: absolute;
            right: 2px;
            top: 50%;
            transform: translateY(-50%);
            width: 58px;
            height: 58px;
            object-fit: contain;
            opacity: 0.96;
            pointer-events: none;
          }

          .doc-no {
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="title">견 적 서</div>

          <div class="top-row">
            <div class="top-left">
              <div class="doc-no">문서번호: ${escapeHtml(reservationNumber || "-")}</div>
            </div>
            <div class="top-right">
              <div><strong>발행일</strong> ${escapeHtml(issueDate || "-")}</div>
            </div>
          </div>

          <div class="recipient-box">
            ${escapeHtml(safeInstitutionName)} 귀하
          </div>

          <table class="meta-table">
            <tr>
              <th>상호</th>
              <td>${escapeHtml(companyName)}</td>
              <th>성명</th>
              <td>${escapeHtml(companyOwner)}</td>
            </tr>
            <tr>
              <th>사업장주소</th>
              <td>${escapeHtml(companyAddress)}</td>
              <th>등록번호</th>
              <td>${escapeHtml(companyBizNo)}</td>
            </tr>
            <tr>
              <th>업태</th>
              <td>${escapeHtml(companyBusinessType)}</td>
              <th>종목</th>
              <td>${escapeHtml(companyBusinessItem)}</td>
            </tr>
            <tr>
              <th>전화번호</th>
              <td>${escapeHtml(companyPhone)}</td>
              <th>공급받는자</th>
              <td>${escapeHtml(safeInstitutionName)}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>품명</th>
                <th style="width:18%;">수량</th>
                <th style="width:24%;">단가</th>
              </tr>
            </thead>
            <tbody>
              ${
                itemRows ||
                `
                <tr>
                  <td colspan="3" class="td center" style="padding:18px 10px; color:#666;">
                    등록된 품목이 없습니다.
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>

          <div style="margin-top:8px; margin-bottom:8px; font-size:12px;">
  DEBUG items count: ${items.length}
</div>

<div style="margin-bottom:8px; font-size:12px; word-break:break-all;">
  DEBUG names: ${items.map((item) => escapeHtml(item.name)).join(" | ")}
</div>

          <div class="summary-box">
            <div class="summary-row">
              <div class="summary-label">품목 합계</div>
              <div class="summary-value">${formatWon(subtotal)}</div>
            </div>

            ${
              hasDiscount
                ? `
            <div class="summary-row">
              <div class="summary-label">할인율</div>
              <div class="summary-value">${discountPercent}%</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">할인금액</div>
              <div class="summary-value discount-negative">- ${formatWon(discountAmount)}</div>
            </div>
            `
                : ""
            }

            <div class="summary-row">
              <div class="summary-label">총 액 (VAT 포함)</div>
              <div class="summary-value">${formatWon(total)}</div>
            </div>
          </div>

          <div class="bottom-area">
            <div class="bottom-text">아래와 같이 견적합니다.</div>

            <div class="supplier-sign">
              <div class="sign-wrapper">
                <div class="company-name">${escapeHtml(companyName)}</div>
                <div class="sign-row">
                  성 명 :
                  <span class="name">
                    ${escapeHtml(companyOwner)} (인)
                    ${
                      includeStamp && stampDataUrl
                        ? `<img class="stamp-on-sign" src="${stampDataUrl}" alt="도장" />`
                        : ""
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getLocalChromePath() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  return candidates[0];
}

async function renderPdfFromHtml(html: string) {
  const isLocal = process.env.NODE_ENV !== "production";

  const browser = await puppeteer.launch(
    isLocal
      ? {
          headless: true,
          executablePath: getLocalChromePath(),
        }
      : {
          args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: await chromium.executablePath(),
          headless: true,
        }
  );

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        bottom: "12mm",
        left: "10mm",
        right: "10mm",
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
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

    const body = (await req.json()) as SendEstimateBody;

    console.log("[send-estimate] body:", body);
    console.log("[send-estimate] items:", body.items);

    const to = normalizeEmail(body.to);
    const adminEmail = normalizeEmail(process.env.GMAIL_USER);

    if (!isValidSingleEmail(to)) {
      return Response.json(
        {
          success: false,
          message: "수신 이메일 형식이 올바르지 않습니다.",
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

    const items = getSafeItems(Array.isArray(body.items) ? body.items : []);
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);

    const manualTotal = parseMoney(body.manualTotal);
    const explicitFinalTotal = parseMoney(body.finalTotal);
    const discountPercent = parsePercent(body.discountPercent);
    const explicitDiscountAmount = parseMoney(body.discountAmount);

    const calculatedDiscountAmount =
      explicitDiscountAmount > 0
        ? explicitDiscountAmount
        : discountPercent > 0
        ? Math.floor((calculatedSubtotal * discountPercent) / 100)
        : 0;

    const finalTotal =
      explicitFinalTotal > 0
        ? explicitFinalTotal
        : manualTotal > 0
        ? manualTotal
        : Math.max(0, calculatedSubtotal - calculatedDiscountAmount);

    const reservationNumber = String(body.reservationNumber || "").trim();
    const institutionName = String(body.institutionName || "").trim();
    const issueDate = String(body.issueDate || "").trim();
    const includeStamp = !!body.includeStamp;

    const stampDataUrl = includeStamp ? await getStampDataUrl() : "";

    const pdfHtml = buildEstimateHtml({
      reservationNumber,
      institutionName,
      issueDate,
      items,
      subtotal: calculatedSubtotal,
      discountPercent,
      discountAmount: calculatedDiscountAmount,
      total: finalTotal,
      includeStamp,
      stampDataUrl,
    });

    const pdfBuffer = await renderPdfFromHtml(pdfHtml);

    const fileDate = getTodayFileDate();
    const safeReservationNumber = reservationNumber || "NO-NUMBER";
    const pdfFileName = `(무명필름) 견적서${fileDate}_${safeReservationNumber}.pdf`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailHtml = `
      <div style="font-family:Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color:#111; line-height:1.7;">
        <p>안녕하세요, 무명필름입니다.</p>
        <p>
          요청해주신 촬영 관련 견적서를 첨부드립니다.<br />
          확인 후 궁금하신 사항이나 조정이 필요하신 부분이 있으시면 편하게 말씀 부탁드립니다.
        </p>
        <p>
          감사합니다.<br />
          무명필름 드림
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"무명필름" <${adminEmail}>`,
      to,
      subject: `[무명필름] 촬영 견적서 전달드립니다 (${institutionName || reservationNumber || "견적서"})`,
      html: mailHtml,
      attachments: [
        {
          filename: pdfFileName,
          content: Buffer.from(pdfBuffer),
          contentType: "application/pdf",
        },
      ],
    });

    return Response.json({
      success: true,
      accepted: info.accepted,
      rejected: info.rejected,
      fileName: pdfFileName,
      subtotal: calculatedSubtotal,
      discountPercent,
      discountAmount: calculatedDiscountAmount,
      finalTotal,
    });
  } catch (error: any) {
    console.error("[POST /api/send-estimate] 오류:", error);
    console.error("[POST /api/send-estimate] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "견적서 발송 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}