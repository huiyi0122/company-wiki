import rateLimit from "express-rate-limit";

export function getRateLimiter(role: string) {
  let maxRequests = 5;
  if (role === "admin") maxRequests = 20;
  if (role === "editor") maxRequests = 10;

  return rateLimit({
    windowMs: 10 * 1000,
    max: maxRequests,
    message: {
      success: false,
      error: "Too many requests, please slow down.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
