import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { ArrowLeft, Home, LayoutDashboard, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();
  useDocumentTitle("Page Not Found — Opedd");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F2F9FF] flex flex-col">
      <header className="bg-white border-b border-[#E8F2FB]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={opeddLogoColor} alt="Opedd" className="h-8" />
          </Link>
          <Link
            to={user ? "/dashboard" : "/login"}
            className="text-sm text-[#4A26ED] font-medium hover:underline"
          >
            {user ? "Dashboard" : "Sign In"}
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-md">
          <Link to="/" className="inline-block mb-8">
            <img src={opeddLogoColor} alt="Opedd" className="h-12 mx-auto" />
          </Link>

          <div className="bg-white rounded-2xl border border-[#E8F2FB] p-8 shadow-sm mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#040042] to-[#0A0066] rounded-2xl mb-6">
              <span className="text-3xl font-bold text-white font-mono">404</span>
            </div>

            <h1 className="text-2xl font-bold text-[#040042] mb-3">Page not found</h1>
            <p className="text-[#040042]/60 mb-8 leading-relaxed">
              The page <code className="text-sm bg-[#040042]/5 px-2 py-0.5 rounded font-mono">{location.pathname}</code> doesn't exist or has been moved.
            </p>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#4A26ED]/30 transition-all mb-3"
            >
              <Home size={18} />
              Return to Homepage
            </Link>

            <div className="flex gap-3">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center gap-2 flex-1 h-12 border border-[#040042]/10 text-[#040042] rounded-xl font-medium hover:bg-[#F2F9FF] transition-all"
              >
                <ArrowLeft size={16} />
                Go Back
              </button>
              {user && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 flex-1 h-12 border border-[#040042]/10 text-[#040042] rounded-xl font-medium hover:bg-[#F2F9FF] transition-all"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E8F2FB] p-5 shadow-sm">
            <p className="text-xs text-[#040042]/40 uppercase tracking-wider font-medium mb-3">Helpful links</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link to="/verify" className="flex items-center gap-2 text-[#040042]/70 hover:text-[#4A26ED] p-2 rounded-lg hover:bg-[#F2F9FF] transition-colors">
                <Search size={14} />
                Verify License
              </Link>
              <Link to="/signup" className="flex items-center gap-2 text-[#040042]/70 hover:text-[#4A26ED] p-2 rounded-lg hover:bg-[#F2F9FF] transition-colors">
                <Home size={14} />
                Sign Up
              </Link>
              <Link to="/login" className="flex items-center gap-2 text-[#040042]/70 hover:text-[#4A26ED] p-2 rounded-lg hover:bg-[#F2F9FF] transition-colors">
                <LayoutDashboard size={14} />
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-6">
        <p className="text-xs text-[#040042]/30">&copy; 2026 Opedd. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default NotFound;
