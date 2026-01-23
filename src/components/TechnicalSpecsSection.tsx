import { motion } from "framer-motion";
import { Rss, Database, Shield, Zap } from "lucide-react";

const specs = [
  {
    icon: Rss,
    label: "FEED_SYNC",
    title: "Feed Ingestion",
    description: "Auto-sync via RSS 2.0, Atom, or JSON Feed. Supports pagination and delta updates.",
    code: "opedd.ingest({ feed: 'https://...' })",
  },
  {
    icon: Database,
    label: "RIGHTS_LEDGER",
    title: "Ownership Tracking",
    description: "Every article registered on a secure rights ledger with immutable provenance.",
    code: "opedd.register({ asset: contentId })",
  },
  {
    icon: Shield,
    label: "LICENSE_TERMS",
    title: "Flexible Licensing",
    description: "Configurable terms: commercial use, attribution requirements, AI training opt-in/out.",
    code: "license.set({ commercial: true })",
  },
  {
    icon: Zap,
    label: "REVENUE_FLOW",
    title: "Instant Settlement",
    description: "Micro-payments via Stripe Connect. Real-time revenue tracking and splits.",
    code: "payment.route({ split: [0.85, 0.15] })",
  },
];

const TechnicalSpecsSection = () => {
  return (
    <section className="py-24 lg:py-32 bg-navy-darker relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-5" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-oxford text-xs font-bold uppercase tracking-[0.2em] font-mono">
            {"// TECHNICAL_SPECS"}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-soft-white mt-4">
            The Protocol
          </h2>
          <p className="text-lg text-alice-gray mt-4 max-w-2xl mx-auto">
            Built on open standards. Designed for scale. Ready for the AI economy.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {specs.map((spec, index) => {
            const Icon = spec.icon;
            return (
              <motion.div
                key={spec.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-navy-deep/50 border border-soft-white/10 rounded-xl p-6 hover:border-oxford/30 transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg border border-oxford/30 flex items-center justify-center bg-oxford/5">
                      <Icon className="w-5 h-5 text-oxford" strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-mono text-oxford tracking-wider">{spec.label}</span>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-soft-white mb-2">{spec.title}</h3>
                  <p className="text-alice-gray text-sm leading-relaxed mb-4">{spec.description}</p>

                  {/* Code Preview */}
                  <div className="bg-navy-darker/80 rounded-lg px-4 py-3 border border-soft-white/5">
                    <code className="text-xs font-mono text-alice-gray">
                      <span className="text-oxford">$</span> {spec.code}
                    </code>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* API Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div className="bg-navy-deep/80 border border-soft-white/10 rounded-xl overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-soft-white/10 bg-navy-darker/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-soft-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-soft-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-soft-white/20" />
              </div>
              <span className="text-xs text-alice-gray/60 font-mono ml-2">opedd-cli v1.0.0</span>
            </div>

            {/* Terminal Content */}
            <div className="p-6 font-mono text-sm">
              <div className="space-y-2">
                <p className="text-alice-gray/60"># Initialize your content catalog</p>
                <p className="text-soft-white"><span className="text-oxford">$</span> opedd init --feed "https://your-newsletter.com/rss"</p>
                <p className="text-sky-blue">✓ Connected to feed (247 articles found)</p>
                <p className="text-sky-blue">✓ Registered on Secure Rights Ledger</p>
                <p className="text-sky-blue">✓ Widget embed code generated</p>
                <p className="text-alice-gray/60 mt-4"># Your catalog is now live</p>
                <p className="text-soft-white"><span className="text-oxford">$</span> opedd status</p>
                <p className="text-alice-gray">Articles: <span className="text-soft-white">247</span> | Licensed: <span className="text-soft-white">12</span> | Revenue: <span className="text-oxford">$1,247.50</span></p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TechnicalSpecsSection;
