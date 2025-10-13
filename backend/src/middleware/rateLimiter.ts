import rateLimit from "express-rate-limit";

// 根据角色生成 limiter
export function getRateLimiter(role: string) {
  let maxRequests = 5; // 默认普通用户
  if (role === "admin") maxRequests = 20;
  if (role === "manager") maxRequests = 10;

  return rateLimit({
    windowMs: 10 * 1000, // 10秒窗口
    max: maxRequests,
    message: {
      success: false,
      error: "Too many requests, please slow down.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
