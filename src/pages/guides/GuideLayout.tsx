import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ArrowLeft, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface GuideLayoutProps {
  title: string;
  documentTitle: string;
  children: React.ReactNode;
}

const GuideLayout = ({ title, documentTitle, children }: GuideLayoutProps) => {
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

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-10">
            {title}
          </h1>

          <div className="prose prose-gray max-w-none">
            {children}
          </div>

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
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Ready to get started? Sign up free →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GuideLayout;
