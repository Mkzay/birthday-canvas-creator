import { z } from "zod";

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{4,38}[a-z0-9])$/;
const revealPinPattern = /^\d{4,12}$/;

/** Public page id (UUID) or public_code — length bound only; value is parameterized in SQL. */
export const pageIdParamSchema = z.object({
  id: z.string().min(1).max(80),
});

export const themeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const pageMessageParamsSchema = z.object({
  id: z.string().min(1).max(80),
  messageId: z.string().uuid(),
});

export const pagePhotoParamsSchema = z.object({
  id: z.string().min(1).max(80),
  photoId: z.string().uuid(),
});

export const signupBodySchema = z.object({
  email: z.string().email().max(320).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(6).max(256),
  displayName: z.union([z.string().max(120), z.null()]).optional(),
  claimToken: z.string().max(120).optional(),
  publicCode: z.string().max(80).optional(),
});

export const loginBodySchema = z.object({
  email: z.string().email().max(320).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1).max(256),
  rememberMe: z.boolean().optional(),
});

export const emailBodySchema = z.object({
  email: z.string().email().max(320).transform((s) => s.trim().toLowerCase()),
});

export const tokenBodySchema = z.object({
  token: z.string().min(10).max(512).transform((s) => s.trim()),
});

export const passwordResetConfirmBodySchema = z.object({
  token: z.string().min(10).max(512).transform((s) => s.trim()),
  password: z.string().min(6).max(256),
});

export const profilePatchBodySchema = z.object({
  displayName: z.union([z.string().max(120), z.null()]).optional(),
  avatarUrl: z.string().max(2000).optional(),
});

export const preferencesPatchBodySchema = z.object({
  defaultTheme: z.string().min(1).max(64).optional(),
  defaultAllowPhotos: z.boolean().optional(),
  defaultAllowAudio: z.boolean().optional(),
  defaultRequireNames: z.boolean().optional(),
});

export const notificationsPatchBodySchema = z.object({
  emailNotifications: z.boolean().optional(),
  newMessageNotifications: z.boolean().optional(),
  birthdayReminders: z.boolean().optional(),
});

export const passwordChangeBodySchema = z.object({
  password: z.string().min(6).max(256),
});

export const themeCreateBodySchema = z.object({
  name: z.string().min(1).max(120),
  emoji: z.string().max(20).optional(),
  gradientFrom: z.string().max(32).optional(),
  gradientTo: z.string().max(32).optional(),
  gradientMid: z.union([z.string().max(32), z.null()]).optional(),
  gradientAngle: z.coerce.number().min(0).max(360).optional(),
  accentColor: z.union([z.string().max(32), z.null()]).optional(),
  font: z.string().max(32).optional(),
  iconUrl: z.union([z.string().max(2000), z.null()]).optional(),
});

export const themePatchBodySchema = themeCreateBodySchema.partial();

export const paystackInitializeBodySchema = z.object({
  callbackPath: z.string().max(200).optional(),
});

export const paystackVerifyBodySchema = z.object({
  reference: z.string().min(6).max(120).transform((s) => s.trim()),
});

export const bachsInitializeBodySchema = z.object({
  callbackPath: z.string().max(200).optional(),
});

export const bachsVerifyBodySchema = z.object({
  checkoutId: z.string().min(6).max(120).transform((s) => s.trim()).optional(),
  reference: z.string().min(6).max(120).transform((s) => s.trim()).optional(),
});

export const poolContributionInitializeBodySchema = z.object({
  amountKobo: z.coerce.number().int().min(100).max(500000000),
  contributorName: z.union([z.string().max(120), z.null()]).optional(),
  contributorEmail: z.union([z.string().email().max(320), z.null()]).optional(),
  callbackPath: z.string().max(200).optional(),
});

export const poolReleaseBodySchema = z.object({
  token: z.string().max(120).optional(),
});

export const adminPoolReconcileBodySchema = z.object({
  reference: z.string().min(6).max(120).transform((s) => s.trim()).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  includeFailed: z.boolean().optional(),
});

export const paystackResolveAccountBodySchema = z.object({
  bankCode: z.string().trim().min(2).max(12),
  accountNumber: z.string().trim().regex(/^\d{10,20}$/),
});

const displayModeSchema = z.enum(["story", "freeform", "bento"]);

export const pageCreateBodySchema = z.object({
  guestEmail: z.union([z.string().email().max(320), z.literal(""), z.null()]).optional(),
  recipientEmail: z.union([z.string().email().max(320), z.literal(""), z.null()]).optional(),
  recipientName: z.string().max(200).optional(),
  birthdayDate: dateYmd,
  theme: z.string().max(80).optional(),
  letterTheme: z.string().max(80).optional(),
  displayMode: displayModeSchema.optional(),
  letterColor: z.union([z.string().max(32), z.null()]).optional(),
  creatorMessage: z.union([z.string().max(5000), z.null()]).optional(),
  soundtrackId: z.string().max(64).optional(),
  pageCustomAudioUrl: z.union([z.string().max(2000), z.null()]).optional(),
  allowPhotos: z.boolean().optional(),
  allowAudio: z.boolean().optional(),
  requireNames: z.boolean().optional(),
  closeDate: dateYmd.optional(),
  revealAt: z.union([z.string().datetime(), z.null()]).optional(),
  revealPin: z.union([z.string().regex(revealPinPattern, "PIN must be 4-12 digits."), z.null()]).optional(),
  publicCode: z.string().regex(slugPattern, "Public code must be 6-40 chars and use lowercase letters, numbers, and hyphens.").optional(),
  poolFundraisingEnabled: z.boolean().optional(),
  poolGoalKobo: z.coerce.number().int().min(0).max(500000000).optional(),
  poolDescription: z.union([z.string().max(500), z.null()]).optional(),
  recipientBankCode: z.union([z.string().max(12), z.null()]).optional(),
  recipientAccountNumber: z.union([z.string().regex(/^\d{10,20}$/), z.null()]).optional(),
  recipientAccountName: z.union([z.string().max(160), z.null()]).optional(),
});

export const pagePatchBodySchema = z.object({
  recipientName: z.string().max(200).optional(),
  recipientEmail: z.union([z.string().email().max(320), z.literal(""), z.null()]).optional(),
  birthdayDate: dateYmd.optional(),
  theme: z.string().max(80).optional(),
  letterTheme: z.string().max(80).optional(),
  displayMode: displayModeSchema.optional(),
  creatorMessage: z.union([z.string().max(5000), z.null()]).optional(),
  soundtrackId: z.string().max(64).optional(),
  allowPhotos: z.boolean().optional(),
  allowAudio: z.boolean().optional(),
  requireNames: z.boolean().optional(),
  closeDate: dateYmd.optional(),
  revealAt: z.union([z.string().datetime(), z.null()]).optional(),
  revealPin: z.union([z.string().regex(revealPinPattern, "PIN must be 4-12 digits."), z.null()]).optional(),
  publicCode: z.union([z.string().regex(slugPattern, "Public code must be 6-40 chars and use lowercase letters, numbers, and hyphens."), z.null()]).optional(),
  coverPhotoUrl: z.union([z.string().max(2000), z.null()]).optional(),
  pageCustomAudioUrl: z.union([z.string().max(2000), z.null()]).optional(),
  letterColor: z.union([z.string().max(32), z.null()]).optional(),
  poolFundraisingEnabled: z.boolean().optional(),
  poolGoalKobo: z.union([z.coerce.number().int().min(0).max(500000000), z.null()]).optional(),
  poolDescription: z.union([z.string().max(500), z.null()]).optional(),
  recipientBankCode: z.union([z.string().max(12), z.null()]).optional(),
  recipientAccountNumber: z.union([z.string().regex(/^\d{10,20}$/), z.null()]).optional(),
  recipientAccountName: z.union([z.string().max(160), z.null()]).optional(),
});

export const publicUnlockBodySchema = z.object({
  pin: z.string().regex(revealPinPattern, "PIN must be 4-12 digits."),
});

const contributionPhotoSchema = z.object({
  url: z.string().min(1).max(2000),
  caption: z.union([z.string().max(500), z.null()]).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const contributionStickerSchema = z.object({
  stickerType: z.string().min(1).max(50),
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100),
  rotation: z.number().min(-360).max(360).optional(),
  scale: z.number().min(0.1).max(5).optional(),
});

export const publicMessageBodySchema = z.object({
  senderName: z.string().max(120).optional(),
  message: z.string().min(1).max(20000),
  photoUrl: z.union([z.string().max(2000), z.null()]).optional(),
  audioUrl: z.union([z.string().max(2000), z.null()]).optional(),
  photos: z.array(contributionPhotoSchema).max(12).optional(),
  stickers: z.array(contributionStickerSchema).max(20).optional(),
  contributionAmountKobo: z.union([z.coerce.number().int().min(0).max(500000000), z.null()]).optional(),
});

export const publicMessageEditBodySchema = z.object({
  senderName: z.string().max(120).optional(),
  message: z.string().min(1).max(20000),
  photoUrl: z.union([z.string().max(2000), z.null()]).optional(),
  audioUrl: z.union([z.string().max(2000), z.null()]).optional(),
  photos: z.array(contributionPhotoSchema).max(12).optional(),
  stickers: z.array(contributionStickerSchema).max(20).optional(),
});

export const uploadPageIdBodySchema = z.object({
  pageId: z.string().min(1).max(80),
  claimToken: z.string().max(120).optional(),
});

export const systemTestEmailBodySchema = z.object({
  to: z.string().email().max(320).optional(),
  subject: z.string().max(200).optional(),
});

export const birthdayNotifyBodySchema = z.object({
  date: dateYmd.optional(),
  dryRun: z.boolean().optional(),
});

export const cronNotifyBodySchema = z.object({
  date: dateYmd.optional(),
  dryRun: z.boolean().optional(),
  secret: z.string().max(256).optional(),
});
