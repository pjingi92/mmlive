import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "촬영 및 라이브 송출 | 무명필름 MMLIVE",
  description:
    "세미나 포럼 학회 강연 촬영과 유튜브 줌 라이브 송출 전문 서비스. PIP 디자인과 행사 인트로 제작까지 무명필름 MMLIVE에서 제공합니다.",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" style={{ WebkitTouchCallout: "none" }}>
      <head>
        <meta
          name="naver-site-verification"
          content="739ff47c8df6b7c7b4ff37a31705b098c4f3fe94"
        />
      </head>
      <body
        style={{ WebkitTextSizeAdjust: "100%" }}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}