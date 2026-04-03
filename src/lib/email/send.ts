import nodemailer from "nodemailer";

const ADMIN_EMAILS = [
  "grace@indieauthormagazine.com",
  "chelle@indieauthormagazine.com",
];

const FROM_ADDRESS = "Author Automations <notifications@authorautomations.com>";

function createTransporter() {
  const smtpUser = process.env.SES_SMTP_USER;
  const smtpPass = process.env.SES_SMTP_PASS;
  const smtpRegion = process.env.SES_SMTP_REGION || "us-east-1";

  if (!smtpUser || !smtpPass) return null;

  return nodemailer.createTransport({
    host: `email-smtp.${smtpRegion}.amazonaws.com`,
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Send an email via SES. Returns true if sent, false if SES is not configured.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email] Skipped (SES not configured): ${subject}`);
    return false;
  }

  const recipients = Array.isArray(to) ? to.join(", ") : to;
  await transporter.sendMail({ from: FROM_ADDRESS, to: recipients, subject, html });
  return true;
}

/**
 * Send an email to both the user and admin team.
 */
export async function sendUserAndAdminEmail({
  userEmail,
  subject,
  userHtml,
  adminHtml,
}: {
  userEmail: string;
  subject: string;
  userHtml: string;
  adminHtml: string;
}): Promise<void> {
  await Promise.all([
    sendEmail({ to: userEmail, subject, html: userHtml }),
    sendEmail({ to: ADMIN_EMAILS, subject: `[Admin] ${subject}`, html: adminHtml }),
  ]);
}
