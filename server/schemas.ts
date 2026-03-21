import { z } from "zod";

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

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

export const pageCreateBodySchema = z.object({
  recipientEmail: z.union([z.string().email().max(320), z.literal(""), z.null()]).optional(),
  recipientName: z.string().max(200).optional(),
  birthdayDate: dateYmd,
  theme: z.string().max(80).optional(),
  creatorMessage: z.union([z.string().max(5000), z.null()]).optional(),
  soundtrackId: z.string().max(64).optional(),
  pageCustomAudioUrl: z.union([z.string().max(2000), z.null()]).optional(),
  allowPhotos: z.boolean().optional(),
  allowAudio: z.boolean().optional(),
  requireNames: z.boolean().optional(),
  closeDate: dateYmd.optional(),
});

export const pagePatchBodySchema = z.object({
  recipientName: z.string().max(200).optional(),
  recipientEmail: z.union([z.string().email().max(320), z.literal(""), z.null()]).optional(),
  birthdayDate: dateYmd.optional(),
  theme: z.string().max(80).optional(),
  creatorMessage: z.union([z.string().max(5000), z.null()]).optional(),
  soundtrackId: z.string().max(64).optional(),
  allowPhotos: z.boolean().optional(),
  allowAudio: z.boolean().optional(),
  requireNames: z.boolean().optional(),
  closeDate: dateYmd.optional(),
  coverPhotoUrl: z.union([z.string().max(2000), z.null()]).optional(),
  pageCustomAudioUrl: z.union([z.string().max(2000), z.null()]).optional(),
  letterColor: z.union([z.string().max(32), z.null()]).optional(),
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
});

export const uploadPageIdBodySchema = z.object({
  pageId: z.string().min(1).max(80),
});

export const systemTestEmailBodySchema = z.object({
  to: z.string().email().max(320).optional(),
  subject: z.string().max(200).optional(),
});

export const birthdayNotifyBodySchema = z.object({
  date: dateYmd.optional(),
});

export const cronNotifyBodySchema = z.object({
  date: dateYmd.optional(),
  secret: z.string().max(256).optional(),
});
