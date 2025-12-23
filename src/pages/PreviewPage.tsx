import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import BirthdayPage from './BirthdayPage';

const PreviewPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (pageId && user) {
      checkOwnership();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [pageId, user, authLoading]);

  const checkOwnership = async () => {
    const { data } = await supabase
      .from('birthday_pages')
      .select('user_id')
      .eq('id', pageId)
      .maybeSingle();

    setIsOwner(data?.user_id === user?.id);
    setLoading(false);
  };

  const copyLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/birthday/${pageId}`;
    navigator.clipboard.writeText(link);
    toast.success('Birthday link copied!');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Preview Banner */}
      {isOwner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-foreground/90 text-primary-foreground px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
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
        <BirthdayPage />
      </div>
    </div>
  );
};

export default PreviewPage;
