import { sendTransactionalEmail } from "./mailer";

function getSiteBaseUrl() {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:8080";
  const first = raw.split(",")[0]?.trim() || "http://localhost:8080";
  return first.replace(/\/+$/, "");
}

function getAppName() {
  return process.env.APP_NAME?.trim() || "WishCanvas";
}

function renderBaseLayout(title: string, body: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.55; color: #1f2937; max-width: 560px; margin: 0 auto;">
      <h2 style="margin: 0 0 12px; font-size: 24px; color: #111827;">${title}</h2>
      ${body}
      <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Sent by ${getAppName()}</p>
    </div>
  `;
}

export async function sendWelcomeEmail(params: { to: string; displayName?: string | null }) {
  const name = params.displayName?.trim() || "there";
  const appName = getAppName();

  const html = renderBaseLayout(
    `Welcome to ${appName}`,
    `
      <p style="margin: 0 0 12px;">Hi ${name},</p>
      <p style="margin: 0 0 12px;">Your account is ready. You can start creating collaborative birthday pages right away.</p>
      <p style="margin: 0;">When you're ready, set the date, share one link, and let everyone contribute.</p>
    `,
  );

  await sendTransactionalEmail({
    to: params.to,
    subject: `Welcome to ${appName}`,
    html,
    text: `Hi ${name}, welcome to ${appName}. Your account is ready.`,
    tags: [{ name: "type", value: "welcome" }],
  });
}

export async function sendVerificationEmail(params: { to: string; token: string; displayName?: string | null }) {
  const name = params.displayName?.trim() || "there";
  const appName = getAppName();
  const url = `${getSiteBaseUrl()}/auth?verify=${encodeURIComponent(params.token)}`;

  const html = renderBaseLayout(
    "Verify your email",
    `
      <p style="margin: 0 0 12px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Please verify your email address to secure your ${appName} account.</p>
      <p style="margin: 0 0 18px;">
        <a href="${url}" style="display: inline-block; background: #8b5cf6; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">
          Verify email
        </a>
      </p>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">If the button doesn't work, use this link: ${url}</p>
    `,
  );

  await sendTransactionalEmail({
    to: params.to,
    subject: `Verify your email for ${appName}`,
    html,
    text: `Verify your email: ${url}`,
    tags: [{ name: "type", value: "verify-email" }],
  });
}

export async function sendPasswordResetEmail(params: { to: string; token: string; displayName?: string | null }) {
  const name = params.displayName?.trim() || "there";
  const appName = getAppName();
  const url = `${getSiteBaseUrl()}/auth?reset=${encodeURIComponent(params.token)}`;

  const html = renderBaseLayout(
    "Reset your password",
    `
      <p style="margin: 0 0 12px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">We received a request to reset your ${appName} password.</p>
      <p style="margin: 0 0 18px;">
        <a href="${url}" style="display: inline-block; background: #8b5cf6; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">This link expires soon. If you didn&apos;t request this, you can ignore this email.</p>
    `,
  );

  await sendTransactionalEmail({
    to: params.to,
    subject: `Reset your ${appName} password`,
    html,
    text: `Reset your password: ${url}`,
    tags: [{ name: "type", value: "password-reset" }],
  });
}

export async function sendBirthdayRecipientEmail(params: {
  to: string;
  recipientName: string;
  publicCode: string;
  messageCount: number;
}) {
  const appName = getAppName();
  const url = `${getSiteBaseUrl()}/birthday/${params.publicCode}`;

  const html = renderBaseLayout(
    `Happy Birthday, ${params.recipientName}!`,
    `
      <p style="margin: 0 0 12px;">Your birthday story is ready.</p>
      <p style="margin: 0 0 12px;">${params.messageCount} message${params.messageCount === 1 ? "" : "s"} have been collected for you.</p>
      <p style="margin: 0 0 18px;">
        <a href="${url}" style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">
          Open your birthday page
        </a>
      </p>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">From ${appName}</p>
    `,
  );

  await sendTransactionalEmail({
    to: params.to,
    subject: `Your birthday story is ready, ${params.recipientName}`,
    html,
    text: `Your birthday page is ready: ${url}`,
    tags: [{ name: "type", value: "birthday-recipient" }],
  });
}

