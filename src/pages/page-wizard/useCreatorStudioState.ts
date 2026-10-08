import { useEffect, useRef, useState } from 'react';
import type { CustomTheme, DisplayMode, Theme } from './types';
import { DEFAULT_LETTER_END, DEFAULT_LETTER_START } from './constants';
import { useBankResolution } from './useBankResolution';
import { useCoverPhotoManager } from './useCoverPhotoManager';
import { useThemePreviewCalculations } from './useThemePreviewCalculations';

export const CREATOR_STEPS = [
  { number: 1, label: 'Honoree' },
  { number: 2, label: 'Keepsake' },
  { number: 3, label: 'Palette & View' },
  { number: 4, label: 'Soundtrack' },
  { number: 5, label: 'Permissions' },
];

export const EDIT_STEPS = [
  { number: 1, label: 'Honoree' },
  { number: 2, label: 'Keepsake' },
  { number: 3, label: 'Palette & View' },
  { number: 4, label: 'Soundtrack' },
  { number: 5, label: 'Permissions & Save' },
];

export interface CreatorStudioInitialValues {
  currentStep?: number;
  recipientName?: string;
  recipientEmail?: string;
  guestEmail?: string;
  birthdayDate?: string | Date | null;
  creatorMessage?: string;
  selectedTheme?: Theme;
  selectedLetterTheme?: Theme;
  selectedDisplayMode?: DisplayMode;
  letterColor?: string;
  letterGradientStart?: string;
  letterGradientEnd?: string;
  allowPhotos?: boolean;
  allowAudio?: boolean;
  requireNames?: boolean;
  closeDate?: string | Date | null;
  selectedSoundtrackId?: string;
  pageCustomAudioUrl?: string | null;
  publicCodeInput?: string;
  revealAtInput?: string;
  revealPinInput?: string;
  poolFundraisingEnabled?: boolean;
  poolGoalNairaInput?: string;
  poolDescriptionInput?: string;
  recipientBankCode?: string;
  recipientAccountNumber?: string;
  recipientAccountName?: string;
  previewView?: 'card' | 'envelope';
  coverPhotoUrl?: string | null;
}

export interface UseCreatorStudioStateOptions {
  mode: 'create' | 'edit';
  storageKey?: string;
  initialValues?: CreatorStudioInitialValues;
  isProUser: boolean;
  defaultTheme?: string;
}

export function useCreatorStudioState({
  mode,
  storageKey,
  initialValues = {},
  isProUser,
  defaultTheme = 'elegant',
}: UseCreatorStudioStateOptions) {
  // Read persistent draft if available
  const initialDraft = useRef<CreatorStudioInitialValues>((() => {
    if (typeof window === 'undefined' || !storageKey) return initialValues;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...initialValues, ...parsed };
      }
    } catch {
      // ignore JSON parse error
    }
    return initialValues;
  })()).current;

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const step = initialDraft.currentStep;
    return typeof step === 'number' && step >= 1 && step <= 5 ? step : 1;
  });

  const [previewView, setPreviewView] = useState<'card' | 'envelope'>(() => initialDraft.previewView ?? 'card');
  const [recipientName, setRecipientName] = useState(() => initialDraft.recipientName ?? '');
  const [recipientEmail, setRecipientEmail] = useState(() => initialDraft.recipientEmail ?? '');
  const [guestEmail, setGuestEmail] = useState(() => initialDraft.guestEmail ?? '');
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(() => {
    if (!initialDraft.birthdayDate) return undefined;
    return initialDraft.birthdayDate instanceof Date ? initialDraft.birthdayDate : new Date(initialDraft.birthdayDate);
  });
  const [creatorMessage, setCreatorMessage] = useState(() => initialDraft.creatorMessage ?? '');
  const [selectedTheme, setSelectedTheme] = useState<Theme>(() => initialDraft.selectedTheme ?? defaultTheme);
  const [selectedLetterTheme, setSelectedLetterTheme] = useState<Theme>(() => initialDraft.selectedLetterTheme ?? defaultTheme);
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DisplayMode>(() => initialDraft.selectedDisplayMode ?? 'story');
  const [letterColor, setLetterColor] = useState<string>(() => initialDraft.letterColor ?? '');
  const [letterGradientStart, setLetterGradientStart] = useState(() => initialDraft.letterGradientStart ?? DEFAULT_LETTER_START);
  const [letterGradientEnd, setLetterGradientEnd] = useState(() => initialDraft.letterGradientEnd ?? DEFAULT_LETTER_END);
  const [allowPhotos, setAllowPhotos] = useState(() => initialDraft.allowPhotos ?? true);
  const [allowAudio, setAllowAudio] = useState(() => initialDraft.allowAudio ?? true);
  const [requireNames, setRequireNames] = useState(() => initialDraft.requireNames ?? true);
  const [closeDate, setCloseDate] = useState<Date | undefined>(() => {
    if (!initialDraft.closeDate) return undefined;
    return initialDraft.closeDate instanceof Date ? initialDraft.closeDate : new Date(initialDraft.closeDate);
  });
  const [selectedSoundtrackId, setSelectedSoundtrackId] = useState(() => initialDraft.selectedSoundtrackId ?? 'golden-hour');
  const [pageCustomAudioUrl, setPageCustomAudioUrl] = useState<string | null>(() => initialDraft.pageCustomAudioUrl ?? null);

  const [publicCodeInput, setPublicCodeInput] = useState(() => initialDraft.publicCodeInput ?? '');
  const [publicCodeError, setPublicCodeError] = useState<string | null>(null);
  const [revealAtInput, setRevealAtInput] = useState(() => initialDraft.revealAtInput ?? '');
  const [revealPinInput, setRevealPinInput] = useState(() => initialDraft.revealPinInput ?? '');

  const [poolFundraisingEnabled, setPoolFundraisingEnabled] = useState(() => initialDraft.poolFundraisingEnabled ?? false);
  const [poolGoalNairaInput, setPoolGoalNairaInput] = useState(() => initialDraft.poolGoalNairaInput ?? '');
  const [poolDescriptionInput, setPoolDescriptionInput] = useState(() => initialDraft.poolDescriptionInput ?? '');

  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  // Sub-hook: Bank resolution
  const bankResolution = useBankResolution({
    initialBankCode: initialDraft.recipientBankCode ?? '',
    initialAccountNumber: initialDraft.recipientAccountNumber ?? '',
    initialAccountName: initialDraft.recipientAccountName ?? '',
    isProUser,
    poolFundraisingEnabled,
  });

  // Sub-hook: Cover photo manager
  const coverPhoto = useCoverPhotoManager({
    initialCoverUrl: initialDraft.coverPhotoUrl ?? null,
  });

  // Sub-hook: Theme preview calculations
  const themePreview = useThemePreviewCalculations({
    selectedTheme,
    selectedLetterTheme,
    letterColor,
    customThemes,
  });

  // Session persistence effect
  useEffect(() => {
    if (!storageKey || currentStep === 6) return;

    try {
      const payload: CreatorStudioInitialValues = {
        currentStep,
        recipientName,
        recipientEmail,
        guestEmail,
        birthdayDate: birthdayDate ? birthdayDate.toISOString() : null,
        creatorMessage,
        selectedTheme,
        selectedLetterTheme,
        selectedDisplayMode,
        letterColor,
        letterGradientStart,
        letterGradientEnd,
        allowPhotos,
        allowAudio,
        requireNames,
        closeDate: closeDate ? closeDate.toISOString() : null,
        selectedSoundtrackId,
        pageCustomAudioUrl,
        publicCodeInput,
        revealAtInput,
        revealPinInput,
        poolFundraisingEnabled,
        poolGoalNairaInput,
        poolDescriptionInput,
        recipientBankCode: bankResolution.recipientBankCode,
        recipientAccountNumber: bankResolution.recipientAccountNumber,
        recipientAccountName: bankResolution.recipientAccountName,
        previewView,
      };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [
    storageKey,
    currentStep,
    recipientName,
    recipientEmail,
    guestEmail,
    birthdayDate,
    creatorMessage,
    selectedTheme,
    selectedLetterTheme,
    selectedDisplayMode,
    letterColor,
    letterGradientStart,
    letterGradientEnd,
    allowPhotos,
    allowAudio,
    requireNames,
    closeDate,
    selectedSoundtrackId,
    pageCustomAudioUrl,
    publicCodeInput,
    revealAtInput,
    revealPinInput,
    poolFundraisingEnabled,
    poolGoalNairaInput,
    poolDescriptionInput,
    bankResolution.recipientBankCode,
    bankResolution.recipientAccountNumber,
    bankResolution.recipientAccountName,
    previewView,
  ]);

  const clearPersistedDraft = () => {
    if (!storageKey) return;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return {
    currentStep,
    setCurrentStep,
    steps: mode === 'create' ? CREATOR_STEPS : EDIT_STEPS,
    previewView,
    setPreviewView,
    recipientName,
    setRecipientName,
    recipientEmail,
    setRecipientEmail,
    guestEmail,
    setGuestEmail,
    birthdayDate,
    setBirthdayDate,
    creatorMessage,
    setCreatorMessage,
    selectedTheme,
    setSelectedTheme,
    selectedLetterTheme,
    setSelectedLetterTheme,
    selectedDisplayMode,
    setSelectedDisplayMode,
    letterColor,
    setLetterColor,
    letterGradientStart,
    setLetterGradientStart,
    letterGradientEnd,
    setLetterGradientEnd,
    allowPhotos,
    setAllowPhotos,
    allowAudio,
    setAllowAudio,
    requireNames,
    setRequireNames,
    closeDate,
    setCloseDate,
    selectedSoundtrackId,
    setSelectedSoundtrackId,
    pageCustomAudioUrl,
    setPageCustomAudioUrl,
    publicCodeInput,
    setPublicCodeInput,
    publicCodeError,
    setPublicCodeError,
    revealAtInput,
    setRevealAtInput,
    revealPinInput,
    setRevealPinInput,
    poolFundraisingEnabled,
    setPoolFundraisingEnabled,
    poolGoalNairaInput,
    setPoolGoalNairaInput,
    poolDescriptionInput,
    setPoolDescriptionInput,
    customThemes,
    setCustomThemes,
    bankResolution,
    coverPhoto,
    themePreview,
    clearPersistedDraft,
  };
}
