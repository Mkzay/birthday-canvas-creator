import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="min-h-screen gradient-hero flex items-center justify-center px-6 pt-20 pb-16 relative overflow-hidden">
      <div className="max-w-6xl mx-auto text-center">
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-6 leading-tight">
            Create Birthday Magic{' '}
            <span className="gradient-accent">Together</span>
          </h1>
        </div>
        
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
            Gather heartfelt messages, photos, and wishes from friends & family. 
            Create a beautiful, collaborative birthday page they'll treasure forever.
          </p>
        </div>
        
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <Link to="/dashboard">
            <Button variant="light" size="xl" className="group">
              Create Your First Page
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        
        {/* Demo Preview Card */}
        <div 
          className="mt-16 animate-scale-in animate-float" 
          style={{ animationDelay: '0.5s', opacity: 0 }}
        >
          <div className="glass-card rounded-3xl p-6 max-w-md mx-auto shadow-soft-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-2xl">
                🎂
              </div>
              <div className="text-left">
                <h3 className="font-bold text-foreground text-lg">Sarah's Birthday</h3>
                <p className="text-muted-foreground text-sm">23 wishes collected</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 -ml-3" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 -ml-3" />
              <div className="w-10 h-10 rounded-full bg-muted -ml-3 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                +20
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-4/5 gradient-cta rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
