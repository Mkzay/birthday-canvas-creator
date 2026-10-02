import { memo } from 'react';
import BentoGridView from '@/components/BentoGridView';
import { useBirthdayView } from '@/pages/birthday/view/BirthdayPageViewContext';
import { cn } from '@/lib/utils';

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
    forceMobileView,
  } = useBirthdayView() as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- VM is Record<string, unknown>

  if (effectiveViewMode !== 'bento') return null;

  return (
    <>
      {/* Mobile Bento Section */}
      <section
        className={cn(
          'relative min-h-[100dvh] px-2 xs:px-3 sm:px-4 py-4 pt-10 pb-28',
          forceMobileView ? '!block !min-h-full' : 'sm:hidden',
        )}
      >
        <BentoGridView
          page={page}
          messages={messages || []}
          theme={theme}
          isDarkExperience={isDarkExperience}
          keepsakePaperClass={keepsakePaperClass}
          keepsakeSoftClass={keepsakeSoftClass}
          birthdayDate={birthdayDate}
          isMobileSim={Boolean(forceMobileView)}
        />
      </section>

      {/* Desktop Bento Section */}
      {!forceMobileView && (
        <section className="relative hidden h-[100dvh] overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 sm:block">
          <BentoGridView
            page={page}
            messages={messages || []}
            theme={theme}
            isDarkExperience={isDarkExperience}
            keepsakePaperClass={keepsakePaperClass}
            keepsakeSoftClass={keepsakeSoftClass}
            birthdayDate={birthdayDate}
            isMobileSim={false}
          />
        </section>
      )}
    </>
  );
});
