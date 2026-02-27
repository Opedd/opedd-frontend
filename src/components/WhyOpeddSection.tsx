import { motion } from "framer-motion";
import { Shield, Zap, Globe, TrendingUp } from "lucide-react";

const reasons = [
  {
    icon: Shield,
    title: "True Sovereignty",
    description: "Your content, your rules. Complete control over who accesses your work and how.",
  },
  {
    icon: Zap,
    title: "Instant Payments",
    description: "No more waiting 90 days. Get paid immediately when your content is licensed.",
  },
  {
    icon: Globe,
    title: "Universal Compatibility",
    description: "Works with any CMS, any platform. Just add your RSS feed and go.",
  },
  {
    icon: TrendingUp,
    title: "AI-Ready Revenue",
    description: "Future-proof your income with automated AI agent licensing.",
  },
];

const WhyOpeddSection = () => {
  return (
    <section id="why-opedd" className="py-24 lg:py-32 relative overflow-hidden scroll-mt-24 bg-navy-deep">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-blue/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-aqua-teal/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-oxford text-sm font-semibold uppercase tracking-wider">
            Why Opedd
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-soft-white mt-4">
            The Unfair Advantage
          </h2>
          <p className="text-lg text-alice-gray mt-4 max-w-2xl mx-auto">
            Join the creators who are taking back control of their content revenue.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <div className="glass-card p-6 lg:p-8 h-full hover-glow transition-all duration-300 flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-oxford/10 flex items-center justify-center shrink-0 group-hover:bg-oxford/20 transition-colors">
                    <Icon className="w-6 h-6 text-oxford" />
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-lg font-bold text-soft-white mb-2">
                      {reason.title}
                    </h3>
                    <p className="text-alice-gray text-sm leading-relaxed">
                      {reason.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-3xl mx-auto"
        >
          {[
            { value: "90%", label: "You keep" },
            { value: "10x", label: "Faster licensing" },
            { value: "$0", label: "Upfront costs" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-soft-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-alice-gray">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WhyOpeddSection;