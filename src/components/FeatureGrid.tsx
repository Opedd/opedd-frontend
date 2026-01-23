import { motion } from "framer-motion";
import { Rss, CreditCard, FileText } from "lucide-react";

const features = [
  {
    icon: Rss,
    title: "Institutional Rights Management",
    description: "Transform your archive into a fully licensed, machine-readable catalog in 60 seconds.",
    highlight: "60 seconds",
  },
  {
    icon: CreditCard,
    title: "Frictionless Licensing Widget",
    description: "A Stripe-like checkout experience for human citations and AI training requests.",
    highlight: "Stripe-like",
  },
  {
    icon: FileText,
    title: "Automated Revenue Settlement",
    description: "Track every ingestion. Receive payments automatically via Story Protocol.",
    highlight: "Story Protocol",
  },
];

const FeatureGrid = () => {
  return (
    <section id="products" className="py-24 lg:py-32 relative scroll-mt-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-oxford text-xs font-bold uppercase tracking-[0.2em] font-mono">
            // INFRASTRUCTURE
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-soft-white mt-4">
            Built for Publishers & Institutions
          </h2>
          <p className="text-lg text-alice-gray mt-4 max-w-2xl mx-auto">
            Enterprise-grade licensing infrastructure for the knowledge economy.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <div className="glass-card p-8 h-full hover-glow transition-all duration-300 group-hover:border-oxford/30">
                  {/* Icon Container */}
                  <div className="w-14 h-14 rounded-xl bg-oxford/10 flex items-center justify-center mb-6 group-hover:bg-oxford/20 transition-colors">
                    <Icon className="w-7 h-7 text-oxford" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-soft-white mb-3">
                    {feature.title}
                  </h3>

                  {/* Description with highlight */}
                  <p className="text-alice-gray leading-relaxed">
                    {feature.description.split(feature.highlight).map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className="text-oxford font-medium">
                            {feature.highlight}
                          </span>
                        )}
                      </span>
                    ))}
                  </p>

                  {/* Decorative line */}
                  <div className="mt-6 h-1 w-12 bg-gradient-to-r from-oxford to-oxford-glow rounded-full group-hover:w-20 transition-all duration-300" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;