import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Share2 } from 'lucide-react';
import BirthdayPage from './BirthdayPage';
import { toast } from 'sonner';

const PreviewPage = () => {
  const { pageId } = useParams();
  const { getPageById } = useApp();
  
  const page = pageId ? getPageById(pageId) : undefined;

  const copyLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/birthday/${pageId}`;
    navigator.clipboard.writeText(link);
    toast.success('Birthday link copied!');
  };
  
  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
          <Link to="/dashboard">
            <Button variant="hero">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Preview Banner */}
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

      {/* Add padding for the banner */}
      <div className="pt-14">
        <BirthdayPage />
      </div>
    </div>
  );
};

export default PreviewPage;
