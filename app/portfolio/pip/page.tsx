"use client";

import { useState } from "react";

export default function PipPortfolioPage() {

  const images = [
    "/portfolio/pip-1.png",
    "/portfolio/pip-2.png",
    "/portfolio/pip-3.png",
    "/portfolio/pip-4.png",
    "/portfolio/pip-5.png",
    "/portfolio/pip-6.png",
  ];

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f3",
        padding: "80px 24px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <a href="/portfolio" style={{ color: "#666", textDecoration: "none" }}>
          ← 포트폴리오로
        </a>

        <h1 style={{ fontSize: 48, marginTop: 20 }}>
          PIP 디자인 포트폴리오
        </h1>

        <p style={{ color: "#555", marginBottom: 40 }}>
          발표자료와 강연자 화면을 함께 구성하는 PIP 디자인 시안입니다.
        </p>

        {/* 이미지 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(350px,1fr))",
            gap: 20,
          }}
        >
          {images.map((src) => (
            <img
              key={src}
              src={src}
              onClick={() => setSelectedImage(src)}
              style={{
                width: "100%",
                borderRadius: 14,
                cursor: "pointer",
                border: "1px solid #ddd",
              }}
            />
          ))}
        </div>
      </div>

      {/* 확대 이미지 */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <img
            src={selectedImage}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 10,
            }}
          />
        </div>
      )}
    </main>
  );
}