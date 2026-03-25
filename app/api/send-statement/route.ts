import nodemailer from "nodemailer";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs/promises";
import path from "path";
import crypto from "node:crypto";

const COOKIE_NAME = "admin_auth";

type DocumentLineItem = {
  name: string | number;
  amount: string | number;
};

type SendStatementBody = {
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
    console.warn("[send-statement] stamp.png를 찾지 못했습니다.");
    return "";
  }
}

async function getEmbeddedKoreanFontCss() {
  const candidates = [
    {
      filePath: path.join(process.cwd(), "public", "fonts", "NotoSansKR-Regular.ttf"),
      fontFamily: "EmbeddedKoreanFont",
      format: "truetype",
      mime: "font/ttf",
    },
    {
      filePath: path.join(process.cwd(), "public", "fonts", "NanumGothic.ttf"),
      fontFamily: "EmbeddedKoreanFont",
      format: "truetype",
      mime: "font/ttf",
    },
    {
      filePath: path.join(process.cwd(), "public", "fonts", "malgun.ttf"),
      fontFamily: "EmbeddedKoreanFont",
      format: "truetype",
      mime: "font/ttf",
    },
    {
      filePath: path.join(process.cwd(), "public", "fonts", "NotoSansKR-Regular.otf"),
      fontFamily: "EmbeddedKoreanFont",
      format: "opentype",
      mime: "font/otf",
    },
  ];

  for (const candidate of candidates) {
    try {
      const fontFile = await fs.readFile(candidate.filePath);
      const base64Font = fontFile.toString("base64");

      return `
        @font-face {
          font-family: '${candidate.fontFamily}';
          src: url(data:${candidate.mime};base64,${base64Font}) format('${candidate.format}');
          font-weight: 400;
          font-style: normal;
        }
      `;
    } catch {
      continue;
    }
  }

  console.warn(
    "[send-statement] 한글 폰트 파일을 찾지 못했습니다. public/fonts/NotoSansKR-Regular.ttf 파일을 추가해주세요."
  );

  return "";
}

function numberToKorean(num: number) {
  if (!Number.isFinite(num) || num <= 0) return "영원";

  const units = ["", "만", "억", "조"];
  const nums = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const smallUnits = ["", "십", "백", "천"];

  function convertChunk(n: number) {
    let result = "";
    const digits = String(n).padStart(4, "0").split("").map(Number);

    for (let i = 0; i < 4; i++) {
      const digit = digits[i];
      if (digit === 0) continue;

      const unitIndex = 3 - i;
      if (digit === 1 && unitIndex > 0) {
        result += smallUnits[unitIndex];
      } else {
        result += nums[digit] + smallUnits[unitIndex];
      }
    }

    return result;
  }

  let value = Math.floor(num);
  let unitIndex = 0;
  let finalResult = "";

  while (value > 0) {
    const chunk = value % 10000;
    if (chunk > 0) {
      finalResult = `${convertChunk(chunk)}${units[unitIndex]}${finalResult}`;
    }
    value = Math.floor(value / 10000);
    unitIndex += 1;
  }

  return `${finalResult}원`;
}

function buildStatementHtml({
  reservationNumber,
  institutionName,
  issueDate,
  items,
  subtotal,
  discountPercent,
  discountAmount,
  supplyAmount,
  vatAmount,
  total,
  totalKorean,
  includeStamp,
  stampDataUrl,
  embeddedFontCss,
}: {
  reservationNumber: string;
  institutionName: string;
  issueDate: string;
  items: { name: string; amount: number }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  supplyAmount: number;
  vatAmount: number;
  total: number;
  totalKorean: string;
  includeStamp: boolean;
  stampDataUrl: string;
  embeddedFontCss: string;
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
      (item, index) => `
        <tr>
          <td class="td center">${index + 1}</td>
          <td class="td">${escapeHtml(item.name)}</td>
          <td class="td center">1</td>
          <td class="td right">${formatWon(item.amount)}</td>
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
          ${embeddedFontCss}

          @page {
            size: A4;
            margin: 12mm 12mm 12mm 12mm;
          }

          body,
          table,
          th,
          td,
          div,
          span,
          p {
            font-family: "EmbeddedKoreanFont", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif;
          }

          body {
            color: #111;
            margin: 0;
            font-size: 12px;
            line-height: 1.42;
            -webkit-font-smoothing: antialiased;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .page {
            width: 100%;
          }

          .title {
            text-align: center;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }

          .top-row {
            display: table;
            width: 100%;
            margin-bottom: 10px;
          }

          .top-left,
          .top-right {
            display: table-cell;
            vertical-align: top;
          }

          .top-right {
            text-align: right;
            font-size: 12px;
          }

          .recipient-box {
            border: 1px solid #9a9a9a;
            padding: 8px 10px;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: 700;
            background: #fff;
          }

          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            table-layout: fixed;
          }

          .meta-table th,
          .meta-table td {
            border: 1px solid #9a9a9a;
            padding: 6px 8px;
            font-size: 11px;
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
            margin-top: 4px;
            table-layout: fixed;
          }

          .items-table th,
          .items-table td {
            border: 1px solid #9a9a9a;
            padding: 7px 8px;
            font-size: 11px;
            vertical-align: middle;
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

          .amount-table {
            width: 390px;
            margin-left: auto;
            margin-top: 10px;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .amount-table th,
          .amount-table td {
            border: 1px solid #9a9a9a;
            padding: 8px 10px;
            font-size: 12px;
            vertical-align: middle;
          }

          .amount-table th {
            width: 38%;
            background: #e9e9e9;
            font-weight: 700;
            text-align: center;
          }

          .amount-table td {
            text-align: right;
            font-weight: 700;
            background: #fff;
          }

          .amount-table tr.total th,
          .amount-table tr.total td {
            font-size: 13px;
            font-weight: 800;
          }

          .discount-negative {
            color: #c33d3d;
          }

          .korean-total {
            margin-top: 8px;
            font-size: 12px;
            font-weight: 700;
            text-align: right;
          }

          .bottom-area {
            margin-top: 18px;
            min-height: 72px;
          }

          .bottom-text {
            font-size: 12px;
            margin-bottom: 10px;
          }

          .supplier-sign {
            margin-top: 10px;
          }

          .sign-wrapper {
            display: inline-block;
            text-align: left;
            font-size: 12px;
            line-height: 1.6;
          }

          .company-name {
            margin-bottom: 2px;
          }

          .sign-row {
            position: relative;
            white-space: nowrap;
          }

          .name {
            display: inline-block;
            position: relative;
            padding-right: 30px;
          }

          .stamp-on-sign {
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-52%);
            width: 52px;
            height: 52px;
            object-fit: contain;
            opacity: 0.96;
            pointer-events: none;
          }

          .doc-no {
            color: #666;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="title">거 래 명 세 서</div>

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
                <th style="width:9%;">NO.</th>
                <th>품목</th>
                <th style="width:11%;">수량</th>
                <th style="width:18%;">단가</th>
                <th style="width:20%;">금액</th>
              </tr>
            </thead>
            <tbody>
              ${
                itemRows ||
                `
                <tr>
                  <td colspan="5" class="td center" style="padding:14px 8px; color:#666;">
                    등록된 품목이 없습니다.
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>

          <table class="amount-table">
            <tr>
              <th>품목 합계</th>
              <td>${formatWon(subtotal)}</td>
            </tr>

            ${
              hasDiscount
                ? `
            <tr>
              <th>할인율</th>
              <td>${discountPercent}%</td>
            </tr>
            <tr>
              <th>할인금액</th>
              <td class="discount-negative">- ${formatWon(discountAmount)}</td>
            </tr>
            `
                : ""
            }

            <tr>
              <th>공급가액</th>
              <td>${formatWon(supplyAmount)}</td>
            </tr>
            <tr>
              <th>세액</th>
              <td>${formatWon(vatAmount)}</td>
            </tr>
            <tr class="total">
              <th>합계</th>
              <td>${formatWon(total)}</td>
            </tr>
          </table>

          <div class="korean-total">
            금액 ${escapeHtml(totalKorean)} 정
          </div>

          <div class="bottom-area">
            <div class="bottom-text">아래와 같이 계산합니다.</div>

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
        top: "8mm",
        bottom: "8mm",
        left: "8mm",
        right: "8mm",
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

    const body = (await req.json()) as SendStatementBody;

    console.log("[send-statement] body:", body);
    console.log("[send-statement] items:", body.items);

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

    const supplyAmount = Math.floor(finalTotal / 1.1);
    const vatAmount = finalTotal - supplyAmount;
    const totalKorean = numberToKorean(finalTotal);

    const reservationNumber = String(body.reservationNumber || "").trim();
    const institutionName = String(body.institutionName || "").trim();
    const issueDate = String(body.issueDate || "").trim();
    const includeStamp = !!body.includeStamp;

    const stampDataUrl = includeStamp ? await getStampDataUrl() : "";
    const embeddedFontCss = await getEmbeddedKoreanFontCss();

    const pdfHtml = buildStatementHtml({
      reservationNumber,
      institutionName,
      issueDate,
      items,
      subtotal: calculatedSubtotal,
      discountPercent,
      discountAmount: calculatedDiscountAmount,
      supplyAmount,
      vatAmount,
      total: finalTotal,
      totalKorean,
      includeStamp,
      stampDataUrl,
      embeddedFontCss,
    });

    const pdfBuffer = await renderPdfFromHtml(pdfHtml);

    const fileDate = getTodayFileDate();
    const safeReservationNumber = reservationNumber || "NO-NUMBER";
    const pdfFileName = `(무명필름) 거래명세서${fileDate}_${safeReservationNumber}.pdf`;

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
          요청해주신 거래명세서를 첨부드립니다.<br />
          확인 부탁드리며, 추가 문의사항 있으시면 언제든지 연락 주세요.
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
      subject: `[무명필름] 거래명세서 전달드립니다 (${institutionName || reservationNumber || "거래명세서"})`,
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
      supplyAmount,
      vatAmount,
    });
  } catch (error: any) {
    console.error("[POST /api/send-statement] 오류:", error);
    console.error("[POST /api/send-statement] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "거래명세서 발송 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}