import { API_BASE_URL } from "./CommonTypes";

export async function fetchWithAuth(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: "include", // ✅ 必须带 cookie
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401) {
    try {
      console.log("🔁 Access token expired, trying refresh...");

      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!refreshRes.ok) throw new Error("Failed to refresh token");

      // ✅ cookie 自动更新，无需 localStorage
      const retryResponse = await fetch(input, {
        ...init,
        credentials: "include",
        headers: {
          ...(init?.headers || {}),
          "Content-Type": "application/json",
        },
      });

      return retryResponse;
    } catch (err) {
      console.error("❌ Token refresh failed:", err);
      window.location.href = "/login"; // 强制登出
      throw err;
    }
  }

  return response;
}
