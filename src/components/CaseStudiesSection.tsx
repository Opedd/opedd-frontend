import { motion } from "framer-motion";
import { TrendingUp, Users, FileText, DollarSign, Quote } from "lucide-react";

const caseStudies = [
  {
    name: "Matter of Fact",
    type: "Political Analysis Newsletter",
    author: "Alexandre Bridi",
    avatar: "AB",
    quote: "Opedd turned my archive into a revenue stream. Media outlets now pay to republish my deep-dives, and I finally get cited properly when AI summarizes my work.",
    metrics: [
      { label: "New Revenue", value: "$780/mo", icon: DollarSign },
      { label: "Licensed Articles", value: "5", icon: FileText },
    ],
  },
  {
    name: "The Climate Desk",
    type: "Environmental Journalism",
    author: "Marcus Rivera",
    avatar: "MR",
    quote: "Other publications used to scrape my research without credit. Now they license it properly, and AI training datasets respect my opt-out preferences.",
    metrics: [
      { label: "Syndication Deals", value: "12", icon: Users },
      { label: "Protected Posts", value: "89", icon: FileText },
      { label: "Revenue Growth", value: "+180%", icon: TrendingUp },
    ],
  },
  {
    name: "Startup Decoded",
    type: "Tech Industry Analysis",
    author: "Priya Patel",
    avatar: "PP",
    quote: "Enterprise clients now license my market analysis directly through Opedd. The automated settlement means I spend zero time chasing invoices.",
    metrics: [
      { label: "Enterprise Clients", value: "8", icon: Users },
      { label: "Avg. License Fee", value: "$350", icon: DollarSign },
      { label: "Time Saved", value: "15hrs/mo", icon: TrendingUp },
    ],
  },
];

const CaseStudiesSection = () => {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
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
            Publisher Success Stories
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-soft-white mb-6">
            Creators Building Revenue
            <br />
            <span className="text-oxford">With Their Words</span>
          </h2>
          <p className="text-lg text-alice-gray max-w-2xl mx-auto">
            See how newsletter writers and independent publishers are monetizing their archives 
            and protecting their work with Opedd's infrastructure.
          </p>
        </motion.div>

        {/* Case Study Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {caseStudies.map((study, index) => (
            <motion.div
              key={study.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 lg:p-8 hover-glow group"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-oxford/20 flex items-center justify-center text-oxford font-bold text-sm shrink-0">
                  {study.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-soft-white group-hover:text-oxford transition-colors">
                    {study.name}
                  </h3>
                  <p className="text-sm text-alice-gray">{study.type}</p>
                  <p className="text-xs text-alice-gray/60 mt-1">by {study.author}</p>
                </div>
              </div>

              {/* Quote */}
              <div className="relative mb-6">
                <Quote className="absolute -top-2 -left-1 w-6 h-6 text-oxford/30" />
                <p className="text-alice-gray text-sm leading-relaxed pl-5 italic">
                  "{study.quote}"
                </p>
              </div>

              {/* Metrics - Center aligned */}
              <div className={`grid gap-3 pt-6 border-t border-soft-white/10 ${
                study.metrics.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}>
                {study.metrics.map((metric) => (
                  <div key={metric.label} className="flex flex-col items-center text-center">
                    <metric.icon className="w-4 h-4 text-oxford mb-2" />
                    <p className="text-lg font-bold text-soft-white">{metric.value}</p>
                    <p className="text-xs text-alice-gray/60">{metric.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
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
            Ready to join them?{" "}
            <a href="#waitlist" className="text-oxford hover:underline font-medium">
              Request early access
            </a>{" "}
            and start monetizing your archive.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CaseStudiesSection;
