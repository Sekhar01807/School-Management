import type { Request, Response, NextFunction } from "express";

/**
 * Recursively cleans prohibited keys starting with '$' or containing '.' in-place.
 * This prevents NoSQL injection attacks while being 100% compatible with Express 5.x getter properties.
 */
export function sanitizeInPlace(obj: any): any {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (obj[i] && typeof obj[i] === "object") {
        sanitizeInPlace(obj[i]);
      }
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    // Prohibit keys starting with $ (MongoDB operators) or containing . (MongoDB dot-notation paths)
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else if (obj[key] && typeof obj[key] === "object") {
      sanitizeInPlace(obj[key]);
    }
  }

  return obj;
}

export function sanitizeObject(obj: any): any {
  return sanitizeInPlace(obj);
}

/**
 * Express 5.x compatible middleware to sanitize `req.body`, `req.query`, and `req.params`.
 */
export const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    sanitizeInPlace(req.body);
  }

  if (req.query && typeof req.query === "object") {
    sanitizeInPlace(req.query);
  }

  if (req.params && typeof req.params === "object") {
    sanitizeInPlace(req.params);
  }

  next();
};
