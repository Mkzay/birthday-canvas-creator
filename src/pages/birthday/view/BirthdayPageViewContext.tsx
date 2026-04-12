import { createContext, useContext, type ReactNode } from 'react';

/**
 * Loose model: mirrors the BirthdayPage component closure so extracted
 * experience sections can read the same values without giant prop drilling.
 * Prefer tightening fields gradually as sections stabilize.
 */
export type BirthdayPageViewModel = Record<string, unknown>;

const BirthdayPageViewContext = createContext<BirthdayPageViewModel | null>(null);

export function BirthdayPageViewProvider({
  value,
  children,
}: {
  value: BirthdayPageViewModel;
  children: ReactNode;
}) {
  return <BirthdayPageViewContext.Provider value={value}>{children}</BirthdayPageViewContext.Provider>;
}

export function useBirthdayView(): BirthdayPageViewModel {
  const v = useContext(BirthdayPageViewContext);
  if (!v) {
    throw new Error('useBirthdayView must be used within BirthdayPageViewProvider');
  }
  return v;
}
