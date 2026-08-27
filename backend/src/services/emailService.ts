/**
 * Transactional Email Notification Service for SchoolSync
 * 
 * Re-exports the unified EmailService implementation from utils/emailService.ts
 * ensuring seamless backward compatibility across all controllers and services.
 */

export {
  EmailService,
  default,
  type EmailPayload,
  type EmailResult,
  type EmailProviderStatus,
} from "../utils/emailService.ts";
