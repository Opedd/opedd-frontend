import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Products", href: "#products" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Pricing", href: "/pricing", isRoute: true },
    { label: "Enterprise", href: "/enterprise", isRoute: true },
    { label: "Publishers", href: "/publishers", isRoute: true },
  ];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/")) return;
    e.preventDefault();
    const targetId = href.replace("#", "");
    const element = document.getElementById(targetId);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerHeight;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  // Auth-aware CTA cluster — prevents flash of "Login" for returning users
  const renderAuthCtas = (mobile = false) => {
    if (isLoading) {
      // Reserve space to avoid CLS
      return <div className={mobile ? "h-20" : "h-9 w-48"} aria-hidden="true" />;
    }
    if (user) {
      return mobile ? (
        <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
          <Button size="sm" className="w-full bg-oxford hover:bg-oxford-dark text-white">
            Dashboard
          </Button>
        </Link>
      ) : (
        <Link to="/dashboard">
          <Button size="sm" className="bg-oxford hover:bg-oxford-dark text-white">
            Dashboard
          </Button>
        </Link>
      );
    }
    return mobile ? (
      <>
        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
          <Button variant="ghost" size="sm" className="w-full text-soft-white hover:text-oxford border border-white/30 hover:border-oxford hover:bg-transparent">
            Login
          </Button>
        </Link>
        <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
          <Button size="sm" className="w-full bg-oxford hover:bg-oxford-dark text-white">
            Get Started Free
          </Button>
        </Link>
      </>
    ) : (
      <>
        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-soft-white hover:text-oxford border border-white/30 hover:border-oxford bg-transparent">
            Login
          </Button>
        </Link>
        <Link to="/signup">
          <Button size="sm" className="bg-oxford hover:bg-oxford-dark text-white">
            Get Started Free
          </Button>
        </Link>
      </>
    );
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-navy-deep backdrop-blur-lg shadow-card border-b border-white/10"
          : "bg-navy-deep/95"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center p-1">
            <img src={opeddLogo} alt="Opedd" className="h-10 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-alice-gray hover:text-oxford transition-colors duration-200 text-sm font-medium"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className="text-alice-gray hover:text-oxford transition-colors duration-200 text-sm font-medium"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {renderAuthCtas(false)}
          </div>

          <button className="md:hidden text-soft-white p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-white/10 bg-navy-deep"
          >
            <nav className="flex flex-col gap-4 bg-navy-deep">
              {navLinks.map((link) =>
                link.isRoute ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="text-alice-gray/80 hover:text-oxford transition-colors py-2 text-sm font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-alice-gray/80 hover:text-oxford transition-colors py-2 text-sm font-medium"
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                  >
                    {link.label}
                  </a>
                )
              )}
              <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                {renderAuthCtas(true)}
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
