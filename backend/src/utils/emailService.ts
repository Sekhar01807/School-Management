/**
 * Centralized Real-Time Email Notification Engine
 * 
 * Architecture:
 * 1. Multi-Tier Fallback Dispatch Pipeline:
 *    - Tier 1: Real-Time Cloud API (Resend REST API)
 *    - Tier 2: Real-Time Gmail SMTP (Google App Password)
 *    - Tier 3: Development / Sandbox SMTP (Mailtrap / Custom SMTP)
 *    - Tier 4: Safe Development Simulator (Zero-crash offline fallback)
 * 2. Responsive, Premium HTML Email Templates with role-tailored cards
 * 3. Dynamic URL and link resolution via appUrl helper
 */

import { logger } from "./logger.ts";
import { getAppUrl, getActionUrl } from "./appUrl.ts";
import { type Request } from "express";

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: "resend" | "gmail-smtp" | "mailtrap-smtp" | "simulator";
  error?: string;
}

export interface EmailProviderStatus {
  primary: {
    provider: string;
    configured: boolean;
    activeKeyMasked: string | null;
  };
  fallbacks: {
    gmail: boolean;
    mailtrapOrSmtp: boolean;
    simulator: boolean;
  };
  defaultSender: string;
  resendSender: string;
}

export class EmailService {
  private static gmailTransporterInstance: any = null;
  private static mailtrapTransporterInstance: any = null;

  /**
   * Resolves default sender identity for SMTP
   */
  public static getFromAddress(): string {
    return (
      process.env.FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      '"SchoolSync Academic Operations" <notifications@schoolsync.com>'
    );
  }

  /**
   * Resolves sender identity specifically for Resend API.
   * On Resend, test domains require 'onboarding@resend.dev' or a verified custom domain.
   */
  public static getResendFromAddress(): string {
    if (process.env.RESEND_FROM && process.env.RESEND_FROM.trim().length > 0) {
      return process.env.RESEND_FROM.trim();
    }
    const envFrom = process.env.FROM_EMAIL || process.env.EMAIL_FROM;
    if (envFrom && (envFrom.includes("@resend.dev") || !envFrom.includes("@gmail.com"))) {
      return envFrom;
    }
    return "SchoolSync <onboarding@resend.dev>";
  }

  /**
   * Returns current status and health of all email providers
   */
  public static getStatus(): EmailProviderStatus {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const hasGmail = Boolean(
      (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS) &&
      (process.env.FROM_EMAIL || process.env.SMTP_USER)
    );
    const hasMailtrap = Boolean(
      (process.env.EMAIL_USER && process.env.EMAIL_PASS) ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    );

    return {
      primary: {
        provider: resendKey ? "Resend REST Cloud API" : hasGmail ? "Gmail SMTP" : "Development Simulator",
        configured: Boolean(resendKey),
        activeKeyMasked: resendKey
          ? `${resendKey.slice(0, 7)}...${resendKey.slice(-4)}`
          : null,
      },
      fallbacks: {
        gmail: hasGmail,
        mailtrapOrSmtp: hasMailtrap,
        simulator: true,
      },
      defaultSender: this.getFromAddress(),
      resendSender: this.getResendFromAddress(),
    };
  }

  /**
   * Initializes or retrieves cached Nodemailer Gmail transporter
   */
  private static async getGmailTransporter(): Promise<any> {
    if (this.gmailTransporterInstance) {
      return this.gmailTransporterInstance;
    }

    const user = process.env.SMTP_USER || process.env.FROM_EMAIL;
    const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

    if (!user || !pass) return null;

    try {
      const nodemailer = await import("nodemailer" as any).catch(() => null);
      if (!nodemailer) return null;
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      this.gmailTransporterInstance = createTransport({
        service: "gmail",
        auth: { user, pass },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 10000,
      });
      return this.gmailTransporterInstance;
    } catch (err: any) {
      logger.warn(`Could not initialize Gmail SMTP transporter: ${err.message}`, "EMAIL");
      return null;
    }
  }

  /**
   * Initializes or retrieves cached Nodemailer Mailtrap/Standard SMTP transporter
   */
  private static async getMailtrapTransporter(): Promise<any> {
    if (this.mailtrapTransporterInstance) {
      return this.mailtrapTransporterInstance;
    }

    const host = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
    const port = parseInt(process.env.SMTP_PORT || "2525", 10);
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!user || !pass) return null;

    try {
      const nodemailer = await import("nodemailer" as any).catch(() => null);
      if (!nodemailer) return null;
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      this.mailtrapTransporterInstance = createTransport({
        host,
        port,
        auth: { user, pass },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 10000,
      });
      return this.mailtrapTransporterInstance;
    } catch (err: any) {
      logger.warn(`Could not initialize Mailtrap/SMTP transporter: ${err.message}`, "EMAIL");
      return null;
    }
  }

  /**
   * TIER 1: Send via Resend Cloud REST API
   */
  public static async sendViaResend(
    recipients: string[],
    payload: EmailPayload
  ): Promise<EmailResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const fromAddress = this.getResendFromAddress();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    });

    if (response.ok) {
      const data: any = await response.json();
      logger.success(
        `Email delivered via Resend REST API (Message ID: ${data.id}) to ${recipients.join(", ")}`,
        "EMAIL"
      );
      return {
        success: true,
        messageId: data.id,
        provider: "resend",
      };
    }

    const errorBody = await response.text();
    throw new Error(`Resend HTTP ${response.status}: ${errorBody}`);
  }

  /**
   * TIER 2: Send via Gmail SMTP Transporter (Google App Password)
   */
  public static async sendViaGmail(
    recipients: string[],
    payload: EmailPayload
  ): Promise<EmailResult> {
    const transporter = await this.getGmailTransporter();
    if (!transporter) {
      throw new Error("Gmail SMTP credentials (GMAIL_APP_PASSWORD / SMTP_USER) not configured.");
    }

    const info = await transporter.sendMail({
      from: this.getFromAddress(),
      to: recipients.join(", "),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
    });

    logger.success(
      `Email delivered via Gmail SMTP (Message ID: ${info.messageId}) to ${recipients.join(", ")}`,
      "EMAIL"
    );
    return {
      success: true,
      messageId: info.messageId,
      provider: "gmail-smtp",
    };
  }

  /**
   * TIER 3: Send via Mailtrap / Custom SMTP Sandbox
   */
  public static async sendViaMailtrap(
    recipients: string[],
    payload: EmailPayload
  ): Promise<EmailResult> {
    const transporter = await this.getMailtrapTransporter();
    if (!transporter) {
      throw new Error("Mailtrap / Custom SMTP credentials (EMAIL_USER / EMAIL_PASS) not configured.");
    }

    const info = await transporter.sendMail({
      from: this.getFromAddress(),
      to: recipients.join(", "),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
    });

    logger.success(
      `Email captured via Mailtrap/SMTP Sandbox (Message ID: ${info.messageId}) to ${recipients.join(", ")}`,
      "EMAIL"
    );
    return {
      success: true,
      messageId: info.messageId,
      provider: "mailtrap-smtp",
    };
  }

  /**
   * TIER 4: Safe Development Sandbox Simulator (Guarantees zero-failure in offline/test envs)
   */
  public static sendViaSimulator(
    recipients: string[],
    payload: EmailPayload
  ): EmailResult {
    const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    logger.info(
      `[SIMULATOR DELIVERY] To: ${recipients.join(", ")} | Subject: "${payload.subject}" | ID: ${simId}`,
      "EMAIL"
    );
    return {
      success: true,
      messageId: simId,
      provider: "simulator",
    };
  }

  /**
   * CENTRAL DISPATCH PIPELINE with Multi-Tier Fallback Mechanism:
   * Resend API -> Gmail SMTP -> Mailtrap Sandbox -> Development Simulator
   */
  public static async dispatchEmail(payload: EmailPayload): Promise<EmailResult> {
    const recipients = Array.isArray(payload.to)
      ? payload.to.map((e) => e?.trim()).filter(Boolean)
      : [payload.to?.trim()].filter(Boolean);

    if (recipients.length === 0) {
      return { success: false, error: "No recipient email addresses provided." };
    }

    const errors: string[] = [];

    // Stage 1: Try Primary Provider — Resend REST API
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0) {
      try {
        return await this.sendViaResend(recipients, payload);
      } catch (err: any) {
        const errorMsg = `Tier 1 (Resend) failed: ${err.message}`;
        logger.warn(errorMsg, "EMAIL_FALLBACK");
        errors.push(errorMsg);
      }
    }

    // Stage 2: Fallback to Secondary Provider — Gmail SMTP
    if (
      (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS) &&
      (process.env.SMTP_USER || process.env.FROM_EMAIL)
    ) {
      try {
        return await this.sendViaGmail(recipients, payload);
      } catch (err: any) {
        const errorMsg = `Tier 2 (Gmail SMTP) failed: ${err.message}`;
        logger.warn(errorMsg, "EMAIL_FALLBACK");
        errors.push(errorMsg);
      }
    }

    // Stage 3: Fallback to Tertiary Provider — Mailtrap Sandbox / Custom SMTP
    if (
      (process.env.EMAIL_USER && process.env.EMAIL_PASS) ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    ) {
      try {
        return await this.sendViaMailtrap(recipients, payload);
      } catch (err: any) {
        const errorMsg = `Tier 3 (Mailtrap/SMTP) failed: ${err.message}`;
        logger.warn(errorMsg, "EMAIL_FALLBACK");
        errors.push(errorMsg);
      }
    }

    // Stage 4: Quaternary Provider — Development Sandbox Simulator
    logger.info(
      `Falling back to Tier 4 (Simulator). Prior errors: [${errors.join(" | ") || "None configured"}]`,
      "EMAIL_FALLBACK"
    );
    return this.sendViaSimulator(recipients, payload);
  }

  /**
   * Backward-compatible alias for dispatchEmail
   */
  public static async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    return this.dispatchEmail(payload);
  }

  /**
   * Diagnostic verification during server boot
   */
  public static async verifyConnection(): Promise<boolean> {
    const status = this.getStatus();

    if (status.primary.configured) {
      logger.success(
        `Primary Email Engine Active: Resend REST API (Key: ${status.primary.activeKeyMasked})`,
        "EMAIL"
      );
      return true;
    }

    const gmailTransporter = await this.getGmailTransporter();
    if (gmailTransporter) {
      try {
        await gmailTransporter.verify();
        logger.success("Gmail SMTP Live Transport verified successfully.", "EMAIL");
        return true;
      } catch (err: any) {
        logger.warn(`Gmail SMTP connection check failed: ${err.message}`, "EMAIL");
      }
    }

    logger.info("Running in Simulator Mode. Outbound emails will be simulated safely.", "EMAIL");
    return false;
  }

  // ==========================================
  // Premium HTML Email Template Engine
  // ==========================================

  /**
   * Wraps email body in a responsive, modern HTML layout
   */
  public static wrapTemplate(title: string, bodyContent: string, actionLabel?: string, actionUrl?: string): string {
    const currentYear = new Date().getFullYear();
    const ctaButton = actionLabel && actionUrl ? `
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${actionUrl}" class="btn" target="_blank" rel="noopener noreferrer">
          ${actionLabel} &rarr;
        </a>
      </div>
    ` : "";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      margin: 0;
      padding: 32px 12px;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
    }
    .header {
      background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #3B82F6 100%);
      padding: 36px 28px;
      text-align: center;
      color: #FFFFFF;
    }
    .header-logo {
      display: inline-block;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #FFFFFF;
      text-decoration: none;
    }
    .header-logo span {
      color: #93C5FD;
    }
    .header-subtitle {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: #DBEAFE;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .content {
      padding: 36px 32px;
      font-size: 15px;
      line-height: 1.7;
      color: #334155;
    }
    .card {
      background: #F8FAFC;
      border-radius: 14px;
      padding: 22px;
      margin: 24px 0;
      border: 1px solid #E2E8F0;
    }
    .card-urgent {
      background: #FEF2F2;
      border-left: 5px solid #EF4444;
      border-top: 1px solid #FEE2E2;
      border-right: 1px solid #FEE2E2;
      border-bottom: 1px solid #FEE2E2;
    }
    .card-warning {
      background: #FFFBEB;
      border-left: 5px solid #F59E0B;
      border-top: 1px solid #FEF3C7;
      border-right: 1px solid #FEF3C7;
      border-bottom: 1px solid #FEF3C7;
    }
    .card-info {
      background: #EFF6FF;
      border-left: 5px solid #3B82F6;
      border-top: 1px solid #DBEAFE;
      border-right: 1px solid #DBEAFE;
      border-bottom: 1px solid #DBEAFE;
    }
    .card-success {
      background: #F0FDF4;
      border-left: 5px solid #10B981;
      border-top: 1px solid #DCFCE7;
      border-right: 1px solid #DCFCE7;
      border-bottom: 1px solid #DCFCE7;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .badge-urgent { background: #FEE2E2; color: #B91C1C; }
    .badge-warning { background: #FEF3C7; color: #B45309; }
    .badge-info { background: #DBEAFE; color: #1D4ED8; }
    .badge-success { background: #DCFCE7; color: #15803D; }
    .badge-role { background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.02em;
      box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      margin: 8px 0;
    }
    .data-table td {
      padding: 6px 0;
      vertical-align: top;
    }
    .data-table .label {
      color: #64748B;
      width: 130px;
      font-weight: 500;
    }
    .data-table .value {
      color: #0F172A;
      font-weight: 600;
    }
    .footer {
      background: #F8FAFC;
      padding: 28px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      line-height: 1.6;
    }
    .footer a {
      color: #2563EB;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">School<span>Sync</span></div>
      <div class="header-subtitle">Academic Operations & Campus Portal</div>
    </div>
    <div class="content">
      ${bodyContent}
      ${ctaButton}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">SchoolSync Academic Intelligence Operations</p>
      <p style="margin: 0 0 6px 0;">This automated message was securely dispatched by SchoolSync real-time notification engine.</p>
      <p style="margin: 0;">&copy; ${currentYear} SchoolSync Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // ==========================================
  // 1. Welcome & Onboarding Transactional Email
  // ==========================================
  public static async sendWelcomeEmail(
    to: string,
    userName: string,
    role: string,
    reqOrPortalUrl?: Request | string,
    portalUrl?: string
  ): Promise<EmailResult> {
    let req: Request | undefined;
    let explicitUrl = portalUrl;

    if (typeof reqOrPortalUrl === "string") {
      explicitUrl = reqOrPortalUrl;
    } else if (reqOrPortalUrl) {
      req = reqOrPortalUrl;
    }

    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
    const loginUrl = explicitUrl || getActionUrl("/login", req);

    const roleFeatures: Record<string, string[]> = {
      student: [
        "View and track your weekly class timetable and lecture schedules",
        "Take online examinations with instant AI performance feedback",
        "Monitor attendance health metrics and download term report cards",
      ],
      teacher: [
        "Generate conflict-free weekly timetables using AI constraint solver",
        "Create, publish, and AI-grade quizzes and formal examinations",
        "Record daily attendance and broadcast targeted class circulars",
      ],
      parent: [
        "Receive instantaneous real-time student absence notifications",
        "Review comprehensive academic grades and term examination results",
        "Access school-wide circulars and update emergency contact records",
      ],
      admin: [
        "Oversee academic years, classes, subject curricula, and timetable engines",
        "Manage institutional directories with strict role boundary isolation",
        "Access campus-wide audit trails, attendance analytics, and PDF exports",
      ],
    };

    const featuresList = (roleFeatures[role.toLowerCase()] || roleFeatures.student)
      .map((feat) => `<li style="margin-bottom: 10px; color: #334155;">${feat}</li>`)
      .join("");

    const html = this.wrapTemplate(
      `Welcome to SchoolSync, ${userName}!`,
      `
      <div style="margin-bottom: 14px;">
        <span class="badge badge-success">Account Activated</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
        Welcome aboard, ${userName}!
      </h2>
      <p>Your <strong>${formattedRole}</strong> account has been successfully initialized in the SchoolSync Academic Portal.</p>
      
      <div class="card card-info">
        <div style="font-size: 12px; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
          Account Profile Credentials
        </div>
        <table class="data-table">
          <tr>
            <td class="label">Full Name:</td>
            <td class="value">${userName}</td>
          </tr>
          <tr>
            <td class="label">Login Email:</td>
            <td class="value">${to}</td>
          </tr>
          <tr>
            <td class="label">Access Role:</td>
            <td><span class="badge badge-role">${formattedRole}</span></td>
          </tr>
        </table>
      </div>

      <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 24px 0 12px 0;">
        Key features enabled for your account:
      </h3>
      <ul style="padding-left: 20px; font-size: 14px; line-height: 1.7; margin: 0 0 20px 0;">
        ${featuresList}
      </ul>
      `,
      "Sign In to Your Portal",
      loginUrl
    );

    return this.dispatchEmail({
      to,
      subject: `Welcome to SchoolSync — Your ${formattedRole} Account is Ready!`,
      html,
      text: `Hello ${userName},\n\nWelcome to SchoolSync! Your ${formattedRole} account (${to}) has been created.\n\nSign in to get started: ${loginUrl}`,
    });
  }

  // ==========================================
  // 2. Password Reset Request Email
  // ==========================================
  public static async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    userName: string
  ): Promise<EmailResult> {
    const html = this.wrapTemplate(
      "Password Reset Request",
      `
      <div style="margin-bottom: 14px;">
        <span class="badge badge-urgent">Security Alert</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
        Password Reset Request
      </h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We received an authenticated request to reset the password for your SchoolSync account.</p>
      
      <div class="card card-urgent">
        <p style="margin: 0; font-weight: 700; color: #991B1B; font-size: 14px;">
          Time-Sensitive Security Link
        </p>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #7F1D1D;">
          This secure link is cryptographically signed and will automatically expire in <strong>15 minutes</strong>.
        </p>
      </div>

      <p style="font-size: 13px; color: #64748B; word-break: break-all; margin-top: 20px;">
        If you have trouble with the button, copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color: #2563EB;">${resetUrl}</a>
      </p>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 24px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
        If you did not request this password reset, please disregard this email. Your credentials remain safe.
      </p>
      `,
      "Reset My Password",
      resetUrl
    );

    return this.dispatchEmail({
      to,
      subject: "SchoolSync — Password Reset Request",
      html,
      text: `Hello ${userName},\n\nReset your SchoolSync password using this link (valid for 15 mins):\n${resetUrl}`,
    });
  }

  // ==========================================
  // 3. Attendance Absence Notification
  // ==========================================
  public static async sendAbsentAttendanceAlert(
    recipients: string[],
    studentName: string,
    className: string,
    date: Date | string,
    req?: Request
  ): Promise<EmailResult> {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const attendanceUrl = getActionUrl("/attendance", req);

    const html = this.wrapTemplate(
      "Student Absence Notice",
      `
      <div style="margin-bottom: 14px;">
        <span class="badge badge-urgent">Attendance Notice</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
        Student Absence Recorded
      </h2>
      <p>This is an automated attendance notice informing you that <strong>${studentName}</strong> was recorded as <strong>Absent</strong> for <strong>${className}</strong> on <strong>${formattedDate}</strong>.</p>
      
      <div class="card card-urgent">
        <table class="data-table">
          <tr>
            <td class="label" style="color: #991B1B;">Student:</td>
            <td class="value" style="color: #7F1D1D;">${studentName}</td>
          </tr>
          <tr>
            <td class="label" style="color: #991B1B;">Class / Section:</td>
            <td class="value" style="color: #7F1D1D;">${className}</td>
          </tr>
          <tr>
            <td class="label" style="color: #991B1B;">Date of Record:</td>
            <td class="value" style="color: #7F1D1D;">${formattedDate}</td>
          </tr>
          <tr>
            <td class="label" style="color: #991B1B;">Status:</td>
            <td><span class="badge badge-urgent">Absent</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748B;">
        If this absence was pre-approved or you believe an entry error occurred, please contact the class instructor or the school administration.
      </p>
      `,
      "Review Attendance Portal",
      attendanceUrl
    );

    return this.dispatchEmail({
      to: recipients,
      subject: `Attendance Notice: ${studentName} recorded absent on ${formattedDate}`,
      html,
      text: `Attendance Notice: ${studentName} was recorded absent in ${className} on ${formattedDate}.\n\nView details: ${attendanceUrl}`,
    });
  }

  // ==========================================
  // 4. New Exam Published Notification
  // ==========================================
  public static async sendNewExamNotification(
    studentEmails: string[],
    examTitle: string,
    subjectName: string,
    className: string,
    dueDate: Date | string,
    duration: number,
    req?: Request
  ): Promise<EmailResult> {
    const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const examUrl = getActionUrl("/lms/exams", req);

    const html = this.wrapTemplate(
      "New Assessment Published",
      `
      <div style="margin-bottom: 14px;">
        <span class="badge badge-info">New Assessment</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
        New Examination Scheduled: ${examTitle}
      </h2>
      <p>A new academic examination has been published for your class (<strong>${className}</strong>).</p>
      
      <div class="card card-info">
        <table class="data-table">
          <tr>
            <td class="label">Assessment:</td>
            <td class="value">${examTitle}</td>
          </tr>
          <tr>
            <td class="label">Subject:</td>
            <td class="value">${subjectName}</td>
          </tr>
          <tr>
            <td class="label">Class:</td>
            <td class="value">${className}</td>
          </tr>
          <tr>
            <td class="label">Allotted Time:</td>
            <td class="value"><strong>${duration}</strong> minutes</td>
          </tr>
          <tr>
            <td class="label">Submission Due:</td>
            <td class="value" style="color: #1D4ED8;"><strong>${formattedDueDate}</strong></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748B;">
        Ensure you are in a quiet environment with a reliable internet connection before clicking "Start Exam".
      </p>
      `,
      "Open Examination Portal",
      examUrl
    );

    return this.dispatchEmail({
      to: studentEmails,
      subject: `New Exam Published: ${examTitle} (${subjectName})`,
      html,
      text: `New Exam Published: "${examTitle}" for ${subjectName} in ${className}.\nDue Date: ${formattedDueDate}\nDuration: ${duration} mins\n\nLink: ${examUrl}`,
    });
  }

  // ==========================================
  // 5. Exam Graded & Result Report Card
  // ==========================================
  public static async sendExamGradedNotification(
    studentEmail: string | string[],
    studentName: string,
    examTitle: string,
    subjectName: string,
    score: number,
    totalPoints: number,
    percentage: number,
    teacherFeedbackOrReq?: string | Request,
    req?: Request
  ): Promise<EmailResult> {
    let teacherFeedback: string | undefined;
    let actualReq: Request | undefined = req;

    if (typeof teacherFeedbackOrReq === "string") {
      teacherFeedback = teacherFeedbackOrReq;
    } else if (teacherFeedbackOrReq) {
      actualReq = teacherFeedbackOrReq;
    }

    const isPassing = percentage >= 60;
    const badgeClass = isPassing ? "badge-success" : "badge-warning";
    const cardClass = isPassing ? "card-success" : "card-warning";
    const statusText = isPassing ? "Passed" : "Needs Review";
    const reportUrl = getActionUrl("/academics/reports", actualReq);

    const feedbackSection = teacherFeedback ? `
      <div style="margin-top: 14px; padding: 12px; background: rgba(255,255,255,0.7); border-radius: 8px; font-size: 13px;">
        <strong>Teacher Feedback:</strong> ${teacherFeedback}
      </div>
    ` : "";

    const html = this.wrapTemplate(
      `Exam Results: ${examTitle}`,
      `
      <div style="margin-bottom: 14px;">
        <span class="badge ${badgeClass}">${statusText} &bull; ${percentage}%</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
        Exam Evaluation Complete
      </h2>
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>Your examination submission for <strong>${examTitle}</strong> (${subjectName}) has been evaluated.</p>
      
      <div class="card ${cardClass}">
        <table class="data-table">
          <tr>
            <td class="label">Assessment:</td>
            <td class="value">${examTitle}</td>
          </tr>
          <tr>
            <td class="label">Subject:</td>
            <td class="value">${subjectName}</td>
          </tr>
          <tr>
            <td class="label">Score Achieved:</td>
            <td class="value" style="font-size: 16px;"><strong>${score} / ${totalPoints}</strong> (${percentage}%)</td>
          </tr>
          <tr>
            <td class="label">Result Status:</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
          </tr>
        </table>
        ${feedbackSection}
      </div>

      <p style="font-size: 13px; color: #64748B;">
        You can view your itemized question breakdown and cumulative GPA on your academic report dashboard.
      </p>
      `,
      "View Detailed Performance Report",
      reportUrl
    );

    return this.dispatchEmail({
      to: studentEmail,
      subject: `Exam Result: ${examTitle} — Score: ${score}/${totalPoints} (${percentage}%)`,
      html,
      text: `Hello ${studentName},\n\nYour score for ${examTitle} (${subjectName}) is ${score}/${totalPoints} (${percentage}%).\n\nView details: ${reportUrl}`,
    });
  }

  // ==========================================
  // 6. Upcoming Exam Automated Reminder (Cron Triggered)
  // ==========================================
  public static async sendUpcomingExamReminderEmail(
    studentEmails: string[],
    examTitle: string,
    subjectName: string,
    className: string,
    dueDate: Date | string,
    daysLeft: number,
    req?: Request
  ): Promise<EmailResult> {
    const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const examUrl = getActionUrl("/lms/exams", req);

    const urgencyText = daysLeft === 0
      ? "Due Today!"
      : daysLeft === 1
      ? "Due Tomorrow!"
      : `Due in ${daysLeft} days`;

    const html = this.wrapTemplate(
      `Reminder: ${examTitle} Due Soon`,
      `
      <div style="margin-bottom: 14px;">
        <span class="badge badge-warning">${urgencyText}</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
        Upcoming Exam Reminder: ${examTitle}
      </h2>
      <p>This is a friendly reminder that you have an active assessment due shortly for <strong>${className}</strong>.</p>
      
      <div class="card card-warning">
        <table class="data-table">
          <tr>
            <td class="label">Assessment:</td>
            <td class="value">${examTitle}</td>
          </tr>
          <tr>
            <td class="label">Subject:</td>
            <td class="value">${subjectName}</td>
          </tr>
          <tr>
            <td class="label">Submission Deadline:</td>
            <td class="value" style="color: #B45309;"><strong>${formattedDueDate}</strong></td>
          </tr>
          <tr>
            <td class="label">Time Remaining:</td>
            <td class="value"><strong>${urgencyText}</strong></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748B;">
        Please complete and submit your examination before the deadline. Submissions will be automatically locked once the window closes.
      </p>
      `,
      "Take Exam Now",
      examUrl
    );

    return this.dispatchEmail({
      to: studentEmails,
      subject: `[REMINDER] ${examTitle} (${subjectName}) is ${urgencyText}`,
      html,
      text: `Reminder: ${examTitle} (${subjectName}) for ${className} is ${urgencyText}.\nDeadline: ${formattedDueDate}\n\nLink: ${examUrl}`,
    });
  }

  // ==========================================
  // 7. Low Attendance Warning Email (Cron Triggered)
  // ==========================================
  public static async sendLowAttendanceWarningEmail(
    recipients: string[],
    studentName: string,
    className: string,
    currentRate: number,
    threshold: number = 75,
    req?: Request
  ): Promise<EmailResult> {
    const attendanceUrl = getActionUrl("/attendance", req);

    const html = this.wrapTemplate(
      "Academic Attendance Warning",
      `
      <div style="margin-bottom: 14px;">
        <span class="badge badge-urgent">Attendance Health Alert</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
        Attendance Below Required Threshold
      </h2>
      <p>This is an automated alert from SchoolSync Academic Compliance to notify you that the attendance rate for <strong>${studentName}</strong> (${className}) has dropped below the required minimum.</p>
      
      <div class="card card-urgent">
        <table class="data-table">
          <tr>
            <td class="label" style="color: #991B1B;">Student:</td>
            <td class="value" style="color: #7F1D1D;">${studentName}</td>
          </tr>
          <tr>
            <td class="label" style="color: #991B1B;">Class / Section:</td>
            <td class="value" style="color: #7F1D1D;">${className}</td>
          </tr>
          <tr>
            <td class="label" style="color: #991B1B;">Current Rate:</td>
            <td class="value" style="color: #DC2626; font-size: 16px;"><strong>${currentRate}%</strong></td>
          </tr>
          <tr>
            <td class="label" style="color: #991B1B;">Policy Requirement:</td>
            <td class="value" style="color: #7F1D1D;">Minimum <strong>${threshold}%</strong></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748B;">
        Consistent classroom attendance is essential for academic standing and examination eligibility. Please review your record or connect with your academic counselor.
      </p>
      `,
      "Review Attendance Records",
      attendanceUrl
    );

    return this.dispatchEmail({
      to: recipients,
      subject: `[ATTENDANCE WARNING] ${studentName}'s attendance is currently at ${currentRate}% (Required: ${threshold}%)`,
      html,
      text: `Attendance Warning: ${studentName}'s attendance in ${className} is at ${currentRate}%, which is below the required ${threshold}% threshold.\n\nReview: ${attendanceUrl}`,
    });
  }

  // ==========================================
  // 8. Urgent Campus Announcement Email
  // ==========================================
  public static async sendUrgentAnnouncementEmail(
    recipientEmails: string[],
    announcementTitle: string,
    content: string,
    authorName: string,
    req?: Request
  ): Promise<EmailResult> {
    const noticeboardUrl = getActionUrl("/announcements", req);

    const html = this.wrapTemplate(
      "Urgent Campus Broadcast",
      `
      <div style="margin-bottom: 14px;">
        <span class="badge badge-urgent">Urgent Circular</span>
      </div>
      <h2 style="margin: 0 0 8px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
        ${announcementTitle}
      </h2>
      <p style="font-size: 13px; color: #64748B; margin: 0 0 18px 0;">
        Broadcasted by: <strong>${authorName}</strong>
      </p>
      
      <div class="card card-warning" style="font-size: 15px; color: #78350F; line-height: 1.7;">
        ${content.replace(/\n/g, "<br/>")}
      </div>
      `,
      "Open Campus Noticeboard",
      noticeboardUrl
    );

    return this.dispatchEmail({
      to: recipientEmails,
      subject: `[URGENT NOTICE] ${announcementTitle}`,
      html,
      text: `[URGENT ANNOUNCEMENT] ${announcementTitle}\nFrom: ${authorName}\n\n${content}\n\nNoticeboard: ${noticeboardUrl}`,
    });
  }
}

export default EmailService;
