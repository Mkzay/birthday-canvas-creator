import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { getSlideDuration } from './revealStory';
import type {
  BirthdayPageData,
  ExpandedPhoto,
  Message,
  PageDisplayMode,
  RevealPhase,
  RevealSlide,
} from './types';

export interface MobileFreeformMotionConfig {
  introStaggerMs: number;
  introPopLagMs: number;
  scrollStaggerMs: number;
  cardDurationMs: number;
}

export interface UseCelebrationRevealEngineOptions {
  page: BirthdayPageData | null;
  messages: Message[];
  loading: boolean;
  shouldShowRevealExperience: boolean;
  isDesktopReveal: boolean;
  expandedPhoto: ExpandedPhoto;
  showShareCard: boolean;
  activeWishAudioId: string | null;
  mobileFreeformMotion: MobileFreeformMotionConfig;
  startSoundtrack: (withLoop?: boolean) => Promise<void>;
  stopSoundtrack: () => void;
}

export interface UseCelebrationRevealEngineReturn {
  showRevealIntro: boolean;
  setShowRevealIntro: React.Dispatch<React.SetStateAction<boolean>>;
  hasTriggeredIntro: boolean;
  setHasTriggeredIntro: React.Dispatch<React.SetStateAction<boolean>>;
  revealPhase: RevealPhase;
  setRevealPhase: React.Dispatch<React.SetStateAction<RevealPhase>>;
  isDesktopPlaybackPaused: boolean;
  setIsDesktopPlaybackPaused: React.Dispatch<React.SetStateAction<boolean>>;
  currentSlide: number;
  setCurrentSlide: React.Dispatch<React.SetStateAction<number>>;
  slideDirection: 'forward' | 'back';
  setSlideDirection: React.Dispatch<React.SetStateAction<'forward' | 'back'>>;
  slideRemainingMs: number;
  setSlideRemainingMs: React.Dispatch<React.SetStateAction<number>>;
  viewMode: PageDisplayMode;
  setViewMode: React.Dispatch<React.SetStateAction<PageDisplayMode>>;
  isFreeformIntroExiting: boolean;
  setIsFreeformIntroExiting: React.Dispatch<React.SetStateAction<boolean>>;
  isFreeformBoardEntered: boolean;
  setIsFreeformBoardEntered: React.Dispatch<React.SetStateAction<boolean>>;
  landedFreeformCards: Set<string>;
  setLandedFreeformCards: React.Dispatch<React.SetStateAction<Set<string>>>;
  poppedFreeformDecorators: Set<string>;
  setPoppedFreeformDecorators: React.Dispatch<React.SetStateAction<Set<string>>>;
  freeformAnimationRun: number;
  setFreeformAnimationRun: React.Dispatch<React.SetStateAction<number>>;
  expandedFreeformCardIds: Set<string>;
  setExpandedFreeformCardIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  revealSlides: RevealSlide[];
  activeSlide: RevealSlide | undefined;
  currentSlideDuration: number;
  effectiveViewMode: PageDisplayMode;
  freeformCardAnimationOrder: string[];
  beginReveal: () => Promise<void>;
  skipReveal: () => Promise<void>;
  goToNextSlide: () => void;
  goToPreviousSlide: () => void;
  handlePlayControl: () => void;
  handlePauseControl: () => void;
  handleStageClick: (event: MouseEvent<HTMLDivElement>) => void;
  handleTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  handleTouchEnd: (event: TouchEvent<HTMLDivElement>) => void;
}

const interactiveSelector = 'button,a,audio,input,textarea,select,[data-no-nav="true"]';

export function useCelebrationRevealEngine({
  page,
  messages,
  loading,
  shouldShowRevealExperience,
  isDesktopReveal,
  expandedPhoto,
  showShareCard,
  activeWishAudioId,
  mobileFreeformMotion,
  startSoundtrack,
  stopSoundtrack,
}: UseCelebrationRevealEngineOptions): UseCelebrationRevealEngineReturn {
  const [showRevealIntro, setShowRevealIntro] = useState(false);
  const [hasTriggeredIntro, setHasTriggeredIntro] = useState(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');
  const [isDesktopPlaybackPaused, setIsDesktopPlaybackPaused] = useState(false);
  const [slideRemainingMs, setSlideRemainingMs] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');
  const [viewMode, setViewMode] = useState<PageDisplayMode>('story');

  const [expandedFreeformCardIds, setExpandedFreeformCardIds] = useState<Set<string>>(() => new Set());
  const [isFreeformIntroExiting, setIsFreeformIntroExiting] = useState(false);
  const [isFreeformBoardEntered, setIsFreeformBoardEntered] = useState(true);
  const [freeformAnimationRun, setFreeformAnimationRun] = useState(0);
  const [landedFreeformCards, setLandedFreeformCards] = useState<Set<string>>(() => new Set());
  const [poppedFreeformDecorators, setPoppedFreeformDecorators] = useState<Set<string>>(() => new Set());

  const slideTimerStartedAtRef = useRef<number | null>(null);
  const freeformAnimationTimeoutsRef = useRef<number[]>([]);
  const touchStartXRef = useRef<number | null>(null);
  const ignoreTouchNavigationRef = useRef(false);

  const effectiveViewMode = viewMode;

  // Auto trigger reveal intro once page details load
  useEffect(() => {
    if (!loading && shouldShowRevealExperience && page?.is_revealed && messages.length > 0 && !hasTriggeredIntro) {
      setShowRevealIntro(true);
    }
  }, [hasTriggeredIntro, loading, messages.length, page?.is_revealed, shouldShowRevealExperience]);

  // Sync viewMode whenever page changes display_mode
  useEffect(() => {
    if (page?.display_mode) {
      setViewMode(page.display_mode);
    }
  }, [page?.display_mode]);

  const revealSlides = useMemo<RevealSlide[]>(() => {
    if (!page) return [];

    const slides: RevealSlide[] = [
      { id: 'cover', kind: 'cover' },
      { id: 'stats', kind: 'stats' },
    ];

    if (page.creator_message) {
      slides.push({ id: 'organizer', kind: 'organizer' });
    }

    messages.forEach((message, index) => {
      slides.push({
        id: `wish-${message.id}`,
        kind: 'wish',
        message,
        index,
      });
    });

    slides.push({ id: 'closing', kind: 'closing' });
    return slides;
  }, [messages, page]);

  useEffect(() => {
    setCurrentSlide((previousSlide) => Math.min(previousSlide, Math.max(revealSlides.length - 1, 0)));
  }, [revealSlides.length]);

  const goToNextSlide = useCallback(() => {
    setSlideDirection('forward');
    setCurrentSlide((previousSlide) => Math.min(previousSlide + 1, Math.max(revealSlides.length - 1, 0)));
  }, [revealSlides.length]);

  const goToPreviousSlide = useCallback(() => {
    setSlideDirection('back');
    setCurrentSlide((previousSlide) => Math.max(previousSlide - 1, 0));
  }, []);

  const activeSlide = revealSlides[currentSlide];
  const currentSlideDuration = useMemo(() => getSlideDuration(activeSlide), [activeSlide]);

  useEffect(() => {
    setSlideRemainingMs(currentSlideDuration);
    slideTimerStartedAtRef.current = null;
  }, [currentSlideDuration, currentSlide]);

  const handlePlayControl = useCallback(() => {
    if (isDesktopReveal) {
      setIsDesktopPlaybackPaused(false);
    }
    void startSoundtrack(true);
  }, [isDesktopReveal, startSoundtrack]);

  const handlePauseControl = useCallback(() => {
    stopSoundtrack();

    if (!isDesktopReveal) {
      return;
    }

    setIsDesktopPlaybackPaused(true);
    const startedAt = slideTimerStartedAtRef.current;
    if (startedAt) {
      const elapsed = Date.now() - startedAt;
      setSlideRemainingMs((previous) => Math.max(280, previous - elapsed));
      slideTimerStartedAtRef.current = null;
    }
  }, [isDesktopReveal, stopSoundtrack]);

  const handleStageClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      const path = (event.nativeEvent as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
      if (path.some((node) => node instanceof HTMLAudioElement)) {
        return;
      }
      if (path.some((node) => node instanceof Element && Boolean(node.closest?.('[data-no-nav="true"]')))) {
        return;
      }
      if (target instanceof Element && target.closest(interactiveSelector)) {
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - bounds.left;

      if (clickX > bounds.width / 2) {
        goToNextSlide();
        return;
      }

      goToPreviousSlide();
    },
    [goToNextSlide, goToPreviousSlide],
  );

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const target = event.target;
    const path = (event.nativeEvent as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    ignoreTouchNavigationRef.current =
      path.some((node) => node instanceof HTMLAudioElement) ||
      path.some((node) => node instanceof Element && Boolean(node.closest?.('[data-no-nav="true"]'))) ||
      (target instanceof Element && Boolean(target.closest(interactiveSelector)));
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const path = (event.nativeEvent as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
      if (path.some((node) => node instanceof HTMLAudioElement)) {
        touchStartXRef.current = null;
        ignoreTouchNavigationRef.current = false;
        return;
      }
      if (path.some((node) => node instanceof Element && Boolean(node.closest?.('[data-no-nav="true"]')))) {
        touchStartXRef.current = null;
        ignoreTouchNavigationRef.current = false;
        return;
      }
      if (ignoreTouchNavigationRef.current) {
        ignoreTouchNavigationRef.current = false;
        touchStartXRef.current = null;
        return;
      }

      const startX = touchStartXRef.current;
      const endX = event.changedTouches[0]?.clientX ?? null;
      touchStartXRef.current = null;

      if (startX === null || endX === null) return;

      const distance = endX - startX;
      if (Math.abs(distance) < 50) return;

      if (distance < 0) {
        goToNextSlide();
        return;
      }

      goToPreviousSlide();
    },
    [goToNextSlide, goToPreviousSlide],
  );

  const freeformCardAnimationOrder = useMemo(() => {
    const order: string[] = ['mobile-cover'];
    if (page?.creator_message) {
      order.push('mobile-organizer');
    }
    order.push(...messages.map((message) => `mobile-message-${message.id}`));
    order.push('mobile-closing');

    const pivotIndex = Math.ceil(messages.length / 2);
    order.push('desktop-cover');
    order.push(...messages.slice(0, pivotIndex).map((message) => `desktop-message-${message.id}`));
    if (page?.creator_message) {
      order.push('desktop-organizer');
    }
    order.push(...messages.slice(pivotIndex).map((message) => `desktop-message-${message.id}`));
    order.push('desktop-closing');

    return order;
  }, [messages, page?.creator_message]);

  const clearFreeformAnimationTimeouts = useCallback(() => {
    freeformAnimationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    freeformAnimationTimeoutsRef.current = [];
  }, []);

  const resetFreeformBoard = useCallback(() => {
    clearFreeformAnimationTimeouts();
    setIsFreeformBoardEntered(false);
    setIsFreeformIntroExiting(false);
    setLandedFreeformCards(new Set());
    setPoppedFreeformDecorators(new Set());
  }, [clearFreeformAnimationTimeouts]);

  useEffect(() => {
    if (effectiveViewMode !== 'freeform') {
      clearFreeformAnimationTimeouts();
      setIsFreeformIntroExiting(false);
      setIsFreeformBoardEntered(true);
      setLandedFreeformCards(new Set());
      setPoppedFreeformDecorators(new Set());
      return;
    }

    if (showRevealIntro) {
      if (!isFreeformIntroExiting) {
        resetFreeformBoard();
      }
      return;
    }

    if (!hasTriggeredIntro) {
      setIsFreeformBoardEntered(true);
      setLandedFreeformCards(new Set(freeformCardAnimationOrder));
      setPoppedFreeformDecorators(new Set(freeformCardAnimationOrder));
    }
  }, [
    clearFreeformAnimationTimeouts,
    effectiveViewMode,
    freeformCardAnimationOrder,
    hasTriggeredIntro,
    isFreeformIntroExiting,
    resetFreeformBoard,
    showRevealIntro,
  ]);

  useEffect(() => {
    if (freeformAnimationRun === 0) {
      return;
    }

    clearFreeformAnimationTimeouts();
    setLandedFreeformCards(new Set());
    setPoppedFreeformDecorators(new Set());

    freeformCardAnimationOrder.forEach((cardId, index) => {
      const startDelay = mobileFreeformMotion.introStaggerMs * index;
      const landTimeoutId = window.setTimeout(() => {
        setLandedFreeformCards((current) => {
          const next = new Set(current);
          next.add(cardId);
          return next;
        });
      }, startDelay);

      const popTimeoutId = window.setTimeout(() => {
        setPoppedFreeformDecorators((current) => {
          const next = new Set(current);
          next.add(cardId);
          return next;
        });
      }, startDelay + mobileFreeformMotion.introPopLagMs);

      freeformAnimationTimeoutsRef.current.push(landTimeoutId, popTimeoutId);
    });

    return () => {
      clearFreeformAnimationTimeouts();
    };
  }, [clearFreeformAnimationTimeouts, freeformAnimationRun, freeformCardAnimationOrder, mobileFreeformMotion]);

  const beginReveal = async () => {
    if (effectiveViewMode === 'freeform') {
      if (isFreeformIntroExiting) {
        return;
      }

      setHasTriggeredIntro(true);
      setIsFreeformIntroExiting(true);
      void startSoundtrack(true);

      const boardEnterTimeoutId = window.setTimeout(() => {
        setShowRevealIntro(false);
        setRevealPhase('idle');
        setIsFreeformBoardEntered(true);
        setIsFreeformIntroExiting(false);
        setFreeformAnimationRun((current) => current + 1);
      }, 750);
      freeformAnimationTimeoutsRef.current.push(boardEnterTimeoutId);
      return;
    }

    setHasTriggeredIntro(true);
    setRevealPhase('opening');
    await startSoundtrack(true);

    window.setTimeout(() => setRevealPhase('burst'), 800);
    window.setTimeout(() => {
      setShowRevealIntro(false);
      setRevealPhase('idle');
    }, 2200);
  };

  const skipReveal = async () => {
    if (effectiveViewMode === 'freeform') {
      if (isFreeformIntroExiting) {
        return;
      }

      setHasTriggeredIntro(true);
      setIsFreeformIntroExiting(true);
      void startSoundtrack(true);

      const boardEnterTimeoutId = window.setTimeout(() => {
        setShowRevealIntro(false);
        setRevealPhase('idle');
        setIsFreeformBoardEntered(true);
        setIsFreeformIntroExiting(false);
        setFreeformAnimationRun((current) => current + 1);
      }, 390);
      freeformAnimationTimeoutsRef.current.push(boardEnterTimeoutId);
      return;
    }

    setHasTriggeredIntro(true);
    setShowRevealIntro(false);
    setRevealPhase('idle');
    await startSoundtrack(true);
  };

  // Auto advance slide timer for story mode
  useEffect(() => {
    if (
      effectiveViewMode !== 'story' ||
      loading ||
      !page ||
      showRevealIntro ||
      expandedPhoto ||
      showShareCard ||
      activeWishAudioId ||
      isDesktopPlaybackPaused
    ) {
      return;
    }
    if (!activeSlide || currentSlide >= revealSlides.length - 1) return;

    let hasAdvanced = false;
    slideTimerStartedAtRef.current = Date.now();

    const timeoutId = window.setTimeout(() => {
      hasAdvanced = true;
      setCurrentSlide((previousSlide) => Math.min(previousSlide + 1, Math.max(revealSlides.length - 1, 0)));
    }, slideRemainingMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (!hasAdvanced) {
        const startedAt = slideTimerStartedAtRef.current;
        if (startedAt) {
          const elapsed = Date.now() - startedAt;
          setSlideRemainingMs((previous) => Math.max(280, previous - elapsed));
        }
      }
      slideTimerStartedAtRef.current = null;
    };
  }, [
    activeSlide,
    activeWishAudioId,
    currentSlide,
    expandedPhoto,
    isDesktopPlaybackPaused,
    isDesktopReveal,
    loading,
    page,
    revealSlides.length,
    showRevealIntro,
    showShareCard,
    slideRemainingMs,
  ]);

  return {
    showRevealIntro,
    setShowRevealIntro,
    hasTriggeredIntro,
    setHasTriggeredIntro,
    revealPhase,
    setRevealPhase,
    isDesktopPlaybackPaused,
    setIsDesktopPlaybackPaused,
    currentSlide,
    setCurrentSlide,
    slideDirection,
    setSlideDirection,
    slideRemainingMs,
    setSlideRemainingMs,
    viewMode,
    setViewMode,
    isFreeformIntroExiting,
    setIsFreeformIntroExiting,
    isFreeformBoardEntered,
    setIsFreeformBoardEntered,
    landedFreeformCards,
    setLandedFreeformCards,
    poppedFreeformDecorators,
    setPoppedFreeformDecorators,
    freeformAnimationRun,
    setFreeformAnimationRun,
    expandedFreeformCardIds,
    setExpandedFreeformCardIds,
    revealSlides,
    activeSlide,
    currentSlideDuration,
    effectiveViewMode,
    freeformCardAnimationOrder,
    beginReveal,
    skipReveal,
    goToNextSlide,
    goToPreviousSlide,
    handlePlayControl,
    handlePauseControl,
    handleStageClick,
    handleTouchStart,
    handleTouchEnd,
  };
}
