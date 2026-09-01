import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves avatar URLs in both monolithic and distributed deployment environments.
 * - Leaves absolute URLs (http://, https://, data:) untouched.
 * - Prepends the backend server host to relative upload paths (/uploads/...).
 */
export function getAvatarUrl(avatar?: string): string {
  if (!avatar || typeof avatar !== "string" || !avatar.trim()) return "";
  const trimmed = avatar.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000/api";
  const backendHost = apiBase.replace(/\/api\/?$/, "");
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${backendHost}${cleanPath}`;
}
