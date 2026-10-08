import { useState, useRef, useEffect, useCallback, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { ApiError, resolveAssetUrl } from '@/lib/api';
import { compressImageFile } from '@/lib/imageCompressor';
import { extractPlainTextFromRichHtml } from './utils';
import { MAX_PHOTOS, MAX_WISH_MESSAGE_CHARACTERS } from './constants';
import type { PublicBirthdayPageData, PendingPhoto, StoredContributorWish, ContributionDraft } from './types';
import type { StickerData } from '@/components/StickerPicker';
import { useAudioRecorder, type UseAudioRecorderReturn } from './useAudioRecorder';
import {
  uploadPendingPhotos,
  uploadPendingAudio,
  postWishMessage,
  updateWishMessage,
  fetchWishForEditing,
  deleteWishMessage,
  undoDeleteWishMessage,
  initializePoolPayment,
} from './wishSubmissionService';
import {
  getStoredContributions,
  saveStoredContribution,
  removeStoredContribution,
  loadSessionDraft,
  saveSessionDraft,
  clearSessionDraft,
} from './storage';

export interface UseWishSubmissionEngineProps {
  page: PublicBirthdayPageData | null;
  pageId: string | undefined;
  onPageUpdate?: Dispatch<SetStateAction<PublicBirthdayPageData | null>>;
}

export interface UseWishSubmissionEngineReturn {
  // Form State
  senderName: string;
  setSenderName: (val: string) => void;
  message: string;
  setMessage: (val: string) => void;
  selectedPhotos: PendingPhoto[];
  draggedPhotoId: string | null;
  setDraggedPhotoId: (id: string | null) => void;
  stickers: StickerData[];
  setStickers: Dispatch<SetStateAction<StickerData[]>>;
  poolAmountNaira: string;
  setPoolAmountNaira: (val: string) => void;
  poolContributorEmail: string;
  setPoolContributorEmail: (val: string) => void;
  currentPlaceholder: string;

  // Audio Recorder
  audioRecorder: UseAudioRecorderReturn;

  // Edit Mode & Recognition
  isEditMode: boolean;
  editingMessageId: string | null;
  editToken: string | null;
  isLocked: boolean;
  lockReason: string | null;
  recognizedWish: StoredContributorWish | null;
  isDeletingWish: boolean;

  // Submission & UI Lifecycle
  submitting: boolean;
  isSubmitted: boolean;
  showConfetti: boolean;
  isConfirmModalOpen: boolean;
  setIsConfirmModalOpen: (open: boolean) => void;

  // Handlers
  handlePhotoSelect: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePhotoCaptionChange: (photoId: string, caption: string) => void;
  removePhoto: (photoId: string) => void;
  reorderPhotos: (sourceId: string, targetId: string) => void;
  validateAndOpenConfirmModal: () => void;
  handleConfirmFinalSubmit: () => Promise<void>;
  handleWishDelete: () => Promise<void>;
  handleUndoWishDelete: () => Promise<void>;
  handleLoadRecognizedWish: () => Promise<void>;
  resetForm: () => void;
  handleEnterEditMode: () => void;
}

export function useWishSubmissionEngine({
  page,
  pageId,
  onPageUpdate,
}: UseWishSubmissionEngineProps): UseWishSubmissionEngineReturn {
  // Form fields
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<PendingPhoto[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [poolAmountNaira, setPoolAmountNaira] = useState('');
  const [poolContributorEmail, setPoolContributorEmail] = useState('');

  // Audio recorder
  const audioRecorder = useAudioRecorder();

  // Edit wish state
  const [editToken, setEditToken] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [recognizedWish, setRecognizedWish] = useState<StoredContributorWish | null>(null);
  const [isDeletingWish, setIsDeletingWish] = useState(false);

  // Submission UI state
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const selectedPhotosRef = useRef<PendingPhoto[]>([]);
  const draftStorageKey = pageId ? `contribute-draft:${pageId}` : null;

  // Track latest photos for cleanup
  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  // Clean up photo object URLs on unmount
  useEffect(() => {
    return () => {
      selectedPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  // Cycling inspirational placeholders
  const placeholderTemplates = [
    (name: string) => `Write something ${name} will never forget...`,
    (name: string) => `What's your favorite memory with ${name}?`,
    (name: string) => `If you could tell ${name} one thing on their birthday...`,
    (name: string) => `What makes ${name} so special to you?`,
    (name: string) => `Write your birthday wish for ${name}...`,
  ];

  const currentPlaceholder = page
    ? placeholderTemplates[placeholderIndex % placeholderTemplates.length](page.recipient_name)
    : 'Write your birthday wish...';

  useEffect(() => {
    if (!page) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholderTemplates.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [page, placeholderTemplates.length]);

  // Load existing wish for editing
  const loadWishForEditing = useCallback(
    async (token: string) => {
      if (!pageId) return;

      try {
        const res = await fetchWishForEditing(pageId, token);

        if (!res.message) {
          if (res.isDeleted) {
            toast.error('This wish has been deleted.');
          } else {
            toast.error('Wish not found.');
          }
          return;
        }

        setEditToken(token);
        setEditingMessageId(res.message.id);
        setIsEditMode(true);
        setIsLocked(res.isLocked);
        setLockReason(res.lockReason || null);

        setSenderName(res.message.sender_name || '');
        setMessage(res.message.message || '');

        const loadedPhotos: PendingPhoto[] = (res.message.photos || []).map((p) => ({
          id: p.id,
          previewUrl: resolveAssetUrl(p.photo_url) || p.photo_url,
          caption: p.caption || '',
          existingUrl: p.photo_url,
        }));
        setSelectedPhotos(loadedPhotos);

        if (res.message.audio_url) {
          audioRecorder.setExistingAudio(res.message.audio_url);
        } else {
          audioRecorder.clearAudio();
        }

        saveStoredContribution({
          pageId,
          messageId: res.message.id,
          editToken: token,
          senderName: res.message.sender_name,
          updatedAt: Date.now(),
        });

        if (res.isLocked) {
          toast.info(res.lockReason || 'This canvas is sealed or revealed. Wishes can no longer be edited.');
        } else {
          toast.success('Your wish has been loaded for editing.');
        }
      } catch (error) {
        console.error('Failed to load wish for editing:', error);
        if (error instanceof ApiError && error.status === 403) {
          toast.error('Invalid or expired edit link.');
        } else {
          toast.error('Could not load your wish for editing.');
        }
      }
    },
    [audioRecorder, pageId],
  );

  // Check URL fragment or stored tokens
  useEffect(() => {
    if (!pageId) return;

    // Check fragment hash (#edit=TOKEN)
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const match = hash.match(/#edit=([a-f0-9]+)/i);
    const fragmentToken = match ? match[1] : null;

    if (fragmentToken) {
      void loadWishForEditing(fragmentToken);
      return;
    }

    // Check local storage for recognized returning contributor
    const stored = getStoredContributions();
    const entry = stored[pageId];
    if (entry && entry.editToken) {
      fetchWishForEditing(pageId, entry.editToken)
        .then((res) => {
          if (res.message && !res.isDeleted) {
            setRecognizedWish(entry);
          } else {
            removeStoredContribution(pageId);
          }
        })
        .catch(() => {
          removeStoredContribution(pageId);
        });
    }
  }, [loadWishForEditing, pageId]);

  // Hydrate draft from session storage
  useEffect(() => {
    if (!draftStorageKey) {
      setDraftHydrated(false);
      return;
    }

    const parsed = loadSessionDraft(draftStorageKey);
    if (parsed) {
      if (typeof parsed.senderName === 'string') setSenderName(parsed.senderName);
      if (typeof parsed.message === 'string') setMessage(parsed.message);
      if (typeof parsed.poolAmountNaira === 'string') setPoolAmountNaira(parsed.poolAmountNaira);
      if (typeof parsed.poolContributorEmail === 'string') setPoolContributorEmail(parsed.poolContributorEmail);
      if (Array.isArray(parsed.stickers)) setStickers(parsed.stickers);
    }
    setDraftHydrated(true);
  }, [draftStorageKey]);

  // Debounced draft auto-save
  useEffect(() => {
    if (!draftStorageKey || !draftHydrated || isSubmitted || isEditMode) {
      return;
    }

    const draft: ContributionDraft = {
      senderName,
      message,
      poolAmountNaira,
      poolContributorEmail,
      stickers,
      updatedAt: Date.now(),
    };

    saveSessionDraft(draftStorageKey, draft);
  }, [
    draftHydrated,
    draftStorageKey,
    isEditMode,
    isSubmitted,
    message,
    poolAmountNaira,
    poolContributorEmail,
    senderName,
    stickers,
  ]);

  // Photo handlers
  const handlePhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const availableSlots = MAX_PHOTOS - selectedPhotos.length;
    const filesToProcess = files.slice(0, availableSlots);

    const validImageFiles: File[] = [];
    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      validImageFiles.push(file);
    }

    const acceptedFiles: PendingPhoto[] = [];
    for (const file of validImageFiles) {
      try {
        const optimizedFile = await compressImageFile(file, { maxDimension: 1600, quality: 0.82 });
        acceptedFiles.push({
          id: crypto.randomUUID(),
          file: optimizedFile,
          previewUrl: URL.createObjectURL(optimizedFile),
          caption: '',
        });
      } catch {
        acceptedFiles.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          caption: '',
        });
      }
    }

    if (files.length > availableSlots) {
      toast.error(`Only ${availableSlots} more photo${availableSlots === 1 ? '' : 's'} can be added`);
    }

    if (acceptedFiles.length) {
      setSelectedPhotos((current) => [...current, ...acceptedFiles]);
    }

    event.target.value = '';
  };

  const handlePhotoCaptionChange = (photoId: string, caption: string) => {
    setSelectedPhotos((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, caption: caption.slice(0, 140) } : photo)),
    );
  };

  const removePhoto = (photoId: string) => {
    setSelectedPhotos((current) => {
      const target = current.find((p) => p.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((p) => p.id !== photoId);
    });
  };

  const reorderPhotos = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setSelectedPhotos((current) => {
      const sourceIndex = current.findIndex((p) => p.id === sourceId);
      const targetIndex = current.findIndex((p) => p.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const resetForm = () => {
    setSenderName('');
    setMessage('');
    selectedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setSelectedPhotos([]);
    audioRecorder.clearAudio();
    setStickers([]);
    setPoolAmountNaira('');
    setPoolContributorEmail('');
    setIsEditMode(false);
    setEditToken(null);
    setEditingMessageId(null);
    setIsLocked(false);
    setLockReason(null);
    if (draftStorageKey) {
      clearSessionDraft(draftStorageKey);
    }
  };

  const handleEnterEditMode = () => {
    if (editToken) {
      void loadWishForEditing(editToken);
    }
  };

  const handleLoadRecognizedWish = async () => {
    if (recognizedWish) {
      await loadWishForEditing(recognizedWish.editToken);
    }
  };

  // Validation before opening confirmation preview modal
  const validateAndOpenConfirmModal = () => {
    if (!page) return;

    if (!page.can_contribute && !isEditMode) {
      if (page.contributor_limit_reached) {
        toast.error('This canvas has reached its free limit of 6 contributors. Ask the organizer to upgrade to Pro.');
      } else {
        toast.error('This birthday page is currently closed for new wishes.');
      }
      return;
    }

    if (page.require_names && !senderName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const plainText = extractPlainTextFromRichHtml(message);
    if (!plainText) {
      toast.error('Please write a birthday message');
      return;
    }

    if (plainText.length > MAX_WISH_MESSAGE_CHARACTERS) {
      toast.error(`Message must be ${MAX_WISH_MESSAGE_CHARACTERS} characters or less`);
      return;
    }

    const amountNaira = Number(poolAmountNaira.replace(/,/g, ''));
    const hasPoolAmount = poolAmountNaira.trim().length > 0;
    if (hasPoolAmount && !isEditMode) {
      if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
        toast.error('Enter a valid amount in Naira or clear the amount field');
        return;
      }
      if (Math.round(amountNaira * 100) < 100) {
        toast.error('Minimum contribution amount is ₦1.00');
        return;
      }
    }

    setIsConfirmModalOpen(true);
  };

  // Final submit handler called from confirmation modal
  const handleConfirmFinalSubmit = async () => {
    if (!page || !pageId) return;

    setSubmitting(true);

    try {
      // 1. Upload non-existing photos
      const uploadedPhotos = selectedPhotos.length
        ? await uploadPendingPhotos(pageId, selectedPhotos)
        : [];

      // 2. Upload audio if present
      let uploadedAudioUrl = audioRecorder.existingAudioUrl;
      if (audioRecorder.wishAudio) {
        const audioUrl = await uploadPendingAudio(pageId, audioRecorder.wishAudio);
        if (!audioUrl) {
          setSubmitting(false);
          toast.error('Failed to upload voice note. Please try again.');
          return;
        }
        uploadedAudioUrl = audioUrl;
      }

      const amountNaira = Number(poolAmountNaira.replace(/,/g, ''));

      // 3. Edit mode submission
      if (isEditMode && editingMessageId && editToken) {
        await updateWishMessage(pageId, editingMessageId, editToken, {
          senderName: senderName.trim() || 'Anonymous',
          message,
          photos: uploadedPhotos,
          audioUrl: uploadedAudioUrl,
        });

        saveStoredContribution({
          pageId,
          messageId: editingMessageId,
          editToken,
          senderName: senderName.trim() || 'Anonymous',
          updatedAt: Date.now(),
        });

        if (draftStorageKey) {
          clearSessionDraft(draftStorageKey);
        }

        setIsConfirmModalOpen(false);
        setShowConfetti(true);
        setIsSubmitted(true);
        toast.success('Your wish has been updated!');
        setTimeout(() => setShowConfetti(false), 5000);
        return;
      }

      // 4. Create new wish message
      const result = await postWishMessage(pageId, {
        senderName: senderName.trim() || 'Anonymous',
        message,
        photos: uploadedPhotos,
        audioUrl: uploadedAudioUrl,
        stickers,
      });

      if (result.editToken) {
        setEditToken(result.editToken);
        setEditingMessageId(result.id);
        saveStoredContribution({
          pageId,
          messageId: result.id,
          editToken: result.editToken,
          senderName: senderName.trim() || 'Anonymous',
          updatedAt: Date.now(),
        });
      }

      // 5. Initialize gift pool checkout if requested
      const shouldPay =
        page.pool_fundraising_enabled &&
        poolAmountNaira.trim().length > 0 &&
        Number.isFinite(amountNaira) &&
        amountNaira > 0;

      if (shouldPay) {
        const amountKobo = Math.round(amountNaira * 100);
        if (draftStorageKey) {
          clearSessionDraft(draftStorageKey);
        }

        setIsConfirmModalOpen(false);
        toast.success('Wish added. Redirecting to payment...');

        const authUrl = await initializePoolPayment(pageId, {
          amountKobo,
          contributorName: senderName.trim() || null,
          contributorEmail: poolContributorEmail.trim() || null,
        });

        window.location.href = authUrl;
        return;
      }

      // 6. Complete free contribution flow
      setIsConfirmModalOpen(false);
      setShowConfetti(true);
      setIsSubmitted(true);
      if (draftStorageKey) {
        clearSessionDraft(draftStorageKey);
      }
      if (onPageUpdate) {
        onPageUpdate((current) =>
          current ? { ...current, message_count: current.message_count + 1 } : current,
        );
      }

      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONTRIBUTOR_LIMIT_REACHED') {
        toast.error('This canvas has reached its free limit. Ask the creator to upgrade to Pro.');
        setIsConfirmModalOpen(false);
        return;
      }
      if (error instanceof ApiError && error.code === 'WISH_LOCKED') {
        toast.error(error.message || 'This canvas is sealed. Wishes can no longer be edited.');
        setIsLocked(true);
        setIsConfirmModalOpen(false);
        return;
      }
      const msg = error instanceof Error ? error.message : 'Failed to save wish';
      toast.error(msg);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete wish
  const handleWishDelete = async () => {
    if (!pageId || !editToken) return;

    setIsDeletingWish(true);
    try {
      await deleteWishMessage(pageId, editToken);
      removeStoredContribution(pageId);
      toast.success('Your wish has been deleted');
      resetForm();
    } catch (error) {
      console.error('Delete wish error:', error);
      toast.error('Failed to delete wish');
    } finally {
      setIsDeletingWish(false);
    }
  };

  // Undo delete wish
  const handleUndoWishDelete = async () => {
    if (!pageId || !editToken) return;

    try {
      const res = await undoDeleteWishMessage(pageId, editToken);
      if (res.message) {
        toast.success('Your wish has been restored!');
        await loadWishForEditing(editToken);
      }
    } catch (error) {
      console.error('Undo delete wish error:', error);
      toast.error('Failed to restore wish');
    }
  };

  return {
    senderName,
    setSenderName,
    message,
    setMessage,
    selectedPhotos,
    draggedPhotoId,
    setDraggedPhotoId,
    stickers,
    setStickers,
    poolAmountNaira,
    setPoolAmountNaira,
    poolContributorEmail,
    setPoolContributorEmail,
    currentPlaceholder,
    audioRecorder,
    isEditMode,
    editingMessageId,
    editToken,
    isLocked,
    lockReason,
    recognizedWish,
    isDeletingWish,
    submitting,
    isSubmitted,
    showConfetti,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    handlePhotoSelect,
    handlePhotoCaptionChange,
    removePhoto,
    reorderPhotos,
    validateAndOpenConfirmModal,
    handleConfirmFinalSubmit,
    handleWishDelete,
    handleUndoWishDelete,
    handleLoadRecognizedWish,
    resetForm,
    handleEnterEditMode,
  };
}
