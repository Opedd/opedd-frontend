import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import EditorialBreakSection from "@/components/EditorialBreakSection";
import FeatureGrid from "@/components/FeatureGrid";
import TechnicalSpecsSection from "@/components/TechnicalSpecsSection";
import CaseStudiesSection from "@/components/CaseStudiesSection";
import WhyOpeddSection from "@/components/WhyOpeddSection";
import PricingSection from "@/components/PricingSection";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <EditorialBreakSection />
        <FeatureGrid />
        <TechnicalSpecsSection />
        <CaseStudiesSection />
        <WhyOpeddSection />
        <PricingSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;