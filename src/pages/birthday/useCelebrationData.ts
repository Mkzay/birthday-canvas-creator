import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/lib/api';
import { parseLocalDate } from '@/lib/date';
import { formatNairaFromKobo } from './formatUtils';
import type {
  BirthdayPageData,
  Message,
  PoolSummaryState,
  PrivatePoolSummary,
  PublicPoolSummary,
} from './types';

export interface UseCelebrationDataOptions {
  pageId: string | undefined;
  isPreview: boolean;
  user: { planTier?: string; isPro?: boolean; is_pro?: boolean } | null;
  navigate: NavigateFunction;
}

export interface UseCelebrationDataReturn {
  page: BirthdayPageData | null;
  setPage: React.Dispatch<React.SetStateAction<BirthdayPageData | null>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  loading: boolean;
  isSaved: boolean;
  isPageOwner: boolean;
  poolSummary: PoolSummaryState;
  setPoolSummary: React.Dispatch<React.SetStateAction<PoolSummaryState>>;
  releasingPoolPayout: boolean;
  requestingGiftRelease: boolean;
  unlockPin: string;
  setUnlockPin: React.Dispatch<React.SetStateAction<string>>;
  unlocking: boolean;
  nowMs: number;
  hasReachedBirthdayDate: boolean;
  isBeforeBirthday: boolean;
  birthdayDate: Date;
  requiresUnlock: boolean;
  isUnlocked: boolean;
  fetchData: () => Promise<void>;
  handleUnlock: () => Promise<void>;
  handleReleasePoolPayout: () => Promise<void>;
  handleRequestGiftRelease: () => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleDeletePhoto: (photoId: string, messageId: string) => Promise<void>;
  handleDeleteAudio: (messageId: string) => Promise<void>;
  toggleSavePage: () => Promise<void>;
}

export function useCelebrationData({
  pageId,
  isPreview,
  user,
  navigate,
}: UseCelebrationDataOptions): UseCelebrationDataReturn {
  const [page, setPage] = useState<BirthdayPageData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isPageOwner, setIsPageOwner] = useState(false);
  const [poolSummary, setPoolSummary] = useState<PoolSummaryState>({
    pool_fundraising_enabled: false,
    pool_goal_kobo: null,
    pooled_amount_kobo: 0,
    pool_description: null,
    contributors: [],
    is_requested: false,
    is_released: false,
  });
  const [releasingPoolPayout, setReleasingPoolPayout] = useState(false);
  const [requestingGiftRelease, setRequestingGiftRelease] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (isPreview || page?.is_revealed !== false) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPreview, page?.is_revealed]);

  const fetchData = useCallback(async () => {
    if (!pageId) return;

    try {
      if (isPreview) {
        const [pageData, messagesData, publicPoolSummary] = await Promise.all([
          apiFetch<BirthdayPageData>(`/pages/${pageId}`),
          apiFetch<Message[]>(`/pages/${pageId}/messages`),
          apiFetch<PublicPoolSummary>(`/public/pages/${pageId}/pool/summary`).catch(() => null),
        ]);

        setPage({
          ...pageData,
          is_revealed: true,
          is_unlocked: true,
          requires_unlock: false,
          owner_plan_tier: user?.planTier === 'pro' || Boolean(user?.isPro || user?.is_pro) ? 'pro' : 'free',
          message_count: messagesData.length,
        });
        setMessages(messagesData);
        setIsPageOwner(true);
        setPoolSummary({
          pool_fundraising_enabled: Boolean(pageData.pool_fundraising_enabled),
          pool_goal_kobo: pageData.pool_goal_kobo ?? null,
          pooled_amount_kobo: Number(publicPoolSummary?.pooled_amount_kobo ?? pageData.pooled_amount_kobo ?? 0),
          pool_description: pageData.pool_description || null,
          contributors: publicPoolSummary?.contributors || [],
          is_requested: Boolean(publicPoolSummary?.is_requested),
          is_released: false,
        });
        return;
      }

      const publicPage = await apiFetch<BirthdayPageData & { pool_summary?: PublicPoolSummary; messages?: Message[] }>(`/public/pages/${pageId}`);
      const hasReachedBirthdayByDate = (() => {
        const parsedBirthday = parseLocalDate(publicPage.birthday_date);
        if (Number.isNaN(parsedBirthday.getTime())) return false;
        return Date.now() >= parsedBirthday.getTime();
      })();
      const normalizedPublicPage =
        hasReachedBirthdayByDate && !publicPage.is_revealed
          ? { ...publicPage, is_revealed: true }
          : publicPage;

      setPage(normalizedPublicPage);

      if (publicPage.pool_summary) {
        setPoolSummary({
          pool_fundraising_enabled: Boolean(publicPage.pool_summary.pool_fundraising_enabled),
          pool_goal_kobo: publicPage.pool_summary.pool_goal_kobo ?? null,
          pooled_amount_kobo: Number(publicPage.pool_summary.pooled_amount_kobo || 0),
          pool_description: publicPage.pool_summary.pool_description || null,
          contributors: publicPage.pool_summary.contributors || [],
          is_requested: Boolean(publicPage.pool_summary.is_requested),
          is_released: false,
        });
      } else {
        const publicPoolSummary = await apiFetch<PublicPoolSummary>(`/public/pages/${pageId}/pool/summary`).catch(() => null);
        setPoolSummary({
          pool_fundraising_enabled: Boolean(publicPoolSummary?.pool_fundraising_enabled ?? publicPage.pool_fundraising_enabled),
          pool_goal_kobo: publicPoolSummary?.pool_goal_kobo ?? publicPage.pool_goal_kobo ?? null,
          pooled_amount_kobo: Number(publicPoolSummary?.pooled_amount_kobo ?? publicPage.pooled_amount_kobo ?? 0),
          pool_description: publicPoolSummary?.pool_description ?? publicPage.pool_description ?? null,
          contributors: publicPoolSummary?.contributors || [],
          is_requested: Boolean(publicPoolSummary?.is_requested),
          is_released: false,
        });
      }

      if (pageId && /^[0-9a-f-]{36}$/i.test(pageId) && normalizedPublicPage.public_code) {
        navigate(`/birthday/${normalizedPublicPage.public_code}`, { replace: true });
      }

      if (Array.isArray(publicPage.messages) && publicPage.messages.length > 0) {
        setMessages(publicPage.messages);
      } else if (normalizedPublicPage.is_revealed && normalizedPublicPage.is_unlocked !== false) {
        try {
          const messagesData = await apiFetch<Message[]>(`/public/pages/${pageId}/messages`);
          setMessages(messagesData);
        } catch (error) {
          if (error instanceof ApiError && error.code === 'PIN_REQUIRED') {
            setMessages([]);
          } else {
            throw error;
          }
        }
      } else {
        setMessages([]);
      }

      if (user) {
        try {
          const [status, ownerStatus, privatePoolSummary] = await Promise.all([
            apiFetch<{ isSaved: boolean }>(`/pages/${pageId}/save-status`),
            apiFetch<{ isOwner: boolean }>(`/pages/${pageId}/ownership`).catch(() => null),
            apiFetch<PrivatePoolSummary>(`/pages/${pageId}/pool/summary`).catch(() => null),
          ]);

          setIsSaved(status.isSaved);
          setIsPageOwner(Boolean(ownerStatus?.isOwner));

          if (privatePoolSummary) {
            setPoolSummary((current) => ({
              ...current,
              pool_fundraising_enabled: Boolean(privatePoolSummary.pool_fundraising_enabled),
              pool_goal_kobo: privatePoolSummary.pool_goal_kobo,
              pooled_amount_kobo: Number(privatePoolSummary.pooled_amount_kobo || 0),
              pool_description: privatePoolSummary.pool_description,
              contributors: privatePoolSummary.contributors || current.contributors,
              is_requested: Boolean(privatePoolSummary.is_requested),
              is_released: Boolean(privatePoolSummary.is_released),
            }));
          }
        } catch {
          setIsPageOwner(false);
        }
      } else {
        setIsSaved(false);
        setIsPageOwner(false);
      }
    } catch (error) {
      console.error(error);
      setPage(null);
      setMessages([]);
      setIsPageOwner(false);
    } finally {
      setLoading(false);
    }
  }, [isPreview, navigate, pageId, user]);

  const handleUnlock = useCallback(async () => {
    if (!pageId || !unlockPin.trim()) {
      toast.error('Enter your PIN to unlock this page');
      return;
    }

    setUnlocking(true);
    try {
      await apiFetch<{ unlocked: boolean }>(`/public/pages/${pageId}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ pin: unlockPin.trim() }),
      });
      toast.success('Birthday page unlocked');
      setUnlockPin('');
      await fetchData();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PIN_INVALID') {
        toast.error('Incorrect PIN. Please try again.');
      } else {
        toast.error('Could not unlock this page right now');
      }
    } finally {
      setUnlocking(false);
    }
  }, [fetchData, pageId, unlockPin]);

  const handleReleasePoolPayout = useCallback(async () => {
    if (!pageId || !page) return;
    if (!poolSummary.pool_fundraising_enabled) {
      toast.error('Pool gifting is not enabled for this page');
      return;
    }

    setReleasingPoolPayout(true);
    try {
      const payout = await apiFetch<{
        amount_kobo?: number;
        payout_fee_kobo?: number;
        gross_pool_amount_kobo?: number;
      }>(`/pages/${pageId}/pool/release`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });

      const amountKobo = Number(payout.amount_kobo || poolSummary.pooled_amount_kobo || 0);
      const payoutFeeKobo = Number(payout.payout_fee_kobo || 0);
      toast.success(
        payoutFeeKobo > 0
          ? `Payout released: ${formatNairaFromKobo(amountKobo)} (2% payout fee: ${formatNairaFromKobo(payoutFeeKobo)})`
          : `Payout released: ${formatNairaFromKobo(amountKobo)}`,
      );
      setPoolSummary((current) => ({ ...current, is_released: true }));
      await fetchData();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PAYOUT_TOO_EARLY') {
        toast.error('Payout can be released only after reveal time');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_EMPTY') {
        toast.error('No pooled amount available yet');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_ACCOUNT_REQUIRED') {
        toast.error('Recipient bank details are incomplete');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_ALREADY_RELEASED') {
        toast.info('Payout has already been released for this page');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_PROVIDER_ACCOUNT_UNVERIFIED') {
        toast.error(
          error.message ||
            'Payouts are temporarily unavailable while we finish verifying our payout provider account. Please try again later.',
        );
      } else if (
        error instanceof ApiError &&
        (error.code === 'PAYOUT_FAILED' ||
          error.code === 'PAYOUT_PROVIDER_NOT_CONFIGURED' ||
          error.code === 'PAYOUT_PROVIDER_BALANCE_LOW' ||
          error.code === 'PAYOUT_PROVIDER_TRANSFER_DISABLED' ||
          error.code === 'PAYOUT_PROVIDER_OTP_REQUIRED' ||
          error.code === 'PAYOUT_PROVIDER_REJECTED')
      ) {
        toast.error(error.message || 'Could not release payout right now');
      } else {
        toast.error('Could not release payout right now');
      }
    } finally {
      setReleasingPoolPayout(false);
    }
  }, [fetchData, page, pageId, poolSummary.pool_fundraising_enabled, poolSummary.pooled_amount_kobo]);

  const handleRequestGiftRelease = useCallback(async () => {
    if (!pageId || !page) return;
    if (!poolSummary.pool_fundraising_enabled || poolSummary.pooled_amount_kobo <= 0) {
      toast.error('No pooled gift is available yet');
      return;
    }

    setRequestingGiftRelease(true);
    try {
      await apiFetch(`/public/pages/${pageId}/pool/request-release`, {
        method: 'POST',
      });
      toast.success("Your gift is on it's way");
      setPoolSummary((current) => ({ ...current, is_requested: true }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PAYOUT_ALREADY_RELEASED') {
        toast.info('This gift has already been released');
      } else if (error instanceof ApiError && error.code === 'PAYOUT_ALREADY_REQUESTED') {
        toast.info('Gift request already sent to the organizer');
        setPoolSummary((current) => ({ ...current, is_requested: true }));
      } else if (error instanceof ApiError && error.code === 'PAYOUT_TOO_EARLY') {
        toast.error('Gift can only be requested after reveal time');
      } else {
        toast.error('Could not request gift release right now');
      }
    } finally {
      setRequestingGiftRelease(false);
    }
  }, [page, pageId, poolSummary.pool_fundraising_enabled, poolSummary.pooled_amount_kobo]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!isPreview || !pageId) {
      return;
    }

    try {
      await apiFetch(`/pages/${pageId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleDeletePhoto = async (photoId: string, messageId: string) => {
    if (!isPreview || !pageId) {
      return;
    }

    try {
      await apiFetch(`/pages/${pageId}/messages/photos/${photoId}`, {
        method: 'DELETE',
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          const newPhotos = msg.photos?.filter((p) => p.id !== photoId);
          const newPhotoUrl = msg.photo_url && `legacy-${msg.id}` === photoId ? null : msg.photo_url;

          return { ...msg, photos: newPhotos, photo_url: newPhotoUrl };
        }),
      );

      toast.success('Photo removed');
    } catch (error) {
      console.error('Delete photo error:', error);
      toast.error('Failed to remove photo');
    }
  };

  const handleDeleteAudio = async (messageId: string) => {
    if (!isPreview || !pageId) {
      return;
    }

    try {
      await apiFetch(`/pages/${pageId}/messages/${messageId}/audio`, {
        method: 'DELETE',
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          return { ...msg, audio_url: null };
        }),
      );

      toast.success('Voice note removed');
    } catch (error) {
      console.error('Delete audio error:', error);
      toast.error('Failed to remove voice note');
    }
  };

  const toggleSavePage = useCallback(async () => {
    if (!pageId) return;

    try {
      if (isSaved) {
        await apiFetch<void>(`/pages/${pageId}/save`, { method: 'DELETE' });
        setIsSaved(false);
        toast.success('Removed from your dashboard');
      } else {
        await apiFetch<void>(`/pages/${pageId}/save`, { method: 'POST' });
        setIsSaved(true);
        toast.success('Saved to your dashboard');
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to update saved status');
    }
  }, [isSaved, pageId]);

  const birthdayDate = parseLocalDate(page?.birthday_date);
  const requiresUnlock = !isPreview && Boolean(page?.requires_unlock);
  const isUnlocked = isPreview || !requiresUnlock || Boolean(page?.is_unlocked);
  const hasReachedBirthdayDate = useMemo(() => {
    if (Number.isNaN(birthdayDate.getTime())) return false;
    return nowMs >= birthdayDate.getTime();
  }, [birthdayDate, nowMs]);
  const isBeforeBirthday = !isPreview && page?.is_revealed === false && !hasReachedBirthdayDate;

  return {
    page,
    setPage,
    messages,
    setMessages,
    loading,
    isSaved,
    isPageOwner,
    poolSummary,
    setPoolSummary,
    releasingPoolPayout,
    requestingGiftRelease,
    unlockPin,
    setUnlockPin,
    unlocking,
    nowMs,
    hasReachedBirthdayDate,
    isBeforeBirthday,
    birthdayDate,
    requiresUnlock,
    isUnlocked,
    fetchData,
    handleUnlock,
    handleReleasePoolPayout,
    handleRequestGiftRelease,
    handleDeleteMessage,
    handleDeletePhoto,
    handleDeleteAudio,
    toggleSavePage,
  };
}
