type MailTag = {
  name: string;
  value: string;
};

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: MailTag[];
};

type ResendEmailResponse = {
  id?: string;
  error?: {
    message?: string;
    name?: string;
  };
};

function normalizeRecipients(to: string | string[]) {
  return Array.isArray(to) ? to : [to];
}

export function isMailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function getMailerConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const defaultReplyTo = process.env.EMAIL_REPLY_TO?.trim();

  if (!apiKey || !from) {
    throw new Error("Resend is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }

  return { apiKey, from, defaultReplyTo };
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  const { apiKey, from, defaultReplyTo } = getMailerConfig();
  const recipients = normalizeRecipients(params.to).map((value) => value.trim()).filter(Boolean);

  if (!recipients.length) {
    throw new Error("No email recipient provided.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo || defaultReplyTo || undefined,
      tags: params.tags,
    }),
  });

  const data = (await response.json()) as ResendEmailResponse;

  if (!response.ok || data.error) {
    const message = data.error?.message || `Resend request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    id: data.id || null,
  };
}

