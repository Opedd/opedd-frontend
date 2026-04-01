import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ArrowLeft, Mail, ArrowRight, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface GuideLayoutProps {
  title: string;
  documentTitle: string;
  intro: string;
  prerequisites: string;
  afterSetup: string;
  children: React.ReactNode;
}

const RevenueFlow = () => (
  <div className="mt-10">
    <h2 className="text-lg font-semibold text-foreground mb-4">How you get paid</h2>
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="flex-1 w-full bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
        <p className="text-sm font-medium text-foreground">Publisher sets price</p>
      </div>
      <ArrowRight className="w-5 h-5 text-[#4A26ED] flex-shrink-0 rotate-90 sm:rotate-0" />
      <div className="flex-1 w-full bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
        <p className="text-sm font-medium text-foreground">AI lab purchases license</p>
      </div>
      <ArrowRight className="w-5 h-5 text-[#4A26ED] flex-shrink-0 rotate-90 sm:rotate-0" />
      <div className="flex-1 w-full bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
        <p className="text-sm font-medium text-foreground">Revenue in your Stripe account</p>
      </div>
    </div>
    <div className="mt-6 text-center">
      <Link
        to="/signup"
        className="inline-flex items-center gap-2 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Ready to get started? Sign up free →
      </Link>
    </div>
  </div>
);

const GuideLayout = ({ title, documentTitle, intro, prerequisites, afterSetup, children }: GuideLayoutProps) => {
  useDocumentTitle(documentTitle);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            to="/guides"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all guides
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {title}
            </h1>
            <span className="bg-[#EEF2FF] text-[#4A26ED] text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Setup time: ~2 minutes
            </span>
          </div>

          {/* A. Why license intro */}
          <p className="text-[#6B7280] text-[15px] leading-relaxed mb-8">{intro}</p>

          {/* B. What you'll need */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-5 mb-8">
            <p className="text-sm font-medium text-foreground mb-1">What you'll need</p>
            <p className="text-sm text-[#374151] leading-relaxed">{prerequisites}</p>
          </div>

          {/* Steps */}
          <div className="prose prose-gray max-w-none">
            {children}
          </div>

          {/* C. What happens after setup */}
          <div className="mt-8 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5">
            <p className="text-sm font-medium text-foreground mb-1">What happens after setup</p>
            <p className="text-sm text-[#374151] leading-relaxed">{afterSetup}</p>
          </div>

          {/* E. Revenue flow */}
          <RevenueFlow />

          {/* Need help */}
          <div className="mt-16 border-t border-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              Need help?{" "}
              <a
                href="mailto:support@opedd.com"
                className="text-[#4A26ED] hover:underline"
              >
                support@opedd.com
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GuideLayout;
