"use client";

import { useEffect, useRef, useState } from "react";

const portfolioItems = [
  {
    title: "Build-a-Claw @ SNU",
    category: "젠슨 황",
    thumbnail: "/portfolio/portfolio-1.png",
    youtubeEmbedUrl: "https://www.youtube.com/embed/vC22ynK8uSs",
    duration: "36:34",
  },
  {
    title: "AI 시대 리더십: 여성들의 목소리",
    category: "매디슨 황",
    thumbnail: "/portfolio/portfolio-2.png",
    youtubeEmbedUrl: "https://www.youtube.com/embed/JJfRfHNw_5A",
    duration: "41:07",
  },
  {
    title: "SNUBIC ART FAIR",
    category: "서울대학교 뇌영상센터",
    thumbnail: "/portfolio/portfolio-3.png",
    youtubeEmbedUrl: "https://www.youtube.com/embed/IyzlWN5mTb4",
    duration: "1:04:24",
  },
  {
    title: "로보콘",
    category: "서울대학교 창의공학설계",
    thumbnail: "/portfolio/portfolio-4.png",
    youtubeEmbedUrl: "https://www.youtube.com/embed/orDd6V8LQMM",
    duration: "8:46",
  },
  {
    title: "농촌 RE:PLAY | 농촌에서 일하다",
    category: "농림축산식품부",
    thumbnail: "/portfolio/portfolio-5.png",
    youtubeEmbedUrl: "https://www.youtube.com/embed/kLxa4HDquf0",
    duration: "8:18",
  },
  {
    title: "시간을 빚어 전통을 잇는 우리술",
    category: "농림축산식품부",
    thumbnail: "/portfolio/portfolio-6.png",
    youtubeEmbedUrl: "https://www.youtube.com/embed/JPAu6BY-MTg",
    duration: "11:36",
  },
];


const faqItems = [
  {
    question: "촬영 예약은 언제까지 해야 하나요?",
    answer:
      "행사 규모와 일정에 따라 다르지만, 안정적인 장비 구성과 인력 배정을 위해 최소 1~2주 전 예약을 권장합니다.",
  },
  {
    question: "라이브 송출은 어떤 플랫폼을 지원하나요?",
    answer:
      "YouTube Live와 Zoom을 기본으로 지원하며, 행사 환경에 맞춰 다양한 온라인 송출 방식도 협의할 수 있습니다.",
  },
  {
    question: "견적은 무료인가요?",
    answer:
      "네. 홈페이지에서 촬영 시간과 옵션을 선택해 예상 견적을 확인한 뒤 무료로 예약 문의를 남길 수 있습니다.",
  },
  {
    question: "지방 촬영도 가능한가요?",
    answer:
      "가능합니다. 서울 외 지역은 이동 거리와 일정에 따라 출장비가 추가될 수 있습니다.",
  },
  {
    question: "영상 편집도 함께 의뢰할 수 있나요?",
    answer:
      "촬영 이후 편집, PIP 디자인, 행사 인트로, 하이라이트 영상 제작까지 함께 의뢰할 수 있습니다.",
  },
  {
    question: "계약 및 결제는 어떻게 진행되나요?",
    answer:
      "예약 문의 확인 후 세부 일정과 범위를 협의하고, 최종 견적과 계약 내용을 안내드립니다.",
  },
];

export default function Home() {
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeImageSrc, setActiveImageSrc] = useState("");
  const [activeImageTitle, setActiveImageTitle] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showAllPortfolios, setShowAllPortfolios] = useState(false);
  const portfolioSectionRef = useRef<HTMLElement | null>(null);

  const visiblePortfolioItems = showAllPortfolios
    ? portfolioItems
    : portfolioItems.slice(0, 6);

  const hasMorePortfolios = portfolioItems.length > 6;

  function openPortfolioVideo(url: string, title: string) {
    setActiveVideoUrl(url);
    setActiveVideoTitle(title);
  }

  function closePortfolioVideo() {
    setActiveVideoUrl("");
    setActiveVideoTitle("");
  }

  function openServiceImage(src: string, title: string) {
    setActiveImageSrc(src);
    setActiveImageTitle(title);
  }

  function closeServiceImage() {
    setActiveImageSrc("");
    setActiveImageTitle("");
  }

  function togglePortfolioList() {
    if (showAllPortfolios) {
      setShowAllPortfolios(false);

      window.requestAnimationFrame(() => {
        portfolioSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

      return;
    }

    setShowAllPortfolios(true);
  }

  useEffect(() => {
    if (!activeVideoUrl && !activeImageSrc) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closePortfolioVideo(); closeServiceImage(); }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeVideoUrl, activeImageSrc]);

  return (
    <>
      <main className="site-root">
        <header className="site-header">
          <a href="#top" className="brand-link" aria-label="홈으로 이동">
            <span className="brand-main">MMLIVE</span>
            <span className="brand-sub">by 무명필름</span>
          </a>

          <nav className="desktop-nav" aria-label="주요 메뉴">
            <a href="#services">서비스</a>
            <a href="#portfolio">포트폴리오</a>
                        <a href="#faq">자주 묻는 질문</a>
            <a href="#company">회사 소개</a>
          </nav>

          <a href="/booking" className="header-booking-button">
            촬영 예약하기
          </a>
        </header>

        <section id="top" className="hero-section">
          <div className="hero-background" aria-hidden="true" />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-content-wrap">
            <div className="hero-content">
              <p className="eyebrow">PROFESSIONAL VIDEO PRODUCTION</p>
              <h1>
                <span className="hero-title-line">교육기관·기업 행사를 위한</span>
                <span className="hero-title-line">전문 촬영 및 라이브 중계</span>
              </h1>
              <p className="hero-description">
                촬영부터 송출, 편집까지
                <br />
                무명필름이 현장의 가치를 안정적으로 전달합니다.
              </p>

              <div className="hero-actions">
                <a href="/booking" className="primary-action">
                  촬영 예약하기
                </a>
                <a href="#portfolio" className="secondary-action">
                  <span className="play-mini">▶</span>
                  포트폴리오 보기
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="서비스 핵심 정보">
          <div className="trust-grid">
            <div className="trust-item">
              <span className="trust-icon">▣</span>
              <div>
                <strong>10년+</strong>
                <span>촬영 및 편집 경력</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">▤</span>
              <div>
                <strong>교육기관·기업</strong>
                <span>행사 전문</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">LIVE</span>
              <div>
                <strong>YouTube·Zoom</strong>
                <span>라이브 송출 지원</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">⌁</span>
              <div>
                <strong>안정적인 시스템</strong>
                <span>오디오·네트워크 백업</span>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="light-section section-block">
          <div className="section-heading centered-heading">
            <p className="section-eyebrow">OUR SERVICES</p>
            <h2>필요한 서비스를 한 번에</h2>
          </div>

          <div className="service-grid">
            <article className="service-card">
              <div className="media-frame">
                <img src="/home/service-shoot.png" alt="행사 촬영 현장" onClick={() => openServiceImage("/home/service-shoot.png", "행사 촬영")} role="button" tabIndex={0} />
              </div>
              <div className="card-copy">
                <h3>행사 촬영</h3>
                <p>강연, 세미나, 포럼 등 다양한 행사를 고화질로 촬영합니다.</p>
              </div>
            </article>

            <article className="service-card">
              <div className="media-frame">
                <img src="/home/service-live.png" alt="라이브 중계 시스템" onClick={() => openServiceImage("/home/service-live.png", "라이브 중계")} role="button" tabIndex={0} />
              </div>
              <div className="card-copy">
                <h3>라이브 중계</h3>
                <p>YouTube와 Zoom 등 온라인 플랫폼으로 안정적인 송출을 지원합니다.</p>
              </div>
            </article>

            <article className="service-card">
              <div className="media-frame">
                <img src="/home/service-edit.png" alt="영상 편집 작업" onClick={() => openServiceImage("/home/service-edit.png", "영상 후반 제작")} role="button" tabIndex={0} />
              </div>
              <div className="card-copy">
                <h3>영상 후반 제작</h3>
                <p>편집, PIP 디자인, 인트로 제작까지 행사 영상의 완성도를 높입니다.</p>
              </div>
            </article>

            <article className="service-card">
              <div className="media-frame">
                <img src="/home/service-custom.png" alt="맞춤형 제작 현장" onClick={() => openServiceImage("/home/service-custom.png", "맞춤형 제작")} role="button" tabIndex={0} />
              </div>
              <div className="card-copy">
                <h3>맞춤형 제작</h3>
                <p>행사 성격과 공간에 맞는 효율적인 촬영·송출 구성을 제안합니다.</p>
              </div>
            </article>
          </div>
        </section>

        

        <section
          id="portfolio"
          ref={portfolioSectionRef}
          className="portfolio-section section-block"
        >
          <div className="section-heading centered-heading">
            <p className="section-eyebrow">PORTFOLIO</p>
            <h2>포트폴리오</h2>
            <p className="portfolio-heading-description">무명필름의 주요 작업 영상을 확인해보세요.</p>
          </div>

          <div className="portfolio-scroller">
            {visiblePortfolioItems.map((item) => (
              <button
                key={item.title}
                type="button"
                className="portfolio-card"
                onClick={() => openPortfolioVideo(item.youtubeEmbedUrl, item.title)}
              >
                <div className="portfolio-thumbnail-wrap">
                  <img src={item.thumbnail} alt={item.title} />
                  <span className="portfolio-play">▶</span>
                  <span className="portfolio-duration">{item.duration}</span>
                </div>
                <div className="portfolio-copy">
                  <strong>{item.title}</strong>
                  <span>{item.category}</span>
                </div>
              </button>
            ))}
          </div>

          {hasMorePortfolios ? (
            <div className="portfolio-toggle-wrap">
              <button
                type="button"
                className="portfolio-toggle-button"
                onClick={togglePortfolioList}
                aria-expanded={showAllPortfolios}
              >
                {showAllPortfolios ? "포트폴리오 접기 ↑" : "포트폴리오 더보기 ↓"}
              </button>
            </div>
          ) : null}
        </section>

        <section id="faq" className="faq-section section-block">
          <div className="section-heading centered-heading">
            <p className="section-eyebrow">FAQ</p>
            <h2>자주 묻는 질문</h2>
          </div>

          <div className="faq-grid">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div key={item.question} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <span className="faq-plus">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? <p className="faq-answer">{item.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="booking-cta-section">
          <div>
            <h2>
              지금 바로 예약하고
              <br />
              간편하게 견적을 확인해보세요.
            </h2>
            <p>빠른 상담을 원하시면 예약 요청을 남겨주세요.</p>
          </div>
          <a href="/booking" className="cta-booking-button">
            촬영 예약하기 →
          </a>
        </section>

        <footer id="company" className="site-footer">
          <div className="footer-grid">
            <div>
              <p className="footer-brand">MMLIVE</p>
              <p className="footer-brand-sub">by 무명필름</p>
              <p className="footer-description">
                교육기관과 기업 행사의 가치를 기록하고,
                <br />
                전문적인 영상으로 전달합니다.
              </p>
            </div>

            <div className="footer-column">
              <strong>서비스</strong>
              <a href="#services">행사 촬영</a>
              <a href="#services">라이브 중계</a>
              <a href="#services">영상 제작</a>
            </div>

            <div className="footer-column">
              <strong>회사</strong>
              <a href="#company">회사 소개</a>
                            <a href="#faq">문의하기</a>
            </div>

            <div className="footer-column footer-contact">
              <strong>문의</strong>
              <span>이메일　pjingi92@gmail.com</span>
              <span>전화　010-6821-7172</span>
            </div>
          </div>

          <div className="footer-bottom">
            <span>대표 문성민 · 사업자등록번호 347-19-00482</span>
            <span>서울 강서구 공항대로 213 보타닉파크타워 II 905호</span>
            <span>© 2017–2026 무명필름. All Rights Reserved.</span>
          </div>
        </footer>
      </main>

      {activeVideoUrl ? (
        <div className="video-modal" onClick={closePortfolioVideo} role="presentation">
          <div className="video-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="video-close-button"
              onClick={closePortfolioVideo}
              aria-label="영상 닫기"
            >
              닫기
            </button>
            <p className="video-title">{activeVideoTitle}</p>
            <div className="video-frame-wrap">
              <iframe
                src={`${activeVideoUrl}?autoplay=1`}
                title={activeVideoTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}

      {activeImageSrc ? (
        <div className="image-modal" onClick={closeServiceImage} role="presentation">
          <div className="image-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-close-button" onClick={closeServiceImage} aria-label="이미지 닫기">닫기</button>
            <p className="image-title">{activeImageTitle}</p>
            <img src={activeImageSrc} alt={activeImageTitle} />
          </div>
        </div>
      ) : null}

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(html) {
          scroll-behavior: smooth;
        }

        :global(body) {
          margin: 0;
          background: #0b0b0b;
        }

        .site-root {
          min-height: 100vh;
          background: #f6f6f4;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          overflow-x: hidden;
        }

        .site-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 36px;
          max-width: 1440px;
          margin: 0 auto;
          padding: 22px 32px;
          color: #fff;
        }

        .brand-link {
          display: flex;
          align-items: baseline;
          gap: 7px;
          color: #fff;
          text-decoration: none;
          white-space: nowrap;
        }

        .brand-main {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .brand-sub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.72);
        }

        .desktop-nav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 34px;
        }

        .desktop-nav a {
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          opacity: 0.9;
          transition: opacity 0.2s ease;
        }

        .desktop-nav a:hover {
          opacity: 1;
        }

        .header-booking-button,
        .primary-action,
        .cta-booking-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ef1f32;
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .header-booking-button {
          min-height: 46px;
          padding: 0 21px;
          border-radius: 4px;
          font-size: 14px;
        }

        .header-booking-button:hover,
        .primary-action:hover,
        .cta-booking-button:hover {
          background: #ff263a;
          transform: translateY(-1px);
        }

        .hero-section {
          position: relative;
          min-height: 760px;
          background: #090909;
          overflow: hidden;
        }

        .hero-background {
          position: absolute;
          inset: 0;
          background-image: url("/home/hero-live.png");
          background-size: cover;
          background-position: center;
          transform: scale(1.02);
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.76) 36%, rgba(0, 0, 0, 0.18) 72%, rgba(0, 0, 0, 0.08) 100%),
            linear-gradient(0deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0.05) 52%, rgba(0, 0, 0, 0.26) 100%);
        }

        .hero-content-wrap {
          position: relative;
          z-index: 2;
          max-width: 1440px;
          min-height: 760px;
          margin: 0 auto;
          padding: 156px 56px 90px;
          display: flex;
          align-items: center;
        }

        .hero-content {
          max-width: 760px;
          color: #fff;
        }

        .eyebrow,
        .section-eyebrow {
          margin: 0 0 16px;
          color: #ef1f32;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .hero-content h1 {
          margin: 0;
          font-size: clamp(46px, 5vw, 76px);
          line-height: 1.16;
          letter-spacing: -0.045em;
          word-break: keep-all;
        }

        .hero-title-line {
          display: block;
          white-space: nowrap;
        }

        .hero-description {
          margin: 28px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 19px;
          line-height: 1.75;
          word-break: keep-all;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 34px;
        }

        .primary-action,
        .secondary-action {
          min-width: 170px;
          min-height: 54px;
          padding: 0 25px;
          border-radius: 4px;
          font-size: 16px;
        }

        .secondary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid rgba(255, 255, 255, 0.55);
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          background: rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(6px);
        }

        .play-mini {
          font-size: 11px;
        }

        .trust-strip {
          background: #141414;
          color: #fff;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .trust-grid {
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 32px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .trust-item {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          padding: 6px 10px;
        }

        .trust-icon {
          min-width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 50%;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
        }

        .trust-item div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .trust-item strong {
          font-size: 14px;
          line-height: 1.35;
        }

        .trust-item span:last-child {
          color: #a9a9a9;
          font-size: 12px;
        }

        .section-block {
          padding: 84px 32px;
        }

        .light-section,
        .faq-section {
          background: #f7f7f5;
        }

        .portfolio-section {
          background: #0b0b0b;
          color: #fff;
        }

        .section-heading {
          max-width: 1180px;
          margin: 0 auto 34px;
        }

        .centered-heading {
          text-align: center;
        }

        .section-heading h2 {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.25;
          letter-spacing: -0.04em;
        }

        .service-grid {
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .service-card {
          overflow: hidden;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.05);
        }

        .media-frame {
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #ddd;
        }

        .media-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
          cursor: zoom-in;
        }

        .service-card:hover .media-frame img,
        .portfolio-card:hover img {
          transform: scale(1.045);
        }

        .card-copy {
          padding: 20px;
        }

        .card-copy h3 {
          margin: 0 0 9px;
          font-size: 20px;
        }

        .card-copy p {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: #666;
          word-break: keep-all;
        }

        .portfolio-section {
          padding-left: 32px;
          padding-right: 32px;
        }

        .portfolio-section .section-heading h2 {
          color: #fff;
        }

        .portfolio-heading-description {
          margin: 14px auto 0;
          color: #9c9c9c;
          font-size: 15px;
          line-height: 1.7;
          word-break: keep-all;
        }

        .portfolio-scroller {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          padding: 4px 0 18px;
        }

        .portfolio-card {
          min-width: 0;
          border: 1px solid #282828;
          border-radius: 7px;
          padding: 0;
          overflow: hidden;
          background: #171717;
          text-align: left;
          cursor: pointer;
          scroll-snap-align: start;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .portfolio-card:hover {
          transform: translateY(-4px);
          border-color: #3b3b3b;
          background: #1d1d1d;
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.38);
        }

        .portfolio-thumbnail-wrap {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #111;
        }

        .portfolio-thumbnail-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }

        .portfolio-play {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.72);
          color: #fff;
          transform: translate(-50%, -50%);
          font-size: 15px;
          backdrop-filter: blur(4px);
        }

        .portfolio-duration {
          position: absolute;
          right: 8px;
          bottom: 8px;
          padding: 4px 6px;
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.74);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
        }

        .portfolio-copy {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 14px 14px 16px;
        }

        .portfolio-copy strong {
          font-size: 15px;
          color: #fff;
        }

        .portfolio-copy span {
          font-size: 12px;
          color: #9a9a9a;
        }

        .portfolio-toggle-wrap {
          max-width: 1320px;
          margin: 14px auto 0;
          display: flex;
          justify-content: center;
        }

        .portfolio-toggle-button {
          min-width: 210px;
          min-height: 50px;
          padding: 0 24px;
          border: 1px solid #3a3a3a;
          border-radius: 999px;
          background: #171717;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 800;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .portfolio-toggle-button:hover {
          transform: translateY(-2px);
          border-color: #666;
          background: #222;
        }

        .portfolio-toggle-button:focus-visible {
          outline: 2px solid #ef1f32;
          outline-offset: 3px;
        }

        .faq-grid {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 18px;
        }

        .faq-item {
          overflow: hidden;
          border: 1px solid #dfdfdf;
          border-radius: 6px;
          background: #fff;
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 17px 19px;
          border: none;
          background: transparent;
          color: #111;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          font-weight: 800;
        }

        .faq-plus {
          font-size: 22px;
          line-height: 1;
          font-weight: 400;
        }

        .faq-answer {
          margin: 0;
          padding: 0 19px 18px;
          color: #666;
          font-size: 14px;
          line-height: 1.75;
          word-break: keep-all;
        }

        .booking-cta-section {
          background: #151515;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 34px max(32px, calc((100vw - 1320px) / 2 + 32px));
        }

        .booking-cta-section h2 {
          margin: 0;
          font-size: 26px;
          line-height: 1.35;
          letter-spacing: -0.035em;
        }

        .booking-cta-section p {
          margin: 8px 0 0;
          color: #999;
          font-size: 13px;
        }

        .cta-booking-button {
          min-width: 180px;
          min-height: 48px;
          padding: 0 22px;
          border-radius: 5px;
          font-size: 14px;
        }

        .site-footer {
          background: #080808;
          color: #fff;
          padding: 46px max(32px, calc((100vw - 1320px) / 2 + 32px)) 28px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr 0.7fr 1fr;
          gap: 34px;
          padding-bottom: 34px;
        }

        .footer-brand {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .footer-brand-sub {
          margin: 5px 0 17px;
          color: #888;
          font-size: 12px;
        }

        .footer-description {
          margin: 0;
          color: #aaa;
          font-size: 13px;
          line-height: 1.75;
        }

        .footer-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 9px;
        }

        .footer-column strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .footer-column a,
        .footer-column span {
          color: #999;
          text-decoration: none;
          font-size: 12px;
          line-height: 1.6;
        }

        .footer-bottom {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 22px;
          padding-top: 22px;
          border-top: 1px solid #222;
          color: #666;
          font-size: 11px;
        }


        .image-modal {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.94);
        }
        .image-dialog {
          position: relative;
          width: min(1280px, 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .image-dialog img {
          width: auto;
          max-width: 100%;
          max-height: calc(100vh - 120px);
          object-fit: contain;
          border-radius: 10px;
          background: #111;
        }
        .image-close-button {
          position: absolute;
          right: 0;
          top: -46px;
          min-width: 72px;
          min-height: 38px;
          border: 1px solid rgba(255,255,255,.3);
          border-radius: 999px;
          background: rgba(255,255,255,.1);
          color: #fff;
          cursor: pointer;
          font-weight: 800;
        }
        .image-title {
          align-self: flex-start;
          margin: 0 0 12px;
          color: #fff;
          font-size: 18px;
          font-weight: 800;
        }

        .video-modal {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.92);
        }

        .video-dialog {
          position: relative;
          width: min(1100px, 100%);
        }

        .video-close-button {
          position: absolute;
          right: 0;
          top: -50px;
          min-width: 72px;
          min-height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          cursor: pointer;
          font-weight: 800;
        }

        .video-title {
          margin: 0 0 12px;
          color: #fff;
          font-size: 18px;
          font-weight: 800;
        }

        .video-frame-wrap {
          position: relative;
          width: 100%;
          padding-top: 56.25%;
          overflow: hidden;
          border-radius: 10px;
          background: #111;
        }

        .video-frame-wrap iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }

        @media (max-width: 1080px) {
          .desktop-nav {
            display: none;
          }

          .site-header {
            grid-template-columns: 1fr auto;
          }

          .service-grid,
          .portfolio-scroller {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .trust-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .site-header {
            padding: 16px;
          }

          .brand-main {
            font-size: 20px;
          }

          .brand-sub {
            display: none;
          }

          .header-booking-button {
            min-height: 40px;
            padding: 0 14px;
            font-size: 12px;
          }

          .hero-section,
          .hero-content-wrap {
            min-height: 680px;
          }

          .hero-background {
            background-position: 64% center;
          }

          .hero-shade {
            background:
              linear-gradient(90deg, rgba(0, 0, 0, 0.91) 0%, rgba(0, 0, 0, 0.66) 68%, rgba(0, 0, 0, 0.3) 100%),
              linear-gradient(0deg, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.12) 58%, rgba(0, 0, 0, 0.3) 100%);
          }

          .hero-content-wrap {
            padding: 126px 20px 58px;
            align-items: flex-end;
          }

          .hero-content h1 {
            font-size: 40px;
            line-height: 1.18;
          }

          .hero-title-line {
            white-space: normal;
          }

          .hero-description {
            margin-top: 20px;
            font-size: 16px;
          }

          .hero-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .primary-action,
          .secondary-action {
            min-width: 0;
            min-height: 50px;
            padding: 0 12px;
            font-size: 14px;
          }

          .trust-grid {
            grid-template-columns: 1fr 1fr;
            padding: 20px 14px;
          }

          .trust-item {
            justify-content: flex-start;
            padding: 8px;
          }

          .section-block {
            padding: 64px 16px;
          }

          .section-heading {
            margin-bottom: 26px;
          }

          .section-heading h2 {
            font-size: 32px;
          }

          .service-grid,
          .faq-grid,
          .footer-grid {
            grid-template-columns: 1fr;
          }

          .portfolio-section {
            padding-left: 16px;
            padding-right: 16px;
          }

          .portfolio-scroller {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .portfolio-toggle-button {
            width: 100%;
          }

          .booking-cta-section {
            flex-direction: column;
            align-items: stretch;
            padding: 28px 16px;
          }

          .booking-cta-section h2 {
            font-size: 24px;
          }

          .cta-booking-button {
            width: 100%;
          }

          .site-footer {
            padding: 40px 16px 26px;
          }

          .footer-grid {
            gap: 28px;
          }

          .footer-bottom {
            flex-direction: column;
          }

          .video-modal {
            padding: 16px;
          }

          .video-close-button {
            top: -46px;
          }
        }

        @media (max-width: 390px) {
          .hero-content h1 {
            font-size: 35px;
          }

          .hero-actions {
            grid-template-columns: 1fr;
          }

          .trust-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}