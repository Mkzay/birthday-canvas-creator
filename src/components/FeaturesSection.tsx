import React from 'react';
import { Check, Image, Palette, Share2, Edit, Heart, Infinity } from 'lucide-react';

const features = [
  { icon: Infinity, label: 'Unlimited messages' },
  { icon: Image, label: 'Photo uploads' },
  { icon: Heart, label: 'Beautiful animations' },
  { icon: Palette, label: 'Custom themes' },
  { icon: Share2, label: 'Easy sharing' },
  { icon: Edit, label: 'Edit anytime' },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-card">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            Features
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Everything You Need
          </h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-b from-muted/40 to-muted/10 border border-border/50 hover:border-primary/20 hover:bg-muted/50 transition-all duration-300 group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl gradient-cta flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <span className="text-sm sm:text-base font-medium text-foreground text-center">
                {feature.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
