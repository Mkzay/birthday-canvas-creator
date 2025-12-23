import React from 'react';
import { Gift, Users, Sparkles } from 'lucide-react';

const steps = [
  {
    icon: Gift,
    step: '01',
    title: 'Create a Page',
    description: "Set up a personalized birthday page in seconds. Choose a theme and add the birthday person's details.",
  },
  {
    icon: Users,
    step: '02',
    title: 'Invite Friends',
    description: 'Share a simple link with friends and family. Everyone can add their own messages and photos.',
  },
  {
    icon: Sparkles,
    step: '03',
    title: 'Reveal the Magic',
    description: 'On the big day, reveal the page filled with love, memories, and heartfelt wishes.',
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-card">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            Simple Process
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            How It Works
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {steps.map((item, index) => (
            <div 
              key={index}
              className="relative text-center p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-muted/30 to-transparent border border-border/50 hover:border-primary/20 transition-all duration-300 group"
            >
              {/* Step number */}
              <span className="absolute top-4 right-4 sm:top-6 sm:right-6 text-4xl sm:text-5xl font-bold text-muted-foreground/10 group-hover:text-primary/10 transition-colors">
                {item.step}
              </span>
              
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl gradient-cta flex items-center justify-center mx-auto mb-4 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-glow">
                <item.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-foreground" />
              </div>
              
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">
                {item.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
