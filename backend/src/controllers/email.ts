import { type Request, type Response } from "express";
import { EmailService } from "../utils/emailService.ts";
import {
  processUpcomingExamReminders,
  processLowAttendanceHealthCheck,
} from "../utils/cronJobs.ts";
import { getAppUrl } from "../utils/appUrl.ts";

/**
 * @desc    Get Email Engine Status & Provider Health
 * @route   GET /api/email/status
 * @access  Public / Admin
 */
export const getEmailStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = EmailService.getStatus();
    const appUrl = getAppUrl(req);

    res.status(200).json({
      service: "SchoolSync Transactional Email Engine",
      resolvedAppUrl: appUrl,
      status,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to retrieve email engine status",
      error: error.message,
    });
  }
};

/**
 * @desc    Dispatch Live Real-Time Test Email (verifies Resend API / SMTP fallback)
 * @route   POST /api/email/test
 * @access  Public / Admin
 */
export const sendTestEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, type = "generic" } = req.body;
    const recipient = to || "delivered@resend.dev";

    let result;

    if (type === "welcome") {
      result = await EmailService.sendWelcomeEmail(
        recipient,
        "Alex Walker",
        "student",
        req
      );
    } else if (type === "absence") {
      result = await EmailService.sendAbsentAttendanceAlert(
        [recipient],
        "Alex Walker",
        "Grade 10-A",
        new Date(),
        req
      );
    } else if (type === "exam") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      result = await EmailService.sendNewExamNotification(
        [recipient],
        "Calculus Mid-Term Assessment",
        "Mathematics",
        "Grade 12-A",
        tomorrow,
        60,
        req
      );
    } else if (type === "exam-result") {
      result = await EmailService.sendExamGradedNotification(
        recipient,
        "Alex Walker",
        "Calculus Mid-Term Assessment",
        "Mathematics",
        92,
        100,
        92,
        "Outstanding analytical reasoning and step-by-step solutions!",
        req
      );
    } else {
      const html = EmailService.wrapTemplate(
        "Real-Time Delivery Test",
        `
        <div style="margin-bottom: 14px;">
          <span class="badge badge-success">Live Dispatch Verified</span>
        </div>
        <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
          Real-Time Email Engine is Operational
        </h2>
        <p>This is an authenticated real-time test transmission dispatched from your SchoolSync platform.</p>
        
        <div class="card card-info">
          <table class="data-table">
            <tr>
              <td class="label">Recipient:</td>
              <td class="value">${recipient}</td>
            </tr>
            <tr>
              <td class="label">Timestamp:</td>
              <td class="value">${new Date().toISOString()}</td>
            </tr>
            <tr>
              <td class="label">Engine Mode:</td>
              <td class="value">Multi-Tier Fallback (Resend REST API primary)</td>
            </tr>
          </table>
        </div>
        `,
        "Open SchoolSync Portal",
        getAppUrl(req)
      );

      result = await EmailService.dispatchEmail({
        to: recipient,
        subject: "SchoolSync — Real-Time Email Delivery Verification",
        html,
        text: `SchoolSync Email Verification dispatched at ${new Date().toISOString()} to ${recipient}`,
      });
    }

    res.status(200).json({
      message: "Test email dispatched successfully",
      recipient,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to dispatch test email",
      error: error.message,
    });
  }
};

/**
 * @desc    Manually Trigger Scheduled Background Email Cron Jobs
 * @route   POST /api/email/trigger-cron
 * @access  Admin
 */
export const triggerCronJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { job = "all" } = req.body;
    const summary: Record<string, any> = {};

    if (job === "all" || job === "exam-reminders") {
      summary.examReminders = await processUpcomingExamReminders();
    }

    if (job === "all" || job === "attendance-check") {
      summary.attendanceCheck = await processLowAttendanceHealthCheck();
    }

    res.status(200).json({
      message: "Background cron tasks executed successfully",
      summary,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to execute cron jobs",
      error: error.message,
    });
  }
};
