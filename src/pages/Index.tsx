import React from 'react';
import { Link } from 'react-router-dom';
import Confetti from '@/components/Confetti';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import ThemesSection from '@/components/ThemesSection';
import FeaturesSection from '@/components/FeaturesSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Confetti />
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <ThemesSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
