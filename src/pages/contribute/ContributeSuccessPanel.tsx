import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, MessageCircle, Pencil, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ContributeSuccessPanelProps = {
  recipientName: string;
  themeTextClass: string;
  pageId: string;
  editToken?: string | null;
  onAddAnother: () => void;
  onEditWish?: () => void;
};

export function ContributeSuccessPanel({
  recipientName,
  themeTextClass,
  pageId,
  editToken,
  onAddAnother,
  onEditWish,
}: ContributeSuccessPanelProps) {
  const [copied, setCopied] = useState(false);

  const editUrl = editToken
    ? `${window.location.origin}/contribute/${pageId}#edit=${editToken}`
    : '';

  const whatsappMessage = `Here is your private link to edit your wish for ${recipientName} on WishCanvas: ${editUrl}`;
  const whatsappEditShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopyEditLink = async () => {
    if (!editUrl) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(editUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = editUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Private edit link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy link. Please copy it manually.');
    }
  };

  return (
    <div className="animate-scale-in px-2 text-center">
      <div className="mb-4 text-6xl sm:mb-6 sm:text-8xl">🎉</div>
      <h2 className={`mb-2 text-2xl font-bold sm:mb-3 sm:text-3xl ${themeTextClass}`}>Your wish has been added!</h2>
      <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        {recipientName} will see it on their special day.
      </p>

      {editToken && (
        <div className="mx-auto mb-8 max-w-xl rounded-2xl border border-border/80 bg-card/80 p-5 text-left shadow-sm backdrop-blur-md transition-all sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">Keep your private edit link</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Spotted a typo or want to swap a photo later? Keep this link safe. You can edit your wish anytime until {recipientName}&apos;s canvas is sealed or revealed.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <a
              href={whatsappEditShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#20ba5a] active:scale-[0.99] sm:w-auto sm:flex-1"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              Send link to myself on WhatsApp
            </a>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyEditLink}
              className="gap-2 rounded-xl text-xs sm:w-auto"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Link Copied' : 'Copy Edit Link'}
            </Button>
          </div>

          {onEditWish && (
            <div className="mt-3.5 flex justify-end border-t border-border/50 pt-3">
              <button
                type="button"
                onClick={onEditWish}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Edit this wish right now
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4">
        <Button variant="outline" size="default" onClick={onAddAnother} className="gap-2">
          <Plus className="h-4 w-4" />
          Add another message
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-xs text-muted-foreground sm:text-sm">or</span>
          </div>
        </div>

        <Link to="/create">
          <Button variant="hero" size="default" className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Create your own birthday page
          </Button>
        </Link>
      </div>
    </div>
  );
}
