export async function POST() {
  const response = Response.json({
    success: true,
  });

  response.headers.append(
    "Set-Cookie",
    "admin_auth=; Path=/; SameSite=Lax; Max-Age=0"
  );

  return response;
}