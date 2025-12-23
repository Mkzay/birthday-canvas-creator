import React from 'react';
import { Check } from 'lucide-react';

const features = [
  'Unlimited messages',
  'Photo uploads',
  'Beautiful animations',
  'Custom themes',
  'Easy sharing',
  'Edit anytime',
];

const FeaturesSection = () => {
  return (
    <section className="py-24 px-6 bg-card">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-16">
          Everything You Need
        </h2>
        
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Check className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-medium text-foreground">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
