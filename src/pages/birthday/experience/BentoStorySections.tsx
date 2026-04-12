import { memo } from 'react';
import BentoGridView from '@/components/BentoGridView';
import { useBirthdayView } from '@/pages/birthday/view/BirthdayPageViewContext';

export const BentoStorySections = memo(function BentoStorySections() {
  const {
    effectiveViewMode,
    messages,
    page,
    theme,
    isDarkExperience,
    keepsakePaperClass,
    keepsakeSoftClass,
    birthdayDate,
  } = useBirthdayView() as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- VM is Record<string, unknown>

  return (
    <>
      {effectiveViewMode === 'bento' && messages.length > 0 && (
        <section className="relative min-h-[100dvh] px-0 py-4 sm:hidden">
          <BentoGridView
            page={page}
            messages={messages}
            theme={theme}
            isDarkExperience={isDarkExperience}
            keepsakePaperClass={keepsakePaperClass}
            keepsakeSoftClass={keepsakeSoftClass}
            birthdayDate={birthdayDate}
          />
        </section>
      )}

      {effectiveViewMode === 'bento' && messages.length > 0 && (
        <section className="relative hidden h-[100dvh] overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 sm:block">
          <BentoGridView
            page={page}
            messages={messages}
            theme={theme}
            isDarkExperience={isDarkExperience}
            keepsakePaperClass={keepsakePaperClass}
            keepsakeSoftClass={keepsakeSoftClass}
            birthdayDate={birthdayDate}
          />
        </section>
      )}
    </>
  );
});
