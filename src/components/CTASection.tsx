import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 gradient-cta relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 sm:mb-6 leading-tight">
          Ready to Make Someone's Day?
        </h2>
        <p className="text-primary-foreground/80 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
          Start creating a birthday page now. It's free, fun, and takes less than 2 minutes.
        </p>
        <Link to="/dashboard">
          <Button variant="light" size="lg" className="group text-base">
            Get Started Free
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default CTASection;
