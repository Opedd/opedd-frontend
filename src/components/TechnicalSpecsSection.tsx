import { motion } from "framer-motion";
import { Code2, Database, Bot, Shield } from "lucide-react";

const specs = [
  {
    icon: Code2,
    label: "WIDGET",
    title: "Embeddable Widget",
    description: "One script tag on any article page. Buyers see pricing and check out without leaving your site.",
  },
  {
    icon: Database,
    label: "API",
    title: "REST API",
    description: "Programmatic access for publishers. List articles, issue licenses, track revenue. REST API with API key auth.",
  },
  {
    icon: Bot,
    label: "MCP SERVER",
    title: "AI Agent Protocol",
    description: "AI assistants (Claude, Cursor, Windsurf) can discover, purchase, and verify licenses mid-conversation via npx opedd-mcp.",
  },
  {
    icon: Shield,
    label: "ON-CHAIN PROOF",
    title: "Blockchain Verification",
    description: "Every license registered on Tempo (Stripe's payments blockchain). Tamper-proof, permanent, verifiable by anyone.",
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
                  <p className="text-alice-gray text-sm leading-relaxed">{spec.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TechnicalSpecsSection;
