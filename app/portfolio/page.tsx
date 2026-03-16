"use client";

import { useEffect, useState } from "react";

export default function PortfolioPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 960);
    };

    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f3",
        color: "#111",
        fontFamily: "sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isMobile ? "40px 16px 60px" : "80px 24px 60px",
        }}
      >
        <a
          href="/"
          style={{
            display: "inline-block",
            marginBottom: 20,
            color: "#666",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← 홈으로
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
          PORTFOLIO
        </p>

        <h1
          style={{
            fontSize: isMobile ? 38 : 56,
            lineHeight: 1.2,
            margin: 0,
            marginBottom: 18,
            wordBreak: "keep-all",
          }}
        >
          이전 작업 시안 및
          <br />
          서비스 포트폴리오
        </h1>

        <p
          style={{
            fontSize: isMobile ? 16 : 19,
            lineHeight: 1.8,
            color: "#555",
            maxWidth: 860,
            marginBottom: 42,
            wordBreak: "keep-all",
          }}
        >
          서울대학교 행사 운영에 활용할 수 있는 PIP 디자인, 인트로 구성,
          라이브 송출 화면, 강연 촬영 시안 등을 정리한 포트폴리오 페이지입니다.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 22,
          }}
        >
          <a href="/portfolio/pip" style={cardLink}>
            <div style={portfolioCard}>
              <div style={thumbBox}>PIP</div>
              <h2 style={cardTitle}>PIP 디자인 시안</h2>
              <p style={cardText}>PIP 디자인 시안 페이지로 이동합니다.</p>
            </div>
          </a>

          <a href="/portfolio/live" style={cardLink}>
            <div style={portfolioCard}>
              <div style={thumbBox}>LIVE</div>
              <h2 style={cardTitle}>라이브 송출 운영 화면</h2>
              <p style={cardText}>라이브 송출 포트폴리오 페이지로 이동합니다.</p>
            </div>
          </a>

          <a href="/portfolio/intro" style={cardLink}>
            <div style={portfolioCard}>
              <div style={thumbBox}>INTRO</div>
              <h2 style={cardTitle}>행사 인트로 제작</h2>
              <p style={cardText}>행사 인트로 포트폴리오 페이지로 이동합니다.</p>
            </div>
          </a>

          <a href="/portfolio/shot" style={cardLink}>
            <div style={portfolioCard}>
              <div style={thumbBox}>SHOT</div>
              <h2 style={cardTitle}>강연·세미나 촬영 구성</h2>
              <p style={cardText}>촬영 구성 포트폴리오 페이지로 이동합니다.</p>
            </div>
          </a>

          <a href="/portfolio/edit" style={cardLink}>
            <div style={portfolioCard}>
              <div style={thumbBox}>EDIT</div>
              <h2 style={cardTitle}>후반 편집 결과물</h2>
              <p style={cardText}>편집 포트폴리오 페이지로 이동합니다.</p>
            </div>
          </a>

          <a href="/portfolio/brand" style={cardLink}>
            <div style={portfolioCard}>
              <div style={thumbBox}>BRAND</div>
              <h2 style={cardTitle}>행사 맞춤 브랜딩 화면</h2>
              <p style={cardText}>브랜딩 포트폴리오 페이지로 이동합니다.</p>
            </div>
          </a>
        </div>
      </section>
    </main>
  );
}

const cardLink = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

const portfolioCard = {
  backgroundColor: "#fff",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
  border: "1px solid #ececec",
  height: "100%",
};

const thumbBox = {
  height: 180,
  borderRadius: 18,
  backgroundColor: "#111",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "0.12em",
  marginBottom: 20,
};

const cardTitle = {
  fontSize: 24,
  marginTop: 0,
  marginBottom: 12,
  color: "#111",
  wordBreak: "keep-all" as const,
};

const cardText = {
  fontSize: 16,
  lineHeight: 1.8,
  color: "#666",
  margin: 0,
  wordBreak: "keep-all" as const,
};