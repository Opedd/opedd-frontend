import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import EditorialBreakSection from "@/components/EditorialBreakSection";
import FeatureGrid from "@/components/FeatureGrid";
import TechnicalSpecsSection from "@/components/TechnicalSpecsSection";
import CaseStudiesSection from "@/components/CaseStudiesSection";
import WhyOpeddSection from "@/components/WhyOpeddSection";
import { Link } from "react-router-dom";
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
        {/* Pricing CTA */}
        <section className="py-20 px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#040042" }}>
            Simple, transparent pricing
          </h2>
          <p className="text-lg mb-8" style={{ color: "#6B7280" }}>
            Start free. Upgrade when your earnings make it obvious.
          </p>
          <Link
            to="/pricing"
            className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#4A26ED" }}
          >
            See pricing
          </Link>
        </section>
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;