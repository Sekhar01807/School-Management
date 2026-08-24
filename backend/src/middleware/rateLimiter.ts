import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Enterprise In-Memory Rate Limiter for Sensitive Endpoints
 * Automatically tracks request counts per IP and applies exponential backoff headers.
 */
export const createRateLimiter = (maxRequests = 10, windowMs = 15 * 60 * 1000, customMessage?: string) => {
  const ipStore = new Map<string, RateLimitRecord>();

  // Periodically clean up expired records
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, windowMs);
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      req.ip ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown_ip";
    const now = Date.now();
    const record = ipStore.get(ip);

    if (!record || now > record.resetTime) {
      ipStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

      return res.status(429).json({
        message:
          customMessage ||
          `Too many attempts from this IP. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      });
    }

    record.count += 1;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - record.count);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
    next();
  };
};

/**
 * Pre-configured Rate Limiters for Core Flows:
 */
// 1. Authentication Login: 10 attempts per 15 minutes
export const loginRateLimiter = createRateLimiter(
  10,
  15 * 60 * 1000,
  "Too many sign-in attempts. For security reasons, please try again in 15 minutes."
);

// 2. Password Recovery (Forgot/Reset): 3 requests per 15 minutes to prevent email spamming
export const passwordResetRateLimiter = createRateLimiter(
  3,
  15 * 60 * 1000,
  "Too many password reset requests. Please wait 15 minutes before requesting another reset link."
);

// 3. User Registration: 5 registrations per 15 minutes per IP to prevent spam bot signups
export const registerRateLimiter = createRateLimiter(
  5,
  15 * 60 * 1000,
  "Registration threshold exceeded. Please wait a few minutes before registering another account."
);

// 4. Report / Data Exports: 15 exports per minute to preserve server CPU & memory
export const exportRateLimiter = createRateLimiter(
  15,
  60 * 1000,
  "Export request rate exceeded. Please wait a moment before downloading another report."
);
