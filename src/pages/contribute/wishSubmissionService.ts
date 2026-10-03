import { apiFetch, apiForm } from '@/lib/api';
import type { PendingPhoto, ContributorWishResponse } from './types';
import type { StickerData } from '@/components/StickerPicker';

export interface UploadedPhoto {
  url: string;
  caption: string | null;
}

export interface WishPayload {
  senderName: string;
  message: string;
  photos: UploadedPhoto[];
  audioUrl: string | null;
  stickers: StickerData[];
}

export interface SubmissionResponse {
  id: string;
  editToken?: string;
}

/**
 * Uploads all non-existing pending photos to the public photo upload endpoint.
 */
export async function uploadPendingPhotos(
  pageId: string,
  photos: PendingPhoto[],
): Promise<UploadedPhoto[]> {
  if (!pageId || !photos.length) return [];

  const uploads = await Promise.all(
    photos.map(async (photo) => {
      if (photo.existingUrl) {
        return {
          url: photo.existingUrl,
          caption: photo.caption.trim() || null,
        };
      }

      if (!photo.file) return null;

      const formData = new FormData();
      formData.append('file', photo.file);

      const data = await apiForm<{ url: string }>(`/public/pages/${pageId}/message-photo`, formData);
      return {
        url: data.url,
        caption: photo.caption.trim() || null,
      };
    }),
  );

  return uploads.filter(Boolean) as UploadedPhoto[];
}

/**
 * Uploads an audio voice note file to the public audio upload endpoint.
 */
export async function uploadPendingAudio(
  pageId: string,
  audioFile: File,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioFile);
  const data = await apiForm<{ url: string }>(`/public/pages/${pageId}/message-audio`, formData);
  return data.url;
}

/**
 * Submits a new wish message.
 */
export async function postWishMessage(
  pageId: string,
  payload: WishPayload,
): Promise<SubmissionResponse> {
  return apiFetch<SubmissionResponse>(`/public/pages/${pageId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates an existing wish message using its edit token.
 */
export async function updateWishMessage(
  pageId: string,
  messageId: string,
  editToken: string,
  payload: Omit<WishPayload, 'stickers'>,
): Promise<void> {
  await apiFetch(`/public/pages/${pageId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'x-wish-edit-token': editToken,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Loads a wish for editing using its private edit token.
 */
export async function fetchWishForEditing(
  pageId: string,
  editToken: string,
): Promise<ContributorWishResponse> {
  return apiFetch<ContributorWishResponse>(`/public/pages/${pageId}/my-wish`, {
    headers: {
      'x-wish-edit-token': editToken,
    },
  });
}

/**
 * Soft deletes a wish message.
 */
export async function deleteWishMessage(
  pageId: string,
  editToken: string,
): Promise<void> {
  await apiFetch(`/public/pages/${pageId}/my-wish`, {
    method: 'DELETE',
    headers: {
      'x-wish-edit-token': editToken,
    },
  });
}

/**
 * Undoes deletion of a wish message.
 */
export async function undoDeleteWishMessage(
  pageId: string,
  editToken: string,
): Promise<ContributorWishResponse> {
  return apiFetch<ContributorWishResponse>(`/public/pages/${pageId}/my-wish/undo-delete`, {
    method: 'POST',
    headers: {
      'x-wish-edit-token': editToken,
    },
  });
}

/**
 * Initializes a Paystack checkout for gift pool fundraising contribution.
 */
export async function initializePoolPayment(
  pageId: string,
  payload: {
    amountKobo: number;
    contributorName: string | null;
    contributorEmail: string | null;
  },
): Promise<string> {
  const result = await apiFetch<{ authorizationUrl: string; accessCode?: string }>(
    `/public/pages/${pageId}/pool/initialize`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return result.authorizationUrl;
}
