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
  title: "무명필름 | 서울대학교 촬영 및 라이브 송출 - MMLIVE",
  description:
    "무명필름이 운영하는 학술행사 촬영 및 라이브 송출 서비스 MMLIVE",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  verification: {
    naver: "739ff47c8df6b7c7b4ff37a31705b098c4f3fe94",
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
      <body
        style={{ WebkitTextSizeAdjust: "100%" }}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}