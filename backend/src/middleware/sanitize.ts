import type { Request, Response, NextFunction } from "express";

/**
 * Recursively removes any keys that start with '$' or contain '.' from an object.
 * This prevents NoSQL injection attacks where attackers pass objects like {"$gt": ""} or {"$where": "..."} in query/body.
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(obj)) {
    // Prohibit keys starting with $ (MongoDB operators) or containing . (MongoDB dot-notation paths)
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Express middleware to sanitize `req.body`, `req.query`, and `req.params`.
 */
export const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }

  next();
};
