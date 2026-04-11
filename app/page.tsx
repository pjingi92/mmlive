"use client";

import { type CSSProperties } from "react";

export default function Home() {
  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f5f5f3",
          color: "#111",
          fontFamily: "sans-serif",
        }}
      >
        <section className="home-section home-hero-section">
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 14 }}>
              <p className="home-logo">MMLIVE</p>
              <p className="home-logo-sub">by 무명필름</p>
            </div>

            <h1 className="home-main-title">
              교육기관·기업 행사 촬영 및
              <br />
              라이브 송출 예약 시스템
            </h1>
          </div>

          <p className="home-main-desc">
            학술행사, 세미나, 포럼, 강연 촬영부터 YouTube·Zoom 라이브 송출,
            PIP 디자인, 인트로 제작까지 한 번에 예약하고 예상 견적을 확인할 수
            있습니다.
          </p>

          <div className="home-action-row">
            <a
              href="/booking"
              style={{
                display: "inline-block",
                padding: "16px 26px",
                backgroundColor: "#111",
                color: "#fff",
                textDecoration: "none",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              촬영 예약하기
            </a>

            <a
              href="#services"
              style={{
                display: "inline-block",
                padding: "16px 26px",
                backgroundColor: "#fff",
                color: "#111",
                textDecoration: "none",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
                border: "1px solid #ddd",
              }}
            >
              서비스 보기
            </a>

            <a
              href="/portfolio"
              style={{
                display: "none",
                padding: "16px 26px",
                backgroundColor: "#fff",
                color: "#111",
                textDecoration: "none",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
                border: "1px solid #ddd",
              }}
            >
              포트폴리오 보기
            </a>
          </div>

          <div className="home-hero-grid">
            <a
              href="/booking"
              className="home-booking-card"
              style={{
                backgroundColor: "#111",
                color: "#fff",
                borderRadius: 28,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                textDecoration: "none",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.15em",
                    color: "#aaa",
                    marginBottom: 14,
                  }}
                >
                  BOOKING FLOW
                </p>

                <h2 className="home-booking-title">
                  예약부터 예상 견적 확인까지
                  <br />
                  한 페이지에서
                </h2>

                <p className="home-booking-desc">
                  촬영 시간, 카메라 대수, Zoom·YouTube 송출, PIP 디자인,
                  인트로 제작 옵션을 직접 선택하고 실시간으로 예상 견적을 확인할
                  수 있습니다.
                </p>
              </div>

              <div className="home-booking-steps">
                <div style={darkInfoBox}>
                  <strong style={darkInfoTitle}>1</strong>
                  <span style={darkInfoText}>날짜 및 정보 입력</span>
                </div>
                <div style={darkInfoBox}>
                  <strong style={darkInfoTitle}>2</strong>
                  <span style={darkInfoText}>옵션 선택</span>
                </div>
                <div style={darkInfoBox}>
                  <strong style={darkInfoTitle}>3</strong>
                  <span style={darkInfoText}>견적 확인 후 요청</span>
                </div>
              </div>
            </a>

            <div
              className="home-included-card"
              style={{
                backgroundColor: "#fff",
                borderRadius: 28,
                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                border: "1px solid #e8e8e8",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  letterSpacing: "0.15em",
                  color: "#888",
                  marginBottom: 16,
                }}
              >
                INCLUDED SERVICE
              </p>

              <div style={{ display: "grid", gap: 14 }}>
                <div style={serviceMiniCard}>
                  <strong>촬영 운영</strong>
                  <span>학술행사 · 세미나 · 포럼 · 강연</span>
                </div>
                <div style={serviceMiniCard}>
                  <strong>라이브 송출</strong>
                  <span>YouTube Live · Zoom 송출 지원</span>
                </div>
                <div style={serviceMiniCard}>
                  <strong>추가 제작</strong>
                  <span>PIP 디자인 · 행사 인트로 제작</span>
                </div>
                <div style={serviceMiniCard}>
                  <strong>견적 확인</strong>
                  <span>옵션 선택 후 예상 금액 즉시 확인</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="home-section home-services-section">
          <div style={{ marginBottom: 34 }}>
            <p
              style={{
                fontSize: 13,
                letterSpacing: "0.15em",
                color: "#888",
                marginBottom: 12,
              }}
            >
              SERVICES
            </p>
            <h2 className="home-services-title">예약 가능한 주요 서비스</h2>
            <p className="home-services-desc">
              행사 운영에 맞춰 촬영, 라이브 송출, 디자인 제작까지
              필요한 항목을 조합해 예약할 수 있습니다.
            </p>
          </div>

          <div className="home-services-grid">
            <div style={serviceCard}>
              <h3 style={serviceTitle}>행사 촬영</h3>
              <p style={serviceText}>
                세미나, 포럼, 학회, 특강 등 다양한 학술행사 촬영을 안정적으로
                운영합니다. 발표 중심 기록 촬영부터 행사 전체 분위기까지 균형 있게
                담아냅니다.
              </p>
            </div>

            <div style={serviceCard}>
              <h3 style={serviceTitle}>라이브 송출</h3>
              <p style={serviceText}>
                YouTube 및 Zoom 기반 실시간 송출을 지원하여 온라인 시청 환경까지
                함께 운영합니다.
              </p>
            </div>

            <div style={serviceCard}>
              <h3 style={serviceTitle}>PIP 디자인</h3>
              <p style={serviceText}>
                발표자료와 강연자 화면을 함께 구성하는 PIP 화면 디자인을
                제공합니다.
              </p>
            </div>

            <div style={serviceCard}>
              <h3 style={serviceTitle}>행사 인트로 제작</h3>
              <p style={serviceText}>
                행사 시작 전 분위기와 브랜딩을 살릴 수 있는 인트로 영상을
                제작합니다.
              </p>
            </div>
          </div>
        </section>

        <footer
          style={{
            borderTop: "1px solid #e5e5e1",
            backgroundColor: "#efefeb",
          }}
        >
          <div className="home-footer-inner">
            <div className="home-footer-grid">
              <div>
                <p className="home-footer-logo">MMLIVE</p>
                <p className="home-footer-sub">by 무명필름</p>
                <p className="home-footer-desc">
                  학술행사 중계, 강의 촬영, 라이브 송출까지
                  <br />
                  기록이 필요한 순간을 안정적으로 제작합니다.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                <p style={footerInfoText}>
                  <strong style={footerLabel}>대표</strong>
                  {" "}문성민
                </p>
                <p style={footerInfoText}>
                  <strong style={footerLabel}>사업자등록번호</strong>
                  {" "}347-19-00482
                </p>
                <p style={footerInfoText}>
                  <strong style={footerLabel}>주소</strong>
                  {" "}서울 강서구 공항대로 213 보타닉파크타워 II 905호
                </p>
                <p style={footerInfoText}>
                  <strong style={footerLabel}>Email</strong>
                  {" "}pjingi92@gmail.com
                </p>
                <p style={footerInfoText}>
                  <strong style={footerLabel}>Tel</strong>
                  {" "}010-6821-7172
                </p>
              </div>
            </div>

            <div
              style={{
                paddingTop: 20,
                borderTop: "1px solid #dddcd7",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#888",
                  margin: 0,
                }}
              >
                © 2017–2026 무명필름. All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>

      <style jsx>{`
        .home-section {
          max-width: 1200px;
          margin: 0 auto;
        }

        .home-hero-section {
          padding: 80px 24px 60px;
        }

        .home-logo {
          font-size: 44px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #111;
          margin: 0;
          line-height: 1;
          font-family: sans-serif;
        }

        .home-logo-sub {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #777;
          margin-top: 10px;
          margin-bottom: 0;
        }

        .home-main-title {
          font-size: 64px;
          line-height: 1.15;
          margin: 0;
          max-width: 900px;
          word-break: keep-all;
        }

        .home-main-desc {
          font-size: 20px;
          line-height: 1.8;
          color: #555;
          max-width: 860px;
          margin-bottom: 36px;
          word-break: keep-all;
        }

        .home-action-row {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 70px;
        }

        .home-hero-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          align-items: stretch;
        }

        .home-booking-card {
          padding: 36px;
          min-height: 320px;
        }

        .home-booking-title {
          font-size: 34px;
          line-height: 1.35;
          margin: 0;
          margin-bottom: 18px;
          word-break: keep-all;
        }

        .home-booking-desc {
          font-size: 16px;
          line-height: 1.8;
          color: #ddd;
          max-width: 520px;
          word-break: keep-all;
        }

        .home-booking-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 28px;
        }

        .home-included-card {
          padding: 30px;
        }

        .home-services-section {
          padding: 20px 24px 100px;
        }

        .home-services-title {
          font-size: 40px;
          margin: 0 0 14px 0;
          word-break: keep-all;
          line-height: 1.3;
        }

        .home-services-desc {
          font-size: 18px;
          color: #666;
          line-height: 1.8;
          max-width: 920px;
          word-break: keep-all;
        }

        .home-services-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .home-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 24px 42px;
        }

        .home-footer-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 28px;
          align-items: start;
          margin-bottom: 28px;
        }

        .home-footer-logo {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #111;
          margin: 0;
        }

        .home-footer-sub {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          margin-top: 10px;
          margin-bottom: 18px;
        }

        .home-footer-desc {
          font-size: 16px;
          line-height: 1.8;
          color: #555;
          max-width: 520px;
          margin: 0;
          word-break: keep-all;
        }

        @media (max-width: 959px) {
          .home-hero-section {
            padding: 40px 16px 40px;
          }

          .home-logo {
            font-size: 28px;
          }

          .home-main-title {
            font-size: 38px;
          }

          .home-main-desc {
            font-size: 17px;
          }

          .home-action-row {
            margin-bottom: 40px;
          }

          .home-hero-grid {
            grid-template-columns: 1fr;
          }

          .home-booking-card {
            padding: 22px;
            min-height: auto;
          }

          .home-booking-title {
            font-size: 28px;
          }

          .home-booking-steps {
            grid-template-columns: 1fr;
          }

          .home-included-card {
            padding: 22px;
          }

          .home-services-section {
            padding: 10px 16px 70px;
          }

          .home-services-title {
            font-size: 30px;
          }

          .home-services-desc {
            font-size: 16px;
          }

          .home-services-grid {
            grid-template-columns: 1fr;
          }

          .home-footer-inner {
            padding: 42px 16px 36px;
          }

          .home-footer-grid {
            grid-template-columns: 1fr;
          }

          .home-footer-logo {
            font-size: 24px;
          }
        }
      `}</style>
    </>
  );
}

const darkInfoBox: CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.06)",
  borderRadius: 18,
  padding: "16px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const darkInfoTitle: CSSProperties = {
  fontSize: 18,
  color: "#fff",
};

const darkInfoText: CSSProperties = {
  fontSize: 14,
  color: "#d6d6d6",
  lineHeight: 1.5,
  wordBreak: "keep-all",
};

const serviceMiniCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "16px 18px",
  borderRadius: 18,
  backgroundColor: "#f7f7f7",
  border: "1px solid #eee",
  fontSize: 14,
  color: "#555",
};

const serviceCard: CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
  border: "1px solid #ececec",
};

const serviceTitle: CSSProperties = {
  fontSize: 22,
  marginTop: 0,
  marginBottom: 12,
  color: "#111",
  wordBreak: "keep-all",
};

const serviceText: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.8,
  color: "#666",
  margin: 0,
  wordBreak: "keep-all",
};

const footerInfoText: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.8,
  color: "#555",
  margin: 0,
  wordBreak: "keep-all",
};

const footerLabel: CSSProperties = {
  display: "inline-block",
  minWidth: 110,
  color: "#111",
};