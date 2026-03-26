import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  CreditCard,
  Radio,
  Shield,
  FileJson,
  Globe,
  RefreshCw,
  Scale,
  Banknote,
  Webhook,
  Rss,
  FileText,
  Layers,
  Users,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

const HOW_IT_WORKS = [
  {
    icon: Layers,
    title: "Choose your coverage",
    description:
      "Select RAG, training, or inference licensing. Cover a custom list of publishers or opt for platform-wide access.",
  },
  {
    icon: Banknote,
    title: "One payment, Opedd disburses",
    description:
      "Pay a single annual fee. Opedd takes 10% and automatically disburses to every publisher monthly — no invoicing, no chasing payments.",
  },
  {
    icon: Zap,
    title: "Content delivered in real-time",
    description:
      "Every time a publisher hits publish, the article is pushed to your webhook URL or available in your paginated content feed within seconds. Structured JSON or XML.",
  },
];

const FEATURES = [
  { icon: Webhook, text: "Real-time content webhooks (HMAC-signed JSON payloads)" },
  { icon: Rss, text: "Paginated REST feed with cursor-based pagination" },
  { icon: FileText, text: "Full HTML + plain text + excerpt for each article" },
  { icon: Shield, text: "RAG, training, or inference licensing tiers" },
  { icon: Users, text: "Platform-wide or custom publisher selection" },
  { icon: RefreshCw, text: "Annual subscription with auto-renewal" },
  { icon: Scale, text: "Legal coverage across all licensed publishers" },
  { icon: CreditCard, text: "Monthly pro-rata disbursements to publishers" },
];

const TIERS = [
  {
    name: "RAG / Retrieval",
    description: "For real-time retrieval and citation in AI responses.",
    price: "Custom pricing",
  },
  {
    name: "Model Training",
    description: "For fine-tuning and training LLMs.",
    price: "Custom pricing",
  },
  {
    name: "Full AI",
    description: "RAG + Training + Inference. Full unrestricted access.",
    price: "Custom pricing",
    highlighted: true,
  },
];

export default function Enterprise() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    org: "",
    email: "",
    role: "",
    useCase: "",
    publisherCount: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.org || !formData.email) return;
    setSubmitting(true);
    try {
      const composedMessage = [
        `Organization: ${formData.org}`,
        `Role: ${formData.role || "N/A"}`,
        `Use case: ${formData.useCase || "N/A"}`,
        `Publisher coverage: ${formData.publisherCount || "N/A"}`,
        formData.message ? `\nMessage:\n${formData.message}` : "",
      ].join("\n");

      const res = await fetch(
        `${EXT_SUPABASE_URL}/contact-publisher`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyer_email: formData.email,
            buyer_name: formData.org,
            message: composedMessage,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again or email enterprise@opedd.com directly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-deep">
      <Header />

      {/* ── Hero ── */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-oxford/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-plum-magenta/10 rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="text-center space-y-6">
            <motion.div
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 bg-soft-white/5 border border-soft-white/10 rounded-full px-4 py-1.5 text-sm text-soft-white/60 font-medium"
            >
              Enterprise Licensing
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl md:text-6xl font-bold text-soft-white leading-[1.1] tracking-tight"
            >
              License the world's best content for AI.{" "}
              <span className="text-soft-white/40">At scale.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-soft-white/50 max-w-2xl mx-auto leading-relaxed"
            >
              One contract. One API. Hundreds of publishers. Opedd handles the legal, the payments, and the delivery — you get a structured JSON/XML feed of licensed articles the moment they're published.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 pt-4 flex-wrap">
              <Button
                onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 px-8 rounded-xl bg-soft-white text-navy-deep text-sm font-bold hover:bg-soft-white/90"
              >
                Request Access
                <ArrowRight size={15} />
              </Button>
              <a
                href="mailto:enterprise@opedd.com"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-soft-white/20 text-soft-white text-sm font-semibold hover:bg-soft-white/5 transition-all bg-transparent"
              >
                Talk to us →
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
              Three steps to licensed content
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-oxford/20">
                  <step.icon size={24} className="text-oxford" />
                </div>
                <h3 className="font-semibold text-base text-soft-white mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-soft-white/50">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Get ── */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">
              What You Get
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
              Everything an AI team needs
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-start gap-3 p-4 rounded-xl bg-soft-white/5 border border-soft-white/10"
              >
                <feat.icon size={18} className="text-oxford shrink-0 mt-0.5" />
                <span className="text-sm text-soft-white/80">{feat.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">
              Pricing
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-soft-white tracking-tight">
              Pricing is based on coverage and license type
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-soft-white/40 mt-3 max-w-xl mx-auto">
              We work with you to negotiate a rate that matches your usage. Contact us to get a quote.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`rounded-2xl border p-6 text-center ${
                  tier.highlighted
                    ? "border-oxford bg-oxford/10"
                    : "border-soft-white/10 bg-soft-white/5"
                }`}
              >
                <h3 className="font-semibold text-lg text-soft-white mb-2">{tier.name}</h3>
                <p className="text-sm text-soft-white/50 mb-6">{tier.description}</p>
                <p className="text-2xl font-bold text-soft-white">{tier.price}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeUp}
            custom={3}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center text-sm text-soft-white/40 mt-8 max-w-2xl mx-auto"
          >
            All plans include automatic publisher disbursements, HMAC-signed webhook delivery, and a paginated content feed API.
          </motion.p>
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section id="contact" className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">
              Get Started
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-soft-white tracking-tight">
              Request Enterprise Access
            </motion.h2>
          </motion.div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-oxford/20 flex items-center justify-center mx-auto mb-4">
                <ArrowRight size={28} className="text-oxford" />
              </div>
              <h3 className="text-xl font-semibold text-soft-white mb-2">Thanks! We'll be in touch within 24 hours.</h3>
              <p className="text-sm text-soft-white/50">
                Or reach us directly at{" "}
                <a href="mailto:enterprise@opedd.com" className="text-oxford hover:underline">
                  enterprise@opedd.com
                </a>
              </p>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              variants={fadeUp}
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-4 bg-soft-white/5 border border-soft-white/10 rounded-2xl p-6 md:p-8"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-soft-white/70 mb-1.5 block">Organization name *</label>
                  <Input
                    required
                    value={formData.org}
                    onChange={(e) => setFormData((p) => ({ ...p, org: e.target.value }))}
                    placeholder="Signal AI"
                    className="bg-soft-white/5 border-soft-white/10 text-soft-white placeholder:text-soft-white/30 focus-visible:ring-oxford/30 focus-visible:border-oxford"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-soft-white/70 mb-1.5 block">Work email *</label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@company.com"
                    className="bg-soft-white/5 border-soft-white/10 text-soft-white placeholder:text-soft-white/30 focus-visible:ring-oxford/30 focus-visible:border-oxford"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-soft-white/70 mb-1.5 block">Role / title</label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                  placeholder="Head of Data"
                  className="bg-soft-white/5 border-soft-white/10 text-soft-white placeholder:text-soft-white/30 focus-visible:ring-oxford/30 focus-visible:border-oxford"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-soft-white/70 mb-1.5 block">Use case</label>
                  <Select value={formData.useCase} onValueChange={(v) => setFormData((p) => ({ ...p, useCase: v }))}>
                    <SelectTrigger className="bg-soft-white/5 border-soft-white/10 text-soft-white [&>span]:text-soft-white/30 data-[state=open]:border-oxford focus:ring-oxford/30">
                      <SelectValue placeholder="Select use case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rag">RAG / Retrieval</SelectItem>
                      <SelectItem value="training">Model Training</SelectItem>
                      <SelectItem value="inference">Inference</SelectItem>
                      <SelectItem value="full">Full AI</SelectItem>
                      <SelectItem value="unsure">Not sure yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-soft-white/70 mb-1.5 block">Estimated publishers</label>
                  <Select value={formData.publisherCount} onValueChange={(v) => setFormData((p) => ({ ...p, publisherCount: v }))}>
                    <SelectTrigger className="bg-soft-white/5 border-soft-white/10 text-soft-white [&>span]:text-soft-white/30 data-[state=open]:border-oxford focus:ring-oxford/30">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<50">&lt;50</SelectItem>
                      <SelectItem value="50-200">50–200</SelectItem>
                      <SelectItem value="200-500">200–500</SelectItem>
                      <SelectItem value="500+">500+</SelectItem>
                      <SelectItem value="platform-wide">Platform-wide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-soft-white/70 mb-1.5 block">Message (optional)</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Tell us about your project…"
                  rows={4}
                  className="bg-soft-white/5 border-soft-white/10 text-soft-white placeholder:text-soft-white/30 focus-visible:ring-oxford/30 focus-visible:border-oxford"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !formData.org || !formData.email}
                className="w-full h-12 rounded-xl text-sm font-bold"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Request"}
              </Button>
            </motion.form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-soft-white/10 py-8">
        <div className="container mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-soft-white/40">
          <span>© 2025 Opedd · enterprise@opedd.com</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-soft-white/60 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-soft-white/60 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
