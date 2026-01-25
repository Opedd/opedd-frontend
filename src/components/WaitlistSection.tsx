import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const userTypes = [
  { value: "Newsletter", label: "Newsletter" },
  { value: "Media Co", label: "Media Co" },
  { value: "Indie Publisher", label: "Indie Publisher" },
  { value: "Enterprise", label: "Enterprise" },
];

const WaitlistSection = () => {
  const [selectedType, setSelectedType] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedType) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("waitlist")
      .insert({ email, role: selectedType });

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
    <section className="py-24 lg:py-32 relative overflow-hidden bg-navy-deep">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-oxford/8 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          {/* Glassmorphism Card */}
          <div className="glass-card p-8 lg:p-12 hover-glow">
            {!isSubmitted ? (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-oxford/10 border border-oxford/20 mb-6">
                    <Gift className="w-4 h-4 text-oxford" />
                    <span className="text-sm font-medium text-oxford">
                      Early Access Bonus
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-soft-white mb-4">
                    Request Infrastructure Access
                  </h2>
                  <p className="text-alice-gray">
                    Get your first <span className="text-oxford font-medium">Audit Report</span> for free when you sign up.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* User Type Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-soft-white mb-2">
                      I am a...
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full h-14 px-5 text-base rounded-xl bg-muted/50 border border-soft-white/20 text-soft-white focus:outline-none focus:ring-2 focus:ring-oxford focus:border-transparent transition-all appearance-none cursor-pointer"
                      required
                      disabled={isLoading}
                    >
                      <option value="" disabled className="bg-navy-deep text-alice-gray">
                        Select your role...
                      </option>
                      {userTypes.map((type) => (
                        <option key={type.value} value={type.value} className="bg-navy-deep text-soft-white">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-medium text-soft-white mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-14 px-5 text-base rounded-xl bg-muted/50 border border-soft-white/20 text-soft-white placeholder:text-alice-gray/60 focus:outline-none focus:ring-2 focus:ring-oxford focus:border-transparent transition-all"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="hero-primary"
                    size="lg"
                    className="w-full group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Request Access
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Trust indicators */}
                <div className="mt-8 pt-6 border-t border-soft-white/10">
                  <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-alice-gray">
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-oxford" />
                      No spam
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-oxford" />
                      Unsubscribe anytime
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-oxford" />
                      Early access
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 rounded-full bg-oxford/20 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-oxford" />
                </div>
                <h3 className="text-2xl font-bold text-soft-white mb-4">
                  You're on the list!
                </h3>
                <p className="text-alice-gray">
                  We'll send your free Audit Report as soon as we launch.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WaitlistSection;
