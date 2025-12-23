import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="min-h-[100svh] gradient-hero flex items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-8 sm:pb-16 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 sm:w-64 sm:h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 sm:w-80 sm:h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="animate-fade-in-up mb-4 sm:mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-primary-foreground/90 text-xs sm:text-sm font-medium">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            Free to use • No signup required
          </span>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-primary-foreground mb-4 sm:mb-6 leading-[1.1] tracking-tight">
            Create Birthday Magic{' '}
            <span className="gradient-accent block sm:inline">Together</span>
          </h1>
        </div>
        
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/80 max-w-xl sm:max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
            Gather heartfelt messages, photos, and wishes from friends & family. 
            Create a beautiful, collaborative birthday page they'll treasure forever.
          </p>
        </div>
        
        <div className="animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <Link to="/dashboard">
            <Button variant="light" size="lg" className="group w-full sm:w-auto text-base">
              Create Your First Page
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <span className="text-primary-foreground/60 text-sm hidden sm:block">
            Takes less than 2 minutes
          </span>
        </div>
        
        {/* Demo Preview Card */}
        <div 
          className="mt-8 sm:mt-12 md:mt-16 animate-scale-in" 
          style={{ animationDelay: '0.5s', opacity: 0 }}
        >
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-sm sm:max-w-md mx-auto shadow-soft-lg animate-float">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                🎂
              </div>
              <div className="text-left min-w-0">
                <h3 className="font-bold text-foreground text-base sm:text-lg truncate">Sarah's Birthday</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">23 wishes collected</p>
              </div>
            </div>
            <div className="flex gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 ring-2 ring-white" />
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 -ml-3 ring-2 ring-white" />
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 -ml-3 ring-2 ring-white" />
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted -ml-3 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-muted-foreground ring-2 ring-white">
                +20
              </div>
            </div>
            <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-4/5 gradient-cta rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
