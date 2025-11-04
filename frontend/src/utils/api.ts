import { API_BASE_URL } from "../components/CommonTypes";

// 用于防止并发刷新token
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// 当token刷新完成后，通知所有等待的请求
function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// 添加等待刷新完成的订阅者
function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  let res = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

  if (res.status === 401 && refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await refreshRes.json();
        if (!refreshRes.ok) {
          logoutAndRedirect();
          isRefreshing = false;
          return res;
        }

        const newAccess = refreshData.accessToken || refreshData?.data?.accessToken;
        const newRefresh = refreshData.refreshToken || refreshData?.data?.refreshToken;

        if (!newAccess) {
          logoutAndRedirect();
          isRefreshing = false;
          return res;
        }

        localStorage.setItem("accessToken", newAccess);
        if (newRefresh) localStorage.setItem("refreshToken", newRefresh);

        isRefreshing = false;
        onRefreshed(newAccess);
        return retryRequest(url, options, newAccess);
      } catch (err) {
        isRefreshing = false;
        logoutAndRedirect();
        return res;
      }
    } else {
      return new Promise<Response>((resolve) => {
        addRefreshSubscriber(async (newToken: string) => {
          const retryRes = await retryRequest(url, options, newToken);
          resolve(retryRes);
        });
      });
    }
  }

  return res;
}


// 用新token重试请求
async function retryRequest(
  url: string,
  options: RequestInit,
  newToken: string
) {
  const retryHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Bearer ${newToken}`,
  };

  console.log(`🔄 Retrying request: ${url}`);

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: retryHeaders,
  });
}

function logoutAndRedirect() {
  console.log("🚪 Logging out and redirecting to login page...");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  
  // 避免在已经在login页面时重复跳转
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}