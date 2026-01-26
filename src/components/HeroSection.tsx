import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    
    const { error } = await supabase
      .from("waitlist")
      .insert({ email, role: "Newsletter" });

    setIsLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "❌ Email already exists",
          description: "Check your inbox for previous confirmation.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsSubmitted(true);
    toast({
      title: "✅ Joined Opedd waitlist!",
      description: "You'll get early access soon.",
    });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/80 via-navy-deep/60 to-navy-deep" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
          >
            <Sparkles className="w-4 h-4 text-oxford" />
            <span className="text-sm font-medium text-alice-gray">
              Made for journalists and writers who want their work cited properly
            </span>
          </motion.div>

          {/* Main Headline - Clean Soft White Typography */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6 text-soft-white"
          >
            Your Content is Valuable.
            <br />
            Make it Sovereign.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-alice-gray max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Opedd helps newsletter writers and publishers license their work for human reuse 
            and authorized AI ingestion—all with one simple widget.
          </motion.p>

          {/* Email Signup Form - Stacked Layout for Perfect Alignment */}
          <motion.div
            id="waitlist-form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-md mx-auto w-full"
          >
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-14 px-6 text-base rounded-xl bg-soft-white/10 border border-soft-white/20 text-soft-white placeholder:text-alice-gray/60 focus:outline-none focus:ring-2 focus:ring-oxford focus:border-transparent transition-all"
                  required
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  variant="hero-primary" 
                  size="lg" 
                  className="w-full h-14 rounded-xl group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Request Early Access
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-3 h-14 px-6 rounded-xl bg-oxford/20 border border-oxford/30"
              >
                <Check className="w-5 h-5 text-oxford" />
                <span className="text-soft-white font-medium">You're on the list! We'll be in touch soon.</span>
              </motion.div>
            )}
          </motion.div>

        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-deep to-transparent" />
    </section>
  );
};

export default HeroSection;
