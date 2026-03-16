export default function BookingCompletePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f3",
        padding: "24px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: "20px",
          padding: "40px 24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "16px",
            color: "#111",
          }}
        >
          예약 문의가 접수되었습니다
        </h1>

        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.7,
            color: "#444",
            marginBottom: "12px",
          }}
        >
          문의 내용을 정상적으로 전달받았습니다.
        </p>

        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.7,
            color: "#444",
            marginBottom: "28px",
          }}
        >
          담당자가 확인 후 영업일 기준 24시간 이내에 연락드리겠습니다.
        </p>

        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "14px 24px",
            borderRadius: "12px",
            backgroundColor: "#111",
            color: "#fff",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          메인으로 돌아가기
        </a>
      </div>
    </main>
  );
}