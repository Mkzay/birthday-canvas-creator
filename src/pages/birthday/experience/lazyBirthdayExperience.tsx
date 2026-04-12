import { lazy } from 'react';

export const LazyRevealIntroOverlay = lazy(async () => {
  const m = await import('./RevealIntroOverlay');
  return { default: m.RevealIntroOverlay };
});

export const LazyMobileStorySection = lazy(async () => {
  const m = await import('./MobileStorySection');
  return { default: m.MobileStorySection };
});

export const LazyBentoStorySections = lazy(async () => {
  const m = await import('./BentoStorySections');
  return { default: m.BentoStorySections };
});

export const LazyFreeformSection = lazy(async () => {
  const m = await import('./FreeformSection');
  return { default: m.FreeformSection };
});

export const LazyDesktopStorySection = lazy(async () => {
  const m = await import('./DesktopStorySection');
  return { default: m.DesktopStorySection };
});
