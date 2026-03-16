"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReservationStatus =
  | "대기"
  | "확정"
  | "촬영완료"
  | "입금대기"
  | "종료"
  | "취소";

type Reservation = {
  reservationNumber: string;
  submittedAt: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  eventName: string;
  eventDate: string;
  time: string;
  hours: string;
  camera: string;
  edit: string;
  options: string;
  total: string;
  request: string;
  adminMemo: string;
  discountCode: string;
};

type DiscountSetting = {
  code: string;
  discountPercent: number;
  enabled: boolean;
  startDate: string;
  endDate: string;
};

type EditForm = {
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
  manualTotal: string;
  request: string;
  adminMemo: string;
  discountCode: string;
};

const DISCOUNT_CODES: DiscountSetting[] = [
  {
    code: "MMLIVE5",
    discountPercent: 5,
    enabled: false,
    startDate: "",
    endDate: "",
  },
  {
    code: "MMLIVE10",
    discountPercent: 10,
    enabled: false,
    startDate: "",
    endDate: "",
  },
  {
    code: "MMLIVE15",
    discountPercent: 15,
    enabled: false,
    startDate: "",
    endDate: "",
  },
  {
    code: "MMLIVE20",
    discountPercent: 20,
    enabled: false,
    startDate: "",
    endDate: "",
  },
];

const ITEMS_PER_PAGE = 20;

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

function parseHours(value: string) {
  const num = Number(String(value || "").replace(/[^\d]/g, ""));
  return num > 0 ? num : 1;
}

function parseCamera(value: string) {
  const num = Number(String(value || "").replace(/[^\d]/g, ""));
  return num > 0 ? num : 1;
}

function parseOptions(options: string) {
  const text = String(options || "");

  return {
    zoom: text.includes("Zoom"),
    youtube: text.includes("YouTube"),
    pip: text.includes("PIP"),
    intro: text.includes("Intro"),
  };
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
  if (!startTime) return "";
  const safeHours = Number(hours || 0);
  if (safeHours <= 0) return startTime;

  const endTime = addHoursToTimeString(startTime, safeHours);
  return `${startTime}~${endTime}`;
}

function extractStartTimeFromTimeRange(timeText: string) {
  const text = String(timeText || "").trim();
  if (!text) return "";

  if (text.includes("~")) {
    return text.split("~")[0].trim();
  }

  return text;
}

function createEditForm(item: Reservation): EditForm {
  const parsedOptions = parseOptions(item.options);

  return {
    eventName: item.eventName || "",
    eventDate: item.eventDate || "",
    startTime: extractStartTimeFromTimeRange(item.time),
    hours: parseHours(item.hours),
    camera: parseCamera(item.camera),
    edit: item.edit === "선택" || item.edit === "신청",
    zoom: parsedOptions.zoom,
    youtube: parsedOptions.youtube,
    pip: parsedOptions.pip,
    intro: parsedOptions.intro,
    manualTotal: "",
    request: item.request === "-" ? "" : item.request || "",
    adminMemo: item.adminMemo || "",
    discountCode: item.discountCode || "",
  };
}

function formatWon(value: number) {
  return `${Number(value || 0).toLocaleString()}원`;
}

function getStatusStyle(status: string) {
  if (status === "확정") {
    return {
      background: "#eaf3ff",
      color: "#2364d2",
    };
  }

  if (status === "촬영완료") {
    return {
      background: "#f3ecff",
      color: "#6d3ccf",
    };
  }

  if (status === "입금대기") {
    return {
      background: "#fff8e6",
      color: "#8a6b16",
    };
  }

  if (status === "종료") {
    return {
      background: "#e8f7ec",
      color: "#207a3d",
    };
  }

  if (status === "취소") {
    return {
      background: "#fdecec",
      color: "#c33d3d",
    };
  }

  return {
    background: "#f3f3f3",
    color: "#666",
  };
}

export default function AdminPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [discountSettings, setDiscountSettings] =
    useState<DiscountSetting[]>(DISCOUNT_CODES);
  const [loading, setLoading] = useState(true);
  const [discountLoading, setDiscountLoading] = useState(true);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [processingNo, setProcessingNo] = useState<string | null>(null);
  const [editingNo, setEditingNo] = useState<string | null>(null);
  const [savingEditNo, setSavingEditNo] = useState<string | null>(null);
  const [deletingNo, setDeletingNo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });

      window.location.href = "/admin-login";
    } catch (error) {
      console.error(error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  }

  async function fetchReservations() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/reservations", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("예약 목록을 불러오지 못했습니다.");
      }

      const data = await res.json();
      setReservations(data.reservations || []);
    } catch (error) {
      console.error(error);
      alert("예약 목록 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDiscountSettings() {
    try {
      setDiscountLoading(true);

      const res = await fetch("/api/admin/discount-settings", {
        cache: "no-store",
      });

      if (!res.ok) {
        setDiscountSettings(DISCOUNT_CODES);
        return;
      }

      const data = await res.json();

      if (Array.isArray(data.settings) && data.settings.length > 0) {
        const mergedSettings = DISCOUNT_CODES.map((defaultItem) => {
          const found = data.settings.find(
            (setting: DiscountSetting) => setting.code === defaultItem.code
          );

          return found
            ? {
                code: found.code || defaultItem.code,
                discountPercent:
                  Number(found.discountPercent) || defaultItem.discountPercent,
                enabled: !!found.enabled,
                startDate: found.startDate || "",
                endDate: found.endDate || "",
              }
            : defaultItem;
        });

        setDiscountSettings(mergedSettings);
      } else {
        setDiscountSettings(DISCOUNT_CODES);
      }
    } catch (error) {
      console.error(error);
      setDiscountSettings(DISCOUNT_CODES);
    } finally {
      setDiscountLoading(false);
    }
  }

  async function saveDiscountSettings() {
    try {
      setDiscountSaving(true);

      const res = await fetch("/api/admin/discount-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: discountSettings,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "할인코드 설정 저장 실패");
      }

      alert("할인코드 설정이 저장되었습니다.");
      await fetchDiscountSettings();
    } catch (error) {
      console.error(error);
      alert("할인코드 설정 저장 중 오류가 발생했습니다.");
    } finally {
      setDiscountSaving(false);
    }
  }

  function updateDiscountSetting(
    code: string,
    field: "enabled" | "startDate" | "endDate",
    value: boolean | string
  ) {
    setDiscountSettings((prev) =>
      prev.map((item) =>
        item.code === code
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function openEdit(item: Reservation) {
    setEditingNo(item.reservationNumber);
    setEditForm(createEditForm(item));
  }

  function closeEdit() {
    setEditingNo(null);
    setEditForm(null);
  }

  function updateEditForm(field: keyof EditForm, value: string | number | boolean) {
    setEditForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  }

  const editPricing = useMemo(() => {
    if (!editForm) {
      return {
        originalTotal: 0,
        discountPercent: 0,
        discountAmount: 0,
        finalTotal: 0,
        appliedDiscountCode: "",
        timeRange: "",
      };
    }

    const extraHourPrice =
      editForm.hours > 1 ? (editForm.hours - 1) * PRICES.extraHour : 0;
    const cameraPrice = editForm.camera > 1 ? PRICES.extraCamera : 0;
    const editPrice = editForm.edit ? PRICES.edit : 0;
    const zoomPrice = editForm.zoom ? PRICES.zoom : 0;
    const youtubePrice = editForm.youtube ? PRICES.youtube : 0;
    const pipPrice = editForm.pip ? PRICES.pip : 0;
    const introPrice = editForm.intro ? PRICES.intro : 0;

    const originalTotal =
      PRICES.base +
      extraHourPrice +
      cameraPrice +
      editPrice +
      zoomPrice +
      youtubePrice +
      pipPrice +
      introPrice;

    const normalizedCode = editForm.discountCode.trim().toUpperCase();

    const foundDiscount = discountSettings.find(
      (item) => item.code === normalizedCode
    );

    const discountPercent = foundDiscount ? Number(foundDiscount.discountPercent) : 0;
    const discountAmount = Math.floor((originalTotal * discountPercent) / 100);

    const finalTotal = editForm.manualTotal
      ? Number(editForm.manualTotal || 0)
      : originalTotal - discountAmount;

    return {
      originalTotal,
      discountPercent,
      discountAmount,
      finalTotal,
      appliedDiscountCode: normalizedCode,
      timeRange: buildTimeRange(editForm.startTime, editForm.hours),
    };
  }, [editForm, discountSettings]);

  async function saveReservationEdit(reservationNumber: string) {
    if (!editForm) return;

    try {
      setSavingEditNo(reservationNumber);

      const payload = {
        reservationNumber,
        eventName: editForm.eventName,
        eventDate: editForm.eventDate,
        startTime: editForm.startTime,
        hours: editForm.hours,
        camera: editForm.camera,
        edit: editForm.edit,
        zoom: editForm.zoom,
        youtube: editForm.youtube,
        pip: editForm.pip,
        intro: editForm.intro,
        options: buildOptionSummary({
          zoom: editForm.zoom,
          youtube: editForm.youtube,
          pip: editForm.pip,
          intro: editForm.intro,
        }),
        total: editPricing.finalTotal,
        request: editForm.request,
        adminMemo: editForm.adminMemo,
        discountCode: editPricing.appliedDiscountCode,
      };

      const res = await fetch("/api/admin/reservation-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "예약 수정 저장 실패");
      }

      alert("예약 정보가 수정되었습니다.");
      closeEdit();
      await fetchReservations();
    } catch (error) {
      console.error(error);
      alert("예약 수정 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingEditNo(null);
    }
  }

  async function handleDeleteReservation(reservationNumber: string) {
    try {
      const ok = window.confirm(
        `${reservationNumber} 예약을 삭제할까요?\n삭제하면 구글 시트에서도 함께 제거되도록 요청됩니다.`
      );

      if (!ok) return;

      setDeletingNo(reservationNumber);

      const res = await fetch("/api/admin/reservation-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationNumber,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "예약 삭제 실패");
      }

      alert("예약이 삭제되었습니다.");
      if (editingNo === reservationNumber) {
        closeEdit();
      }
      await fetchReservations();
    } catch (error) {
      console.error(error);
      alert("예약 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingNo(null);
    }
  }

  async function handleStatusChange(
    reservationNumber: string,
    status: ReservationStatus
  ) {
    try {
      const shouldSendMail = status === "확정" || status === "취소";
      const confirmMessage = shouldSendMail
        ? `${reservationNumber} 예약을 ${status} 처리할까요?\n고객에게 안내 메일도 발송됩니다.`
        : `${reservationNumber} 예약을 ${status} 상태로 변경할까요?`;

      const ok = window.confirm(confirmMessage);

      if (!ok) return;

      setProcessingNo(reservationNumber);

      const res = await fetch(
        `/api/reservation-status?no=${encodeURIComponent(
          reservationNumber
        )}&status=${encodeURIComponent(status)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "처리 실패");
      }

      alert(`예약이 ${status} 처리되었습니다.`);
      await fetchReservations();
    } catch (error) {
      console.error(error);
      alert("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setProcessingNo(null);
    }
  }

  useEffect(() => {
    fetchReservations();
    fetchDiscountSettings();
  }, []);

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => {
      const aNum = Number(a.reservationNumber.replace(/[^\d]/g, "")) || 0;
      const bNum = Number(b.reservationNumber.replace(/[^\d]/g, "")) || 0;
      return bNum - aNum;
    });
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return sortedReservations;

    return sortedReservations.filter((item) => {
      return (
        item.reservationNumber.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.eventName.toLowerCase().includes(q) ||
        item.eventDate.toLowerCase().includes(q) ||
        item.time.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.discountCode.toLowerCase().includes(q)
      );
    });
  }, [sortedReservations, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReservations.length / ITEMS_PER_PAGE)
  );

  const pagedReservations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredReservations.slice(startIndex, endIndex);
  }, [filteredReservations, currentPage]);

  const activeDiscountCodeList = useMemo(() => {
    return discountSettings.filter((item) => item.enabled).map((item) => item.code);
  }, [discountSettings]);

  const summary = useMemo(() => {
    return {
      total: reservations.length,
      pending: reservations.filter((v) => v.status === "대기").length,
      confirmed: reservations.filter((v) => v.status === "확정").length,
      filmed: reservations.filter((v) => v.status === "촬영완료").length,
      waitingPayment: reservations.filter((v) => v.status === "입금대기").length,
      done: reservations.filter((v) => v.status === "종료").length,
      canceled: reservations.filter((v) => v.status === "취소").length,
      discounted: reservations.filter((v) => !!v.discountCode).length,
    };
  }, [reservations]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f3",
        padding: "40px 20px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
              예약 관리자
            </h1>

            <Link href="/admin/calendar" style={{ textDecoration: "none" }}>
              <button
                type="button"
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                달력 관리
              </button>
            </Link>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            로그아웃
          </button>
        </div>

        <p style={{ color: "#666", marginBottom: 24 }}>
          예약 요청 관리, 할인코드 운영, 상태 변경 및 진행 완료 관리
        </p>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            boxShadow: "0 6px 20px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <h2 style={{ fontSize: 24, margin: 0, marginBottom: 6 }}>
                할인코드 관리
              </h2>
              <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
                상단에서 할인코드 활성화와 유효기간을 제어할 수 있습니다.
              </p>
            </div>

            <button
              type="button"
              onClick={saveDiscountSettings}
              disabled={discountSaving}
              style={{
                border: "none",
                background: "#111",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: 12,
                cursor: discountSaving ? "default" : "pointer",
                fontWeight: 700,
                opacity: discountSaving ? 0.7 : 1,
                height: "fit-content",
              }}
            >
              {discountSaving ? "저장 중..." : "할인설정 저장"}
            </button>
          </div>

          {discountLoading ? (
            <div style={{ color: "#666" }}>할인코드 설정 불러오는 중...</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {discountSettings.map((item) => (
                <div
                  key={item.code}
                  style={{
                    border: "1px solid #ececec",
                    borderRadius: 16,
                    padding: 16,
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(180px, 1.2fr) minmax(120px, 0.8fr) minmax(150px, 1fr) minmax(150px, 1fr)",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        {item.code}
                      </div>
                      <div style={{ color: "#666", fontSize: 14 }}>
                        {item.discountPercent}% 할인 코드
                      </div>
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontWeight: 700,
                        color: item.enabled ? "#207a3d" : "#666",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          updateDiscountSetting(item.code, "enabled", e.target.checked)
                        }
                      />
                      {item.enabled ? "활성화" : "비활성화"}
                    </label>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#666",
                          marginBottom: 6,
                        }}
                      >
                        시작일
                      </div>
                      <input
                        type="date"
                        value={item.startDate}
                        onChange={(e) =>
                          updateDiscountSetting(item.code, "startDate", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "12px 12px",
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          fontSize: 14,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#666",
                          marginBottom: 6,
                        }}
                      >
                        종료일
                      </div>
                      <input
                        type="date"
                        value={item.endDate}
                        onChange={(e) =>
                          updateDiscountSetting(item.code, "endDate", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "12px 12px",
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          fontSize: 14,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#666", fontSize: 13 }}>전체</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.total}</div>
          </div>

          <div
            style={{
              background: "#f3f3f3",
              border: "1px solid #e1e1e1",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#666", fontSize: 13 }}>대기</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.pending}</div>
          </div>

          <div
            style={{
              background: "#eaf3ff",
              border: "1px solid #cfe0ff",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#2364d2", fontSize: 13 }}>확정</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.confirmed}</div>
          </div>

          <div
            style={{
              background: "#f3ecff",
              border: "1px solid #e0d2ff",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#6d3ccf", fontSize: 13 }}>촬영완료</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.filmed}</div>
          </div>

          <div
            style={{
              background: "#fff8e6",
              border: "1px solid #f0e0aa",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#8a6b16", fontSize: 13 }}>입금대기</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.waitingPayment}
            </div>
          </div>

          <div
            style={{
              background: "#e8f7ec",
              border: "1px solid #cfe9d6",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#207a3d", fontSize: 13 }}>종료</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.done}</div>
          </div>

          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #f0d0d0",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#c33d3d", fontSize: 13 }}>취소</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.canceled}</div>
          </div>

          <div
            style={{
              background: "#f4f1ff",
              border: "1px solid #ddd4ff",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: "#5b46c5", fontSize: 13 }}>할인코드 사용</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.discounted}</div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="예약번호, 이름, 이메일, 연락처, 행사명, 날짜, 시간, 할인코드 검색"
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 15,
              borderRadius: 12,
              border: "1px solid #ddd",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {loading ? (
          <div>불러오는 중...</div>
        ) : pagedReservations.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              border: "1px solid #e5e5e5",
            }}
          >
            검색된 예약이 없습니다.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "#666", fontSize: 14 }}>
                최신 요청이 먼저 보이도록 정렬되었습니다. 총{" "}
                <strong>{filteredReservations.length}건</strong> / 현재{" "}
                <strong>{currentPage}페이지</strong>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: currentPage === 1 ? "default" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontWeight: 700,
                  }}
                >
                  이전
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                    fontSize: 14,
                    color: "#555",
                  }}
                >
                  {currentPage} / {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  style={{
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: currentPage === totalPages ? "default" : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontWeight: 700,
                  }}
                >
                  다음
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {pagedReservations.map((item) => {
                const isEditing = editingNo === item.reservationNumber;
                const isSavingThisEdit = savingEditNo === item.reservationNumber;
                const isDeletingThis = deletingNo === item.reservationNumber;
                const statusStyle = getStatusStyle(item.status);

                return (
                  <div
                    key={item.reservationNumber}
                    style={{
                      background: "#fff",
                      borderRadius: 18,
                      padding: 24,
                      border: "1px solid #e7e7e7",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 24,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 320 }}>
                        <div style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 700,
                              marginBottom: 6,
                            }}
                          >
                            {item.eventName || "(행사명 없음)"}
                          </div>
                          <div style={{ color: "#666", fontSize: 14 }}>
                            접수일시: {item.submittedAt}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 10,
                            color: "#333",
                            lineHeight: 1.7,
                          }}
                        >
                          <div>
                            <strong>예약번호:</strong> {item.reservationNumber}
                          </div>
                          <div>
                            <strong>신청자명:</strong> {item.name}
                          </div>
                          <div>
                            <strong>이메일:</strong> {item.email}
                          </div>
                          <div>
                            <strong>연락처:</strong> {item.phone}
                          </div>
                          <div>
                            <strong>촬영날짜:</strong> {item.eventDate}
                          </div>
                          <div>
                            <strong>시간:</strong> {item.time}
                          </div>
                          <div>
                            <strong>촬영시간:</strong> {item.hours}
                          </div>
                          <div>
                            <strong>카메라대수:</strong> {item.camera}
                          </div>
                          <div>
                            <strong>편집:</strong> {item.edit}
                          </div>
                          <div>
                            <strong>옵션:</strong> {item.options}
                          </div>
                          <div>
                            <strong>예상견적:</strong> {item.total}
                          </div>
                          <div>
                            <strong>할인코드:</strong> {item.discountCode || "-"}
                          </div>
                        </div>

                        <div style={{ marginTop: 14, color: "#333", lineHeight: 1.7 }}>
                          <strong>요청사항:</strong>
                          <div
                            style={{
                              marginTop: 6,
                              background: "#fafafa",
                              border: "1px solid #eee",
                              borderRadius: 12,
                              padding: 12,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {item.request || "-"}
                          </div>
                        </div>

                        {item.adminMemo ? (
                          <div style={{ marginTop: 14, color: "#333", lineHeight: 1.7 }}>
                            <strong>관리자메모:</strong>
                            <div
                              style={{
                                marginTop: 6,
                                background: "#f8f8ff",
                                border: "1px solid #e7e7ff",
                                borderRadius: 12,
                                padding: 12,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {item.adminMemo}
                            </div>
                          </div>
                        ) : null}

                        {isEditing && editForm ? (
                          <div
                            style={{
                              marginTop: 18,
                              padding: 18,
                              borderRadius: 16,
                              background: "#f8f8f8",
                              border: "1px solid #e8e8e8",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 700,
                                marginBottom: 16,
                              }}
                            >
                              예약 수정
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: 12,
                              }}
                            >
                              <div>
                                <div style={editLabelStyle}>행사명</div>
                                <input
                                  value={editForm.eventName}
                                  onChange={(e) =>
                                    updateEditForm("eventName", e.target.value)
                                  }
                                  style={editInputStyle}
                                />
                              </div>

                              <div>
                                <div style={editLabelStyle}>촬영날짜</div>
                                <input
                                  type="date"
                                  value={editForm.eventDate}
                                  onChange={(e) =>
                                    updateEditForm("eventDate", e.target.value)
                                  }
                                  style={editInputStyle}
                                />
                              </div>

                              <div>
                                <div style={editLabelStyle}>시작시간</div>
                                <input
                                  type="time"
                                  value={editForm.startTime}
                                  onChange={(e) =>
                                    updateEditForm("startTime", e.target.value)
                                  }
                                  style={editInputStyle}
                                />
                              </div>

                              <div>
                                <div style={editLabelStyle}>촬영시간</div>
                                <select
                                  value={editForm.hours}
                                  onChange={(e) =>
                                    updateEditForm("hours", Number(e.target.value))
                                  }
                                  style={editInputStyle}
                                >
                                  {Array.from({ length: 16 }, (_, i) => i + 1).map(
                                    (hour) => (
                                      <option key={hour} value={hour}>
                                        {hour}시간
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div>
                                <div style={editLabelStyle}>카메라대수</div>
                                <select
                                  value={editForm.camera}
                                  onChange={(e) =>
                                    updateEditForm("camera", Number(e.target.value))
                                  }
                                  style={editInputStyle}
                                >
                                  <option value={1}>1대</option>
                                  <option value={2}>2대</option>
                                </select>
                              </div>

                              <div>
                                <div style={editLabelStyle}>할인코드</div>
                                <input
                                  value={editForm.discountCode}
                                  onChange={(e) =>
                                    updateEditForm(
                                      "discountCode",
                                      e.target.value.toUpperCase()
                                    )
                                  }
                                  placeholder={
                                    activeDiscountCodeList.length > 0
                                      ? `사용 가능: ${activeDiscountCodeList.join(", ")}`
                                      : "할인코드 없음"
                                  }
                                  style={editInputStyle}
                                />
                              </div>

                              <div>
                                <div style={editLabelStyle}>수동 최종금액</div>
                                <input
                                  value={editForm.manualTotal}
                                  onChange={(e) =>
                                    updateEditForm(
                                      "manualTotal",
                                      e.target.value.replace(/[^\d]/g, "")
                                    )
                                  }
                                  placeholder="비워두면 자동 계산"
                                  style={editInputStyle}
                                />
                              </div>

                              <div>
                                <div style={editLabelStyle}>시간 범위</div>
                                <div
                                  style={{
                                    ...editInputStyle,
                                    color: "#555",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  {editPricing.timeRange || "-"}
                                </div>
                              </div>
                            </div>

                            <div style={{ marginTop: 16 }}>
                              <div style={editLabelStyle}>옵션 선택</div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(180px, 1fr))",
                                  gap: 10,
                                }}
                              >
                                <label style={editCheckStyle}>
                                  <input
                                    type="checkbox"
                                    checked={editForm.edit}
                                    onChange={(e) =>
                                      updateEditForm("edit", e.target.checked)
                                    }
                                  />
                                  <span style={{ marginLeft: 8 }}>편집</span>
                                </label>

                                <label style={editCheckStyle}>
                                  <input
                                    type="checkbox"
                                    checked={editForm.zoom}
                                    onChange={(e) =>
                                      updateEditForm("zoom", e.target.checked)
                                    }
                                  />
                                  <span style={{ marginLeft: 8 }}>Zoom</span>
                                </label>

                                <label style={editCheckStyle}>
                                  <input
                                    type="checkbox"
                                    checked={editForm.youtube}
                                    onChange={(e) =>
                                      updateEditForm("youtube", e.target.checked)
                                    }
                                  />
                                  <span style={{ marginLeft: 8 }}>YouTube</span>
                                </label>

                                <label style={editCheckStyle}>
                                  <input
                                    type="checkbox"
                                    checked={editForm.pip}
                                    onChange={(e) =>
                                      updateEditForm("pip", e.target.checked)
                                    }
                                  />
                                  <span style={{ marginLeft: 8 }}>PIP</span>
                                </label>

                                <label style={editCheckStyle}>
                                  <input
                                    type="checkbox"
                                    checked={editForm.intro}
                                    onChange={(e) =>
                                      updateEditForm("intro", e.target.checked)
                                    }
                                  />
                                  <span style={{ marginLeft: 8 }}>Intro</span>
                                </label>
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: 16,
                                padding: 14,
                                borderRadius: 14,
                                background: "#fff",
                                border: "1px solid #e7e7e7",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  marginBottom: 10,
                                }}
                              >
                                금액 자동 계산
                              </div>

                              <div style={priceRowStyle}>
                                <span>할인 전 금액</span>
                                <strong>{formatWon(editPricing.originalTotal)}</strong>
                              </div>

                              <div style={priceRowStyle}>
                                <span>할인코드</span>
                                <strong>
                                  {editPricing.appliedDiscountCode || "-"}
                                </strong>
                              </div>

                              <div style={priceRowStyle}>
                                <span>할인율</span>
                                <strong>{editPricing.discountPercent}%</strong>
                              </div>

                              <div style={priceRowStyle}>
                                <span>할인금액</span>
                                <strong>- {formatWon(editPricing.discountAmount)}</strong>
                              </div>

                              <div style={priceRowStyle}>
                                <span>최종금액</span>
                                <strong>{formatWon(editPricing.finalTotal)}</strong>
                              </div>
                            </div>

                            <div style={{ marginTop: 16 }}>
                              <div style={editLabelStyle}>요청사항</div>
                              <textarea
                                value={editForm.request}
                                onChange={(e) =>
                                  updateEditForm("request", e.target.value)
                                }
                                rows={4}
                                style={{ ...editInputStyle, resize: "vertical" as const }}
                              />
                            </div>

                            <div style={{ marginTop: 16 }}>
                              <div style={editLabelStyle}>관리자메모</div>
                              <textarea
                                value={editForm.adminMemo}
                                onChange={(e) =>
                                  updateEditForm("adminMemo", e.target.value)
                                }
                                rows={4}
                                style={{ ...editInputStyle, resize: "vertical" as const }}
                              />
                            </div>

                            <div
                              style={{
                                marginTop: 16,
                                padding: 12,
                                borderRadius: 12,
                                background: "#fff",
                                border: "1px solid #e7e7e7",
                                color: "#555",
                                fontSize: 14,
                                lineHeight: 1.7,
                              }}
                            >
                              현재 옵션 요약:{" "}
                              <strong>
                                {buildOptionSummary({
                                  zoom: editForm.zoom,
                                  youtube: editForm.youtube,
                                  pip: editForm.pip,
                                  intro: editForm.intro,
                                })}
                              </strong>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                marginTop: 16,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  saveReservationEdit(item.reservationNumber)
                                }
                                disabled={isSavingThisEdit}
                                style={primaryButtonStyle(isSavingThisEdit)}
                              >
                                {isSavingThisEdit ? "저장 중..." : "수정 저장"}
                              </button>

                              <button
                                type="button"
                                onClick={closeEdit}
                                disabled={isSavingThisEdit}
                                style={secondaryButtonStyle(isSavingThisEdit)}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div style={{ minWidth: 260 }}>
                        <div
                          style={{
                            display: "inline-block",
                            padding: "8px 14px",
                            borderRadius: 999,
                            fontWeight: 700,
                            marginBottom: 16,
                            background: statusStyle.background,
                            color: statusStyle.color,
                          }}
                        >
                          {item.status}
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            disabled={
                              savingEditNo === item.reservationNumber ||
                              deletingNo === item.reservationNumber
                            }
                            style={secondaryButtonStyle(
                              savingEditNo === item.reservationNumber ||
                                deletingNo === item.reservationNumber
                            )}
                          >
                            수정
                          </button>

                          <button
                            onClick={() =>
                              handleStatusChange(item.reservationNumber, "확정")
                            }
                            disabled={
                              processingNo === item.reservationNumber ||
                              deletingNo === item.reservationNumber
                            }
                            style={statusButtonStyle(
                              processingNo === item.reservationNumber ||
                                deletingNo === item.reservationNumber,
                              "#2364d2",
                              "#fff"
                            )}
                          >
                            {processingNo === item.reservationNumber &&
                            item.status !== "확정"
                              ? "처리 중..."
                              : "확정"}
                          </button>

                          <button
                            onClick={() =>
                              handleStatusChange(item.reservationNumber, "촬영완료")
                            }
                            disabled={
                              processingNo === item.reservationNumber ||
                              deletingNo === item.reservationNumber
                            }
                            style={statusButtonStyle(
                              processingNo === item.reservationNumber ||
                                deletingNo === item.reservationNumber,
                              "#6d3ccf",
                              "#fff"
                            )}
                          >
                            촬영완료
                          </button>

                          <button
                            onClick={() =>
                              handleStatusChange(item.reservationNumber, "입금대기")
                            }
                            disabled={
                              processingNo === item.reservationNumber ||
                              deletingNo === item.reservationNumber
                            }
                            style={statusButtonStyle(
                              processingNo === item.reservationNumber ||
                                deletingNo === item.reservationNumber,
                              "#f6e7a8",
                              "#6b570f"
                            )}
                          >
                            입금대기
                          </button>

                          <button
                            onClick={() =>
                              handleStatusChange(item.reservationNumber, "종료")
                            }
                            disabled={
                              processingNo === item.reservationNumber ||
                              deletingNo === item.reservationNumber
                            }
                            style={statusButtonStyle(
                              processingNo === item.reservationNumber ||
                                deletingNo === item.reservationNumber,
                              "#207a3d",
                              "#fff"
                            )}
                          >
                            종료
                          </button>

                          <button
                            onClick={() =>
                              handleStatusChange(item.reservationNumber, "취소")
                            }
                            disabled={
                              processingNo === item.reservationNumber ||
                              deletingNo === item.reservationNumber
                            }
                            style={statusButtonStyle(
                              processingNo === item.reservationNumber ||
                                deletingNo === item.reservationNumber,
                              "#fff",
                              "#111",
                              "1px solid #ddd"
                            )}
                          >
                            취소
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteReservation(item.reservationNumber)
                            }
                            disabled={
                              deletingNo === item.reservationNumber ||
                              processingNo === item.reservationNumber ||
                              savingEditNo === item.reservationNumber
                            }
                            style={{
                              border: "1px solid #f0c9c9",
                              background: "#fff0f0",
                              color: "#c33d3d",
                              padding: "12px 16px",
                              borderRadius: 12,
                              cursor:
                                deletingNo === item.reservationNumber ||
                                processingNo === item.reservationNumber ||
                                savingEditNo === item.reservationNumber
                                  ? "default"
                                  : "pointer",
                              fontWeight: 700,
                              opacity:
                                deletingNo === item.reservationNumber ||
                                processingNo === item.reservationNumber ||
                                savingEditNo === item.reservationNumber
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {deletingNo === item.reservationNumber
                              ? "삭제 중..."
                              : "삭제"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: currentPage === 1 ? "default" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                  fontWeight: 700,
                }}
              >
                이전 페이지
              </button>

              <div style={{ fontSize: 14, color: "#555" }}>
                {currentPage} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: currentPage === totalPages ? "default" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  fontWeight: 700,
                }}
              >
                다음 페이지
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const editLabelStyle = {
  fontSize: 13,
  color: "#666",
  marginBottom: 6,
};

const editInputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 14,
  boxSizing: "border-box" as const,
  background: "#fff",
};

const editCheckStyle = {
  display: "flex",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #e5e5e5",
  background: "#fff",
  fontSize: 14,
};

const priceRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
  fontSize: 14,
  color: "#333",
};

function primaryButtonStyle(disabled: boolean) {
  return {
    border: "none",
    background: "#111",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 12,
    cursor: disabled ? "default" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.6 : 1,
  };
}

function secondaryButtonStyle(disabled: boolean) {
  return {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    padding: "12px 16px",
    borderRadius: 12,
    cursor: disabled ? "default" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.6 : 1,
  };
}

function statusButtonStyle(
  disabled: boolean,
  background: string,
  color: string,
  border: string = "none"
) {
  return {
    border,
    background,
    color,
    padding: "12px 16px",
    borderRadius: 12,
    cursor: disabled ? "default" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.6 : 1,
  };
}