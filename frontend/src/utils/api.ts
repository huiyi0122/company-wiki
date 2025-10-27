import { API_BASE_URL } from "../components/CommonTypes";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  // 附带 Authorization 头
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  let res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && refreshToken) {
    console.warn("Access token expired, trying refresh...");

    // 调用 refresh-token
    const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      console.error("Refresh failed Log out.");
      logoutAndRedirect();
      return res;
    }

    const refreshData = await refreshRes.json();
    if (!refreshData.success || !refreshData.data) {
      console.error("Invalid refresh response:", refreshData);
      logoutAndRedirect();
      return res;
    }

    const { accessToken: newAccess, refreshToken: newRefresh } = refreshData.data;
    if (!newAccess) {
      console.error("Missing new access token");
      logoutAndRedirect();
      return res;
    }

    localStorage.setItem("accessToken", newAccess);
    if (newRefresh) localStorage.setItem("refreshToken", newRefresh);

    // 重试原请求
    const retryHeaders = {
      ...headers,
      Authorization: `Bearer ${newAccess}`,
    };

    res = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: retryHeaders,
    });
  }

  return res;
}

function logoutAndRedirect() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
}