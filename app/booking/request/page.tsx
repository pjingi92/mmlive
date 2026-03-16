"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PreviewType = "image" | "video" | "";

type ActiveDiscountCode = {
  code: string;
  discountPercent: number;
  enabled: boolean;
  startDate: string;
  endDate: string;
};

const MAX_HOURS = 16;

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

export default function BookingRequestPage() {
  const searchParams = useSearchParams();

  const selectedDateFromCalendar = searchParams.get("date") || "";
  const selectedStartTimeFromCalendar = searchParams.get("startTime") || "";
  const selectedHoursFromCalendar = Number(searchParams.get("hours") || "1");

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

  const [isMobile, setIsMobile] = useState(false);
  const [previewType, setPreviewType] = useState<PreviewType>("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(selectedDateFromCalendar);
  const [startTime, setStartTime] = useState(selectedStartTimeFromCalendar);
  const [request, setRequest] = useState("");

  const [hours, setHours] = useState(
    selectedHoursFromCalendar > 0
      ? Math.min(selectedHoursFromCalendar, MAX_HOURS)
      : 1
  );
  const [camera, setCamera] = useState(1);
  const [edit, setEdit] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [youtube, setYoutube] = useState(false);
  const [pip, setPip] = useState(false);
  const [intro, setIntro] = useState(false);

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [discountMessage, setDiscountMessage] = useState("");
  const [discountErrorMessage, setDiscountErrorMessage] = useState("");
  const [availableDiscountCodes, setAvailableDiscountCodes] = useState<
    ActiveDiscountCode[]
  >([]);
  const [discountCodesLoading, setDiscountCodesLoading] = useState(true);
  const [discountApplying, setDiscountApplying] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 960);
    };

    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  useEffect(() => {
    if (selectedDateFromCalendar) {
      setEventDate(selectedDateFromCalendar);
    }
    if (selectedStartTimeFromCalendar) {
      setStartTime(selectedStartTimeFromCalendar);
    }
    if (selectedHoursFromCalendar > 0) {
      setHours(Math.min(selectedHoursFromCalendar, MAX_HOURS));
    }
  }, [
    selectedDateFromCalendar,
    selectedStartTimeFromCalendar,
    selectedHoursFromCalendar,
  ]);

  async function fetchDiscountCodesStrict() {
    const res = await fetch("/api/discount-settings", {
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "할인코드 정보를 불러오지 못했습니다.");
    }

    return Array.isArray(data.codes) ? data.codes : [];
  }

  async function fetchDiscountCodesSilent() {
    try {
      const res = await fetch("/api/discount-settings", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        console.warn(
          "[discount-settings] silent fetch failed:",
          data?.message || "할인코드 정보를 불러오지 못했습니다."
        );
        return [];
      }

      return Array.isArray(data.codes) ? data.codes : [];
    } catch (error) {
      console.warn("[discount-settings] silent fetch error:", error);
      return [];
    }
  }

  useEffect(() => {
    async function loadDiscountCodes() {
      setDiscountCodesLoading(true);
      const codes = await fetchDiscountCodesSilent();
      setAvailableDiscountCodes(codes);
      setDiscountCodesLoading(false);
    }

    loadDiscountCodes();
  }, []);

  useEffect(() => {
    async function refreshDiscountCodes() {
      const codes = await fetchDiscountCodesSilent();
      setAvailableDiscountCodes(codes);

      if (appliedDiscountCode) {
        const stillValid = codes.find(
          (item: any) => item.code === appliedDiscountCode
        );

        if (!stillValid) {
          setAppliedDiscountCode("");
          setDiscountMessage("");
          setDiscountErrorMessage(
            "적용 중이던 할인코드가 현재 비활성화되었거나 유효기간이 지났습니다."
          );
        }
      }
    }

    const handleFocus = () => {
      refreshDiscountCodes();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshDiscountCodes();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [appliedDiscountCode]);

  const selectedRangeTimes = useMemo(() => {
    return getRangeTimes(startTime, hours);
  }, [startTime, hours]);

  const endTimeLabel = useMemo(() => {
    if (!startTime) return "";
    return addHoursToTimeString(startTime, hours);
  }, [startTime, hours]);

  function clearTimeSelection() {
    setStartTime("");
    setHours(1);
  }

  function handleTimeClick(time: string) {
    const clickedIndex = timeOptions.indexOf(time);

    if (clickedIndex === -1) return;

    if (!startTime) {
      setStartTime(time);
      setHours(1);
      return;
    }

    const currentStartIndex = timeOptions.indexOf(startTime);

    if (currentStartIndex === -1) {
      setStartTime(time);
      setHours(1);
      return;
    }

    const currentEndIndex = currentStartIndex + hours - 1;

    if (hours === 1 && currentStartIndex === clickedIndex) {
      clearTimeSelection();
      return;
    }

    // 첫 칸 다시 누르면 앞에서 1칸 제거
    if (clickedIndex === currentStartIndex) {
      const nextStart = timeOptions[currentStartIndex + 1];

      if (!nextStart || hours <= 1) {
        clearTimeSelection();
        return;
      }

      setStartTime(nextStart);
      setHours(hours - 1);
      return;
    }

    // 마지막 칸 다시 누르면 뒤에서 1칸 제거
    if (clickedIndex === currentEndIndex) {
      if (hours <= 1) {
        clearTimeSelection();
        return;
      }

      setHours(hours - 1);
      return;
    }

    // 현재 범위 안의 중간 시간 클릭 시:
    // 클릭한 시간까지로 범위 축소
    if (clickedIndex > currentStartIndex && clickedIndex < currentEndIndex) {
      setHours(clickedIndex - currentStartIndex + 1);
      return;
    }

    // 범위 밖 클릭 시 새 범위 확장/재설정
    const fromIndex = Math.min(currentStartIndex, clickedIndex);
    const toIndex = Math.max(currentStartIndex, clickedIndex);
    const proposedLength = toIndex - fromIndex + 1;

    setStartTime(timeOptions[fromIndex]);
    setHours(Math.min(proposedLength, MAX_HOURS));
  }

  const extraHourPrice = hours > 1 ? (hours - 1) * PRICES.extraHour : 0;
  const cameraPrice = camera > 1 ? PRICES.extraCamera : 0;
  const editPrice = edit ? PRICES.edit : 0;
  const zoomPrice = zoom ? PRICES.zoom : 0;
  const youtubePrice = youtube ? PRICES.youtube : 0;
  const pipPrice = pip ? PRICES.pip : 0;
  const introPrice = intro ? PRICES.intro : 0;

  const originalTotal =
    PRICES.base +
    extraHourPrice +
    cameraPrice +
    editPrice +
    zoomPrice +
    youtubePrice +
    pipPrice +
    introPrice;

  const discountPercent = useMemo(() => {
    if (!appliedDiscountCode) return 0;

    const found = availableDiscountCodes.find(
      (item) => item.code === appliedDiscountCode
    );

    return found ? Number(found.discountPercent || 0) : 0;
  }, [appliedDiscountCode, availableDiscountCodes]);

  const discountAmount = Math.floor((originalTotal * discountPercent) / 100);
  const finalTotal = originalTotal - discountAmount;

  const openImagePreview = (src: string, title: string) => {
    setPreviewType("image");
    setPreviewSrc(src);
    setPreviewTitle(title);
  };

  const openVideoPreview = (src: string, title: string) => {
    setPreviewType("video");
    setPreviewSrc(src);
    setPreviewTitle(title);
  };

  const closePreview = () => {
    setPreviewType("");
    setPreviewSrc("");
    setPreviewTitle("");
  };

  const handleApplyDiscountCode = async () => {
    const normalizedCode = discountCodeInput.trim().toUpperCase();

    setDiscountMessage("");
    setDiscountErrorMessage("");

    if (!normalizedCode) {
      setAppliedDiscountCode("");
      setDiscountErrorMessage("할인 코드를 입력해주세요.");
      return;
    }

    try {
      setDiscountApplying(true);

      const latestCodes = await fetchDiscountCodesStrict();
      setAvailableDiscountCodes(latestCodes);

      const found = latestCodes.find((item) => item.code === normalizedCode);

      if (!found) {
        setAppliedDiscountCode("");
        setDiscountErrorMessage("입력하신 할인코드를 다시 확인해주세요.");
        return;
      }

      setAppliedDiscountCode(normalizedCode);
      setDiscountCodeInput(normalizedCode);
      setDiscountMessage(`${found.discountPercent}% 할인 코드가 적용되었습니다.`);
    } catch (error) {
      console.error("[handleApplyDiscountCode] 오류:", error);
      setAppliedDiscountCode("");
      setDiscountErrorMessage("할인 코드 확인 중 오류가 발생했습니다.");
    } finally {
      setDiscountApplying(false);
    }
  };

  const handleRemoveDiscountCode = () => {
    setDiscountCodeInput("");
    setAppliedDiscountCode("");
    setDiscountMessage("");
    setDiscountErrorMessage("");
  };

  const validateForm = () => {
    if (!name.trim()) return "신청자명을 입력해주세요.";
    if (!email.trim()) return "이메일을 입력해주세요.";
    if (!phone.trim()) return "연락처를 입력해주세요.";
    if (!eventName.trim()) return "행사명을 입력해주세요.";
    if (!eventDate.trim()) return "촬영 날짜를 선택해주세요.";
    if (!startTime.trim()) return "시작 시간을 선택해주세요.";
    if (hours < 1 || hours > MAX_HOURS) {
      return `촬영 시간은 1시간부터 ${MAX_HOURS}시간까지 선택 가능합니다.`;
    }
    if (startTime && selectedRangeTimes.length !== hours) {
      return "선택한 시작 시간 기준으로 해당 촬영 시간을 구성할 수 없습니다.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
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
          total: finalTotal,
          originalTotal,
          discountCode: appliedDiscountCode,
          discountPercent,
          discountAmount,
          finalTotal,
          basePrice: PRICES.base,
          extraHourPrice,
          cameraPrice,
          editPrice,
          zoomPrice,
          youtubePrice,
          pipPrice,
          introPrice,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage("예약 요청 전송에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f5f5f3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "sans-serif",
          color: "#111",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 640,
            backgroundColor: "#fff",
            borderRadius: 24,
            padding: isMobile ? 24 : 36,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              color: "#888",
              marginBottom: 12,
            }}
          >
            REQUEST COMPLETE
          </p>

          <h1
            style={{
              fontSize: isMobile ? 30 : 38,
              marginBottom: 16,
              lineHeight: 1.3,
              wordBreak: "keep-all",
            }}
          >
            예약 요청이 정상적으로 접수되었습니다
          </h1>

          <p
            style={{
              fontSize: isMobile ? 16 : 18,
              color: "#555",
              lineHeight: 1.8,
              marginBottom: 10,
              wordBreak: "keep-all",
            }}
          >
            담당자가 내용을 확인한 뒤 입력하신 연락처 또는 이메일로
            회신드리겠습니다.
          </p>

          <p
            style={{
              fontSize: 14,
              color: "#777",
              lineHeight: 1.7,
              marginBottom: 28,
              wordBreak: "keep-all",
            }}
          >
            예약 가능 여부와 최종 금액은 촬영 조건 및 일정 확인 후 확정됩니다.
          </p>

          <Link
            href="/booking"
            style={{
              display: "inline-block",
              padding: "14px 22px",
              borderRadius: 14,
              backgroundColor: "#111",
              color: "#fff",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            달력으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f3",
        padding: isMobile ? "32px 16px 60px" : "60px 20px",
        fontFamily: "sans-serif",
        color: "#111",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link
          href="/booking"
          style={{
            display: "inline-block",
            marginBottom: 20,
            color: "#666",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← 달력으로
        </Link>

        <h1
          style={{
            fontSize: isMobile ? 32 : 42,
            marginBottom: 12,
            lineHeight: 1.25,
            wordBreak: "keep-all",
          }}
        >
          촬영 예약 신청
        </h1>

        <p
          style={{
            fontSize: isMobile ? 16 : 18,
            color: "#666",
            marginBottom: 32,
            lineHeight: 1.8,
            maxWidth: 760,
            wordBreak: "keep-all",
          }}
        >
          달력에서 선택한 일정이 자동 반영됩니다. 행사 정보와 옵션을 입력하면
          예상 견적이 계산됩니다.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.35fr 0.85fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: "#fff",
              borderRadius: 24,
              padding: isMobile ? 20 : 28,
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              border: "1px solid #ececec",
            }}
          >
            <h2 style={{ fontSize: isMobile ? 22 : 24, marginBottom: 24 }}>
              예약 정보 입력
            </h2>

            <div style={fieldWrap}>
              <label style={labelStyle}>신청자명</label>
              <input
                type="text"
                name="신청자명"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>이메일</label>
              <input
                type="email"
                name="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>연락처</label>
              <input
                type="text"
                name="연락처"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>행사명</label>
              <input
                type="text"
                name="행사명"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>촬영 날짜</label>
              <input
                type="date"
                name="촬영날짜"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>촬영 시간</label>

              {!showTimePicker ? (
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  style={{
                    width: "100%",
                    padding: "16px 18px",
                    borderRadius: 14,
                    border: "1px solid #ddd",
                    backgroundColor: "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {startTime ? (
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#111",
                          marginBottom: 4,
                        }}
                      >
                        {startTime}~{endTimeLabel}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#666",
                        }}
                      >
                        {hours}시간
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#111",
                          marginBottom: 4,
                        }}
                      >
                        촬영 시간 선택
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#777",
                        }}
                      >
                        원하는 시간대를 눌러주세요.
                      </div>
                    </div>
                  )}
                </button>
              ) : (
                <div
                  style={{
                    border: "1px solid #ececec",
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#111",
                      }}
                    >
                      촬영 시간 설정
                    </p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {startTime ? (
                        <button
                          type="button"
                          onClick={clearTimeSelection}
                          style={{
                            border: "1px solid #e2e2e2",
                            backgroundColor: "#fff",
                            color: "#c33d3d",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            borderRadius: 10,
                            padding: "8px 10px",
                          }}
                        >
                          선택 해제
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setShowTimePicker(false)}
                        style={{
                          border: "none",
                          backgroundColor: "#111",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          borderRadius: 10,
                          padding: "9px 12px",
                        }}
                      >
                        완료
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(3, minmax(0, 1fr))"
                        : "repeat(4, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    {timeOptions.map((time) => {
                      const isStartTime = startTime === time;
                      const isInSelectedRange = selectedRangeTimes.includes(time);

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => handleTimeClick(time)}
                          style={{
                            border: isStartTime
                              ? "1px solid #111"
                              : isInSelectedRange
                              ? "1px solid rgba(17,17,17,0.35)"
                              : "1px solid #ddd",
                            backgroundColor: isStartTime
                              ? "#111"
                              : isInSelectedRange
                              ? "rgba(17,17,17,0.08)"
                              : "#fff",
                            color: isStartTime ? "#fff" : "#111",
                            padding: "12px 10px",
                            borderRadius: 12,
                            fontSize: 14,
                            fontWeight: isStartTime || isInSelectedRange ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid #e7e7e7",
                      backgroundColor: "#fff",
                      fontSize: 14,
                      color: "#555",
                      lineHeight: 1.8,
                    }}
                  >
                    <div>
                      시간대: {startTime ? `${startTime}~${endTimeLabel}` : "미선택"}
                    </div>
                    <div>촬영 시간: {hours}시간</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...fieldWrap, marginBottom: 28 }}>
              <label style={labelStyle}>추가 요청사항</label>
              <textarea
                name="추가요청사항"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                rows={5}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div
              style={{
                borderTop: "1px solid #eee",
                paddingTop: 28,
                marginTop: 10,
              }}
            >
              <h2 style={{ fontSize: isMobile ? 22 : 24, marginBottom: 24 }}>
                옵션 선택
              </h2>

              <div style={{ marginBottom: 28 }}>
                <p style={groupTitleStyle}>카메라 구성</p>

                <div style={optionCardStyle}>
                  <div style={optionHeaderStyle}>
                    <div>
                      <p style={optionTitleStyle}>카메라 1대 (기본)</p>
                      <p style={optionDescStyle}>기본 촬영 구성입니다.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openImagePreview("/options/camera-1.jpg", "카메라 1대 예시 1")
                    }
                    style={previewButtonStyle}
                  >
                    예시 1 보기
                  </button>

                  <label style={radioCardStyle}>
                    <input
                      type="radio"
                      name="카메라대수UI"
                      value={1}
                      checked={camera === 1}
                      onChange={() => setCamera(1)}
                    />
                    <span style={{ marginLeft: 10 }}>1대 선택</span>
                  </label>
                </div>

                <div style={optionCardStyle}>
                  <div style={optionHeaderStyle}>
                    <div>
                      <p style={optionTitleStyle}>카메라 2대 (+300,000원)</p>
                      <p style={optionDescStyle}>
                        와이드 샷과 클로즈업 등 더 풍부한 화면 구성이 가능합니다.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openImagePreview("/options/camera-2.jpg", "카메라 2대 예시 2")
                    }
                    style={previewButtonStyle}
                  >
                    예시 2 보기
                  </button>

                  <label style={radioCardStyle}>
                    <input
                      type="radio"
                      name="카메라대수UI"
                      value={2}
                      checked={camera === 2}
                      onChange={() => setCamera(2)}
                    />
                    <span style={{ marginLeft: 10 }}>2대 선택</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <p style={groupTitleStyle}>편집 옵션</p>

                <label style={checkCardStyle}>
                  <input
                    type="checkbox"
                    name="편집"
                    checked={edit}
                    onChange={() => setEdit(!edit)}
                  />
                  <span style={{ marginLeft: 10 }}>편집 (+350,000원)</span>
                </label>
              </div>

              <div style={{ marginBottom: 24 }}>
                <p style={groupTitleStyle}>송출 옵션</p>

                <label style={checkCardStyle}>
                  <input
                    type="checkbox"
                    name="Zoom송출"
                    checked={zoom}
                    onChange={() => setZoom(!zoom)}
                  />
                  <span style={{ marginLeft: 10 }}>Zoom 송출 (+200,000원)</span>
                </label>

                <label style={checkCardStyle}>
                  <input
                    type="checkbox"
                    name="YouTube라이브"
                    checked={youtube}
                    onChange={() => setYoutube(!youtube)}
                  />
                  <span style={{ marginLeft: 10 }}>
                    YouTube 라이브 (+250,000원)
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: 28 }}>
                <p style={groupTitleStyle}>추가 제작 옵션</p>

                <div style={optionCardStyle}>
                  <label style={checkCardStyle}>
                    <input
                      type="checkbox"
                      name="PIP디자인"
                      checked={pip}
                      onChange={() => setPip(!pip)}
                    />
                    <span style={{ marginLeft: 10 }}>
                      PIP 디자인 (+150,000원)
                    </span>
                  </label>

                  <p style={optionDescStyle}>
                    강연자와 발표 자료를 함께 보여주는 구성입니다.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openImagePreview("/options/pip.jpg", "PIP 디자인 예시")
                    }
                    style={previewButtonStyle}
                  >
                    예시 보기
                  </button>
                </div>

                <div style={optionCardStyle}>
                  <label style={checkCardStyle}>
                    <input
                      type="checkbox"
                      name="인트로제작"
                      checked={intro}
                      onChange={() => setIntro(!intro)}
                    />
                    <span style={{ marginLeft: 10 }}>
                      행사 인트로 제작 (+150,000원)
                    </span>
                  </label>

                  <p style={optionDescStyle}>
                    행사 시작 전 분위기를 살리는 오프닝 영상입니다.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openVideoPreview(
                        "https://www.youtube.com/embed/Iaip0_tIykI",
                        "행사 인트로 예시 영상"
                      )
                    }
                    style={previewButtonStyle}
                  >
                    영상 예시 보기
                  </button>
                </div>
              </div>
            </div>

            {errorMessage && (
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 8,
                  color: "#d93025",
                  fontSize: 14,
                  lineHeight: 1.6,
                  wordBreak: "keep-all",
                }}
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                marginTop: 12,
                backgroundColor: "#111",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "16px 20px",
                fontSize: 16,
                fontWeight: 700,
                cursor: isSubmitting ? "default" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "예약 요청 전송 중..." : "예약 요청 보내기"}
            </button>

            <p
              style={{
                fontSize: 13,
                color: "#777",
                marginTop: 14,
                lineHeight: 1.7,
                wordBreak: "keep-all",
              }}
            >
              버튼을 누르면 예약 요청이 접수됩니다. 담당자가 확인 후 입력하신
              연락처 또는 이메일로 회신드립니다.
            </p>
          </form>

          <div
            style={{
              backgroundColor: "#111",
              color: "#fff",
              borderRadius: 24,
              padding: isMobile ? 20 : 28,
              position: isMobile ? "relative" : "sticky",
              top: 20,
            }}
          >
            <p style={{ fontSize: 13, letterSpacing: "0.15em", color: "#aaa" }}>
              ESTIMATE
            </p>
            <h2
              style={{
                fontSize: isMobile ? 24 : 28,
                marginTop: 10,
                marginBottom: 24,
              }}
            >
              예상 견적
            </h2>

            <div style={summaryRowStyle}>
              <span>기본 촬영비 (1시간)</span>
              <span>{PRICES.base.toLocaleString()}원</span>
            </div>

            <div style={summaryRowStyle}>
              <span>추가 시간</span>
              <span>{extraHourPrice.toLocaleString()}원</span>
            </div>

            <div style={summaryRowStyle}>
              <span>카메라 추가</span>
              <span>{cameraPrice.toLocaleString()}원</span>
            </div>

            <div style={summaryRowStyle}>
              <span>편집</span>
              <span>{editPrice.toLocaleString()}원</span>
            </div>

            <div style={summaryRowStyle}>
              <span>Zoom 송출</span>
              <span>{zoomPrice.toLocaleString()}원</span>
            </div>

            <div style={summaryRowStyle}>
              <span>YouTube 라이브</span>
              <span>{youtubePrice.toLocaleString()}원</span>
            </div>

            <div style={summaryRowStyle}>
              <span>PIP 디자인</span>
              <span>{pipPrice.toLocaleString()}원</span>
            </div>

            <div style={summaryRowStyle}>
              <span>행사 인트로 제작</span>
              <span>{introPrice.toLocaleString()}원</span>
            </div>

            <div
              style={{
                marginTop: 22,
                paddingTop: 22,
                borderTop: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#aaa",
                  marginBottom: 12,
                }}
              >
                할인 코드
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <input
                  type="text"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                  placeholder="할인 코드를 입력하세요"
                  style={{
                    flex: 1,
                    padding: "14px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    backgroundColor: "#1b1b1b",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />

                <button
                  type="button"
                  onClick={handleApplyDiscountCode}
                  disabled={discountCodesLoading || discountApplying}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "none",
                    backgroundColor: "#fff",
                    color: "#111",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      discountCodesLoading || discountApplying
                        ? "default"
                        : "pointer",
                    whiteSpace: "nowrap",
                    opacity: discountCodesLoading || discountApplying ? 0.7 : 1,
                  }}
                >
                  {discountApplying
                    ? "확인 중..."
                    : discountCodesLoading
                    ? "불러오는 중..."
                    : "코드 적용"}
                </button>
              </div>

              {discountMessage && (
                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    color: "#8df0ad",
                    fontSize: 13,
                    lineHeight: 1.6,
                    wordBreak: "keep-all",
                  }}
                >
                  {discountMessage}
                </p>
              )}

              {discountErrorMessage && (
                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    color: "#ff8f8f",
                    fontSize: 13,
                    lineHeight: 1.6,
                    wordBreak: "keep-all",
                  }}
                >
                  {discountErrorMessage}
                </p>
              )}

              {appliedDiscountCode && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {appliedDiscountCode}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: 12,
                        color: "#bbb",
                      }}
                    >
                      {discountPercent}% 할인 적용 중
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveDiscountCode}
                    style={{
                      border: "1px solid rgba(255,255,255,0.16)",
                      backgroundColor: "transparent",
                      color: "#fff",
                      padding: "10px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    코드 제거
                  </button>
                </div>
              )}

              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#999",
                  lineHeight: 1.7,
                }}
              >
                할인코드는 별도 안내받은 경우에만 입력해주세요.
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                marginTop: 20,
                paddingTop: 20,
              }}
            >
              <div style={summaryRowStyleNoBorder}>
                <span style={{ color: "#aaa" }}>할인 전 금액</span>
                <span>{originalTotal.toLocaleString()}원</span>
              </div>

              <div style={summaryRowStyleNoBorder}>
                <span style={{ color: "#aaa" }}>할인 금액</span>
                <span>- {discountAmount.toLocaleString()}원</span>
              </div>

              <p style={{ fontSize: 13, color: "#aaa", marginTop: 14, marginBottom: 8 }}>
                FINAL TOTAL
              </p>
              <h3
                style={{
                  fontSize: isMobile ? 28 : 34,
                  margin: 0,
                  wordBreak: "keep-all",
                }}
              >
                {finalTotal.toLocaleString()}원
              </h3>
            </div>

            <div
              style={{
                marginTop: 26,
                padding: 18,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.06)",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#ddd",
                wordBreak: "keep-all",
              }}
            >
              달력에서 선택한 일정이 자동 반영되었습니다. 최종 금액은 촬영 조건과
              일정 확인 후 확정됩니다.
            </div>
          </div>
        </div>
      </div>

      {previewType && (
        <div
          onClick={closePreview}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? 16 : 24,
            zIndex: 9999,
            cursor: "pointer",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: previewType === "video" ? "1100px" : "1200px",
            }}
          >
            <button
              type="button"
              onClick={closePreview}
              style={{
                position: "absolute",
                top: -46,
                right: 0,
                border: "none",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              닫기
            </button>

            <div
              style={{
                marginBottom: 12,
                color: "#fff",
                fontSize: isMobile ? 16 : 18,
                fontWeight: 700,
              }}
            >
              {previewTitle}
            </div>

            {previewType === "image" && (
              <img
                src={previewSrc}
                alt={previewTitle}
                style={{
                  width: "100%",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  borderRadius: 20,
                  display: "block",
                  backgroundColor: "#111",
                }}
              />
            )}

            {previewType === "video" && (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  paddingTop: "56.25%",
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: "#111",
                }}
              >
                <iframe
                  src={previewSrc}
                  title={previewTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

const fieldWrap = {
  marginBottom: 20,
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  fontSize: 15,
};

const groupTitleStyle = {
  fontWeight: 700,
  marginBottom: 12,
  fontSize: 15,
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #ddd",
  fontSize: 15,
  boxSizing: "border-box" as const,
  backgroundColor: "#fff",
};

const checkCardStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: 12,
  fontSize: 15,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #e9e9e9",
  backgroundColor: "#fafafa",
};

const radioCardStyle = {
  display: "flex",
  alignItems: "center",
  marginTop: 12,
  fontSize: 15,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #e9e9e9",
  backgroundColor: "#fafafa",
};

const optionCardStyle = {
  border: "1px solid #ececec",
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  backgroundColor: "#fff",
};

const optionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const optionTitleStyle = {
  fontSize: 16,
  fontWeight: 700,
  margin: 0,
};

const optionDescStyle = {
  fontSize: 14,
  color: "#666",
  lineHeight: 1.7,
  marginTop: 6,
  marginBottom: 0,
  wordBreak: "keep-all" as const,
};

const previewButtonStyle = {
  display: "inline-block",
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 12,
  backgroundColor: "#111",
  color: "#fff",
  border: "none",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  fontSize: 15,
};

const summaryRowStyleNoBorder = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
  fontSize: 15,
};