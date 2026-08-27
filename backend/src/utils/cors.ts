/**
 * Enterprise Strict CORS Whitelist Utility
 * 
 * Enforces strict origin matching against configured CLIENT_URL values.
 * Explicitly rejects wildcard/subdomain matching (*.vercel.app) to prevent
 * unauthorized cross-origin credentialed requests.
 */

export const getAllowedOrigins = (clientUrlConfig?: string): string[] => {
  const rawOrigins =
    clientUrlConfig !== undefined
      ? clientUrlConfig
      : process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000";
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
};

export const isOriginAllowed = (
  origin?: string,
  clientUrlOverride?: string,
  nodeEnvOverride?: string
): boolean => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, healthchecks)
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, "");
  const allowedOrigins = getAllowedOrigins(clientUrlOverride);

  // Strict whitelist match against configured client origins
  if (allowedOrigins.includes(normalized)) {
    return true;
  }

  // In development/test mode, allow loopback addresses
  const currentEnv =
    nodeEnvOverride !== undefined ? nodeEnvOverride : process.env.NODE_ENV;
  if (
    currentEnv !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)
  ) {
    return true;
  }

  return false;
};
