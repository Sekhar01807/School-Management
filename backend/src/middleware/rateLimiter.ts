import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Lightweight in-memory rate limiter for sensitive endpoints (e.g., login).
 * Default: 10 requests per 15 minutes per IP.
 */
export const createRateLimiter = (maxRequests = 10, windowMs = 15 * 60 * 1000) => {
  const ipStore = new Map<string, RateLimitRecord>();

  // Periodically clean up expired records
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const now = Date.now();
    const record = ipStore.get(ip);

    if (!record || now > record.resetTime) {
      ipStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        message: `Too many attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      });
    }

    record.count += 1;
    next();
  };
};

export const loginRateLimiter = createRateLimiter(10, 15 * 60 * 1000); // 10 attempts per 15 mins
