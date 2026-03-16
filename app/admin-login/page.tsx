"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "로그인에 실패했습니다.");
      }

      router.push("/admin");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f3",
        padding: 20,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: "#111",
          }}
        >
          관리자 로그인
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#666",
            marginBottom: 20,
            lineHeight: 1.7,
          }}
        >
          무명필름 예약 관리자 페이지 접근용 비밀번호를 입력해주세요.
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="관리자 비밀번호"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 15,
                boxSizing: "border-box",
              }}
            />
          </div>

          {errorMessage ? (
            <div
              style={{
                marginBottom: 12,
                color: "#d93025",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              background: "#111",
              color: "#fff",
              padding: "14px 16px",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}