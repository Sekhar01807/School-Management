/**
 * Dynamic URL and Link Resolution Utility
 * 
 * Prevents hardcoded localhost/domain issues across development, staging,
 * and production environments. Dynamically resolves trusted base URLs
 * using environment variables (APP_URL, CLIENT_URL) or request headers
 * (x-forwarded-proto, host).
 */

import { type Request } from "express";

/**
 * Resolves the primary client application base URL.
 * Priority:
 * 1. process.env.APP_URL (Explicit override)
 * 2. process.env.CLIENT_URL (Configured frontend origin, picks first if comma-separated)
 * 3. Request origin / referer / x-forwarded headers (if trusted)
 * 4. Fallback to http://localhost:5173
 */
export function getAppUrl(req?: Request): string {
  // 1. Explicit APP_URL override
  if (process.env.APP_URL && process.env.APP_URL.trim().length > 0) {
    return process.env.APP_URL.trim().replace(/\/$/, "");
  }

  // 2. Configured CLIENT_URL list
  if (process.env.CLIENT_URL && process.env.CLIENT_URL.trim().length > 0) {
    const origins = process.env.CLIENT_URL.split(",")
      .map((o) => o.trim().replace(/\/$/, ""))
      .filter(Boolean);
    if (origins.length > 0) {
      // If request has origin that matches one of the allowed origins, prefer it
      if (req) {
        const clientOrigin = (req.headers.origin as string || req.headers.referer as string || "").replace(/\/$/, "");
        const matched = origins.find((allowed) => clientOrigin.startsWith(allowed));
        if (matched) return matched;
      }
      return origins[0];
    }
  }

  // 3. Dynamic header detection if req is provided
  if (req) {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // 4. Default local development origin
  return "http://localhost:5173";
}

/**
 * Builds an absolute deep link URL for action buttons inside emails.
 * e.g., getActionUrl("/reset-password?token=xyz", req)
 */
export function getActionUrl(path: string, req?: Request): string {
  const baseUrl = getAppUrl(req);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
