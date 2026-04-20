import { useState, useEffect } from "react";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  ArrowRight,
  Search,
  FlaskConical,
  CreditCard,
  Download,
  Check,
  X,
  Copy,
  Database,
  Cpu,
  Warehouse,
  Newspaper,
  PenLine,
  Radio,
  Shield,
  FileJson,
  DollarSign,
  Link2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import opeddIcon from "@/assets/opedd-icon.svg";

/* ─── Static data ─── */

const STEPS = [
  {
    icon: Search,
    title: "Browse the Catalog",
    desc: "Explore publishers, pricing, and sample articles via our public API. No account needed.",
  },
  {
    icon: FlaskConical,
    title: "Evaluate in Sandbox",
    desc: "Get a free sandbox token. Preview truncated content from any publisher. Zero commitment.",
  },
  {
    icon: CreditCard,
    title: "Purchase a License",
    desc: "Pick your publishers, choose annual or monthly billing, and pay via Stripe. One invoice.",
  },
  {
    icon: Download,
    title: "Stream Content via API",
    desc: "Fetch full articles with provenance metadata. Get webhooks when new content is published.",
  },
];

const PRICING_ROWS = [
  {
    label: "What you get",
    values: ["Single article, one-time", "Full back-catalog, 12 months", "All new content as published"],
  },
  {
    label: "Typical price range",
    values: ["$5 – $200", "$3,000 – $25,000/yr", "$250 – $2,000/mo"],
  },
  {
    label: "Billing",
    values: ["One-time", "Annual subscription", "Monthly subscription"],
  },
  {
    label: "Content delivery",
    values: ["Single article", "Full catalog via API", "New articles via API + webhooks"],
  },
];

const LICENSE_TIERS = [
  {
    name: "RAG",
    desc: "Retrieval-Augmented Generation. Fetch content at inference time for grounded AI responses.",
  },
  {
    name: "Training",
    desc: "Model fine-tuning and pretraining. Use content in training datasets with full legal coverage.",
  },
  {
    name: "Inference",
    desc: "Real-time AI outputs. License content that appears in AI-generated responses.",
  },
  {
    name: "Full AI",
    desc: "All use cases combined. Maximum flexibility for multi-purpose AI platforms.",
    highlighted: true,
  },
];

const COMPARISON = [
  { feature: "Single API for all publishers", opedd: true, direct: false, legacy: false },
  { feature: "Publisher-set pricing", opedd: true, direct: true, legacy: "CCC sets rates" },
  { feature: "Monthly forward feed", opedd: true, direct: "Varies", legacy: false },
  { feature: "On-chain proof of license", opedd: true, direct: false, legacy: false },
  { feature: "Sandbox / try before you buy", opedd: true, direct: false, legacy: false },
  { feature: "Time to integrate", opedd: "Hours", direct: "Months", legacy: "Months" },
  { feature: "Content delivery API", opedd: true, direct: "Varies", legacy: false },
  { feature: "Webhooks for new content", opedd: true, direct: false, legacy: false },
];

const SANDBOX_CURL = `curl -X POST https://api.opedd.com/enterprise-auth \\
  -H "Content-Type: application/json" \\
  -d '{"action": "create_sandbox", "buyer_email": "you@yourcompany.com"}'`;

/* ─── Helpers ─── */

function CellValue({ val }: { val: boolean | string }) {
  if (val === true) return <Check size={16} className="text-emerald-400 mx-auto" />;
  if (val === false) return <X size={16} className="text-soft-white/20 mx-auto" />;
  return <span className="text-soft-white/60 text-xs">{val}</span>;
}

/* ─── Component ─── */

export default function Enterprise() {
  useDocumentTitle("Enterprise Content Licensing — Opedd");
  const { toast } = useToast();
  const [stats, setStats] = useState({
    publishers: "50+",
    articles: "10,000+",
    licenses: "500+",
    proofs: "500+",
  });

  useEffect(() => {
    fetch(`${EXT_SUPABASE_URL}/functions/v1/registry`, {
      headers: { Authorization: `Bearer ${EXT_ANON_KEY}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setStats({
            publishers: data.publishers_count ? `${data.publishers_count}+` : "50+",
            articles: data.articles_count ? `${Number(data.articles_count).toLocaleString()}+` : "10,000+",
            licenses: data.licenses_count ? `${Number(data.licenses_count).toLocaleString()}+` : "500+",
            proofs: data.events_count ? `${Number(data.events_count).toLocaleString()}+` : "500+",
          });
        }
      })
      .catch(() => {});
  }, []);

  const scrollToSandbox = () =>
    document.getElementById("sandbox")?.scrollIntoView({ behavior: "smooth" });

  const handleCopy = async () => {
    const ok = await copyToClipboard(SANDBOX_CURL);
    toast({ title: ok ? "Copied to clipboard" : "Copy failed" });
  };

  return (
    <div className="min-h-screen bg-navy-deep">
      <SEO
        title="Enterprise Content Licensing — Opedd"
        description="License content at scale. Bulk API access, dedicated support, and custom pricing for enterprises."
        path="/enterprise"
      />
      <Header />

      {/* ══ HERO ══ */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-oxford/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-plum-magenta/10 rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-4xl text-center space-y-6">
          <p className="inline-flex items-center gap-2 bg-soft-white/5 border border-soft-white/10 rounded-full px-4 py-1.5 text-sm text-soft-white/60 font-medium">
            For AI Labs &amp; Enterprise
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-soft-white leading-[1.1] tracking-tight">
            License thousands of newsletters for your AI.{" "}
            <span className="text-soft-white/40">One API, one invoice.</span>
          </h1>
          <p className="text-lg md:text-xl text-soft-white/50 max-w-3xl mx-auto leading-relaxed">
            Opedd gives AI companies bulk access to premium publisher content — legally, programmatically, and with on-chain proof of every license.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
            <Button
              onClick={scrollToSandbox}
              className="h-12 px-8 rounded-xl bg-soft-white text-navy-deep text-sm font-bold hover:bg-soft-white/90"
            >
              Get Sandbox Access (Free)
              <ArrowRight size={15} />
            </Button>
            <a
              href="https://docs.opedd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-soft-white/20 text-soft-white text-sm font-semibold hover:bg-soft-white/5 transition-all bg-transparent"
            >
              View API Docs
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
              Four steps to licensed content
            </h2>
          </div>

          {/* Step flow */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center relative">
                {/* Connector arrow (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-soft-white/15">
                    <ArrowRight size={12} className="text-soft-white/30 absolute -right-1.5 -top-1.5" />
                  </div>
                )}
                <div className="w-14 h-14 rounded-full bg-oxford/20 border border-oxford/30 flex items-center justify-center mb-4 relative z-10">
                  <step.icon size={22} className="text-oxford" />
                </div>
                <span className="text-xs text-soft-white/30 font-mono mb-1">0{i + 1}</span>
                <h3 className="font-semibold text-sm text-soft-white mb-1.5">{step.title}</h3>
                <p className="text-xs leading-relaxed text-soft-white/50 max-w-[200px]">{step.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-soft-white/40 mt-10">
            Average integration time: <span className="text-soft-white/70 font-semibold">2 hours</span> from sandbox to first API call.
          </p>
        </div>
      </section>

      {/* ══ ARCHITECTURE DIAGRAM ══ */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">Architecture</p>
            <h2 className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
              How data and money flow
            </h2>
          </div>

          <div className="bg-soft-white/[0.03] border border-soft-white/10 rounded-2xl p-6 md:p-10 relative overflow-hidden">
            {/* Subtle grid */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative z-10">
              {/* Your AI Lab */}
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-soft-white uppercase tracking-wider">Your AI Lab</h3>
                <div className="space-y-3">
                  {[
                    { icon: FileJson, label: "API" },
                    { icon: Cpu, label: "Pipeline" },
                    { icon: Warehouse, label: "Data Warehouse" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-center gap-2 text-soft-white/60 text-xs">
                      <item.icon size={14} /> {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opedd */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <img src={opeddIcon} alt="Opedd" className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-oxford uppercase tracking-wider">Opedd</h3>
                </div>
                <div className="bg-oxford/10 border border-oxford/20 rounded-xl p-4 space-y-2">
                  {["Auth", "Catalog", "Delivery", "Billing", "On-chain Proof"].map((l) => (
                    <div key={l} className="text-xs text-soft-white/70 font-medium">{l}</div>
                  ))}
                </div>
                {/* Flow labels */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-soft-white/40">
                  <div className="text-left">← Content + license keys</div>
                  <div className="text-right">API requests + payment →</div>
                  <div className="text-left">← Content + pricing</div>
                  <div className="text-right">Monthly payouts (80%) →</div>
                </div>
              </div>

              {/* Publishers */}
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-soft-white uppercase tracking-wider">Publishers</h3>
                <div className="space-y-3">
                  {[
                    { icon: Newspaper, label: "Newsletter" },
                    { icon: PenLine, label: "Blog" },
                    { icon: Radio, label: "Media" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-center gap-2 text-soft-white/60 text-xs">
                      <item.icon size={14} /> {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
              Transparent, publisher-set pricing
            </h2>
            <p className="text-soft-white/40 mt-3 max-w-xl mx-auto text-sm">
              Every publisher sets their own price. You see the full catalog and pick what you need.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft-white/10">
                  <th className="text-left py-3 px-4 text-soft-white/40 font-medium text-xs uppercase tracking-wider" />
                  <th className="py-3 px-4 text-soft-white font-semibold text-xs uppercase tracking-wider">Per Article</th>
                  <th className="py-3 px-4 text-soft-white font-semibold text-xs uppercase tracking-wider">Archive (Annual)</th>
                  <th className="py-3 px-4 text-soft-white font-semibold text-xs uppercase tracking-wider">Forward Feed (Monthly)</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-soft-white/5">
                    <td className="py-3 px-4 text-soft-white/60 font-medium text-xs">{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className="py-3 px-4 text-soft-white/80 text-xs text-center">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-soft-white/40 mt-6 text-center max-w-2xl mx-auto">
            Forward feed price is always annual price ÷ 12. Publishers control their pricing — no hidden markups.
          </p>
        </div>
      </section>

      {/* ══ LICENSE TIERS ══ */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">License Types</p>
            <h2 className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
              Choose the license that fits your use case
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LICENSE_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-6 ${
                  tier.highlighted
                    ? "border-oxford bg-oxford/10"
                    : "border-soft-white/10 bg-soft-white/5"
                }`}
              >
                <h3 className="font-bold text-lg text-soft-white mb-2">{tier.name}</h3>
                <p className="text-xs text-soft-white/50 leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-soft-white/40 mt-6 text-center max-w-2xl mx-auto">
            Publishers opt into tiers individually. Your license only covers publishers who've enabled your tier.
          </p>
        </div>
      </section>

      {/* ══ SANDBOX CTA ══ */}
      <section id="sandbox" className="py-20 border-t border-soft-white/10 bg-navy-darker">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">Sandbox</p>
          <h2 className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight mb-3">
            Try it now — no account required
          </h2>
          <p className="text-soft-white/50 text-sm mb-8 max-w-xl mx-auto">
            Get a free sandbox token in 30 seconds. Browse the full catalog, preview content, and evaluate the API before committing.
          </p>

          <div className="bg-soft-white/[0.03] border border-soft-white/10 rounded-xl p-5 text-left relative">
            <pre className="text-xs text-soft-white/80 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {SANDBOX_CURL}
            </pre>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="gap-2 bg-soft-white/10 border-soft-white/10 text-soft-white hover:bg-soft-white/20"
            >
              <Copy size={14} />
              Copy to clipboard
            </Button>
            <a
              href="https://docs.opedd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-oxford hover:underline font-medium inline-flex items-center gap-1"
            >
              Or read the full integration guide <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ══ WHY OPEDD vs ALTERNATIVES ══ */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">Comparison</p>
            <h2 className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
              Why Opedd vs. alternatives
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft-white/10">
                  <th className="text-left py-3 px-4 text-soft-white/40 font-medium text-xs uppercase tracking-wider">Feature</th>
                  <th className="py-3 px-4 text-oxford font-bold text-xs uppercase tracking-wider">Opedd</th>
                  <th className="py-3 px-4 text-soft-white/50 font-medium text-xs uppercase tracking-wider">Direct deals</th>
                  <th className="py-3 px-4 text-soft-white/50 font-medium text-xs uppercase tracking-wider">Legacy (CCC)</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-b border-soft-white/5">
                    <td className="py-3 px-4 text-soft-white/70 text-xs">{row.feature}</td>
                    <td className="py-3 px-4 text-center"><CellValue val={row.opedd} /></td>
                    <td className="py-3 px-4 text-center"><CellValue val={row.direct} /></td>
                    <td className="py-3 px-4 text-center"><CellValue val={row.legacy} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══ SOCIAL PROOF / STATS ══ */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Publishers", value: stats.publishers },
              { label: "Articles Licensed", value: stats.articles },
              { label: "Licenses Issued", value: stats.licenses },
              { label: "On-chain Proofs", value: stats.proofs },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-soft-white/5 border border-soft-white/10 rounded-2xl p-6 text-center"
              >
                <p className="text-2xl md:text-3xl font-bold text-soft-white mb-1">{m.value}</p>
                <p className="text-xs text-soft-white/40 uppercase tracking-wider font-medium">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BOTTOM CTA ══ */}
      <section className="py-20 border-t border-soft-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-soft-white tracking-tight">
            Ready to get started?
          </h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              onClick={scrollToSandbox}
              className="h-12 px-8 rounded-xl bg-soft-white text-navy-deep text-sm font-bold hover:bg-soft-white/90"
            >
              Get Sandbox Access
              <ArrowRight size={15} />
            </Button>
            <a
              href="mailto:sales@opedd.com?subject=Enterprise%20Licensing%20Inquiry"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-soft-white/20 text-soft-white text-sm font-semibold hover:bg-soft-white/5 transition-all bg-transparent"
            >
              Talk to Sales
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
