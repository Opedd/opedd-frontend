import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL } from "@/lib/constants";
import { Check, Minus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Billing = "monthly" | "annually";

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const ctaLink = user ? "/dashboard" : "/signup";
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async (plan: "pro" | "enterprise") => {
    if (!user) {
      navigate("/signup");
      return;
    }
    setUpgrading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "create_subscription", plan }),
      });
      const data = await res.json();
      const checkoutUrl = data?.data?.checkout_url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert("Could not start checkout. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ── Section A — Hero ── */}
      <section className="pt-[80px] pb-16 px-6 text-center">
        <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6" style={{ color: "#4A26ED", backgroundColor: "#F0EBFF" }}>
          Simple, transparent pricing
        </span>
        <h1 className="text-5xl font-bold mb-4" style={{ color: "#040042" }}>
          License your content.
          <br className="hidden sm:block" />
          Keep more of what you earn.
        </h1>
        <p className="text-lg mb-10" style={{ color: "#6B7280" }}>
          Start free. Upgrade when your earnings make it obvious.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-3 bg-slate-100 p-1 rounded-full">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${billing === "monthly" ? "bg-white shadow-sm" : ""}`}
            style={{ color: billing === "monthly" ? "#040042" : "#6B7280" }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annually")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${billing === "annually" ? "bg-white shadow-sm" : ""}`}
            style={{ color: billing === "annually" ? "#040042" : "#6B7280" }}
          >
            Annually
          </button>
          {billing === "annually" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}>
              Save 18%
            </span>
          )}
        </div>
      </section>

      {/* ── Section B — Three Pricing Cards ── */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
          {/* Card 1 — Free */}
          <div className="rounded-2xl p-8 border flex flex-col" style={{ borderColor: "#E5E7EB" }}>
            <h3 className="text-xl font-bold" style={{ color: "#040042" }}>Free</h3>
            <div className="mt-3 mb-1 flex items-baseline gap-1">
              <span className="text-4xl font-bold" style={{ color: "#040042" }}>$0</span>
              <span className="text-sm" style={{ color: "#6B7280" }}>/ month</span>
            </div>
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>No credit card required</p>
            <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-5" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
              12% platform fee
            </span>
            <button
              onClick={() => navigate(ctaLink)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold border bg-white transition-colors hover:bg-slate-50 mb-6"
              style={{ borderColor: "#040042", color: "#040042" }}
            >
              Get Started Free
            </button>
            <FeatureList features={freeFeatures} variant="light" />
          </div>

          {/* Card 2 — Pro */}
          <div className="rounded-2xl p-8 relative flex flex-col md:-mt-4" style={{ border: "2px solid #4A26ED", boxShadow: "0 8px 30px rgba(74,38,237,0.15)" }}>
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full text-white whitespace-nowrap" style={{ backgroundColor: "#4A26ED" }}>
              Most Popular
            </span>
            <h3 className="text-xl font-bold" style={{ color: "#040042" }}>Pro</h3>
            <div className="mt-3 mb-1 flex items-baseline gap-1">
              <span className="text-4xl font-bold" style={{ color: "#040042" }}>
                ${billing === "monthly" ? "79" : "65"}
              </span>
              <span className="text-sm" style={{ color: "#6B7280" }}>/ month</span>
            </div>
            {billing === "annually" && (
              <p className="text-xs mb-1" style={{ color: "#6B7280" }}>Billed $780/year</p>
            )}
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>For serious publishers</p>
            <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-5" style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}>
              7% platform fee
            </span>
            <button
              onClick={() => handleUpgrade("pro")}
              disabled={upgrading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90 mb-6 disabled:opacity-50"
              style={{ backgroundColor: "#4A26ED" }}
            >
              {upgrading ? "Loading..." : "Upgrade to Pro"}
            </button>
            <FeatureList features={proFeatures} variant="light" />
          </div>

          {/* Card 3 — Enterprise */}
          <div className="rounded-2xl p-8 flex flex-col" style={{ backgroundColor: "#040042" }}>
            <h3 className="text-xl font-bold text-white">Enterprise</h3>
            <div className="mt-3 mb-1 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">
                ${billing === "monthly" ? "249" : "199"}
              </span>
              <span className="text-sm text-white/60">/ month</span>
            </div>
            {billing === "annually" && (
              <p className="text-xs text-white/60 mb-1">Billed $2,388/year</p>
            )}
            <p className="text-sm text-white/60 mb-4">For media organizations</p>
            <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full text-white mb-5" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              5% platform fee
            </span>
            <button
              onClick={() => handleUpgrade("enterprise")}
              disabled={upgrading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 mb-6 disabled:opacity-50"
              style={{ backgroundColor: "white", color: "#040042" }}
            >
              {upgrading ? "Loading..." : "Contact Sales"}
            </button>
            <FeatureList features={enterpriseFeatures} variant="dark" />
          </div>
        </div>
      </section>

      {/* ── Section C — The Math ── */}
      <section className="px-6 py-16" style={{ backgroundColor: "#040042" }}>
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">The upgrade pays for itself</h2>
          <p className="text-white/60">
            Our platform fee drops with each tier. At scale, your savings dwarf the subscription cost.
          </p>
        </div>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <th className="pb-3 pr-4 font-medium text-white/50">Monthly licensing revenue</th>
                <th className="pb-3 px-4 font-medium text-white/50">Free (12% fee)</th>
                <th className="pb-3 px-4 font-medium text-white/50">Pro ($79 + 7%)</th>
                <th className="pb-3 pl-4 font-medium text-white/50">Enterprise ($249 + 5%)</th>
              </tr>
            </thead>
            <tbody>
              {mathRows.map((r) => (
                <tr key={r.sales} className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <td className="py-3.5 pr-4 text-white font-medium">{r.sales}</td>
                  <td className="py-3.5 px-4 text-white/70">{r.free}</td>
                  <td className="py-3.5 px-4 text-white/70">
                    {r.pro}
                    {r.proWin && <Check size={14} className="inline ml-1.5 text-emerald-400" />}
                  </td>
                  <td className="py-3.5 pl-4 text-white/70">
                    {r.ent}
                    {r.entWin && <Check size={14} className="inline ml-1.5 text-emerald-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-white/40 text-xs mt-6">
            * Stripe processing fees (~2.9% + $0.30/transaction) apply separately to all plans.
          </p>
        </div>
      </section>

      {/* ── Section D — FAQ ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "#040042" }}>
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((f, i) => (
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

      {/* ── Section E — Bottom CTA ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#F9FAFB" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#040042" }}>
            Start licensing your content today
          </h2>
          <p className="text-base mb-10 leading-relaxed" style={{ color: "#6B7280" }}>
            Join publishers already protecting their work with Opedd Protocol.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate(ctaLink)}
              className="px-8 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: "#4A26ED" }}
            >
              Get started free
            </button>
            <a
              href="#"
              className="px-8 py-3 rounded-lg text-sm font-semibold border-2 transition-all hover:bg-slate-50"
              style={{ borderColor: "#E5E7EB", color: "#374151" }}
            >
              View documentation
            </a>
          </div>
          <p className="text-xs mt-8 tracking-wide" style={{ color: "#9CA3AF" }}>
            No credit card required · Cancel anytime · Setup in under 5 minutes
          </p>
          <p className="text-sm mt-6" style={{ color: "#6B7280" }}>
            Questions about enterprise pricing? Contact us at{" "}
            <a href="mailto:support@opedd.com" className="text-[#4A26ED] hover:underline font-medium">support@opedd.com</a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── Data ── */

type Feature = { t: string; ok: boolean };

const freeFeatures: Feature[] = [
  { t: "100 articles", ok: true },
  { t: "1 content source", ok: true },
  { t: "Badge widget", ok: true },
  { t: "License certificates (PDF)", ok: true },
  { t: "Community support", ok: true },
  { t: "Analytics dashboard", ok: false },
  { t: "API & webhooks", ok: false },
  { t: "Invoice PDFs", ok: false },
  { t: "Archive licenses", ok: false },
  { t: "AI defense policy", ok: false },
];

const proFeatures: Feature[] = [
  { t: "Unlimited articles", ok: true },
  { t: "10 content sources", ok: true },
  { t: "All widget modes (card, badge, compact)", ok: true },
  { t: "License certificates + Invoice PDFs", ok: true },
  { t: "Analytics dashboard", ok: true },
  { t: "API access (1,000 req/day)", ok: true },
  { t: "Publisher webhooks", ok: true },
  { t: "Archive licenses (10/month)", ok: true },
  { t: "AI defense policy (ai.txt)", ok: true },
  { t: "5 team seats", ok: true },
  { t: "Priority email support", ok: true },
];

const enterpriseFeatures: Feature[] = [
  { t: "Everything in Pro", ok: true },
  { t: "Unlimited sources", ok: true },
  { t: "Unlimited archive licenses", ok: true },
  { t: "Unlimited API access", ok: true },
  { t: "On-chain blockchain proof (Base)", ok: true },
  { t: "Custom widget branding", ok: true },
  { t: "Unlimited team seats", ok: true },
  { t: "Dedicated account manager + Slack", ok: true },
  { t: "99.9% SLA", ok: true },
];

const mathRows = [
  { sales: "$1,000", free: "$120 in fees", pro: "$149 total", proWin: false, ent: "$299 total", entWin: false },
  { sales: "$5,000", free: "$600 in fees", pro: "$429 total", proWin: true, ent: "$499 total", entWin: false },
  { sales: "$15,000", free: "$1,800 in fees", pro: "$1,129 total", proWin: true, ent: "$999 total", entWin: true },
  { sales: "$50,000", free: "$6,000 in fees", pro: "$3,579 total", proWin: true, ent: "$2,749 total", entWin: true },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes. Upgrades apply immediately. Downgrades apply at the next billing cycle." },
  { q: "What is the platform fee?", a: "Opedd takes a small percentage of each licensing transaction. Your plan determines your rate: 12% (Free), 7% (Pro), or 5% (Enterprise). Stripe processing fees (~2.9% + $0.30) apply separately." },
  { q: 'What counts as an "article"?', a: "Any piece of content registered in your library — articles, essays, newsletters, reports, or podcast transcripts." },
  { q: "What is an archive license?", a: "A site-wide license covering all your content within a date range. Used for enterprise deals (e.g., an AI company licensing your full 2024 archive)." },
  { q: "What is on-chain proof?", a: "Enterprise licenses are recorded on the Base blockchain, giving buyers tamper-proof permanent proof of purchase — useful for legal and compliance teams." },
  { q: "Do I need a credit card for the free plan?", a: "No. Sign up and start licensing immediately, no card required." },
];

/* ── Feature List Component ── */

function FeatureList({ features, variant }: { features: Feature[]; variant: "light" | "dark" }) {
  return (
    <ul className="space-y-3 flex-1">
      {features.map((f) => (
        <li key={f.t} className="flex items-start gap-2.5 text-sm">
          {f.ok ? (
            <Check size={16} className={`mt-0.5 flex-shrink-0 ${variant === "dark" ? "text-white" : "text-emerald-500"}`} />
          ) : (
            <Minus size={16} className={`mt-0.5 flex-shrink-0 ${variant === "dark" ? "text-white/20" : "text-slate-300"}`} />
          )}
          <span className={f.ok ? (variant === "dark" ? "text-white" : "text-slate-700") : (variant === "dark" ? "text-white/30" : "text-slate-400")}>
            {f.t}
          </span>
        </li>
      ))}
    </ul>
  );
}
