"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";

type CalendarSettingItem = {
  date: string;
  type: string;
  time: string;
  status: string;
  note: string;
};

type CalendarDaySummary = {
  date: string;
  isHoliday: boolean;
  blockedTimes: string[];
  note: string;
};

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

const timeOptions = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

// 🔧 FIX: 8:00 / 08:00 / 9:00 / 09:00 모두 HH:mm 으로 통일
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

// 🔧 FIX: 공통 문자열 정규화
function normalizeText(value: string) {
  return String(value || "").trim().toLowerCase();
}

// 🔧 ADD: 예약 시간 문자열에서 시작시간 추출
function extractStartTime(timeText: string) {
  const text = String(timeText || "").trim();
  if (!text) return "";

  if (text.includes("~")) {
    return normalizeTime(text.split("~")[0].trim());
  }

  return normalizeTime(text);
}

// 🔧 ADD: "3시간" 같은 문자열에서 시간 수 추출
function parseReservationHours(hoursText: string) {
  const matched = String(hoursText || "").match(/\d+/);
  const hours = matched ? Number(matched[0]) : 1;
  return hours > 0 ? hours : 1;
}

// 🔧 ADD: 시작시간 + 시간수로 예약 점유 슬롯 계산
function getReservationRangeTimes(startTime: string, hours: number) {
  const normalizedStart = normalizeTime(startTime);
  const startIndex = timeOptions.indexOf(normalizedStart);

  if (!normalizedStart || startIndex === -1) return [];

  return Array.from({ length: hours }, (_, i) => timeOptions[startIndex + i]).filter(
    Boolean
  ) as string[];
}

export default function AdminCalendarPage() {
  const [selected, setSelected] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [isHoliday, setIsHoliday] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [allSettings, setAllSettings] = useState<CalendarSettingItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const today = startOfDay(new Date());

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : "";

  const blockedTimeSet = useMemo(() => {
    return new Set(blockedTimes.map((time) => normalizeTime(time)));
  }, [blockedTimes]);

  const daySummaryMap = useMemo(() => {
    const map = new Map<string, CalendarDaySummary>();

    allSettings.forEach((item) => {
      const key = String(item.date || "").trim();
      if (!key) return;

      const itemType = normalizeText(item.type);
      const itemTime = normalizeTime(item.time);
      const itemStatus = normalizeText(item.status);

      const prev = map.get(key) || {
        date: key,
        isHoliday: false,
        blockedTimes: [],
        note: "",
      };

      if (
        itemType === "day" &&
        itemTime === "all" &&
        itemStatus === "closed"
      ) {
        prev.isHoliday = true;
      }

      if (
        itemType === "slot" &&
        itemStatus === "closed" &&
        itemTime &&
        itemTime !== "all" &&
        timeOptions.includes(itemTime)
      ) {
        if (!prev.blockedTimes.includes(itemTime)) {
          prev.blockedTimes.push(itemTime);
        }
      }

      if (!prev.note && String(item.note || "").trim()) {
        prev.note = String(item.note || "").trim();
      }

      map.set(key, prev);
    });

    return map;
  }, [allSettings]);

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();

    reservations.forEach((item) => {
      const key = String(item.eventDate || "").trim();
      if (!key) return;

      const prev = map.get(key) || [];
      prev.push(item);
      map.set(key, prev);
    });

    return map;
  }, [reservations]);

  const selectedDateReservations = useMemo(() => {
    if (!selectedKey) return [];
    const items = reservationsByDate.get(selectedKey) || [];

    return [...items].sort((a, b) => {
      const aConfirmed = a.status === "확정" ? 1 : 0;
      const bConfirmed = b.status === "확정" ? 1 : 0;

      if (aConfirmed !== bConfirmed) {
        return bConfirmed - aConfirmed;
      }

      return String(a.time || "").localeCompare(String(b.time || ""));
    });
  }, [reservationsByDate, selectedKey]);

  const selectedDateConfirmedReservations = useMemo(() => {
    return selectedDateReservations.filter((item) => item.status === "확정");
  }, [selectedDateReservations]);

  const selectedDatePendingReservations = useMemo(() => {
    return selectedDateReservations.filter((item) => item.status === "대기");
  }, [selectedDateReservations]);

  // 🔧 ADD: 선택 날짜 기준 확정 예약 시간 슬롯 집합
  const selectedConfirmedTimeSet = useMemo(() => {
    const times = selectedDateConfirmedReservations.flatMap((item) => {
      const startTime = extractStartTime(item.time);
      const hours = parseReservationHours(item.hours);
      return getReservationRangeTimes(startTime, hours);
    });

    return new Set(times.map((time) => normalizeTime(time)));
  }, [selectedDateConfirmedReservations]);

  // 🔧 ADD: 선택 날짜 기준 대기 예약 시간 슬롯 집합
  const selectedPendingTimeSet = useMemo(() => {
    const times = selectedDatePendingReservations.flatMap((item) => {
      const startTime = extractStartTime(item.time);
      const hours = parseReservationHours(item.hours);
      return getReservationRangeTimes(startTime, hours);
    });

    return new Set(times.map((time) => normalizeTime(time)));
  }, [selectedDatePendingReservations]);

  const reservationDates = useMemo(() => {
    return Array.from(reservationsByDate.keys()).map((date) => new Date(date));
  }, [reservationsByDate]);

  const confirmedReservationDates = useMemo(() => {
    return Array.from(reservationsByDate.entries())
      .filter(([, items]) => items.some((item) => item.status === "확정"))
      .map(([date]) => new Date(date));
  }, [reservationsByDate]);

  const pendingReservationDates = useMemo(() => {
    return Array.from(reservationsByDate.entries())
      .filter(([, items]) => items.some((item) => item.status === "대기"))
      .map(([date]) => new Date(date));
  }, [reservationsByDate]);

  const holidayDates = useMemo(() => {
    return Array.from(daySummaryMap.values())
      .filter((item) => item.isHoliday)
      .map((item) => new Date(item.date));
  }, [daySummaryMap]);

  const partialDates = useMemo(() => {
    return Array.from(daySummaryMap.values())
      .filter((item) => !item.isHoliday && item.blockedTimes.length > 0)
      .map((item) => new Date(item.date));
  }, [daySummaryMap]);

  const modifiers = {
    adminHoliday: holidayDates,
    adminPartial: partialDates,
    adminReserved: reservationDates,
    adminConfirmedReservation: confirmedReservationDates,
    adminPendingReservation: pendingReservationDates,
  };

  const selectedSummary = selectedKey ? daySummaryMap.get(selectedKey) : undefined;

  async function fetchAllCalendarSettings() {
    try {
      setCalendarLoading(true);

      const res = await fetch("/api/admin/calendar-settings", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("전체 달력 설정을 불러오지 못했습니다.");
      }

      const data = await res.json();
      const settings: CalendarSettingItem[] = Array.isArray(data.settings)
        ? data.settings
        : [];

      setAllSettings(settings);
    } catch (error) {
      console.error(error);
      setAllSettings([]);
    } finally {
      setCalendarLoading(false);
    }
  }

  async function fetchReservations() {
    try {
      setReservationLoading(true);

      const res = await fetch("/api/admin/reservations", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("예약 목록을 불러오지 못했습니다.");
      }

      const data = await res.json();
      setReservations(Array.isArray(data.reservations) ? data.reservations : []);
    } catch (error) {
      console.error(error);
      setReservations([]);
    } finally {
      setReservationLoading(false);
    }
  }

  async function fetchCalendarSettings(date: string) {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/calendar-settings?date=${encodeURIComponent(date)}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error("달력 설정을 불러오지 못했습니다.");
      }

      const data = await res.json();
      const settings: CalendarSettingItem[] = Array.isArray(data.settings)
        ? data.settings
        : [];

      const dayClosed = settings.some((item) => {
        const itemType = normalizeText(item.type);
        const itemTime = normalizeTime(item.time);
        const itemStatus = normalizeText(item.status);

        return (
          itemType === "day" &&
          itemTime === "all" &&
          itemStatus === "closed"
        );
      });

      const slotClosedTimes = settings
        .filter((item) => {
          const itemType = normalizeText(item.type);
          const itemTime = normalizeTime(item.time);
          const itemStatus = normalizeText(item.status);

          return (
            itemType === "slot" &&
            itemStatus === "closed" &&
            itemTime &&
            itemTime !== "all" &&
            timeOptions.includes(itemTime)
          );
        })
        .map((item) => normalizeTime(item.time));

      const firstNote =
        settings.find((item) => String(item.note || "").trim())?.note || "";

      setIsHoliday(dayClosed);
      setBlockedTimes(Array.from(new Set(slotClosedTimes)).sort());
      setNote(firstNote);
    } catch (error) {
      console.error(error);
      alert("달력 설정을 불러오는 중 오류가 발생했습니다.");
      setIsHoliday(false);
      setBlockedTimes([]);
      setNote("");
    } finally {
      setLoading(false);
    }
  }

  async function saveCalendarSettings() {
    if (!selectedKey) {
      alert("날짜를 먼저 선택해줘.");
      return;
    }

    try {
      setSaving(true);

      const items: CalendarSettingItem[] = [];

      if (isHoliday) {
        items.push({
          date: selectedKey,
          type: "day",
          time: "all",
          status: "closed",
          note: note.trim(),
        });
      }

      if (!isHoliday) {
        Array.from(new Set(blockedTimes.map((time) => normalizeTime(time))))
          .filter((time) => timeOptions.includes(time))
          .forEach((time) => {
            items.push({
              date: selectedKey,
              type: "slot",
              time,
              status: "closed",
              note: note.trim(),
            });
          });
      }

      const res = await fetch("/api/admin/calendar-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: selectedKey,
          reset: true,
          items,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "달력 설정 저장 실패");
      }

      alert("달력 설정이 저장되었습니다.");
      await fetchCalendarSettings(selectedKey);
      await fetchAllCalendarSettings();
    } catch (error) {
      console.error(error);
      alert("달력 설정 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleSelectDate(date: Date | undefined) {
    setSelected(date);
  }

  function toggleBlockedTime(time: string) {
    if (isHoliday) return;

    const normalizedTime = normalizeTime(time);

    setBlockedTimes((prev) => {
      const normalizedPrev = prev.map((item) => normalizeTime(item));

      if (normalizedPrev.includes(normalizedTime)) {
        return normalizedPrev.filter((item) => item !== normalizedTime);
      }

      return [...normalizedPrev, normalizedTime].sort();
    });
  }

  useEffect(() => {
    fetchAllCalendarSettings();
    fetchReservations();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      setIsHoliday(false);
      setBlockedTimes([]);
      setNote("");
      return;
    }

    fetchCalendarSettings(selectedKey);
  }, [selectedKey]);

  useEffect(() => {
    if (isHoliday) {
      setBlockedTimes([]);
    }
  }, [isHoliday]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <section className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/admin"
              className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              ← 예약 관리자 돌아가기
            </Link>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-white/50">
              Admin Calendar
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              달력 관리
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
              홈페이지 예약 달력과 비슷한 화면에서 날짜별 휴무 및 시간 차단을 관리할 수 있어.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="min-w-0 rounded-[28px] border border-white/10 bg-[#111111] p-3 shadow-2xl sm:p-6 md:p-8">
            <div className="mb-5 flex flex-wrap gap-2 sm:gap-3">
              <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 sm:text-sm">
                운영 가능
              </div>
              <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300 sm:text-sm">
                일부 시간 차단
              </div>
              <div className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-300 sm:text-sm">
                하루 휴무
              </div>
              <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-300 sm:text-sm">
                예약 문의 있음
              </div>
              <div className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs text-violet-300 sm:text-sm">
                확정 일정 있음
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/60 sm:px-4 sm:text-sm">
              {calendarLoading || reservationLoading
                ? "달력 상태 불러오는 중..."
                : "빨간 날짜는 하루 휴무, 노란 날짜는 일부 시간 차단, 파란/보라 표시로 예약 문의와 확정 일정을 함께 확인할 수 있어."}
            </div>

            <div className="booking-dark-calendar min-w-0 overflow-hidden">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={handleSelectDate}
                locale={ko}
                showOutsideDays
                defaultMonth={new Date()}
                disabled={{ before: today }}
                modifiers={modifiers}
                modifiersClassNames={{
                  adminHoliday: "admin-holiday-day",
                  adminPartial: "admin-partial-day",
                  adminReserved: "admin-reserved-day",
                  adminConfirmedReservation: "admin-confirmed-reserved-day",
                  adminPendingReservation: "admin-pending-reserved-day",
                }}
                className="w-full max-w-full"
                styles={
                  isMobile
                    ? {
                        months: {
                          width: "100%",
                        },
                        month: {
                          width: "100%",
                        },
                        month_grid: {
                          width: "100%",
                          maxWidth: "100%",
                          tableLayout: "fixed",
                          borderCollapse: "collapse",
                        },
                        weekdays: {
                          width: "100%",
                        },
                        weekday: {
                          width: "14.2857%",
                          padding: "0 0 6px 0",
                          fontSize: "10px",
                          textAlign: "center",
                        },
                        week: {
                          width: "100%",
                        },
                        day: {
                          width: "14.2857%",
                          padding: "1px",
                          textAlign: "center",
                        },
                        day_button: {
                          width: "100%",
                          maxWidth: "100%",
                          height: "34px",
                          fontSize: "12px",
                          borderRadius: "10px",
                          margin: "0 auto",
                        },
                        month_caption: {
                          marginBottom: "12px",
                        },
                        caption_label: {
                          fontSize: "15px",
                          fontWeight: "600",
                        },
                        nav: {
                          gap: "4px",
                        },
                        button_previous: {
                          width: "32px",
                          height: "32px",
                          minWidth: "32px",
                          minHeight: "32px",
                          padding: "0",
                        },
                        button_next: {
                          width: "32px",
                          height: "32px",
                          minWidth: "32px",
                          minHeight: "32px",
                          padding: "0",
                        },
                      }
                    : undefined
                }
                classNames={{
                  months: "flex justify-center",
                  month: "w-full min-w-0",
                  month_caption:
                    "mb-4 flex items-center justify-between text-white sm:mb-6",
                  caption_label: "text-base font-semibold sm:text-2xl",
                  nav: "flex items-center gap-1 sm:gap-2",
                  button_previous:
                    "h-8 w-8 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:h-10 sm:w-10",
                  button_next:
                    "h-8 w-8 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:h-10 sm:w-10",
                  weekdays: "mb-1 sm:mb-2",
                  weekday:
                    "pb-2 text-[11px] font-medium text-white/45 sm:text-sm",
                  week: "mt-1 sm:mt-2",
                  day: "p-0 sm:p-2",
                  selected: "selected-day",
                  today: "today-day",
                }}
                footer={
                  <p className="pt-5 text-center text-xs text-white/40 sm:text-sm">
                    오늘 이전 날짜는 관리 대상에서 제외됩니다.
                  </p>
                }
              />
            </div>
          </div>

          <div className="min-w-0 rounded-[28px] border border-white/10 bg-[#111111] p-5 shadow-2xl sm:p-6">
            <h2 className="text-lg font-semibold sm:text-xl">선택한 날짜 관리</h2>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
              {selected ? (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Selected Date
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
                    {format(selected, "yyyy년 M월 d일 (eee)", { locale: ko })}
                  </p>

                  {loading ? (
                    <p className="mt-4 text-sm text-white/60">
                      설정 불러오는 중...
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <div
                          className={`rounded-full px-3 py-2 text-xs font-medium sm:text-sm ${
                            isHoliday
                              ? "border border-rose-400/30 bg-rose-400/10 text-rose-300"
                              : blockedTimes.length > 0
                              ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                              : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          }`}
                        >
                          {isHoliday
                            ? "하루 휴무"
                            : blockedTimes.length > 0
                            ? "일부 시간 차단"
                            : "운영 가능"}
                        </div>

                        {selectedDateReservations.length > 0 ? (
                          <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-300 sm:text-sm">
                            예약 {selectedDateReservations.length}건
                          </div>
                        ) : null}

                        {selectedDateConfirmedReservations.length > 0 ? (
                          <div className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs text-violet-300 sm:text-sm">
                            확정 {selectedDateConfirmedReservations.length}건
                          </div>
                        ) : null}

                        {selectedDatePendingReservations.length > 0 ? (
                          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 sm:text-sm">
                            대기 {selectedDatePendingReservations.length}건
                          </div>
                        ) : null}

                        {selectedSummary?.note ? (
                          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 sm:text-sm">
                            메모 있음
                          </div>
                        ) : null}
                      </div>

                      {selectedDateReservations.length > 0 ? (
                        <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white/90">
                              예약 / 확정 현황
                            </p>
                            <p className="text-xs text-white/55">
                              관리자 1페이지 예약 목록 연동
                            </p>
                          </div>

                          <div className="grid gap-3">
                            {selectedDateReservations.map((item) => (
                              <div
                                key={item.reservationNumber}
                                className="rounded-2xl border border-white/10 bg-black/30 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      {item.eventName || "(행사명 없음)"}
                                    </p>
                                    <p className="mt-1 text-xs text-white/55">
                                      예약번호 {item.reservationNumber}
                                    </p>
                                  </div>

                                  <div
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                      item.status === "확정"
                                        ? "border border-violet-400/30 bg-violet-400/10 text-violet-300"
                                        : item.status === "대기"
                                        ? "border border-sky-400/30 bg-sky-400/10 text-sky-300"
                                        : "border border-white/10 bg-white/5 text-white/70"
                                    }`}
                                  >
                                    {item.status}
                                  </div>
                                </div>

                                <div className="mt-3 grid gap-2 text-sm text-white/75">
                                  <div>
                                    <span className="text-white/45">시간</span>{" "}
                                    {item.time || "-"}
                                  </div>
                                  <div>
                                    <span className="text-white/45">신청자</span>{" "}
                                    {item.name || "-"}
                                  </div>
                                  <div>
                                    <span className="text-white/45">연락처</span>{" "}
                                    {item.phone || "-"}
                                  </div>
                                  {item.request && item.request !== "-" ? (
                                    <div className="leading-6">
                                      <span className="text-white/45">요청사항</span>{" "}
                                      {item.request}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                        <label className="flex items-center gap-3 text-sm text-white/85">
                          <input
                            type="checkbox"
                            checked={isHoliday}
                            onChange={(e) => setIsHoliday(e.target.checked)}
                            className="h-4 w-4"
                          />
                          하루 전체 휴무로 설정
                        </label>
                        <p className="mt-2 text-xs leading-5 text-white/45">
                          체크하면 이 날짜는 홈페이지에서 선택 불가 처리됨.
                        </p>
                      </div>

                      <div className="mt-6">
                        <p className="mb-3 text-sm font-medium text-white/80">
                          시간 슬롯 차단
                        </p>

                        <div className="mb-3 flex flex-wrap gap-2">
                          <div className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
                            수동 차단
                          </div>
                          <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-300">
                            대기 예약 시간
                          </div>
                          <div className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs text-violet-300">
                            확정 예약 시간
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {timeOptions.map((time) => {
                            const normalized = normalizeTime(time);
                            const isBlocked = blockedTimeSet.has(normalized);
                            const isConfirmedReserved =
                              selectedConfirmedTimeSet.has(normalized);
                            const isPendingReserved =
                              selectedPendingTimeSet.has(normalized);

                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => toggleBlockedTime(time)}
                                disabled={isHoliday}
                                className={`rounded-xl border px-3 py-3 text-sm transition ${
                                  isHoliday
                                    ? "cursor-not-allowed border-white/10 bg-white/5 text-white/25"
                                    : isBlocked
                                    ? "border-rose-400/40 bg-rose-400/15 text-rose-300"
                                    : isConfirmedReserved
                                    ? "border-violet-400/40 bg-violet-400/15 text-violet-300"
                                    : isPendingReserved
                                    ? "border-sky-400/40 bg-sky-400/15 text-sky-300"
                                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-3 text-xs leading-5 text-white/45">
                          예약 시간은 참고 표시이며 직접 차단할지는 네가 판단해서 운영하면 된다.
                        </p>
                      </div>

                      <div className="mt-6">
                        <p className="mb-3 text-sm font-medium text-white/80">
                          관리자 메모
                        </p>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={4}
                          placeholder="예: 서울대 촬영 일정 / 오후 이동 시간 / 내부 휴무"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                        />
                      </div>

                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                        <p>날짜: {selectedKey}</p>
                        <p className="mt-1">
                          상태:{" "}
                          {isHoliday
                            ? "하루 휴무"
                            : blockedTimes.length > 0
                            ? "일부 시간 차단"
                            : "운영 가능"}
                        </p>
                        <p className="mt-1">
                          예약 현황:{" "}
                          {selectedDateReservations.length > 0
                            ? `총 ${selectedDateReservations.length}건 / 확정 ${selectedDateConfirmedReservations.length}건 / 대기 ${selectedDatePendingReservations.length}건`
                            : "없음"}
                        </p>
                        <p className="mt-1">
                          차단 시간:{" "}
                          {isHoliday
                            ? "전체 차단"
                            : blockedTimes.length > 0
                            ? blockedTimes.join(", ")
                            : "없음"}
                        </p>
                        <p className="mt-1">
                          메모: {note.trim() ? note.trim() : "없음"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={saveCalendarSettings}
                        disabled={saving}
                        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? "저장 중..." : "이 설정 저장하기"}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Selected Date
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    달력에서 날짜를 선택하면 하루 휴무 또는 시간 차단을 설정할 수 있어.
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-400" />
                <span className="text-white/75">운영 가능</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-amber-400" />
                <span className="text-white/75">일부 시간 차단</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-rose-400" />
                <span className="text-white/75">하루 휴무</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-sky-400" />
                <span className="text-white/75">예약 문의 있음</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-violet-400" />
                <span className="text-white/75">확정 일정 있음</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .admin-holiday-day button {
          background: rgba(251, 113, 133, 0.18) !important;
          border: 1px solid rgba(251, 113, 133, 0.45) !important;
          color: rgb(253, 164, 175) !important;
        }

        .admin-holiday-day button:hover {
          background: rgba(251, 113, 133, 0.24) !important;
        }

        .admin-partial-day button {
          background: rgba(251, 191, 36, 0.16) !important;
          border: 1px solid rgba(251, 191, 36, 0.4) !important;
          color: rgb(252, 211, 77) !important;
        }

        .admin-partial-day button:hover {
          background: rgba(251, 191, 36, 0.22) !important;
        }

        .admin-reserved-day button {
          box-shadow: inset 0 -3px 0 rgba(56, 189, 248, 0.95);
        }

        .admin-pending-reserved-day button {
          box-shadow: inset 0 -3px 0 rgba(56, 189, 248, 0.95);
        }

        .admin-confirmed-reserved-day button {
          box-shadow: inset 0 -6px 0 rgba(167, 139, 250, 0.95);
        }
      `}</style>
    </main>
  );
}