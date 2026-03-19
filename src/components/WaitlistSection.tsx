import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const WaitlistSection = () => {
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
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-soft-white mb-4">
                Start licensing your content today
              </h2>
              <p className="text-alice-gray">
                Free to start. No credit card required. Set up in under 5 minutes.
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <Link to="/signup">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full max-w-sm group"
                >
                  Create your free account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 pt-6 border-t border-soft-white/10">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-alice-gray">
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-oxford" />
                  No credit card
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-oxford" />
                  Free tier included
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-oxford" />
                  Setup in 5 minutes
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WaitlistSection;
