import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import BirthdayPage from './BirthdayPage';
import { apiFetch } from '@/lib/api';
import WishCanvasLoader from '@/components/WishCanvasLoader';

const PreviewPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [publicCode, setPublicCode] = useState<string | null>(null);

  const checkOwnership = useCallback(async () => {
    if (!pageId) return;

    try {
      const data = await apiFetch<{ isOwner: boolean; publicCode: string | null; isGuest?: boolean }>(`/pages/${pageId}/ownership`);
      setIsOwner(data.isOwner);
      setIsGuest(Boolean(data.isGuest));
      setPublicCode(data.publicCode);
      
      if (!data.isOwner) {
        navigate(`/birthday/${pageId}`, { replace: true });
        return;
      }

      // If we are using a UUID but have a public code, redirect to use the public code in the URL
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

  useEffect(() => {
    if (!isOwner) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehaviorY = body.style.overscrollBehaviorY;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehaviorY = 'none';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehaviorY = previousBodyOverscrollBehaviorY;
    };
  }, [isOwner]);

  const copyLink = async () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/birthday/${publicCode || pageId}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success('Birthday link copied');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  if (loading || authLoading) {
    return <WishCanvasLoader />;
  }

  return (
    <div className="relative">
      {/* Preview Banner */}
      {isOwner && (
        <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2.5 shadow-md ${isGuest ? 'bg-amber-950/95 text-amber-50 backdrop-blur-md' : 'bg-foreground/90 text-primary-foreground'}`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                    return;
                  }
                  navigate(user ? '/dashboard' : '/');
                }}
                className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${isGuest ? 'bg-amber-500/25 text-amber-300' : 'bg-white/10 text-white'}`}>
                {isGuest ? 'Guest Preview' : 'Preview Mode'}
              </span>
              {isGuest && (
                <span className="hidden md:inline text-amber-200/90 text-[11px]">
                  Created as guest. Claim to edit details or moderate wishes.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isGuest ? (
                <Link to={`/auth?mode=signup&public_code=${publicCode || pageId}`}>
                  <Button size="sm" className="btn-press h-7 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3 shadow-xs">
                    Claim Canvas
                  </Button>
                </Link>
              ) : (
                <Link to={`/edit/${pageId}`}>
                  <Button variant="glass" size="sm" className="gap-1 h-7 text-xs">
                    <Edit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </Link>
              )}
              <Button variant="glass" size="sm" className="gap-1 h-7 text-xs" onClick={copyLink}>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add padding for the banner */}
      <div className={isOwner ? "pt-12" : ""}>
        <BirthdayPage isPreview={isOwner} showRevealIntroInPreview={isOwner} />
      </div>
    </div>
  );
};

export default PreviewPage;
