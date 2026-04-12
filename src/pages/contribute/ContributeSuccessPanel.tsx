import { Link } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ContributeSuccessPanelProps = {
  recipientName: string;
  themeTextClass: string;
  onAddAnother: () => void;
};

export function ContributeSuccessPanel({ recipientName, themeTextClass, onAddAnother }: ContributeSuccessPanelProps) {
  return (
    <div className="animate-scale-in px-2 text-center">
      <div className="mb-4 text-6xl sm:mb-6 sm:text-8xl">🎉</div>
      <h2 className={`mb-2 text-2xl font-bold sm:mb-3 sm:text-3xl ${themeTextClass}`}>Your wish has been added!</h2>
      <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        {recipientName} will see it on their special day.
      </p>

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
