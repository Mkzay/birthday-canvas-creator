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
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Shared design tokens ────────────────────────────────────────────────────
const CORAL     = "#E8572A";
const CORAL_MID = "#E8724A";
const CORAL_LT  = "#FCEEE8";
const CREAM     = "#FFF8F2";
const INK       = "#1A0A00";
const MUTED     = "#7A5540";
const BORDER    = "#F0D9CE";

// ─── Base shell ─────────────────────────────────────────────────────────────
function shell(innerHtml: string, preheader: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light dark"/>
  <title>WishCanvas</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    body, table, tr, td, div, p, a, span, h1 {
      font-family: Nunito, 'Segoe UI', Arial, sans-serif !important;
    }
    @media (prefers-color-scheme: dark) {
      .shell   { background: #140800 !important; }
      .card    { background: #1E0E04 !important; border-color: #3D1F0D !important; }
      .hero    { background: linear-gradient(135deg,#C0401A 0%,#A0300E 100%) !important; }
      .ink     { color: #FFF0E8 !important; }
      .muted   { color: #C4927A !important; }
      .cream   { background: #1E0E04 !important; }
      .divider { border-color: #3D1F0D !important; }
      .footer  { color: #7A5540 !important; }
      .cta-btn { background: linear-gradient(135deg,#FF7043,#E8572A) !important; }
      .pill    { background: rgba(232,87,42,0.2) !important; color: #FF9070 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F5EDE6;" class="shell">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="shell" style="background:#F5EDE6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
        <!-- wordmark -->
        <tr><td style="padding:0 4px 16px;font-family:Georgia,serif;font-size:13px;letter-spacing:0.12em;color:${MUTED};text-transform:uppercase;">
          WishCanvas
        </td></tr>
        <!-- card -->
        <tr><td class="card" style="border-radius:24px;overflow:hidden;background:#fff;border:1px solid ${BORDER};">
          ${innerHtml}
        </td></tr>
        <!-- footer -->
        <tr><td class="footer" style="padding:20px 4px 0;font-family:Georgia,serif;font-size:11px;color:${MUTED};letter-spacing:0.05em;text-align:center;">
          Sent with care by WishCanvas &nbsp;·&nbsp; <a href="${getSiteBaseUrl()}" style="color:${CORAL};text-decoration:none;">${getSiteBaseUrl().replace(/https?:\/\//, "")}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Hero block ──────────────────────────────────────────────────────────────
function hero(icon: string, eyebrow: string, title: string) {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td class="hero" style="background:linear-gradient(135deg,${CORAL} 0%,${CORAL_MID} 50%,#D4845A 100%);padding:24px 36px 20px;border-radius:24px 24px 0 0;position:relative;">
      <!-- blob decoration -->
      <div style="position:absolute;bottom:0;left:0;width:120px;height:60px;background:rgba(255,255,255,0.06);border-radius:0 60% 0 0;"></div>
      <div style="position:absolute;top:0;right:0;width:90px;height:50px;background:rgba(255,255,255,0.05);border-radius:0 24px 0 60%;"></div>

      <div style="font-size:32px;margin-bottom:8px;">${icon}</div>

      <div class="pill" style="display:inline-block;margin-bottom:10px;padding:4px 10px;border-radius:9999px;background:rgba(255,255,255,0.18);color:#fff;font-family:Georgia,serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">
        ${escapeHtml(eyebrow)}
      </div>

      <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;line-height:1.2;color:#ffffff;letter-spacing:-0.01em;">
        ${escapeHtml(title)}
      </h1>
    </td></tr>
  </table>`;
}

// ─── Body block ──────────────────────────────────────────────────────────────
function body(contentHtml: string, cta?: Cta, note?: string) {
  const ctaHtml = cta ? `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 20px;">
      <tr><td>
        <a href="${cta.href}" class="cta-btn" style="display:inline-block;padding:14px 28px;border-radius:9999px;background:linear-gradient(135deg,#FF7043,${CORAL});color:#ffffff;font-family:Georgia,serif;font-size:15px;font-weight:bold;text-decoration:none;letter-spacing:0.02em;">
          ${escapeHtml(cta.label)} &rarr;
        </a>
      </td></tr>
    </table>` : "";

  const noteHtml = note ? `
    <p style="margin:16px 0 0;font-family:Georgia,serif;font-size:12px;color:${MUTED};line-height:1.6;">
      ${note}
    </p>` : "";

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td class="cream" style="background:${CREAM};padding:32px 36px 36px;">
      <div class="ink" style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:${INK};">
        ${contentHtml}
      </div>
      ${ctaHtml}
      <hr class="divider" style="border:none;border-top:1px solid ${BORDER};margin:24px 0 20px;"/>
      <p class="muted" style="margin:0;font-family:Georgia,serif;font-size:12px;color:${MUTED};line-height:1.6;">
        If you didn't expect this email, you can safely ignore it.
      </p>
      <p class="muted" style="margin:12px 0 0;font-family:Georgia,serif;font-size:12px;color:${MUTED};line-height:1.6;">
        Need help? Email <a href="mailto:${escapeHtml(getSupportEmail())}" style="color:${CORAL};text-decoration:none;">${escapeHtml(getSupportEmail())}</a>.
      </p>
      ${noteHtml}
    </td></tr>
  </table>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;">${text}</p>`;
}

function highlight(text: string) {
  return `<span style="color:${CORAL};font-weight:bold;">${text}</span>`;
}

// ─── Feature row (used in welcome) ───────────────────────────────────────────
function featureRow(icon: string, label: string, desc: string) {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
    <tr>
      <td width="40" valign="top" style="padding-top:2px;">
        <div style="width:32px;height:32px;border-radius:50%;background:${CORAL_LT};display:flex;align-items:center;justify-content:center;font-size:16px;text-align:center;line-height:32px;">
          ${icon}
        </div>
      </td>
      <td style="padding-left:12px;">
        <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:14px;font-weight:bold;color:${INK};">${escapeHtml(label)}</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:${MUTED};line-height:1.5;">${escapeHtml(desc)}</p>
      </td>
    </tr>
  </table>`;
}

// ════════════════════════════════════════════════════════════════════════════
// WELCOME
// ════════════════════════════════════════════════════════════════════════════
export async function sendWelcomeEmail(params: { to: string; displayName?: string | null }) {
  const appName = getAppName();
  const safeName = escapeHtml(params.displayName?.trim() || "there");
  const dashboardUrl = `${getSiteBaseUrl()}/dashboard`;

  const inner = hero("🎨", "Welcome aboard", `You're in, ${safeName}`) +
    body(`
      ${p(`We're glad you're here. ${highlight("WishCanvas")} gives you one beautiful place to collect birthday wishes, photos, and memories.`)}
      ${p("Here's what you can do:")}
      ${featureRow("🔗", "One link, everyone contributes", "Share a single link with family and friends — no accounts needed for guests.")}
      ${featureRow("🎁", "Reveal on the big day", "Everything stays hidden until you're ready to present it.")}
      ${featureRow("🖼️", "Themes that feel personal", "Pick a look that fits the person you're celebrating.")}
    `,
    { label: "Open your dashboard", href: dashboardUrl },
    `Sent to ${params.to}`
  );

  const html = shell(inner, "Your WishCanvas account is ready. Let's build something beautiful.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Welcome to ${appName} 🎨`,
    html,
    text: `Welcome to ${appName}, ${safeName}. Your account is ready. Open your dashboard: ${dashboardUrl}`,
    tags: [{ name: "type", value: "welcome" }],
  });
}

// ════════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION
// ════════════════════════════════════════════════════════════════════════════
export async function sendVerificationEmail(params: { to: string; token: string; displayName?: string | null }) {
  const appName = getAppName();
  const safeName = escapeHtml(params.displayName?.trim() || "there");
  const url = `${getSiteBaseUrl()}/verify-email?token=${encodeURIComponent(params.token)}`;

  const inner = hero("✉️", "One last step", "Confirm your email address") +
    body(`
      ${p(`Hi ${safeName},`)}
      ${p(`You're almost set. Just click below to verify your email and activate your ${escapeHtml(appName)} account.`)}
      ${p("This link expires automatically — if it stops working, you can request a new one from the sign-in page.")}
      <p style="margin:0 0 8px;font-size:12px;color:${MUTED};font-family:Georgia,serif;">Or copy this link directly:</p>
      <p style="margin:0;font-size:12px;word-break:break-all;font-family:Georgia,serif;">
        <a href="${url}" style="color:${CORAL};text-decoration:none;">${escapeHtml(url)}</a>
      </p>
    `,
    { label: "Verify my email", href: url }
  );

  const html = shell(inner, "Verify your email to finish setting up your WishCanvas account.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Verify your email for ${appName}`,
    html,
    text: `Verify your email for ${appName}: ${url}`,
    tags: [{ name: "type", value: "verify-email" }],
  });
}

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET
// ════════════════════════════════════════════════════════════════════════════
export async function sendPasswordResetEmail(params: { to: string; token: string; displayName?: string | null }) {
  const appName = getAppName();
  const safeName = escapeHtml(params.displayName?.trim() || "there");
  const url = `${getSiteBaseUrl()}/auth?reset=${encodeURIComponent(params.token)}`;

  const inner = hero("🔑", "Account security", "Reset your password") +
    body(`
      ${p(`Hi ${safeName},`)}
      ${p(`We received a request to reset your ${escapeHtml(appName)} password. Click the button below to set a new one.`)}
      ${p(`${highlight("This link expires automatically.")} If you didn't request this, no changes have been made to your account, so you can safely ignore this email.`)}
      <p style="margin:0 0 8px;font-size:12px;color:${MUTED};font-family:Georgia,serif;">Backup link:</p>
      <p style="margin:0;font-size:12px;word-break:break-all;font-family:Georgia,serif;">
        <a href="${url}" style="color:${CORAL};text-decoration:none;">${escapeHtml(url)}</a>
      </p>
    `,
    { label: "Reset my password", href: url }
  );

  const html = shell(inner, "Use this link to reset your WishCanvas password.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Reset your ${appName} password`,
    html,
    text: `Reset your ${appName} password: ${url}`,
    tags: [{ name: "type", value: "password-reset" }],
  });
}

// ════════════════════════════════════════════════════════════════════════════
// BIRTHDAY RECIPIENT
// ════════════════════════════════════════════════════════════════════════════
export async function sendBirthdayRecipientEmail(params: {
  to: string;
  recipientName: string;
  publicCode: string;
  messageCount: number;
}) {
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "Friend");
  const messageLabel = params.messageCount === 1 ? "message" : "messages";
  const url = `${getSiteBaseUrl()}/birthday/${params.publicCode}`;

  const inner = hero("🎂", "Birthday reveal", `Happy Birthday, ${safeRecipientName}!`) +
    body(`
      ${p("The people who love you put something together.")}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 20px;">
        <tr>
          <td align="center" style="background:${CORAL_LT};border-radius:16px;padding:20px 24px;">
            <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:13px;color:${MUTED};letter-spacing:0.06em;text-transform:uppercase;">waiting for you inside</p>
            <p style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:bold;color:${CORAL};">${params.messageCount}</p>
            <p style="margin:4px 0 0;font-family:Georgia,serif;font-size:14px;color:${MUTED};">${messageLabel}</p>
          </td>
        </tr>
      </table>
      ${p("Notes, photos, voice messages — all in one place, just for you.")}
    `,
    { label: "Open your birthday page 🎁", href: url },
    "Made with care in WishCanvas"
  );

  const html = shell(inner, "Your birthday story is ready. Open it to see the full reveal.");

  await sendTransactionalEmail({
    to: params.to,
    subject: `Your birthday story is ready, ${params.recipientName} 🎂`,
    html,
    text: `Happy Birthday, ${params.recipientName}. Your story is ready with ${params.messageCount} ${messageLabel}. Open: ${url}`,
    tags: [{ name: "type", value: "birthday-recipient" }],
  });
}

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
  const safeSenderName = escapeHtml(params.senderName.trim() || "Someone");
  const pageUrl = `${getSiteBaseUrl()}/preview/${params.pageCode}`;

  const inner = hero("💬", "New wish received", `A message arrived for ${safeRecipientName}`) +
    body(`
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`${safeSenderName} just left a new wish on ${highlight(escapeHtml(params.recipientName))}.`)}
      ${p(`You now have ${highlight(String(params.messageCount))} total ${params.messageCount === 1 ? "wish" : "wishes"} collected.`)}
      ${p("Open your dashboard to review the new message and keep the celebration moving.")}
    `,
    { label: "View birthday page", href: pageUrl },
    "You can turn off these alerts from your notification settings."
  );

  const html = shell(inner, `A new birthday wish just came in for ${params.recipientName}.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `New wish for ${params.recipientName}`,
    html,
    text: `${params.senderName} just left a new wish for ${params.recipientName}. Open: ${pageUrl}`,
    tags: [{ name: "type", value: "new-message-alert" }],
  });
}

export async function sendBirthdayReminderEmail(params: {
  to: string;
  ownerName?: string | null;
  recipientName: string;
  publicCode: string;
  messageCount: number;
  birthdayDate: string;
}) {
  const safeOwnerName = escapeHtml(params.ownerName?.trim() || "there");
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "your page");
  const pageUrl = `${getSiteBaseUrl()}/preview/${params.publicCode}`;

  const inner = hero("🎂", "Birthday reminder", `Today is ${safeRecipientName}'s day`) +
    body(`
      ${p(`Hi ${safeOwnerName},`)}
      ${p(`Today is the birthday you set for ${highlight(escapeHtml(params.recipientName))}.`)}
      ${p(`You’ve collected ${highlight(String(params.messageCount))} ${params.messageCount === 1 ? "wish" : "wishes"} so far.`)}
      ${p("Open the page now to review everything before you share the reveal.")}
    `,
    { label: "Open the birthday page", href: pageUrl },
    `Birthday date: ${escapeHtml(params.birthdayDate)}`
  );

  const html = shell(inner, `Birthday reminder for ${params.recipientName}.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `Birthday reminder for ${params.recipientName}`,
    html,
    text: `Reminder: today is ${params.recipientName}'s birthday. Open: ${pageUrl}`,
    tags: [{ name: "type", value: "birthday-reminder" }],
  });
}

export async function sendPoolReleaseRequestEmail(params: {
  to: string;
  ownerName?: string | null;
  recipientName: string;
  pageCode: string;
}) {
  const safeOwnerName = escapeHtml(params.ownerName?.trim() || "there");
  const safeRecipientName = escapeHtml(params.recipientName.trim() || "the recipient");
  const pageUrl = `${getSiteBaseUrl()}/birthday/${params.pageCode}`;

  const inner = hero("🎁", "Gift request", `${safeRecipientName} requested the gift`) +
    body(`
      ${p(`Hi ${safeOwnerName},`) }
      ${p(`${safeRecipientName} just requested that you release their pooled birthday gift.`)}
      ${p("A 2% payout fee will be deducted from the pool total before transfer is sent.")}
      ${p("Open the birthday page to confirm and release the payout.")}
    `,
    { label: "Open release page", href: pageUrl },
    "If you've already released it, you can ignore this email."
  );

  const html = shell(inner, `${params.recipientName} requested gift release.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `${params.recipientName} requested their birthday gift`,
    html,
    text: `${params.recipientName} requested gift release. Open: ${pageUrl}`,
    tags: [{ name: "type", value: "gift-release-request" }],
  });
}

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

  const inner = hero("🎉", "Celebration Canvas", `Your page for ${safeRecipientName} is ready`) +
    body(`
      ${p(`Hi there,`)}
      ${p(`You just created a celebration canvas for ${highlight(safeRecipientName)} on WishCanvas.`)}
      ${p(`Share your contributor link with friends and family so they can leave heartfelt messages, photos, and voice notes:`)}
      <div style="background:#FFF3ED;border:1px solid #F0D9CE;border-radius:12px;padding:12px;margin:16px 0;word-break:break-all;">
        <span style="font-size:11px;font-weight:bold;color:#7A5540;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px;">Shareable Contributor Link</span>
        <a href="${contributeUrl}" style="color:#E8572A;font-weight:700;text-decoration:underline;font-size:14px;">${contributeUrl}</a>
      </div>
      ${p(`You can also preview how the celebration looks anytime:`)}
      <div style="margin:12px 0;">
        <a href="${previewUrl}" style="color:#1A0A00;font-weight:600;text-decoration:underline;font-size:13px;">View Live Preview</a>
      </div>
      <div style="border-top:1px solid #F0D9CE;margin:24px 0 16px;padding-top:16px;">
        <span style="display:inline-block;background:#FFE4D6;color:#C0401A;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Important Notice</span>
        ${p(`Because you created this canvas as a guest, editing and wish moderation are locked. To unlock editing, manage wishes, and keep this canvas in your creator atelier, claim your canvas below:`)}
      </div>
    `,
    { label: "Claim Your Canvas Now", href: claimUrl },
    "Create your account password to claim this canvas and unlock full editing."
  );

  const html = shell(inner, `Your celebration canvas for ${params.recipientName} is live.`);

  await sendTransactionalEmail({
    to: params.to,
    subject: `Your celebration canvas for ${params.recipientName} is live! 🎉`,
    html,
    text: `Your celebration canvas for ${params.recipientName} is live!\n\nContributor link: ${contributeUrl}\nPreview link: ${previewUrl}\n\nClaim your canvas: ${claimUrl}`,
    tags: [{ name: "type", value: "guest-canvas-created" }],
  });
}
