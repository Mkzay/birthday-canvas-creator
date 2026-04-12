export type SystemStatusPayload = {
  ok: boolean;
  checks: {
    db: { ok: boolean; latency_ms?: number; error?: string };
    uploads: { ok: boolean; error?: string };
  };
  ts: string;
  latency_ms: number;
  meta?: { node_env?: string };
  stats?: {
    total_users: number;
    total_pages: number;
    total_visitors: number;
  };
};

export type AdminBirthdayRow = {
  id: string;
  public_code: string;
  recipient_name: string;
  recipient_email: string | null;
  birthday_date: string;
  reveal_at: string | null;
  close_date: string | null;
  theme: string;
  status: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  pool_fundraising_enabled: boolean;
  pooled_amount_kobo: number;
  owner_user_id: string;
  owner_display_name: string | null;
  owner_email: string;
  owner_plan_tier: string;
  message_count: number;
};

export type BirthdayNotifyResult = {
  pageId: string;
  publicCode: string;
  recipientName: string;
  birthdayDate: string;
  messageCount: number;
  recipientEmail: string | null;
  ownerEmail: string | null;
  ownerWillBeNotified: boolean;
  recipientDeliveryEmail: string | null;
  sent: boolean;
  reason?: string;
};

export type BirthdayNotifyPayload = {
  ok: boolean;
  dryRun: boolean;
  date: string;
  total: number;
  sent: number;
  results: BirthdayNotifyResult[];
};
