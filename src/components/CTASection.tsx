import React from 'react';
import { Button } from '@/components/ui/button';

const CTASection = () => {
  return (
    <section className="py-24 px-6 gradient-cta relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground mb-8">
          Ready to Make Someone's Day?
        </h2>
        <Button variant="light" size="xl">
          Get Started Free
        </Button>
      </div>
    </section>
  );
};

export default CTASection;
