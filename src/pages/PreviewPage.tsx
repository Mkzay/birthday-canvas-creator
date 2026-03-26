import React, { useCallback, useEffect, useState } from 'react';
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
  const [publicCode, setPublicCode] = useState<string | null>(null);

  const checkOwnership = useCallback(async () => {
    if (!pageId) return;

    try {
      const data = await apiFetch<{ isOwner: boolean; publicCode: string | null }>(`/pages/${pageId}/ownership`);
      setIsOwner(data.isOwner);
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
    if (pageId && user) {
      void checkOwnership();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, checkOwnership, navigate, pageId, user]);

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
        <div className="fixed top-0 left-0 right-0 z-50 bg-foreground/90 text-primary-foreground px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                    return;
                  }
                  navigate('/dashboard');
                }}
                className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <span className="text-sm opacity-70">Preview Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/edit/${pageId}`}>
                <Button variant="glass" size="sm" className="gap-1">
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <Button variant="glass" size="sm" className="gap-1" onClick={copyLink}>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add padding for the banner */}
      <div className={isOwner ? "pt-14" : ""}>
        <BirthdayPage isPreview={isOwner} showRevealIntroInPreview={isOwner} />
      </div>
    </div>
  );
};

export default PreviewPage;
