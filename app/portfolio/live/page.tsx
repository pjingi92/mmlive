export default function LivePortfolioPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f3",
        color: "#111",
        fontFamily: "sans-serif",
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <a
          href="/portfolio"
          style={{
            display: "inline-block",
            marginBottom: 20,
            color: "#666",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← 포트폴리오로
        </a>

        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#666",
            marginBottom: 14,
          }}
        >
          LIVE PORTFOLIO
        </p>

        <h1 style={{ fontSize: 48, marginBottom: 18 }}>
          라이브 송출 포트폴리오
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.8, color: "#555" }}>
          여기에 라이브 송출 관련 작업물을 넣을 수 있습니다.
        </p>
      </div>
    </main>
  );
}