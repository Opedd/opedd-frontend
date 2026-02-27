import { motion } from "framer-motion";
import { Newspaper, Bot, Building2 } from "lucide-react";

const useCases = [
  {
    icon: Newspaper,
    name: "News Publishers",
    description: "List your archive. Set per-article or site-wide prices. Buyers check out instantly. Revenue lands in your account.",
  },
  {
    icon: Bot,
    name: "AI Companies",
    description: "License training data and inference corpora at scale. Programmatic API and MCP server for autonomous purchasing. On-chain proof for compliance teams.",
  },
  {
    icon: Building2,
    name: "Enterprise Research Teams",
    description: "Archive licenses cover everything from a publisher within a date range. Invoice PDFs generated automatically for finance teams.",
  },
];

const CaseStudiesSection = () => {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden bg-navy-deep">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-10" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-oxford/10 border border-oxford/20 text-oxford text-sm font-medium mb-6">
            Use Cases
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-soft-white mb-6">
            Built for Every Side
            <br />
            <span className="text-oxford">of the Transaction</span>
          </h2>
          <p className="text-lg text-alice-gray max-w-2xl mx-auto">
            Whether you publish content or need to license it, Opedd handles the infrastructure.
          </p>
        </motion.div>

        {/* Use Case Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <motion.div
                key={useCase.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card p-6 lg:p-8 hover-glow group"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-oxford/20 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-oxford" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-soft-white group-hover:text-oxford transition-colors">
                      {useCase.name}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-alice-gray text-sm leading-relaxed">
                  {useCase.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-alice-gray">
            Ready to get started?{" "}
            <a href="/signup" className="text-oxford hover:underline font-medium">
              Create your free account
            </a>{" "}
            and start licensing your content.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CaseStudiesSection;
