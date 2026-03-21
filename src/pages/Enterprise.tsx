import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Search, CreditCard, Rss, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

const STEPS = [
  {
    icon: Search,
    title: "Discover",
    description: "Browse our verified publisher directory. Filter by category, article volume, and pricing.",
  },
  {
    icon: CreditCard,
    title: "License",
    description: "Select publishers, pay once via Stripe. We handle distribution to each publisher automatically.",
  },
  {
    icon: Rss,
    title: "Receive",
    description: "Poll our content feed daily via API. JSON or XML. Includes full article text where available.",
  },
];

const API_CODE = `# 1. Discover publishers
GET /publisher-directory?category=Finance&min_articles=100

# 2. License a bundle
POST /enterprise-license
{
  "publisher_ids": ["uuid1", "uuid2"],
  "buyer_email": "signal@signalai.com",
  "buyer_org": "Signal AI"
}
→ {
    "client_secret": "pi_...",
    "access_key": "ent_abc123",
    "auto_renews": true
  }

# 3. Receive content daily
GET /enterprise-license?access_key=ent_abc123&cursor=2026-01-01T00:00:00Z
→ {
    "articles": [...],
    "next_cursor": "..."
  }`;

const FAQS = [
  {
    q: "Do publishers have to opt in?",
    a: "Yes. Only verified publishers with AI pricing set appear in the directory.",
  },
  {
    q: "What if a publisher doesn't have full article text?",
    a: "The feed includes a summary + URL. Full text is available for publishers whose RSS feeds include content:encoded.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, cancel anytime from your Stripe billing portal. Access continues until the end of the current billing period.",
  },
];

export default function Enterprise() {
  const scrollToPublishers = () => {
    document.getElementById("pricing-model")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Header />

      {/* ── Hero ── */}
      <section className="bg-navy-deep pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-oxford/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-[#7C3AED]/10 rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="text-center space-y-6">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/60 font-medium">
              Enterprise Licensing
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              License the internet's best writing.{" "}
              <span className="text-white/40">At scale.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              One API call. One payment. Access to hundreds of verified publishers — delivered in JSON or XML, updated daily.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 pt-4 flex-wrap">
              <button
                onClick={scrollToPublishers}
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-white text-navy-deep text-sm font-bold hover:bg-white/90 transition-all"
              >
                Explore Publishers
                <ArrowRight size={15} />
              </button>
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5 transition-all bg-transparent"
              >
                Read the docs
                <ExternalLink size={15} />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 border-b border-[#E5E7EB]">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">How It Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#040042" }}>
              Three steps to licensed content
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#EEF0FD" }}>
                  <step.icon size={24} className="text-oxford" />
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "#040042" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Model ── */}
      <section id="pricing-model" className="py-20" style={{ backgroundColor: "#F9FAFB" }}>
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">Pricing</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight" style={{ color: "#040042" }}>
              Transparent, publisher-first pricing
            </motion.h2>
          </motion.div>

          <motion.div variants={fadeUp} custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm text-center">
              <div className="text-5xl font-bold mb-2" style={{ color: "#040042" }}>10%</div>
              <p className="text-base font-medium mb-4" style={{ color: "#040042" }}>platform fee — the rest goes directly to publishers.</p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#6B7280" }}>
                Pricing is set by publishers. Typical range: $2,000–$15,000 per publisher per year for AI licensing. Annual subscriptions auto-renew.
              </p>
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full" style={{ backgroundColor: "#EEF0FD", color: "#4A26ED" }}>
                Enterprise deals available — <a href="mailto:hello@opedd.com" className="underline">hello@opedd.com</a>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── API Preview ── */}
      <section className="py-20 lg:py-28 bg-navy-deep">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-[#A78BFA] mb-3">API Preview</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Three calls. That's it.
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-white/40 mt-3 max-w-xl mx-auto">
              Discover publishers, license a bundle, and receive content — all via REST.
            </motion.p>
          </motion.div>

          <motion.div variants={fadeUp} custom={3} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="bg-[#0D0D2B] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-white/30 text-xs font-mono ml-3">enterprise-api.sh</span>
              </div>
              <pre className="p-6 overflow-x-auto text-[13px] leading-relaxed">
                <code className="text-white/80 font-mono whitespace-pre">{API_CODE}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "#040042" }}>
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-slate-100">
                <AccordionTrigger className="text-left font-medium text-sm hover:no-underline py-4" style={{ color: "#040042" }}>
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#F9FAFB" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#040042" }}>
            Ready to license at scale?
          </h2>
          <p className="text-base mb-10 leading-relaxed" style={{ color: "#6B7280" }}>
            Get in touch to discuss enterprise pricing and custom integrations.
          </p>
          <a
            href="mailto:hello@opedd.com"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg bg-oxford"
          >
            Contact Sales
            <ArrowRight size={15} />
          </a>
          <p className="text-xs mt-8 tracking-wide" style={{ color: "#9CA3AF" }}>
            Or email us directly at hello@opedd.com
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}