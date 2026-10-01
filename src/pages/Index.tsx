import Confetti from '@/components/Confetti';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import InteractiveExperienceSection from '@/components/InteractiveExperienceSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import FeaturesSection from '@/components/FeaturesSection';
import ThemesSection from '@/components/ThemesSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FAQSection from '@/components/FAQSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Confetti />
      <Header />
      <main>
        <HeroSection />
        <InteractiveExperienceSection />
        <HowItWorksSection />
        <FeaturesSection />
        <ThemesSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
