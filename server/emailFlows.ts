import { sendTransactionalEmail } from "./mailer";

type Cta = { label: string; href: string };

function getSiteBaseUrl() {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:8080";
  const first = raw.split(",")[0]?.trim() || "http://localhost:8080";
  return first.replace(/\/+$/, "");
}

function getAppName() {
  return process.env.APP_NAME?.trim() || "WishCanvas";
}

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || "hello@wishcanvas.app";
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Design tokens aligning with WishCanvas design system
const BRAND_GRADIENT = "linear-gradient(135deg, #f97316 0%, #e11d48 50%, #be123c 100%)";
const MIDNIGHT_GRADIENT = "linear-gradient(135deg, #090514 0%, #170b2e 50%, #29081a 100%)";
const BG_COLOR = "#fbf9f6";
const CARD_BG = "#ffffff";
const TEXT_MAIN = "#0f172a";
const TEXT_MUTED = "#64748b";
const BORDER_COLOR = "#f1e5dc";
const ACCENT_GOLD = "#fbbf24";
const ACCENT_ROSE = "#e11d48";
const PILL_BG = "rgba(255, 255, 255, 0.14)";

// Base shell wrapper
function shell(innerHtml: string, preheader: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light dark"/>
  <title>WishCanvas</title>
  <!--[if mso]>
  <style>
    body, table, td, p, a, h1, span { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${BG_COLOR};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
    }
    table {
      border-collapse: separate;
    }
    @media (prefers-color-scheme: dark) {
      .body-bg { background-color: #090514 !important; }
      .card-box { background-color: #130c24 !important; border-color: #271a44 !important; }
      .text-main { color: #f8fafc !important; }
      .text-muted { color: #94a3b8 !important; }
      .subcard { background-color: #1a1230 !important; border-color: #2d1f4d !important; }
      .divider { border-color: #271a44 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};" class="body-bg">
  <div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="body-bg" style="background-color:${BG_COLOR};padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;">
          <!-- Top Wordmark Pill -->
          <tr>
            <td align="center" style="padding:0 0 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:9999px;padding:6px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                    <span style="font-size:13px;color:${ACCENT_GOLD};vertical-align:middle;">&#10024;</span>
                    <span style="font-size:13px;font-weight:800;color:${TEXT_MAIN};letter-spacing:-0.02em;margin-left:6px;vertical-align:middle;">WishCanvas</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main Card Box -->
          <tr>
            <td class="card-box" style="background-color:${CARD_BG};border-radius:24px;border:1px solid ${BORDER_COLOR};box-shadow:0 12px 32px rgba(15,23,42,0.06);overflow:hidden;">
              ${innerHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:${TEXT_MUTED};">
                Sent with care by <strong style="color:${TEXT_MAIN};">WishCanvas</strong> &middot; Collaborative Birthday Stories
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                <a href="${getSiteBaseUrl()}" style="color:#94a3b8;text-decoration:underline;">wishcanvas.app</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${escapeHtml(getSupportEmail())}" style="color:#94a3b8;text-decoration:underline;">${escapeHtml(getSupportEmail())}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Hero header block with midnight or lacquer celebration styling
function hero({
  eyebrow,
  title,
  icon = "&#10024;",
  variant = "midnight",
}: {
  eyebrow: string;
  title: string;
  icon?: string;
  variant?: "midnight" | "lacquer";
}) {
  const bgGrad = variant === "lacquer" ? BRAND_GRADIENT : MIDNIGHT_GRADIENT;
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td style="background:${bgGrad};padding:34px 36px 28px;text-align:left;position:relative;">
        <div style="margin-bottom:14px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="background:${PILL_BG};border:1px solid rgba(255,255,255,0.22);border-radius:9999px;padding:4px 12px;">
                <span style="font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.06em;text-transform:uppercase;">
                  ${icon} &nbsp;${escapeHtml(eyebrow)}
                </span>
              </td>
            </tr>
          </table>
        </div>
        <h1 style="margin:0;font-size:26px;font-weight:900;line-height:1.25;color:#ffffff;letter-spacing:-0.03em;">
          ${escapeHtml(title)}
        </h1>
      </td>
    </tr>
  </table>`;
}

// Card body with rich typography and lacquer button
function body({
  contentHtml,
  cta,
  secondaryNote,
}: {
  contentHtml: string;
  cta?: Cta;
  secondaryNote?: string;
}) {
  const ctaMarkup = cta ? `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 16px;">
    <tr>
      <td style="border-radius:9999px;background:${BRAND_GRADIENT};box-shadow:0 8px 20px rgba(225,29,72,0.28);">
        <a href="${cta.href}" style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-0.01em;">
          ${escapeHtml(cta.label)} &rarr;
        </a>
      </td>
    </tr>
  </table>` : "";

  const noteMarkup = secondaryNote ? `
  <p class="text-muted" style="margin:16px 0 0;font-size:12px;color:${TEXT_MUTED};line-height:1.6;">
    ${secondaryNote}
  </p>` : "";

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td style="padding:32px 36px 36px;">
        <div class="text-main" style="font-size:15px;line-height:1.65;color:${TEXT_MAIN};">
          ${contentHtml}
        </div>
        ${ctaMarkup}
        <hr class="divider" style="border:none;border-top:1px solid ${BORDER_COLOR};margin:28px 0 20px;"/>
        <p class="text-muted" style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.6;">
          If you did not expect this message, you can safely disregard it. Need assistance? Contact <a href="mailto:${escapeHtml(getSupportEmail())}" style="color:${ACCENT_ROSE};text-decoration:none;font-weight:600;">${escapeHtml(getSupportEmail())}</a>.
        </p>
        ${noteMarkup}
      </td>
    </tr>
  </table>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;">${text}</p>`;
}

function highlight(text: string) {
  return `<strong style="color:${ACCENT_ROSE};font-weight:700;">${text}</strong>`;
}

function featureCard(icon: string, label: string, desc: string) {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
    <tr>
      <td class="subcard" style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:16px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-weight:800;font-size:14px;color:${TEXT_MAIN};">${icon} &nbsp;${escapeHtml(label)}</p>
        <p style="margin:0;font-size:13px;color:${TEXT_MUTED};line-height:1.5;">${escapeHtml(desc)}</p>
      </td>
    </tr>
  </table>`;
}

// ============================================================================
// 1. WELCOME EMAIL
// ============================================================================
export async function sendWelcomeEmail(params: { to: string; displayName?: string | null }) {
  const appName = getAppName();
  const safeName = escapeHtml(params.displayName?.trim() || "there");
  const dashboardUrl = `${getSiteBaseUrl()}/dashboard`;

  const inner = hero({
    eyebrow: "Welcome to WishCanvas",
    title: `You're all set, ${safeName}`,
    icon: "&#10024;",
    variant: "midnight",
  }) +
  body({
    contentHtml: `
      ${p(`We're delighted to welcome you to ${highlight("WishCanvas")}. You now have an atelier to gather heartfelt birthday wishes, photos, and voice notes into an unforgettable reveal story.`)}
      ${p("Here is how your celebrations work:")}
      ${featureCard("&#128279;", "One link, everyone contributes", "Share a single invite link with family and friends. No accounts or app downloads needed for guests.")}
      ${featureCard("&#127873;", "Sealed until the midnight reveal", "Every heartfelt message, photo, and voice recording stays securely sealed until the birthday reveal.")}
      ${featureCard("&#127912;", "Cinematic story presentation", "Reveal the collection as a polished story with bespoke themes, background audio, and animations.")}
      ${p("Ready to create your first celebration? Open your atelier below.")}
    `,
    cta: { label: "Open Your Atelier", href: dashboardUrl },
    secondaryNote: `Account email: ${escapeHtml(params.to)}`,
  });

  const html = shell(inner, "Your WishCanvas account is ready. Welcome to collaborative birthday stories.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Welcome to ${appName} ✨`,
    html,
    text: `Welcome to ${appName}, ${safeName}. Your account is ready. Open your atelier: ${dashboardUrl}`,
    tags: [{ name: "type", value: "welcome" }],
  });
}

// ============================================================================
// 2. EMAIL VERIFICATION
// ============================================================================
export async function sendVerificationEmail(params: { to: string; token: string; displayName?: string | null }) {
  const appName = getAppName();
  const safeName = escapeHtml(params.displayName?.trim() || "there");
  const url = `${getSiteBaseUrl()}/verify-email?token=${encodeURIComponent(params.token)}`;

  const inner = hero({
    eyebrow: "Account Verification",
    title: "Confirm your email address",
    icon: "&#9993;",
    variant: "midnight",
  }) +
  body({
    contentHtml: `
      ${p(`Hi ${safeName},`)}
      ${p(`Welcome to ${escapeHtml(appName)}. To complete your registration and activate your celebration atelier, please verify your email address below:`)}
      <div style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:14px;padding:14px 18px;margin:20px 0;">
        <span style="font-size:11px;font-weight:800;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:6px;">Direct Verification Link</span>
        <a href="${url}" style="font-size:13px;color:${ACCENT_ROSE};word-break:break-all;font-weight:600;text-decoration:none;">${escapeHtml(url)}</a>
      </div>
      ${p("This link will remain active for 24 hours. If it expires, you can request a fresh verification link from the login page.")}
    `,
    cta: { label: "Verify Email Address", href: url },
  });

  const html = shell(inner, "Verify your email to activate your WishCanvas account.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Verify your email for ${appName}`,
    html,
    text: `Verify your email for ${appName}: ${url}`,
    tags: [{ name: "type", value: "verify-email" }],
  });
}

// ============================================================================
// 3. PASSWORD RESET
// ============================================================================
export async function sendPasswordResetEmail(params: { to: string; token: string; displayName?: string | null }) {
  const appName = getAppName();
  const safeName = escapeHtml(params.displayName?.trim() || "there");
  const url = `${getSiteBaseUrl()}/auth?reset=${encodeURIComponent(params.token)}`;

  const inner = hero({
    eyebrow: "Account Security",
    title: "Reset your password",
    icon: "&#128274;",
    variant: "midnight",
  }) +
  body({
    contentHtml: `
      ${p(`Hi ${safeName},`)}
      ${p(`We received a request to reset the password for your ${escapeHtml(appName)} account. Tap the button below to set a new password:`)}
      <div style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:14px;padding:14px 18px;margin:20px 0;">
        <span style="font-size:11px;font-weight:800;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:6px;">Direct Reset Link</span>
        <a href="${url}" style="font-size:13px;color:${ACCENT_ROSE};word-break:break-all;font-weight:600;text-decoration:none;">${escapeHtml(url)}</a>
      </div>
      ${p(`${highlight("This password link expires automatically.")} If you did not request a password reset, you can safely disregard this email, your password remains unchanged.`)}
    `,
    cta: { label: "Reset Password", href: url },
  });

  const html = shell(inner, "Reset your WishCanvas password safely.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Reset your ${appName} password`,
    html,
    text: `Reset your ${appName} password: ${url}`,
    tags: [{ name: "type", value: "password-reset" }],
  });
}

// ============================================================================
// 4. BIRTHDAY RECIPIENT REVEAL
// ============================================================================
export async function sendBirthdayRecipientEmail(params: {
  to: string;
  recipientName: string;
  publicCode: string;
  messageCount: number;
}) {
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "Friend");
  const countStr = Number(params.messageCount) || 0;
  const messageLabel = countStr === 1 ? "heartfelt wish" : "heartfelt wishes";
  const url = `${getSiteBaseUrl()}/birthday/${params.publicCode}`;

  const inner = hero({
    eyebrow: "Birthday Story Reveal",
    title: `Happy Birthday, ${safeRecipientName}!`,
    icon: "&#127874;",
    variant: "lacquer",
  }) +
  body({
    contentHtml: `
      ${p("The people who love you put together something truly special.")}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 24px;">
        <tr>
          <td align="center" style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:20px;padding:24px 20px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${TEXT_MUTED};letter-spacing:0.06em;text-transform:uppercase;">
              Waiting For You Inside
            </p>
            <p style="margin:0;font-size:48px;font-weight:900;color:${ACCENT_ROSE};letter-spacing:-0.03em;line-height:1.1;">
              ${countStr}
            </p>
            <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:${TEXT_MAIN};">
              ${messageLabel}, photos &amp; voice recordings
            </p>
            <div style="margin-top:12px;display:inline-block;background:rgba(251,191,36,0.18);border:1px solid #fbbf24;border-radius:9999px;padding:4px 14px;">
              <span style="font-size:12px;font-weight:700;color:#b45309;">&#10024; Sealed with love &middot; Ready to open</span>
            </div>
          </td>
        </tr>
      </table>
      ${p("Open your birthday letter to experience the full story, voice notes, and memories prepared for you.")}
    `,
    cta: { label: "Open Your Birthday Story 🎁", href: url },
    secondaryNote: "Crafted with care on WishCanvas",
  });

  const html = shell(inner, `Your birthday story is ready with ${countStr} ${messageLabel}. Open to view the reveal.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `Your birthday story is ready, ${params.recipientName} 🎂`,
    html,
    text: `Happy Birthday, ${params.recipientName}. Your story is ready with ${countStr} ${messageLabel}. Open: ${url}`,
    tags: [{ name: "type", value: "birthday-recipient" }],
  });
}

// ============================================================================
// 5. NEW MESSAGE ALERT
// ============================================================================
export async function sendNewMessageAlertEmail(params: {
  to: string;
  ownerName?: string | null;
  recipientName: string;
  pageCode: string;
  senderName: string;
  messageCount: number;
}) {
  const safeOwnerName = escapeHtml(params.ownerName?.trim() || "there");
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "your birthday page");
  const safeSenderName = escapeHtml(params.senderName.trim() || "A friend");
  const countStr = Number(params.messageCount) || 1;
  const pageUrl = `${getSiteBaseUrl()}/preview/${params.pageCode}`;

  const inner = hero({
    eyebrow: "New Wish Received",
    title: `A wish arrived for ${safeRecipientName}`,
    icon: "&#128172;",
    variant: "midnight",
  }) +
  body({
    contentHtml: `
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`${highlight(safeSenderName)} just added a new wish to the celebration for ${safeRecipientName}.`)}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 20px;">
        <tr>
          <td style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:16px;padding:16px 20px;">
            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.05em;">Current Total</p>
            <p style="margin:0;font-size:20px;font-weight:800;color:${TEXT_MAIN};">
              ${countStr} ${countStr === 1 ? "heartfelt wish" : "heartfelt wishes"} collected so far
            </p>
          </td>
        </tr>
      </table>
      ${p("Open your preview anytime to review the new message and manage contributions.")}
    `,
    cta: { label: "Review Birthday Canvas", href: pageUrl },
    secondaryNote: "You can adjust notification preferences in your settings.",
  });

  const html = shell(inner, `A new birthday wish just arrived for ${params.recipientName}.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `New wish for ${params.recipientName}`,
    html,
    text: `${params.senderName} just left a new wish for ${params.recipientName}. Open: ${pageUrl}`,
    tags: [{ name: "type", value: "new-message-alert" }],
  });
}

// ============================================================================
// 6. BIRTHDAY REMINDER
// ============================================================================
export async function sendBirthdayReminderEmail(params: {
  to: string;
  ownerName?: string | null;
  recipientName: string;
  publicCode: string;
  messageCount: number;
  birthdayDate: string;
}) {
  const safeOwnerName = escapeHtml(params.ownerName?.trim() || "there");
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "your celebrant");
  const countStr = Number(params.messageCount) || 0;
  const pageUrl = `${getSiteBaseUrl()}/preview/${params.publicCode}`;

  const inner = hero({
    eyebrow: "Birthday Reminder",
    title: `Today is ${safeRecipientName}'s day!`,
    icon: "&#127874;",
    variant: "lacquer",
  }) +
  body({
    contentHtml: `
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`Today is the big day you set for ${highlight(safeRecipientName)}.`)}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 20px;">
        <tr>
          <td style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:16px;padding:16px 20px;">
            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.05em;">Celebration Ready</p>
            <p style="margin:0;font-size:20px;font-weight:800;color:${TEXT_MAIN};">
              ${countStr} ${countStr === 1 ? "wish" : "wishes"} and memories gathered
            </p>
          </td>
        </tr>
      </table>
      ${p("Open the birthday canvas now to review everything before sharing the big reveal link with the birthday person.")}
    `,
    cta: { label: "Open Birthday Reveal", href: pageUrl },
    secondaryNote: `Celebration date: ${escapeHtml(params.birthdayDate)}`,
  });

  const html = shell(inner, `Today is ${params.recipientName}'s birthday. Your celebration canvas is ready.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `Birthday reminder for ${params.recipientName} 🎂`,
    html,
    text: `Reminder: today is ${params.recipientName}'s birthday. Open: ${pageUrl}`,
    tags: [{ name: "type", value: "birthday-reminder" }],
  });
}

// ============================================================================
// 7. POOL RELEASE REQUEST
// ============================================================================
export async function sendPoolReleaseRequestEmail(params: {
  to: string;
  ownerName?: string | null;
  recipientName: string;
  pageCode: string;
}) {
  const safeOwnerName = escapeHtml(params.ownerName?.trim() || "there");
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "the recipient");
  const pageUrl = `${getSiteBaseUrl()}/birthday/${params.pageCode}`;

  const inner = hero({
    eyebrow: "Gift Pool Request",
    title: `${safeRecipientName} requested their gift`,
    icon: "&#127873;",
    variant: "midnight",
  }) +
  body({
    contentHtml: `
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`${highlight(safeRecipientName)} has requested the payout release of their collaborative gift pool funds.`)}
      <div style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:14px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:800;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.06em;">Payout Details</p>
        <p style="margin:0;font-size:14px;color:${TEXT_MAIN};line-height:1.5;">
          A 2% standard processing fee is automatically deducted from the pool total prior to transfer.
        </p>
      </div>
      ${p("Open the celebration page below to verify bank details and authorize the release.")}
    `,
    cta: { label: "Review & Release Payout", href: pageUrl },
    secondaryNote: "If you have already authorized this payout, you may disregard this notice.",
  });

  const html = shell(inner, `${params.recipientName} requested gift pool release.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `${params.recipientName} requested their birthday gift pool funds`,
    html,
    text: `${params.recipientName} requested gift pool release. Open: ${pageUrl}`,
    tags: [{ name: "type", value: "gift-release-request" }],
  });
}

// ============================================================================
// 8. GUEST CANVAS CREATED & CLAIM FLOW
// ============================================================================
export async function sendGuestCanvasCreatedEmail(params: {
  to: string;
  recipientName: string;
  publicCode: string;
  claimToken: string;
}) {
  const siteUrl = getSiteBaseUrl();
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "the celebrant");
  const contributeUrl = `${siteUrl}/contribute/${params.publicCode}`;
  const previewUrl = `${siteUrl}/preview/${params.publicCode}`;
  const claimUrl = `${siteUrl}/auth?mode=signup&claim_token=${params.claimToken}&public_code=${params.publicCode}&email=${encodeURIComponent(params.to)}`;

  const inner = hero({
    eyebrow: "Celebration Canvas Created",
    title: `Your page for ${safeRecipientName} is live!`,
    icon: "&#127881;",
    variant: "lacquer",
  }) +
  body({
    contentHtml: `
      ${p("Congratulations! You just created a collaborative birthday celebration canvas on WishCanvas.")}
      ${p("Here is the contributor link to share with friends, family, and colleagues so they can add wishes, photos, and voice notes:")}
      
      <div style="background:#faf8f5;border:1px solid ${BORDER_COLOR};border-radius:14px;padding:16px 18px;margin:16px 0;">
        <span style="font-size:11px;font-weight:800;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:6px;">Shareable Contributor Link</span>
        <a href="${contributeUrl}" style="font-size:14px;color:${ACCENT_ROSE};word-break:break-all;font-weight:700;text-decoration:none;">${contributeUrl}</a>
      </div>

      <p style="margin:16px 0 6px;">You can also preview how the celebration looks anytime:</p>
      <div style="margin:0 0 20px;">
        <a href="${previewUrl}" style="color:${TEXT_MAIN};font-size:14px;font-weight:700;text-decoration:underline;">View Live Preview &rarr;</a>
      </div>

      <div style="border-top:1px solid ${BORDER_COLOR};margin:24px 0 16px;padding-top:20px;">
        <span style="display:inline-block;background:rgba(225,29,72,0.1);color:${ACCENT_ROSE};font-weight:800;font-size:11px;padding:4px 10px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">
          Action Recommended
        </span>
        ${p(`Because you created this canvas as a guest, editing, wish moderation, and music controls are locked. Claim your canvas now to unlock full moderation and save this canvas permanently in your creator atelier:`)}
      </div>
    `,
    cta: { label: "Claim Your Canvas Now", href: claimUrl },
    secondaryNote: "Create your account password to claim this canvas and unlock full editing privileges.",
  });

  const html = shell(inner, `Your celebration canvas for ${params.recipientName} is live. Contributor and claim links enclosed.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `Your celebration canvas for ${params.recipientName} is live! 🎉`,
    html,
    text: `Your celebration canvas for ${params.recipientName} is live!\n\nContributor link: ${contributeUrl}\nPreview link: ${previewUrl}\n\nClaim your canvas: ${claimUrl}`,
    tags: [{ name: "type", value: "guest-canvas-created" }],
  });
}
