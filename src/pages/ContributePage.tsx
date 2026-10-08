import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Confetti from '@/components/Confetti';
import { parseLocalDate } from '@/lib/date';
import { apiFetch, resolveAssetUrl } from '@/lib/api';
import BrandLogo from '@/components/BrandLogo';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import { visualThemeConfig, fontClassMap } from '@/lib/themes';
import {
  ContributeSuccessPanel,
  ContributorWishPreview,
  ContributeConfirmModal,
  ContributeForm,
  useWishSubmissionEngine,
  type PublicBirthdayPageData,
} from '@/pages/contribute';

const themeConfig = visualThemeConfig;

const ContributePage = () => {
  const { pageId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<PublicBirthdayPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

  const engine = useWishSubmissionEngine({
    page,
    pageId,
    onPageUpdate: setPage,
  });

  const fetchPage = useCallback(async () => {
    if (!pageId) return;

    try {
      const data = await apiFetch<PublicBirthdayPageData>(`/public/pages/${pageId}`);
      setPage(data);
    } catch (error) {
      console.error(error);
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (pageId) {
      void fetchPage();
    }
  }, [fetchPage, pageId]);

  // Handle return from Paystack checkout redirect
  useEffect(() => {
    if (searchParams.get('contribution') === 'success') {
      const koboRaw = Number(searchParams.get('amount_kobo'));
      if (Number.isFinite(koboRaw) && koboRaw > 0) {
        toast.success('Your pool gift was received successfully!');
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('contribution');
      nextParams.delete('amount_kobo');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (loading) {
    return <WishCanvasLoader message="Loading birthday page..." />;
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <BrandLogo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
          <p className="mt-2 text-muted-foreground">This birthday page does not exist or may have been deleted.</p>
          <Link to="/" className="mt-6 inline-block">
            <Button variant="default">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCustomTheme = page.theme.startsWith('custom_');
  const builtInTheme = themeConfig[page.theme as keyof typeof themeConfig] || themeConfig.elegant;
  const customGradientFrom = page.theme_gradient_from || '#8b5cf6';
  const customGradientTo = page.theme_gradient_to || '#ec4899';
  const customGradientMid = page.theme_gradient_mid || null;
  const customGradientAngle = page.theme_gradient_angle ?? 135;
  const customGradientStops = customGradientMid
    ? `${customGradientFrom}, ${customGradientMid}, ${customGradientTo}`
    : `${customGradientFrom}, ${customGradientTo}`;
  const customThemeFont = fontClassMap[page.theme_font || 'sans'] || 'font-jakarta';
  const theme = isCustomTheme
    ? {
        emoji: page.theme_emoji || '🎨',
        text: 'text-slate-950',
        bg: '',
        font: customThemeFont,
        titleClass: customThemeFont,
        style: {
          background: `linear-gradient(${customGradientAngle}deg, ${customGradientStops})`,
        },
      }
    : {
        emoji: builtInTheme.emoji,
        text: builtInTheme.text,
        bg: builtInTheme.heroClass,
        font: builtInTheme.font,
        titleClass: builtInTheme.titleClass,
        style: undefined,
      };

  const birthdayDate = parseLocalDate(page.birthday_date);
  const formattedDate = birthdayDate ? format(birthdayDate, 'MMMM d, yyyy') : page.birthday_date;
  const customGradient = isCustomTheme
    ? {
        from: customGradientFrom,
        to: customGradientTo,
        mid: customGradientMid,
        angle: customGradientAngle,
      }
    : undefined;

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.font}`} style={theme.style}>
      {engine.showConfetti && <Confetti />}

      <header className="border-b border-border/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to={`/p/${page.id}`} className="flex items-center gap-2">
            <BrandLogo compact className="mb-0" />
            <span className={`text-xs opacity-75 sm:text-sm ${theme.text}`}>&larr; View birthday page</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`text-xs opacity-80 sm:text-sm ${theme.text}`}>{page.recipient_name}&apos;s Birthday</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {!engine.isSubmitted ? (
          <>
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/20 bg-card/60 px-4 py-1.5 backdrop-blur-md">
                <span className="text-lg">🎉</span>
                <span className="text-sm font-medium text-foreground">{formattedDate}</span>
              </div>
              <h1 className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${theme.titleClass || theme.font} ${theme.text}`}>
                {engine.isEditMode ? 'Update Your Birthday Memory' : `Leave a Birthday Memory for ${page.recipient_name}`}
              </h1>
              <p className={`mx-auto mt-2 max-w-xl text-sm sm:text-base opacity-90 ${theme.text}`}>
                {engine.isEditMode
                  ? 'Make any adjustments to your message, notes, photos, or voice note before the canvas is revealed.'
                  : 'Leave a message, add a few photos if you want, and attach a short note to each memory so the page feels more personal.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(page.contributor_count || page.message_count, 3))].map((_, index) => (
                    <div key={index} className="h-7 w-7 rounded-full border-2 border-card bg-gradient-to-br from-primary to-secondary sm:h-8 sm:w-8" />
                  ))}
                </div>
                <span className={`text-xs opacity-80 sm:text-sm ${theme.text}`}>
                  {page.contributor_limit_reached
                    ? 'Free limit reached (6 contributors)'
                    : `${page.contributor_count || page.message_count} ${(page.contributor_count || page.message_count) === 1 ? 'person has' : 'people have'} contributed`}
                </span>
              </div>
            </div>

            {/* Mobile Mode Switcher Pill */}
            <div className="sticky top-3 z-30 mb-6 flex justify-center font-sans lg:hidden">
              <div className="inline-flex items-center rounded-full border border-stone-200/90 bg-white/95 p-1 shadow-lg shadow-black/8 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setMobileView('form')}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    mobileView === 'form' ? 'bg-slate-900 text-white shadow-xs' : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  <span>✍️</span>
                  <span>Compose Wish</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView('preview')}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    mobileView === 'preview' ? 'bg-slate-900 text-white shadow-xs' : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  <span>👁️</span>
                  <span>Live Preview</span>
                  {(engine.selectedPhotos.length > 0 || engine.message.trim() || engine.audioRecorder.wishAudioPreviewUrl || engine.stickers.length > 0) && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Sticky Live Keepsake Preview Column */}
              <div className={`lg:col-span-5 lg:sticky lg:top-8 self-start ${mobileView === 'preview' ? 'block' : 'hidden lg:block'}`}>
                <ContributorWishPreview
                  recipientName={page.recipient_name}
                  senderName={engine.senderName}
                  message={engine.message}
                  selectedPhotos={engine.selectedPhotos}
                  wishAudioPreviewUrl={
                    engine.audioRecorder.wishAudioPreviewUrl ||
                    (engine.audioRecorder.existingAudioUrl ? resolveAssetUrl(engine.audioRecorder.existingAudioUrl) || engine.audioRecorder.existingAudioUrl : null)
                  }
                  recordingDuration={engine.audioRecorder.recordingDuration}
                  isRecording={engine.audioRecorder.isRecording}
                  stickers={engine.stickers}
                  poolAmountNaira={engine.poolAmountNaira}
                  poolFundraisingEnabled={Boolean(page.pool_fundraising_enabled)}
                  themeKey={page.theme}
                  customGradient={customGradient}
                  themeGradientFrom={page.theme_gradient_from}
                  themeGradientTo={page.theme_gradient_to}
                  themeGradientMid={page.theme_gradient_mid}
                  themeGradientAngle={page.theme_gradient_angle}
                  themeEmoji={page.theme_emoji}
                  themeFont={page.theme_font}
                  displayMode={page.display_mode}
                  letterTheme={page.letter_theme}
                  coverPhotoUrl={page.cover_photo_url}
                />
                {mobileView === 'preview' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="mt-4 w-full rounded-2xl border-stone-300 bg-white/95 font-sans font-bold text-stone-800 shadow-sm hover:bg-white lg:hidden"
                    onClick={() => {
                      setMobileView('form');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    ✍️ Return to Editing Wish
                  </Button>
                )}
              </div>

              {/* Form Workbench Column */}
              <div className={`lg:col-span-7 ${mobileView === 'form' ? 'block' : 'hidden lg:block'}`}>
                <ContributeForm
                  page={page}
                  engine={engine}
                  onPreviewClick={() => {
                    setMobileView('preview');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <ContributeSuccessPanel
            recipientName={page.recipient_name}
            themeTextClass={theme.text}
            pageId={page.id}
            editToken={engine.editToken}
            onAddAnother={engine.resetForm}
            onEditWish={engine.handleEnterEditMode}
          />
        )}
      </main>

      {/* Confirmation Modal */}
      {page && (
        <ContributeConfirmModal
          isOpen={engine.isConfirmModalOpen}
          onClose={() => engine.setIsConfirmModalOpen(false)}
          onConfirm={engine.handleConfirmFinalSubmit}
          isSubmitting={engine.submitting}
          isEditMode={engine.isEditMode}
          recipientName={page.recipient_name}
          senderName={engine.senderName || 'Anonymous'}
          message={engine.message}
          selectedPhotos={engine.selectedPhotos}
          wishAudioPreviewUrl={
            engine.audioRecorder.wishAudioPreviewUrl ||
            (engine.audioRecorder.existingAudioUrl ? resolveAssetUrl(engine.audioRecorder.existingAudioUrl) || engine.audioRecorder.existingAudioUrl : null)
          }
          stickers={engine.stickers}
          poolAmountNaira={engine.poolAmountNaira}
          poolFundraisingEnabled={page.pool_fundraising_enabled && !engine.isEditMode}
          pageTheme={page.theme}
          customGradient={customGradient}
          themeGradientFrom={page.theme_gradient_from}
          themeGradientTo={page.theme_gradient_to}
          themeGradientMid={page.theme_gradient_mid}
          themeGradientAngle={page.theme_gradient_angle}
          themeEmoji={page.theme_emoji}
          themeFont={page.theme_font}
          displayMode={page.display_mode}
          letterTheme={page.letter_theme}
          coverPhotoUrl={page.cover_photo_url}
        />
      )}
    </div>
  );
};

export default ContributePage;
