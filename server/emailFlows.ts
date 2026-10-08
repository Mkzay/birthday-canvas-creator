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

// Warm Editorial Design Tokens matching the WishCanvas Keepsake aesthetic
const COLOR_BG = "#fbf8f4";
const COLOR_CARD = "#ffffff";
const COLOR_BORDER = "#eae2d8";
const COLOR_INK_MAIN = "#1c1917";
const COLOR_INK_MUTED = "#78716c";
const COLOR_INK_LIGHT = "#a8a29e";
const COLOR_TERRACOTTA = "#e06d53";
const COLOR_TERRACOTTA_DEEP = "#c85238";
const COLOR_AMBER = "#d97706";
const COLOR_WELL_BG = "#faf6f0";
const COLOR_WELL_BORDER = "#e8dcce";
const COLOR_MIDNIGHT = "#15121b";

// Base HTML Shell with typography and bulletproof MSO table formatting
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
    body, table, td, p, a, h1, h2, span { font-family: Georgia, 'Times New Roman', serif !important; }
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${COLOR_BG};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
    }
    table {
      border-collapse: separate;
    }
    a {
      color: ${COLOR_TERRACOTTA};
      text-decoration: underline;
    }
    @media (prefers-color-scheme: dark) {
      .body-bg { background-color: #121016 !important; }
      .card-box { background-color: #1a1722 !important; border-color: #2e2838 !important; }
      .text-main { color: #f5f2ed !important; }
      .text-muted { color: #a8a29e !important; }
      .well-box { background-color: #221d2d !important; border-color: #342c42 !important; }
      .divider-line { border-color: #2e2838 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLOR_BG};" class="body-bg">
  <div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="body-bg" style="background-color:${COLOR_BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <!-- Editorial Brand Letterhead -->
          <tr>
            <td align="center" style="padding:0 0 24px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="text-align:center;">
                    <a href="${getSiteBaseUrl()}" style="text-decoration:none;display:inline-block;">
                      <span style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${COLOR_INK_MAIN};letter-spacing:-0.02em;">
                        Wish<span style="color:${COLOR_TERRACOTTA};">Canvas</span>
                      </span>
                    </a>
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.22em;color:${COLOR_INK_LIGHT};text-transform:uppercase;margin-top:4px;">
                      Birthday Keepsake Atelier
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Stationery Card Box -->
          <tr>
            <td class="card-box" style="background-color:${COLOR_CARD};border-radius:20px;border:1px solid ${COLOR_BORDER};box-shadow:0 10px 32px rgba(78,64,53,0.06);overflow:hidden;">
              ${innerHtml}
            </td>
          </tr>

          <!-- Editorial Footer -->
          <tr>
            <td align="center" style="padding:28px 12px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:${COLOR_INK_MUTED};line-height:1.5;">
                Crafted with care on <strong style="color:${COLOR_INK_MAIN};">WishCanvas</strong> &middot; Collaborative Birthday Stories
              </p>
              <p style="margin:0;font-size:11px;color:${COLOR_INK_LIGHT};line-height:1.5;">
                <a href="${getSiteBaseUrl()}" style="color:${COLOR_INK_LIGHT};text-decoration:underline;">wishcanvas.app</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${escapeHtml(getSupportEmail())}" style="color:${COLOR_INK_LIGHT};text-decoration:underline;">${escapeHtml(getSupportEmail())}</a>
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

// Header banner for celebration or editorial moments
function heroHeader({
  title,
  subtitle,
  variant = "editorial",
}: {
  title: string;
  subtitle?: string;
  variant?: "editorial" | "celebration";
}) {
  if (variant === "celebration") {
    return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="background-color:${COLOR_MIDNIGHT};background-image:linear-gradient(145deg, #181324 0%, #291a24 100%);padding:36px 36px 32px;text-align:left;">
          <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;line-height:1.2;color:#ffffff;letter-spacing:-0.02em;">
            ${escapeHtml(title)}
          </h1>
          ${subtitle ? `
          <p style="margin:10px 0 0;font-size:14px;color:#e7dfd5;line-height:1.5;">
            ${escapeHtml(subtitle)}
          </p>` : ""}
        </td>
      </tr>
    </table>`;
  }

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td style="background-color:${COLOR_WELL_BG};border-bottom:1px solid ${COLOR_BORDER};padding:34px 36px 28px;text-align:left;">
        <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;line-height:1.25;color:${COLOR_INK_MAIN};letter-spacing:-0.02em;">
          ${escapeHtml(title)}
        </h1>
        ${subtitle ? `
        <p style="margin:8px 0 0;font-size:14px;color:${COLOR_INK_MUTED};line-height:1.5;">
          ${escapeHtml(subtitle)}
        </p>` : ""}
      </td>
    </tr>
  </table>`;
}

// Card content body with rich typography and bulletproof button
function bodyContainer({
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
      <td align="center" style="border-radius:10px;background-color:${COLOR_TERRACOTTA};background-image:linear-gradient(135deg, ${COLOR_TERRACOTTA} 0%, ${COLOR_TERRACOTTA_DEEP} 100%);">
        <a href="${cta.href}" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ${escapeHtml(cta.label)} &rarr;
        </a>
      </td>
    </tr>
  </table>` : "";

  const noteMarkup = secondaryNote ? `
  <p class="text-muted" style="margin:16px 0 0;font-size:12px;color:${COLOR_INK_MUTED};line-height:1.6;">
    ${secondaryNote}
  </p>` : "";

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td style="padding:32px 36px 36px;">
        <div class="text-main" style="font-size:15px;line-height:1.65;color:${COLOR_INK_MAIN};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ${contentHtml}
        </div>
        ${ctaMarkup}
        <hr class="divider-line" style="border:none;border-top:1px solid ${COLOR_BORDER};margin:28px 0 20px;"/>
        <p class="text-muted" style="margin:0;font-size:12px;color:${COLOR_INK_MUTED};line-height:1.6;">
          If you did not expect this message, you can safely disregard it. Need assistance? Contact <a href="mailto:${escapeHtml(getSupportEmail())}" style="color:${COLOR_TERRACOTTA};text-decoration:none;font-weight:600;">${escapeHtml(getSupportEmail())}</a>.
        </p>
        ${noteMarkup}
      </td>
    </tr>
  </table>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;line-height:1.65;">${text}</p>`;
}

function highlight(text: string) {
  return `<strong style="color:${COLOR_TERRACOTTA};font-weight:700;">${text}</strong>`;
}

function featureItem(title: string, desc: string) {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
    <tr>
      <td class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:14px;padding:16px 18px;">
        <p style="margin:0 0 4px;font-weight:700;font-size:14px;color:${COLOR_INK_MAIN};font-family:'Playfair Display',Georgia,serif;">${escapeHtml(title)}</p>
        <p style="margin:0;font-size:13px;color:${COLOR_INK_MUTED};line-height:1.5;">${escapeHtml(desc)}</p>
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

  const inner = heroHeader({
    title: `Welcome to your atelier, ${safeName}`,
    subtitle: "Your collaborative birthday storytelling space is ready.",
    variant: "editorial",
  }) +
  bodyContainer({
    contentHtml: `
      ${p(`We are delighted to welcome you to ${highlight("WishCanvas")}. You now have an atelier to gather heartfelt birthday wishes, photos, and voice notes into an unforgettable reveal story.`)}
      ${p("Here is how your celebrations work:")}
      ${featureItem("One simple link for contributors", "Share a single invite link with family and friends. No accounts or app downloads needed for guests.")}
      ${featureItem("Sealed until the birthday reveal", "Every heartfelt message, photo, and voice recording stays securely sealed until the special day.")}
      ${featureItem("Cinematic story presentation", "Reveal the collection as a polished story with bespoke themes, background audio, and smooth motion.")}
      ${p("Ready to create your first celebration? Open your atelier below.")}
    `,
    cta: { label: "Open Your Atelier", href: dashboardUrl },
    secondaryNote: `Account email: ${escapeHtml(params.to)}`,
  });

  const html = shell(inner, "Your WishCanvas account is ready. Welcome to collaborative birthday stories.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Welcome to ${appName}`,
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

  const inner = heroHeader({
    title: "Confirm your email address",
    subtitle: "Activate your account and protect your celebrations.",
    variant: "editorial",
  }) +
  bodyContainer({
    contentHtml: `
      ${p(`Hi ${safeName},`)}
      ${p(`Welcome to ${escapeHtml(appName)}. To complete your registration and activate your celebration atelier, please verify your email address below:`)}
      <div class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:12px;padding:14px 18px;margin:20px 0;">
        <span style="font-size:10px;font-weight:700;color:${COLOR_INK_LIGHT};text-transform:uppercase;letter-spacing:0.16em;display:block;margin-bottom:6px;">Verification Link</span>
        <a href="${url}" style="font-size:13px;color:${COLOR_TERRACOTTA};word-break:break-all;font-weight:600;text-decoration:none;">${escapeHtml(url)}</a>
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

  const inner = heroHeader({
    title: "Reset your password",
    subtitle: "Choose a new password to secure your atelier.",
    variant: "editorial",
  }) +
  bodyContainer({
    contentHtml: `
      ${p(`Hi ${safeName},`)}
      ${p(`We received a request to reset the password for your ${escapeHtml(appName)} account. Tap the button below to set a new password:`)}
      <div class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:12px;padding:14px 18px;margin:20px 0;">
        <span style="font-size:10px;font-weight:700;color:${COLOR_INK_LIGHT};text-transform:uppercase;letter-spacing:0.16em;display:block;margin-bottom:6px;">Direct Reset Link</span>
        <a href="${url}" style="font-size:13px;color:${COLOR_TERRACOTTA};word-break:break-all;font-weight:600;text-decoration:none;">${escapeHtml(url)}</a>
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

  const inner = heroHeader({
    title: `Happy Birthday, ${safeRecipientName}!`,
    subtitle: "A collaborative celebration story prepared just for you.",
    variant: "celebration",
  }) +
  bodyContainer({
    contentHtml: `
      ${p("The people who love you put together something truly special.")}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 24px;">
        <tr>
          <td align="center" class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:18px;padding:26px 20px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:${COLOR_INK_LIGHT};letter-spacing:0.16em;text-transform:uppercase;">
              Waiting For You Inside
            </p>
            <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:44px;font-weight:700;color:${COLOR_TERRACOTTA};line-height:1.1;">
              ${countStr}
            </p>
            <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:${COLOR_INK_MAIN};">
              ${messageLabel}, photos, and voice recordings
            </p>
            <div style="margin-top:14px;display:inline-block;background-color:#ffffff;border:1px solid ${COLOR_BORDER};border-radius:9999px;padding:5px 16px;">
              <span style="font-size:11px;font-weight:700;color:${COLOR_AMBER};letter-spacing:0.04em;">Sealed with love &middot; Ready to open</span>
            </div>
          </td>
        </tr>
      </table>
      ${p("Open your birthday letter to experience the full story, voice notes, and memories prepared for you.")}
    `,
    cta: { label: "Open Your Birthday Story", href: url },
    secondaryNote: "Crafted with care on WishCanvas",
  });

  const html = shell(inner, `Your birthday story is ready with ${countStr} ${messageLabel}. Open to view the reveal.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `Your birthday story is ready, ${params.recipientName}`,
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

  const inner = heroHeader({
    title: `A wish arrived for ${safeRecipientName}`,
    subtitle: `${safeSenderName} just added a new note to the celebration.`,
    variant: "editorial",
  }) +
  bodyContainer({
    contentHtml: `
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`${highlight(safeSenderName)} just added a new wish to the celebration for ${safeRecipientName}.`)}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 20px;">
        <tr>
          <td class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:14px;padding:16px 20px;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${COLOR_INK_LIGHT};text-transform:uppercase;letter-spacing:0.14em;">Current Total</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:${COLOR_INK_MAIN};font-family:'Playfair Display',Georgia,serif;">
              ${countStr} ${countStr === 1 ? "heartfelt wish" : "heartfelt wishes"} collected so far
            </p>
          </td>
        </tr>
      </table>
      ${p("Open your preview anytime to review the new message and curate the presentation.")}
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

  const inner = heroHeader({
    title: `Today is ${safeRecipientName}'s special day`,
    subtitle: "The celebration canvas is sealed and ready for the big reveal.",
    variant: "celebration",
  }) +
  bodyContainer({
    contentHtml: `
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`Today is the big day you set for ${highlight(safeRecipientName)}.`)}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 20px;">
        <tr>
          <td class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:14px;padding:16px 20px;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${COLOR_INK_LIGHT};text-transform:uppercase;letter-spacing:0.14em;">Celebration Ready</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:${COLOR_INK_MAIN};font-family:'Playfair Display',Georgia,serif;">
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
    subject: `Birthday reminder for ${params.recipientName}`,
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

  const inner = heroHeader({
    title: `${safeRecipientName} requested their gift`,
    subtitle: "Authorized gift pool release request received.",
    variant: "editorial",
  }) +
  bodyContainer({
    contentHtml: `
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`${highlight(safeRecipientName)} has requested the payout release of their collaborative gift pool funds.`)}
      <div class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${COLOR_INK_LIGHT};text-transform:uppercase;letter-spacing:0.14em;">Payout Details</p>
        <p style="margin:0;font-size:14px;color:${COLOR_INK_MAIN};line-height:1.5;">
          A 2% standard processing fee is automatically deducted from the pool total prior to transfer.
        </p>
      </div>
      ${p("Open the celebration page below to verify bank details and authorize the release.")}
    `,
    cta: { label: "Review and Release Payout", href: pageUrl },
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

  const inner = heroHeader({
    title: `Your page for ${safeRecipientName} is live`,
    subtitle: "Share the contributor link to start gathering memories.",
    variant: "editorial",
  }) +
  bodyContainer({
    contentHtml: `
      ${p("Congratulations! You just created a collaborative birthday celebration canvas on WishCanvas.")}
      ${p("Here is the contributor link to share with friends, family, and colleagues so they can add wishes, photos, and voice notes:")}
      
      <div class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:12px;padding:16px 18px;margin:16px 0;">
        <span style="font-size:10px;font-weight:700;color:${COLOR_INK_LIGHT};text-transform:uppercase;letter-spacing:0.16em;display:block;margin-bottom:6px;">Shareable Contributor Link</span>
        <a href="${contributeUrl}" style="font-size:14px;color:${COLOR_TERRACOTTA};word-break:break-all;font-weight:700;text-decoration:none;">${contributeUrl}</a>
      </div>

      <p style="margin:16px 0 6px;">You can also preview how the celebration looks anytime:</p>
      <div style="margin:0 0 20px;">
        <a href="${previewUrl}" style="color:${COLOR_INK_MAIN};font-size:14px;font-weight:700;text-decoration:underline;">View Live Preview &rarr;</a>
      </div>

      <div style="border-top:1px solid ${COLOR_BORDER};margin:24px 0 16px;padding-top:20px;">
        <span style="display:inline-block;background-color:#fee2e2;color:#b91c1c;font-weight:700;font-size:10px;padding:4px 10px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
          Action Recommended
        </span>
        ${p("Because you created this canvas as a guest, editing, wish moderation, and music controls are locked. Claim your canvas now to unlock full moderation and save this canvas permanently in your creator atelier:")}
      </div>
    `,
    cta: { label: "Claim Your Canvas Now", href: claimUrl },
    secondaryNote: "Create your account password to claim this canvas and unlock full editing privileges.",
  });

  const html = shell(inner, `Your celebration canvas for ${params.recipientName} is live. Contributor and claim links enclosed.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `Your celebration canvas for ${params.recipientName} is live`,
    html,
    text: `Your celebration canvas for ${params.recipientName} is live!\n\nContributor link: ${contributeUrl}\nPreview link: ${previewUrl}\n\nClaim your canvas: ${claimUrl}`,
    tags: [{ name: "type", value: "guest-canvas-created" }],
  });
}

// ============================================================================
// 9. SYSTEM DIAGNOSTIC EMAIL (Used by Admin test)
// ============================================================================
export async function sendDiagnosticTestEmail(params: {
  to: string;
  subject?: string;
}) {
  const appName = getAppName();
  const subject = params.subject?.trim() || `${appName} Pipeline Diagnostic`;

  const inner = heroHeader({
    title: "Resend pipeline connected",
    subtitle: "Your transactional email dispatch pipeline is operating smoothly.",
    variant: "editorial",
  }) +
  bodyContainer({
    contentHtml: `
      ${p(`This is a test notification from <strong style="color:${COLOR_TERRACOTTA};">${appName}</strong> confirming that your transactional email pipeline is operating smoothly.`)}
      <div class="well-box" style="background-color:${COLOR_WELL_BG};border:1px solid ${COLOR_WELL_BORDER};border-radius:12px;padding:14px 18px;margin:16px 0;font-size:13px;color:${COLOR_INK_MUTED};">
        Verification Timestamp: <strong>${new Date().toISOString()}</strong>
      </div>
      ${p("All headers, DNS authorization, and template formatting are configured correctly.")}
    `,
    cta: { label: "Open Admin Atelier", href: `${getSiteBaseUrl()}/admin` },
  });

  const html = shell(inner, `Test email diagnostic confirmation for ${appName}.`);

  return sendTransactionalEmail({
    to: params.to,
    subject,
    html,
    text: `Test email from ${appName}: Transactional pipeline operational at ${new Date().toISOString()}`,
    tags: [{ name: "type", value: "system-test" }],
  });
}
