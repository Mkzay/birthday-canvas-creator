import type { BirthdayPageViewModel } from './BirthdayPageViewContext';

/**
 * Wraps the BirthdayPage hook closure in a view-model object for lazy experience chunks.
 * Call once per render with every binding the experience tree reads via useBirthdayView().
 */
export function asBirthdayViewModel(model: Record<string, unknown>): BirthdayPageViewModel {
  return model as BirthdayPageViewModel;
}
