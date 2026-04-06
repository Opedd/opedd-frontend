import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import SEO from "@/components/SEO";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import EditorialBreakSection from "@/components/EditorialBreakSection";
import FeatureGrid from "@/components/FeatureGrid";
import TechnicalSpecsSection from "@/components/TechnicalSpecsSection";
import CaseStudiesSection from "@/components/CaseStudiesSection";
import WhyOpeddSection from "@/components/WhyOpeddSection";

import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

const Index = () => {
  useDocumentTitle("Opedd — The Stripe for Content Licensing");
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
      </main>
      <Footer />
    </div>
  );
};

export default Index;