import React from 'react';
import { Gift, Users, Sparkles } from 'lucide-react';

const steps = [
  {
    icon: Gift,
    step: 'STEP 1',
    title: 'Create a Page',
    description: "Set up a personalized birthday page in seconds. Choose a theme and add the birthday person's details.",
  },
  {
    icon: Users,
    step: 'STEP 2',
    title: 'Invite Friends',
    description: 'Share a simple link with friends and family. Everyone can add their own messages and photos.',
  },
  {
    icon: Sparkles,
    step: 'STEP 3',
    title: 'Reveal the Magic',
    description: 'On the big day, reveal the page filled with love, memories, and heartfelt wishes.',
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 px-6 bg-card">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-16">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <div 
              key={index}
              className="text-center p-8 rounded-3xl hover:bg-muted/50 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl gradient-cta flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-glow">
                <item.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <span className="text-xs font-bold tracking-widest text-primary mb-2 block">
                {item.step}
              </span>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
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
