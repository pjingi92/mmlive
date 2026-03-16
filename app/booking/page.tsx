"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, isBefore, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";

type DayStatus = "available" | "partial" | "closed" | "holiday";

type ScheduleItem = {
  date: string;
  status: DayStatus;
  note?: string;
  blockedTimes?: string[];
};

type CalendarSettingItem = {
  date: string;
  type: string;
  time: string;
  status: string;
  note: string;
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

const MAX_HOURS = 16;
const hourOptions = Array.from({ length: MAX_HOURS }, (_, i) => i + 1);

function addHoursToTimeString(time: string, hoursToAdd: number) {
  const [hourText, minuteText] = String(time || "00:00").split(":");
  const baseHour = Number(hourText || 0);
  const minute = Number(minuteText || 0);

  const totalHour = baseHour + hoursToAdd;
  const paddedHour = String(totalHour).padStart(2, "0");
  const paddedMinute = String(minute).padStart(2, "0");

  return `${paddedHour}:${paddedMinute}`;
}

function getRangeTimes(startTime: string, hours: number) {
  if (!startTime) return [];

  const startIndex = timeOptions.indexOf(startTime);
  if (startIndex === -1) return [];

  return Array.from({ length: hours }, (_, i) => timeOptions[startIndex + i]).filter(
    Boolean
  ) as string[];
}

export default function BookingPage() {
  const [selected, setSelected] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const today = startOfDay(new Date());

  async function fetchCalendarSettings() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/calendar-settings", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("달력 설정을 불러오지 못했습니다.");
      }

      const data = await res.json();
      const settings: CalendarSettingItem[] = Array.isArray(data.settings)
        ? data.settings
        : [];

      const groupedMap = new Map<
        string,
        {
          isHoliday: boolean;
          blockedTimes: string[];
          note: string;
        }
      >();

      settings.forEach((item) => {
        const key = String(item.date || "").trim();
        if (!key) return;

        const current = groupedMap.get(key) || {
          isHoliday: false,
          blockedTimes: [],
          note: "",
        };

        if (
          item.type === "day" &&
          item.time === "all" &&
          item.status === "closed"
        ) {
          current.isHoliday = true;
        }

        if (
          item.type === "slot" &&
          item.status === "closed" &&
          item.time &&
          item.time !== "all"
        ) {
          if (!current.blockedTimes.includes(item.time)) {
            current.blockedTimes.push(item.time);
          }
        }

        if (!current.note && String(item.note || "").trim()) {
          current.note = String(item.note || "").trim();
        }

        groupedMap.set(key, current);
      });

      const nextSchedule: ScheduleItem[] = Array.from(groupedMap.entries()).map(
        ([date, value]) => {
          if (value.isHoliday) {
            return {
              date,
              status: "holiday",
              note: value.note || "휴무",
              blockedTimes: [],
            };
          }

          if (value.blockedTimes.length > 0) {
            return {
              date,
              status: "partial",
              note: value.note || "일부 시간 차단",
              blockedTimes: value.blockedTimes.sort(),
            };
          }

          return {
            date,
            status: "available",
            note: value.note || "예약 가능",
            blockedTimes: [],
          };
        }
      );

      setSchedule(nextSchedule);
    } catch (error) {
      console.error(error);
      alert("예약 달력 설정을 불러오는 중 오류가 발생했습니다.");
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCalendarSettings();
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

  const scheduleMap = useMemo(() => {
    return new Map(schedule.map((item) => [item.date, item]));
  }, [schedule]);

  const availableDates = schedule
    .filter((item) => item.status === "available")
    .map((item) => new Date(item.date));

  const partialDates = schedule
    .filter((item) => item.status === "partial")
    .map((item) => new Date(item.date));

  const closedDates = schedule
    .filter((item) => item.status === "closed")
    .map((item) => new Date(item.date));

  const holidayDates = schedule
    .filter((item) => item.status === "holiday")
    .map((item) => new Date(item.date));

  const disabledDays = [...closedDates, ...holidayDates, { before: today }];

  const modifiers = {
    available: availableDates,
    partial: partialDates,
    closed: closedDates,
    holiday: holidayDates,
  };

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : "";
  const selectedInfo = selectedKey ? scheduleMap.get(selectedKey) : undefined;

  const blockedTimesForSelected = selectedInfo?.blockedTimes || [];
  const blockedTimeSet = useMemo(
    () => new Set(blockedTimesForSelected),
    [blockedTimesForSelected]
  );

  const selectedRangeTimes = useMemo(() => {
    return getRangeTimes(startTime, hours);
  }, [startTime, hours]);

  const endTimeLabel = useMemo(() => {
    if (!startTime) return "";
    return addHoursToTimeString(startTime, hours);
  }, [startTime, hours]);

  const rangeHasBlockedTime = useMemo(() => {
    if (!selectedRangeTimes.length) return false;
    return selectedRangeTimes.some((time) => blockedTimeSet.has(time));
  }, [selectedRangeTimes, blockedTimeSet]);

  const isPastSelected =
    selected ? isBefore(startOfDay(selected), today) : false;

  const selectedStatusLabel = isPastSelected
    ? "마감"
    : selectedInfo?.status === "available"
    ? "예약 가능"
    : selectedInfo?.status === "partial"
    ? "일부 일정 있음"
    : selectedInfo?.status === "closed"
    ? "마감"
    : selectedInfo?.status === "holiday"
    ? "휴무"
    : "문의 가능";

  const canSelectTime =
    !!selected &&
    !isPastSelected &&
    selectedInfo?.status !== "holiday" &&
    selectedInfo?.status !== "closed";

  const canBook =
    !!selected &&
    !!startTime &&
    !isPastSelected &&
    selectedInfo?.status !== "holiday" &&
    selectedInfo?.status !== "closed" &&
    !rangeHasBlockedTime;

  function clearTimeSelection() {
    setStartTime("");
    setHours(1);
  }

  function handleTimeClick(time: string) {
    if (blockedTimeSet.has(time)) return;

    if (!startTime) {
      setStartTime(time);
      setHours(1);
      return;
    }

    const startIndex = timeOptions.indexOf(startTime);
    const clickedIndex = timeOptions.indexOf(time);

    if (startIndex === -1 || clickedIndex === -1) {
      setStartTime(time);
      setHours(1);
      return;
    }

    if (time === startTime && hours === 1) {
      clearTimeSelection();
      return;
    }

    const currentRange = getRangeTimes(startTime, hours);
    const lastSelectedTime =
      currentRange.length > 0 ? currentRange[currentRange.length - 1] : startTime;

    if (time === lastSelectedTime && currentRange.length > 1) {
      setHours((prev) => Math.max(1, prev - 1));
      return;
    }

    if (time === lastSelectedTime && currentRange.length === 1) {
      clearTimeSelection();
      return;
    }

    const fromIndex = Math.min(startIndex, clickedIndex);
    const toIndex = Math.max(startIndex, clickedIndex);
    const proposedRange = timeOptions.slice(fromIndex, toIndex + 1);

    const hasBlocked = proposedRange.some((item) => blockedTimeSet.has(item));
    if (hasBlocked) return;

    setStartTime(timeOptions[fromIndex]);
    setHours(Math.min(proposedRange.length, MAX_HOURS));
  }

  function isHourOptionValid(hour: number) {
    if (!startTime) return true;
    const range = getRangeTimes(startTime, hour);
    if (range.length !== hour) return false;
    return !range.some((time) => blockedTimeSet.has(time));
  }

  function handleHourClick(hour: number) {
    if (!startTime) {
      setHours(hour);
      return;
    }

    if (!isHourOptionValid(hour)) return;
    setHours(hour);
  }

  const handleSelectDate = (date: Date | undefined) => {
    setSelected(date);
    setStartTime("");
    setHours(1);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <section className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              ← 뒤로가기
            </Link>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-white/50">
              Booking Calendar
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              촬영 예약 달력
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
              날짜와 시간대를 먼저 선택하신 뒤 촬영 문의를 진행하실 수 있습니다.
              일부 일정이 있는 날짜도 촬영 성격에 따라 진행 가능할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="min-w-0 rounded-[28px] border border-white/10 bg-[#111111] p-3 shadow-2xl sm:p-6 md:p-8">
            <div className="mb-5 flex flex-wrap gap-2 sm:gap-3">
              <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 sm:text-sm">
                예약 가능
              </div>
              <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300 sm:text-sm">
                일부 일정
              </div>
              <div className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-300 sm:text-sm">
                마감
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 sm:text-sm">
                휴무
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/60 sm:px-4 sm:text-sm">
              {loading
                ? "예약 가능 일정을 불러오는 중입니다..."
                : "관리자 설정에 따라 휴무일과 일부 차단 시간이 자동 반영됩니다."}
            </div>

            <div className="booking-dark-calendar min-w-0 overflow-hidden">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={handleSelectDate}
                locale={ko}
                showOutsideDays
                defaultMonth={new Date()}
                disabled={disabledDays}
                modifiers={modifiers}
                modifiersClassNames={{
                  available: "booking-available",
                  partial: "booking-partial",
                  closed: "booking-closed",
                  holiday: "booking-holiday",
                }}
                className="w-full max-w-full"
                style={
                  isMobile
                    ? ({
                        width: "100%",
                        maxWidth: "100%",
                        ["--rdp-day-width" as string]: "36px",
                        ["--rdp-day-height" as string]: "36px",
                        ["--rdp-day_button-width" as string]: "36px",
                        ["--rdp-day_button-height" as string]: "36px",
                        ["--rdp-nav_button-width" as string]: "32px",
                        ["--rdp-nav_button-height" as string]: "32px",
                        ["--rdp-weekday-padding" as string]: "0px",
                        ["--rdp-months-gap" as string]: "0px",
                      } as React.CSSProperties)
                    : undefined
                }
                classNames={{
                  months: "flex justify-center",
                  month: "w-full max-w-full min-w-0",
                  month_caption:
                    "mb-4 flex items-center justify-between text-white sm:mb-6",
                  caption_label: "text-sm font-semibold sm:text-2xl",
                  nav: "flex items-center gap-1 sm:gap-2",
                  button_previous:
                    "h-8 w-8 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:h-10 sm:w-10",
                  button_next:
                    "h-8 w-8 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:h-10 sm:w-10",
                  weekdays: "mb-1 sm:mb-2",
                  weekday:
                    "pb-2 text-[10px] font-medium text-white/45 sm:text-sm",
                  week: "mt-1 sm:mt-2",
                  day: "p-0 sm:p-2",
                  selected: "selected-day",
                  today: "today-day",
                }}
                footer={
                  <p className="pt-5 text-center text-xs text-white/40 sm:text-sm">
                    지난 날짜 / 마감 / 휴무 날짜는 선택할 수 없습니다.
                  </p>
                }
              />
            </div>
          </div>

          <div className="min-w-0 rounded-[28px] border border-white/10 bg-[#111111] p-5 shadow-2xl sm:p-6">
            <h2 className="text-lg font-semibold sm:text-xl">선택한 일정</h2>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
              {selected ? (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Selected Date
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
                    {format(selected, "yyyy년 M월 d일 (eee)", { locale: ko })}
                  </p>
                  <p className="mt-4 text-sm text-white/70">
                    상태: {selectedStatusLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {selectedInfo?.note ?? "현재 문의 가능한 날짜입니다."}
                  </p>

                  {selectedInfo?.status === "partial" &&
                    blockedTimesForSelected.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
                        차단 시간: {blockedTimesForSelected.join(", ")}
                      </div>
                    )}

                  {canSelectTime && (
                    <>
                      <div className="mt-6">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white/80">
                            시간대 선택
                          </p>

                          {startTime ? (
                            <button
                              type="button"
                              onClick={clearTimeSelection}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10"
                            >
                              선택 해제
                            </button>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {timeOptions.map((time) => {
                            const isInSelectedRange =
                              selectedRangeTimes.includes(time);
                            const isStartTime = startTime === time;
                            const isBlocked = blockedTimeSet.has(time);

                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => handleTimeClick(time)}
                                disabled={isBlocked}
                                className={`rounded-xl border px-3 py-3 text-sm transition ${
                                  isBlocked
                                    ? "cursor-not-allowed border-rose-400/20 bg-rose-400/10 text-rose-300/50"
                                    : isStartTime
                                    ? "border-white bg-white text-black"
                                    : isInSelectedRange
                                    ? "border-white/70 bg-white/85 text-black"
                                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>

                        <p className="mt-3 text-xs leading-5 text-white/45">
                          같은 시간 버튼을 다시 누르시면 마지막 선택 시간이 해제됩니다.
                        </p>
                      </div>

                      <div className="mt-6">
                        <p className="mb-3 text-sm font-medium text-white/80">
                          촬영 시간
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {hourOptions.map((hour) => {
                            const isActive = hours === hour;
                            const isDisabled = !isHourOptionValid(hour);

                            return (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => handleHourClick(hour)}
                                disabled={isDisabled}
                                className={`rounded-xl border px-3 py-3 text-sm transition ${
                                  isDisabled
                                    ? "cursor-not-allowed border-white/10 bg-white/5 text-white/25"
                                    : isActive
                                    ? "border-white bg-white text-black"
                                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                }`}
                              >
                                {hour}시간
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                        <p>촬영 시간: {hours}시간</p>
                        <p className="mt-1">
                          촬영 시간대:{" "}
                          {startTime ? `${startTime} ~ ${endTimeLabel}` : "미선택"}
                        </p>
                      </div>

                      {rangeHasBlockedTime && (
                        <p className="mt-4 text-sm text-rose-300">
                          선택하신 시간대 안에 차단된 시간이 포함되어 있습니다.
                          다른 시간대를 선택해주세요.
                        </p>
                      )}

                      {canBook && (
                        <Link
                          href={`/booking/request?date=${format(
                            selected,
                            "yyyy-MM-dd"
                          )}&startTime=${encodeURIComponent(
                            startTime
                          )}&hours=${hours}`}
                          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
                        >
                          이 일정으로 촬영 문의하기
                        </Link>
                      )}

                      {!startTime && (
                        <p className="mt-4 text-sm text-amber-300">
                          촬영 문의를 진행하시려면 시간대를 먼저 선택해주세요.
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Selected Date
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    달력에서 날짜를 선택하시면 시간대와 촬영 시간을 정한 뒤
                    예약 문의로 넘어가실 수 있습니다.
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-400" />
                <span className="text-white/75">예약 가능</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-amber-400" />
                <span className="text-white/75">일부 일정 있음</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-rose-400" />
                <span className="text-white/75">마감</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-white/30" />
                <span className="text-white/75">휴무</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}