/**
 * Enterprise Transactional Email Notification Engine for SchoolSync
 * 
 * Supports:
 * 1. Gmail SMTP Transport via Google App Password
 * 2. Custom SMTP Hosts (AWS SES, Mailtrap, SendGrid, etc.)
 * 3. Resend REST API Transport
 * 4. Rich, responsive HTML email templates with role-tailored welcome onboarding cards
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static transporterInstance: any = null;

  public static getFromAddress(): string {
    return process.env.EMAIL_FROM || '"SchoolSync Academic Operations" <notifications@schoolsync.com>';
  }

  /**
   * Initializes or returns cached Nodemailer transporter
   */
  private static async getTransporter(): Promise<any> {
    if (this.transporterInstance) {
      return this.transporterInstance;
    }

    try {
      const nodemailer = await import("nodemailer" as any).catch(() => null);
      if (!nodemailer) return null;

      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      // 1. Service shorthand (e.g., Gmail with App Password)
      if (process.env.SMTP_SERVICE && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporterInstance = createTransport({
          service: process.env.SMTP_SERVICE,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        return this.transporterInstance;
      }

      // 2. Standard SMTP Host Configuration (AWS SES, Mailtrap, Custom SMTP, etc.)
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const port = parseInt(process.env.SMTP_PORT || "587", 10);
        const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

        this.transporterInstance = createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure: isSecure,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        return this.transporterInstance;
      }
    } catch (err: any) {
      console.warn("⚠️  Could not initialize Nodemailer transporter:", err.message);
    }

    return null;
  }

  /**
   * Optional connection check during server startup
   */
  static async verifyConnection(): Promise<boolean> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      console.log("ℹ️  [EMAIL SERVICE] Operating in Development Simulator Mode (No live SMTP credentials).");
      return false;
    }

    try {
      await transporter.verify();
      console.log("✅ [EMAIL SERVICE] Live SMTP Connection verified successfully.");
      return true;
    } catch (err: any) {
      console.warn("⚠️  [EMAIL SERVICE] Live SMTP connection test failed:", err.message);
      return false;
    }
  }

  /**
   * Dispatches email payload via available transport
   */
  static async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    const recipients = Array.isArray(payload.to)
      ? payload.to.map((e) => e?.trim()).filter(Boolean)
      : [payload.to?.trim()].filter(Boolean);

    if (recipients.length === 0) {
      return { success: false, error: "No recipient email addresses provided." };
    }

    // 1. Resend REST API Fallback (if RESEND_API_KEY is configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: this.getFromAddress(),
            to: recipients,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          return { success: true, messageId: data.id };
        } else {
          const errData = await response.text();
          console.error("⚠️  Failed to send via Resend API:", errData);
        }
      } catch (err: any) {
        console.error("⚠️  Resend API error:", err.message);
      }
    }

    // 2. SMTP Transporter
    const transporter = await this.getTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: this.getFromAddress(),
          to: recipients.join(", "),
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });

        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        console.error("⚠️  Failed to deliver email via SMTP transporter:", err.message);
      }
    }

    // 3. Fallback Development Logger
    console.log("------------------------------------------------------------------");
    console.log("📧 [TRANSACTIONAL EMAIL DISPATCHER (SIMULATED DEV TRANSMISSION)]");
    console.log(`To:       ${recipients.join(", ")}`);
    console.log(`From:     ${this.getFromAddress()}`);
    console.log(`Subject:  ${payload.subject}`);
    console.log(`Preview:  ${payload.text || payload.html.replace(/<[^>]+>/g, "").slice(0, 160)}...`);
    console.log("------------------------------------------------------------------");

    return {
      success: true,
      messageId: `simulated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  /**
   * Premium Responsive HTML Email Template Wrapper
   */
  private static wrapTemplate(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 24px 12px;
      color: #0F172A;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03);
    }
    .header {
      background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 50%, #0F172A 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .header-logo {
      display: inline-block;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #FFFFFF;
      text-decoration: none;
    }
    .header-logo span {
      color: #60A5FA;
    }
    .header-subtitle {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #BFDBFE;
      font-weight: 500;
    }
    .content {
      padding: 32px 28px;
      font-size: 15px;
      line-height: 1.65;
      color: #334155;
    }
    .card {
      background: #F8FAFC;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid #E2E8F0;
    }
    .card-urgent {
      background: #FEF2F2;
      border-left: 4px solid #DC2626;
      border-top: 1px solid #FEE2E2;
      border-right: 1px solid #FEE2E2;
      border-bottom: 1px solid #FEE2E2;
    }
    .card-info {
      background: #EFF6FF;
      border-left: 4px solid #2563EB;
      border-top: 1px solid #DBEAFE;
      border-right: 1px solid #DBEAFE;
      border-bottom: 1px solid #DBEAFE;
    }
    .card-success {
      background: #F0FDF4;
      border-left: 4px solid #16A34A;
      border-top: 1px solid #DCFCE7;
      border-right: 1px solid #DCFCE7;
      border-bottom: 1px solid #DCFCE7;
    }
    .badge {
      display: inline-block;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-urgent { background: #FEE2E2; color: #991B1B; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-role { background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }
    .btn {
      display: inline-block;
      padding: 13px 28px;
      background: #1E40AF;
      color: #FFFFFF !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 700;
      margin: 20px 0;
      font-size: 14px;
      letter-spacing: 0.01em;
      box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.2);
    }
    .btn:hover {
      background: #1E3A8A;
    }
    .footer {
      background: #F1F5F9;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      line-height: 1.6;
    }
    .footer a {
      color: #1E40AF;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">School<span>Sync</span></div>
      <div class="header-subtitle">Academic Operations & Institution Management</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">This is an automated notification from SchoolSync Academic Operations.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} SchoolSync Portal. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 1. Send Welcome Onboarding Card Email (For New Registrations)
   */
  static async sendWelcomeEmail(
    to: string,
    userName: string,
    role: string,
    portalUrl?: string
  ): Promise<EmailResult> {
    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
    const loginUrl = portalUrl || process.env.CLIENT_URL || "http://localhost:5173/login";

    const roleFeatures: { [key: string]: string[] } = {
      student: [
        "View and track your weekly class timetable and lecture schedules",
        "Take online exams and receive instantaneous AI-graded performance feedback",
        "Monitor your personal attendance health and GPA report cards",
      ],
      teacher: [
        "Generate conflict-free weekly timetables with AI constraint solving",
        "Create and publish AI-assisted examinations and quizzes",
        "Record daily classroom attendance and broadcast class announcements",
      ],
      parent: [
        "Stay informed with real-time student absence notifications",
        "Review comprehensive academic report cards and examination results",
        "Access school-wide circulars and direct emergency contact management",
      ],
      admin: [
        "Oversee campus operations, academic years, classes, and subjects",
        "Manage staff and student directories with role boundary isolation",
        "Access real-time audit logs, attendance analytics, and system reports",
      ],
    };

    const featuresList = (roleFeatures[role.toLowerCase()] || roleFeatures.student)
      .map((feat) => `<li style="margin-bottom: 8px;">${feat}</li>`)
      .join("");

    const html = this.wrapTemplate(
      `Welcome to SchoolSync, ${userName}!`,
      `
      <div style="margin-bottom: 12px;">
        <span class="badge badge-success">Welcome to SchoolSync</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
        Welcome aboard, ${userName}!
      </h2>
      <p>Your <strong>${formattedRole}</strong> account has been successfully initialized and activated in the SchoolSync Academic Portal.</p>
      
      <div class="card card-info" style="margin: 22px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #1E40AF; text-transform: uppercase; margin-bottom: 8px;">
          Account Profile Summary
        </div>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748B; width: 120px;">Full Name:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${userName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748B;">Email Login:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${to}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748B;">Assigned Role:</td>
            <td style="padding: 4px 0;"><span class="badge badge-role">${formattedRole}</span></td>
          </tr>
        </table>
      </div>

      <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 20px 0 10px 0;">
        What you can do with your account:
      </h3>
      <ul style="padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
        ${featuresList}
      </ul>

      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${loginUrl}" class="btn" target="_blank">Sign In to Your Dashboard &rarr;</a>
      </div>
      <p style="font-size: 13px; color: #64748B; text-align: center;">
        Need help? Contact your school administration or reply directly to this email.
      </p>
      `
    );

    return this.sendEmail({
      to,
      subject: `Welcome to SchoolSync — Your ${formattedRole} Account is Ready!`,
      html,
      text: `Hello ${userName},\n\nWelcome to SchoolSync! Your ${formattedRole} account (${to}) has been created.\n\nSign in to get started: ${loginUrl}`,
    });
  }

  /**
   * 2. Send Password Reset Link Email
   */
  static async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    userName: string
  ): Promise<EmailResult> {
    const html = this.wrapTemplate(
      "Password Reset Request",
      `
      <div style="margin-bottom: 12px;">
        <span class="badge badge-urgent">Security Verification</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 800;">
        Password Reset Request
      </h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We received a request to reset your password for your SchoolSync account.</p>
      
      <div class="card card-urgent">
        <p style="margin: 0; font-weight: 700; color: #991B1B; font-size: 14px;">
          Expiring Security Link
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #7F1D1D;">
          This link is cryptographically signed and will automatically expire in <strong>15 minutes</strong> for your protection.
        </p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" class="btn" target="_blank">Reset My Password &rarr;</a>
      </div>

      <p style="font-size: 13px; color: #64748B; word-break: break-all;">
        If the button above does not work, copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color: #1E40AF;">${resetUrl}</a>
      </p>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 24px; border-top: 1px solid #E2E8F0; pt: 12px;">
        If you did not request this password reset, no action is needed and your account remains secure.
      </p>
      `
    );

    return this.sendEmail({
      to,
      subject: "SchoolSync — Password Reset Request",
      html,
      text: `Hello ${userName}, reset your password using the following link (valid for 15 mins): ${resetUrl}`,
    });
  }

  /**
   * 3. Send Absent Attendance Alert (to Parent and/or Student)
   */
  static async sendAbsentAttendanceAlert(
    recipients: string[],
    studentName: string,
    className: string,
    date: Date | string
  ): Promise<EmailResult> {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const html = this.wrapTemplate(
      "Attendance Notice: Marked Absent",
      `
      <div style="margin-bottom: 12px;">
        <span class="badge badge-urgent">Attendance Notice</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 800;">
        Student Absence Notice
      </h2>
      <p>This is an automated notification to inform you that <strong>${studentName}</strong> was marked <strong>Absent</strong> for class <strong>${className}</strong> on <strong>${formattedDate}</strong>.</p>
      
      <div class="card card-urgent">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 3px 0; color: #991B1B; font-weight: 600; width: 120px;">Student Name:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #7F1D1D;">${studentName}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #991B1B; font-weight: 600;">Class Section:</td>
            <td style="padding: 3px 0; color: #7F1D1D;">${className}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #991B1B; font-weight: 600;">Recorded Date:</td>
            <td style="padding: 3px 0; color: #7F1D1D;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #991B1B; font-weight: 600;">Attendance:</td>
            <td style="padding: 3px 0;"><span class="badge badge-urgent">Absent</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748B;">
        If this absence was pre-excused or you believe this entry was made in error, please contact the class teacher or school attendance administrator.
      </p>
      `
    );

    return this.sendEmail({
      to: recipients,
      subject: `Attendance Alert: ${studentName} marked absent on ${formattedDate}`,
      html,
      text: `Attendance Notice: ${studentName} was marked absent in ${className} on ${formattedDate}.`,
    });
  }

  /**
   * 4. Send New Exam Published Notification (to Enrolled Students)
   */
  static async sendNewExamNotification(
    studentEmails: string[],
    examTitle: string,
    subjectName: string,
    className: string,
    dueDate: Date | string,
    duration: number
  ): Promise<EmailResult> {
    const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = this.wrapTemplate(
      "New Assessment Published",
      `
      <div style="margin-bottom: 12px;">
        <span class="badge badge-info">New Assessment</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 800;">
        New Exam Assigned: ${examTitle}
      </h2>
      <p>A new assessment has been scheduled and published for your class (<strong>${className}</strong>).</p>
      
      <div class="card card-info">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #1E40AF; font-weight: 600; width: 120px;">Exam Title:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #1E3A8A;">${examTitle}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #1E40AF; font-weight: 600;">Subject:</td>
            <td style="padding: 4px 0; color: #1E3A8A;">${subjectName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #1E40AF; font-weight: 600;">Duration:</td>
            <td style="padding: 4px 0; color: #1E3A8A;"><strong>${duration}</strong> minutes</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #1E40AF; font-weight: 600;">Submission Due:</td>
            <td style="padding: 4px 0; color: #1E3A8A;"><strong>${formattedDueDate}</strong></td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/lms/exams" class="btn" target="_blank">
          Open Exam Portal &rarr;
        </a>
      </div>
      <p style="font-size: 13px; color: #64748B; text-align: center;">
        Please make sure you have a stable internet connection before beginning the timed assessment.
      </p>
      `
    );

    return this.sendEmail({
      to: studentEmails,
      subject: `New Exam Assigned: ${examTitle} (${subjectName})`,
      html,
      text: `New Exam Published: "${examTitle}" for ${subjectName} in ${className}. Due: ${formattedDueDate}.`,
    });
  }

  /**
   * 5. Send Urgent Campus Announcement Notification
   */
  static async sendUrgentAnnouncementEmail(
    recipientEmails: string[],
    announcementTitle: string,
    content: string,
    authorName: string
  ): Promise<EmailResult> {
    const html = this.wrapTemplate(
      "Urgent Campus Announcement",
      `
      <div style="margin-bottom: 12px;">
        <span class="badge badge-urgent">Urgent Announcement</span>
      </div>
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 800;">
        ${announcementTitle}
      </h2>
      <p style="font-size: 13px; color: #64748B; margin-top: -4px;">
        Broadcasted by: <strong>${authorName}</strong>
      </p>
      
      <div class="card card-urgent" style="font-size: 14px; color: #78350F; line-height: 1.65; background: #FFFBEB; border-left: 4px solid #D97706;">
        ${content.replace(/\n/g, "<br/>")}
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/announcements" class="btn" target="_blank">
          View Campus Noticeboard &rarr;
        </a>
      </div>
      `
    );

    return this.sendEmail({
      to: recipientEmails,
      subject: `[URGENT NOTICE] ${announcementTitle}`,
      html,
      text: `[URGENT ANNOUNCEMENT] ${announcementTitle} (from ${authorName}):\n\n${content}`,
    });
  }
}
