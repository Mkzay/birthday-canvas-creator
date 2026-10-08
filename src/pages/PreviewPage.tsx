import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Check,
  Copy,
  Edit,
  ExternalLink,
  Laptop,
  QrCode,
  RotateCcw,
  Share2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import BirthdayPage from './BirthdayPage';
import { apiFetch } from '@/lib/api';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import QRCodeModal from '@/components/QRCodeModal';
import { cn } from '@/lib/utils';

type DeviceView = 'desktop' | 'mobile';

const PreviewPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [resolvedPageId, setResolvedPageId] = useState<string | null>(null);

  // Device simulation and replay states
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
  const [replayKey, setReplayKey] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  // QR Modal and link copy states
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrType, setQrType] = useState<'birthday' | 'contribute'>('birthday');
  const [copiedReveal, setCopiedReveal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const checkOwnership = useCallback(async () => {
    if (!pageId) return;

    try {
      const data = await apiFetch<{
        isOwner: boolean;
        publicCode: string | null;
        recipientName: string | null;
        pageId: string | null;
        isGuest?: boolean;
      }>(`/pages/${pageId}/ownership`);

      setIsOwner(data.isOwner);
      setIsGuest(Boolean(data.isGuest));
      setPublicCode(data.publicCode);
      setRecipientName(data.recipientName);
      setResolvedPageId(data.pageId || pageId);

      if (!data.isOwner) {
        navigate(`/birthday/${pageId}`, { replace: true });
        return;
      }

      // If accessing via raw UUID when a clean public code exists, update the URL
      if (pageId && /^[0-9a-f-]{36}$/i.test(pageId) && data.publicCode) {
        navigate(`/preview/${data.publicCode}`, { replace: true });
      }
    } catch {
      navigate(`/birthday/${pageId}`, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate, pageId]);

  useEffect(() => {
    if (pageId && !authLoading) {
      void checkOwnership();
    }
  }, [authLoading, checkOwnership, pageId]);



  const effectiveShareKey = publicCode || resolvedPageId || pageId;

  const handleCopyLink = async (type: 'birthday' | 'contribute') => {
    const origin = window.location.origin;
    const targetUrl = type === 'birthday'
      ? `${origin}/birthday/${effectiveShareKey}`
      : `${origin}/contribute/${effectiveShareKey}`;

    try {
      await navigator.clipboard.writeText(targetUrl);
      if (type === 'birthday') {
        setCopiedReveal(true);
        setTimeout(() => setCopiedReveal(false), 2000);
        toast.success('Celebrant Reveal link copied to clipboard');
      } else {
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
        toast.success('Guest Contributor invite link copied');
      }
    } catch {
      window.prompt('Copy link:', targetUrl);
    }
  };

  const handleReplayReveal = () => {
    setIsReplaying(true);
    setReplayKey((prev) => prev + 1);
    toast.info('Replaying celebration reveal from the beginning');
    setTimeout(() => setIsReplaying(false), 700);
  };

  const handleBackToAtelier = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetEditId = resolvedPageId || pageId;
    if (targetEditId) {
      navigate(`/edit/${targetEditId}`);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(user ? '/dashboard' : '/');
  };

  // Collapsible staging command deck state: default to collapsed on mobile/tablets to never cover story header
  const [controlsCollapsed, setControlsCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024
  );

  if (loading || authLoading) {
    return <WishCanvasLoader />;
  }

  return (
    <div
      className={cn(
        'text-stone-900 flex flex-col relative min-h-screen overflow-x-hidden bg-[#FAF7F2]',
        deviceView === 'desktop'
          ? 'lg:h-screen lg:overflow-hidden'
          : 'lg:h-screen lg:overflow-hidden lg:bg-stone-900'
      )}
    >
      
      {/* 1. INDEPENDENT FLOATING STAGING COMMAND DECK */}
      {isOwner && (
        <aside
          aria-label="Preview Controls"
          className={cn(
            'fixed z-50 pointer-events-auto transition-all duration-300',
            controlsCollapsed
              ? 'bottom-14 left-3 lg:bottom-auto lg:top-3 lg:left-1/2 lg:-translate-x-1/2'
              : 'top-2.5 left-2.5 right-2.5 sm:top-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto max-w-[calc(100vw-1.25rem)]'
          )}
        >
          {controlsCollapsed ? (
            /* Minimized Capsule Pill */
            <button
              type="button"
              onClick={() => setControlsCollapsed(false)}
              className="btn-press flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 text-white shadow-card-lg backdrop-blur-md border border-white/20 text-xs font-semibold hover:bg-slate-900 transition-all"
              title="Expand Staging Controls"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Staging Controls</span>
              <span className="text-[10px] text-stone-400 font-mono">▾</span>
            </button>
          ) : (
            /* Expanded Staging Island Capsule */
            <div className="flex items-center gap-1.5 sm:gap-2.5 rounded-2xl sm:rounded-full bg-white/92 backdrop-blur-xl border border-stone-200/90 px-2 sm:px-3 py-1.5 shadow-card-lg transition-all">
              
              {/* Return to Atelier Button */}
              <button
                type="button"
                onClick={handleBackToAtelier}
                className="btn-press flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs shrink-0 cursor-pointer touch-manipulation"
                title="Return to Atelier"
                aria-label="Return to Atelier"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>

              {/* Status Badge & Title */}
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                {isGuest ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300/80 text-[10px] font-bold shadow-2xs shrink-0">
                    <Sparkles className="h-3 w-3 text-amber-700" />
                    <span className="hidden xs:inline">Guest</span>
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-950 border border-emerald-200/80 text-[10px] font-bold shadow-2xs shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live</span>
                  </span>
                )}
                <span className="hidden sm:inline font-serif font-bold text-slate-950 text-xs truncate max-w-[130px]">
                  {recipientName || 'Preview'}
                </span>
              </div>

              {/* Divider: Visible on desktop only */}
              <div className="hidden lg:block h-4 w-px bg-stone-200" />

              {/* Viewport Switcher: Hidden on mobile and tablet devices */}
              <div className="hidden lg:flex items-center p-0.5 rounded-full bg-stone-100 border border-stone-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDeviceView('desktop')}
                  className={cn(
                    'btn-press flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                    deviceView === 'desktop'
                      ? 'bg-white text-slate-950 shadow-xs ring-1 ring-stone-900/5'
                      : 'text-stone-600 hover:text-slate-950'
                  )}
                  title="Desktop widescreen layout"
                >
                  <Laptop className="h-3 w-3 text-stone-500" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceView('mobile')}
                  className={cn(
                    'btn-press flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                    deviceView === 'mobile'
                      ? 'bg-white text-slate-950 shadow-xs ring-1 ring-stone-900/5'
                      : 'text-stone-600 hover:text-slate-950'
                  )}
                  title="Mobile smartphone simulator"
                >
                  <Smartphone className="h-3 w-3 text-stone-500" />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Replay Reveal Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplayReveal}
                className="btn-press h-8 rounded-full border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[11px] font-semibold px-2 sm:px-2.5 shadow-2xs gap-1"
                title="Replay reveal from the start"
              >
                <RotateCcw className={cn('h-3 w-3 text-amber-700', isReplaying && 'animate-spin')} />
                <span className="hidden lg:inline">Replay</span>
              </Button>

              {/* Share & Links Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-press h-8 rounded-full border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[11px] font-semibold px-2 sm:px-2.5 shadow-2xs gap-1"
                  >
                    <Share2 className="h-3 w-3 text-stone-600" />
                    <span className="hidden sm:inline">Links</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 rounded-2xl p-2 shadow-card-lg border-stone-200 bg-white mt-2">
                  <div className="px-2.5 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Share Celebration</p>
                    <p className="text-xs text-stone-600 mt-0.5">Invite friends or copy the private reveal link.</p>
                  </div>
                  <DropdownMenuSeparator className="bg-stone-100" />
                  
                  <DropdownMenuItem
                    onClick={() => void handleCopyLink('contribute')}
                    className="rounded-xl cursor-pointer py-2 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✉️</span>
                      <div>
                        <p className="font-bold text-slate-900">Guest Invite Link</p>
                        <p className="text-[10px] text-stone-600">For friends to pin wishes</p>
                      </div>
                    </div>
                    {copiedInvite ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-stone-600" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => void handleCopyLink('birthday')}
                    className="rounded-xl cursor-pointer py-2 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎂</span>
                      <div>
                        <p className="font-bold text-slate-900">Celebrant Reveal Link</p>
                        <p className="text-[10px] text-stone-600">For {recipientName || 'the celebrant'}</p>
                      </div>
                    </div>
                    {copiedReveal ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-stone-600" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-stone-100" />

                  <DropdownMenuItem
                    onClick={() => {
                      setQrType('birthday');
                      setQrModalOpen(true);
                    }}
                    className="rounded-xl cursor-pointer py-1.5 text-xs flex items-center gap-2"
                  >
                    <QrCode className="h-3.5 w-3.5 text-stone-600" />
                    <span>Reveal QR Code</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setQrType('contribute');
                      setQrModalOpen(true);
                    }}
                    className="rounded-xl cursor-pointer py-1.5 text-xs flex items-center gap-2"
                  >
                    <QrCode className="h-3.5 w-3.5 text-stone-600" />
                    <span>Contributor QR Code</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Action: Curate or Claim */}
              {isGuest ? (
                <Button
                  asChild
                  size="sm"
                  className="btn-press h-8 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white font-bold text-[11px] px-2.5 sm:px-3.5 shadow-xs hover:brightness-105 gap-1 cursor-pointer"
                >
                  <Link
                    to={`/auth?mode=signup&public_code=${effectiveShareKey}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/auth?mode=signup&public_code=${effectiveShareKey}`);
                    }}
                  >
                    <Sparkles className="h-3 w-3 text-amber-200" />
                    <span>Claim</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  className="btn-press h-8 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-[11px] px-2.5 sm:px-3 shadow-xs gap-1 cursor-pointer"
                >
                  <Link
                    to={`/edit/${resolvedPageId || pageId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/edit/${resolvedPageId || pageId}`);
                    }}
                  >
                    <Edit className="h-3 w-3 text-amber-300" />
                    <span className="hidden sm:inline">Curate</span>
                    <span className="sm:hidden">Edit</span>
                  </Link>
                </Button>
              )}

              {/* Minimize Island Button */}
              <button
                type="button"
                onClick={() => setControlsCollapsed(true)}
                className="btn-press flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
                title="Minimize staging controls"
                aria-label="Minimize staging controls"
              >
                <span className="text-xs font-mono">▴</span>
              </button>

            </div>
          )}
        </aside>
      )}

      {/* 2. MAIN PREVIEW STAGING ARENA: Zero offset so canvas occupies true full viewport */}
      <main className="flex-1 flex flex-col min-h-0 w-full pt-0">
        
        {deviceView === 'mobile' ? (
          /* MOBILE PHONE SIMULATOR VIEWPORT */
          <div className="flex-1 flex flex-col items-center justify-center relative lg:bg-stone-900/90 lg:backdrop-blur-sm lg:p-4 lg:pt-14 lg:pb-6">
            {/* Ambient Background Glows: Desktop only */}
            <div className="hidden lg:block pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="hidden lg:block pointer-events-none absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />

            {/* Helper Caption: Desktop only */}
            <div className="hidden lg:block mb-3 text-center">
              <span className="text-[11px] font-semibold text-stone-300 tracking-wide flex items-center justify-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                <span>Mobile Experience Simulator: Scroll and touch to test</span>
              </span>
            </div>

            {/* TACTILE SMARTPHONE SHELL CONTAINER (Desktop) / NATIVE CANVAS (Mobile & Tablet) */}
            <div className="w-full min-h-screen lg:min-h-0 lg:w-[440px] lg:max-w-[calc(100vw-2rem)] lg:h-[840px] lg:max-h-[86vh] lg:rounded-[3.25rem] lg:border-[10px] lg:border-slate-950 lg:bg-black lg:shadow-2xl relative flex flex-col overflow-hidden lg:ring-1 lg:ring-white/15">
              
              {/* Top Dynamic Island with Camera & Sensor: Desktop only */}
              <div className="hidden lg:flex absolute top-2.5 left-1/2 -translate-x-1/2 z-50 h-5 w-24 bg-black rounded-full pointer-events-none items-center justify-end pr-2.5 shadow-2xs">
                <div className="h-2.5 w-2.5 rounded-full bg-stone-900 border border-stone-800" />
              </div>

              {/* Viewport: Single BirthdayPage instance with forceMobileView */}
              <div className="flex-1 w-full lg:overflow-y-auto lg:overflow-x-hidden scrollbar-none lg:rounded-[2.6rem] relative bg-[#FAF7F2]">
                <BirthdayPage
                  key={`preview-canvas-${replayKey}`}
                  isPreview={isOwner}
                  showRevealIntroInPreview={isOwner}
                  forceMobileView={true}
                />
              </div>

              {/* Bottom Home Indicator Bar: Desktop only */}
              <div className="hidden lg:block absolute bottom-2 left-1/2 -translate-x-1/2 z-50 w-28 h-1 bg-stone-400/40 rounded-full pointer-events-none" />
            </div>
          </div>
        ) : (
          /* DESKTOP FULL-WIDTH VIEWPORT */
          <div className="flex-1 w-full relative min-h-screen lg:min-h-0 lg:h-full">
            <BirthdayPage
              key={`preview-canvas-${replayKey}`}
              isPreview={isOwner}
              showRevealIntroInPreview={isOwner}
              forceMobileView={false}
            />
          </div>
        )}

      </main>

      {/* QR Code Sharing Modal */}
      <QRCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        url={`${window.location.origin}/${qrType === 'contribute' ? 'contribute' : 'birthday'}/${effectiveShareKey}`}
        title={qrType === 'contribute' ? 'Contributor Invite QR Code' : 'Celebrant Reveal QR Code'}
        recipientName={recipientName || 'Celebrant'}
      />

    </div>
  );
};

export default PreviewPage;
