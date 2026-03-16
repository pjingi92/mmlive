export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = String(body?.password || "").trim();

    const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();

    if (!adminPassword) {
      return Response.json(
        {
          success: false,
          message: "ADMIN_PASSWORD가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return Response.json(
        {
          success: false,
          message: "비밀번호가 올바르지 않습니다.",
        },
        { status: 401 }
      );
    }

    const response = Response.json({
      success: true,
    });

    response.headers.append(
      "Set-Cookie",
      "admin_auth=authenticated; Path=/; SameSite=Lax; Max-Age=86400"
    );

    return response;
  } catch (error: any) {
    console.error("[POST /api/admin/login] 오류:", error);
    console.error("[POST /api/admin/login] 메시지:", error?.message);

    return Response.json(
      {
        success: false,
        message: error?.message || "관리자 로그인 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}