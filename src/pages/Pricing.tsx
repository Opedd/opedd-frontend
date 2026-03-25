import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL } from "@/lib/constants";
import { Check, Minus, X, Newspaper, Bot, Briefcase, Info } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Billing = "monthly" | "annually";

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<"pro" | "enterprise" | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutStripePromise, setCheckoutStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const handleUpgrade = async (plan: "pro" | "enterprise") => {
    if (!user) { navigate("/signup"); return; }
    setUpgrading(plan);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create_subscription", plan, billing, embedded: true }),
      });
      const data = await res.json();
      if (data?.data?.client_secret) {
        setCheckoutStripePromise(loadStripe(data.data.publishable_key));
        setCheckoutClientSecret(data.data.client_secret);
      } else {
        toast({ title: "Checkout error", description: "Could not start checkout. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setUpgrading(null);
    }
  };

  const proMonthly = 49;
  const proAnnual = Math.round(470 / 12);   // ~$39/mo
  const entMonthly = 199;
  const entAnnual = Math.round(1910 / 12);  // ~$159/mo

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-white">
        <Header />

        {/* ── Hero ── */}
        <section className="pt-[80px] pb-16 px-6 text-center">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6" style={{ color: "#4A26ED", backgroundColor: "#F0EBFF" }}>
            Simple, transparent pricing
          </span>
          <h1 className="text-5xl font-bold mb-4" style={{ color: "#040042" }}>
            Protect your writing.{" "}
            <br className="hidden sm:block" />
            Get paid when it's used.
          </h1>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "#6B7280" }}>
            For independent writers, newsletter creators, and bloggers. Start free — upgrade when your earnings make it obvious.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-full">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${billing === "monthly" ? "bg-white shadow-sm text-[#040042]" : "text-[#6B7280]"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annually")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${billing === "annually" ? "bg-white shadow-sm text-[#040042]" : "text-[#6B7280]"}`}
            >
              Annually
            </button>
            {/* Reserve width so the toggle row never reflows — use visibility not conditional render */}
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity duration-150"
              style={{
                backgroundColor: "#D1FAE5",
                color: "#065F46",
                visibility: billing === "annually" ? "visible" : "hidden",
              }}
            >
              Save 20%
            </span>
          </div>
        </section>

        {/* ── Pricing Cards ── */}
        <section className="pb-24 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">

            {/* Free — The Hobbyist */}
            <div className="rounded-2xl p-8 border flex flex-col" style={{ borderColor: "#E5E7EB" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>The Hobbyist</p>
              <h3 className="text-xl font-bold" style={{ color: "#040042" }}>Free</h3>
              <div className="mt-3 mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold" style={{ color: "#040042" }}>$0</span>
                <span className="text-sm" style={{ color: "#6B7280" }}>/month</span>
              </div>
              <p className="text-sm mb-4" style={{ color: "#6B7280" }}>No credit card required</p>
              <div className="flex items-center gap-1.5 mb-5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                  15% platform fee
                </span>
                <FeeTip fee="15" />
              </div>
              <p className="text-xs mb-5 italic" style={{ color: "#9CA3AF" }}>Only pay when you earn — $0 if you don't.</p>
              <button
                onClick={() => navigate("/signup")}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border bg-white transition-colors hover:bg-slate-50 mb-6"
                style={{ borderColor: "#040042", color: "#040042" }}
              >
                Get Started Free
              </button>
              <FeatureList features={freeFeatures} variant="light" />
            </div>

            {/* Pro — The Professional */}
            <div className="rounded-2xl p-8 relative flex flex-col md:-mt-4" style={{ border: "2px solid #4A26ED", boxShadow: "0 8px 30px rgba(74,38,237,0.15)" }}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full text-white whitespace-nowrap" style={{ backgroundColor: "#4A26ED" }}>
                Most Popular
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#4A26ED" }}>The Professional</p>
              <h3 className="text-xl font-bold" style={{ color: "#040042" }}>Pro</h3>
              <div className="mt-3 mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold transition-all duration-200" style={{ color: "#040042" }}>
                  ${billing === "monthly" ? proMonthly : proAnnual}
                </span>
                <span className="text-sm" style={{ color: "#6B7280" }}>/month</span>
              </div>
              {/* Always reserve line height — invisible when monthly to prevent CTA shift */}
              <p
                className="text-xs mb-1 transition-opacity duration-150"
                style={{ color: "#6B7280", visibility: billing === "annually" ? "visible" : "hidden" }}
              >
                Billed $470/year — save $118
              </p>
              <p className="text-sm mb-4" style={{ color: "#6B7280" }}>For serious writers & newsletters</p>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}>
                  9% platform fee
                </span>
                <FeeTip fee="9" />
              </div>
              <p className="text-xs mb-5 font-medium" style={{ color: "#4A26ED" }}>
                ✦ 30-day full-access trial · No credit card required
              </p>
              <button
                onClick={() => handleUpgrade("pro")}
                disabled={upgrading !== null}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90 mb-6 disabled:opacity-50"
                style={{ backgroundColor: "#4A26ED" }}
              >
                {upgrading === "pro" ? "Loading…" : "Start Free Trial"}
              </button>
              <FeatureList features={proFeatures} variant="light" />
            </div>

            {/* Enterprise — Media House */}
            <div className="rounded-2xl p-8 flex flex-col" style={{ backgroundColor: "#040042" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Media House</p>
              <h3 className="text-xl font-bold text-white">Enterprise</h3>
              <div className="mt-3 mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white transition-all duration-200">
                  ${billing === "monthly" ? entMonthly : entAnnual}
                </span>
                <span className="text-sm text-white/60">/month</span>
              </div>
              {/* Always reserve line height — invisible when monthly to prevent CTA shift */}
              <p
                className="text-xs mb-1 transition-opacity duration-150"
                style={{ color: "rgba(255,255,255,0.6)", visibility: billing === "annually" ? "visible" : "hidden" }}
              >
                Billed $1,910/year — save $478
              </p>
              <p className="text-sm text-white/60 mb-4">For media teams & publications</p>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                  5% platform fee
                </span>
                <FeeTip fee="5" dark />
              </div>
              <p className="text-xs mb-5 font-medium text-white/60">
                ✦ 30-day full-access trial · No credit card required
              </p>
              <button
                onClick={() => handleUpgrade("enterprise")}
                disabled={upgrading !== null}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 mb-6 disabled:opacity-50"
                style={{ backgroundColor: "white", color: "#040042" }}
              >
                {upgrading === "enterprise" ? "Loading…" : "Get Enterprise"}
              </button>
              <FeatureList features={enterpriseFeatures} variant="dark" />
            </div>
          </div>
        </section>

        {/* ── How You Get Paid ── */}
        <section className="py-20 px-6" style={{ backgroundColor: "#F9FAFB" }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3" style={{ color: "#040042" }}>How you get paid</h2>
              <p className="text-base" style={{ color: "#6B7280" }}>
                Opedd turns your writing into a licensable asset. Three ways buyers pay you:
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#EEF0FD" }}>
                  <Newspaper size={24} style={{ color: "#4A26ED" }} />
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "#040042" }}>Reprint Rights</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  Magazines, news sites, and newsletters pay to legally republish your posts. Think of it as syndication — but you set the price.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#EEF0FD" }}>
                  <Bot size={24} style={{ color: "#4A26ED" }} />
                </div>
                <h3 className="font-semibold text-base mb-2 flex items-center justify-center gap-1.5" style={{ color: "#040042" }}>
                  AI Access &amp; Protection
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={13} className="cursor-help" style={{ color: "#9CA3AF" }} />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      AI companies pay to legally train on or retrieve from your content. Without this, they use it for free.
                    </TooltipContent>
                  </Tooltip>
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  AI companies pay to legally use your work for training or retrieval. Without a license, they scrape it for free.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#EEF0FD" }}>
                  <Briefcase size={24} style={{ color: "#4A26ED" }} />
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "#040042" }}>Corporate Use</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  Companies pay to use your research, analysis, or reporting internally — in reports, presentations, or training materials.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── The Math ── */}
        <section className="px-6 py-16" style={{ backgroundColor: "#040042" }}>
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">The upgrade pays for itself</h2>
            <p className="text-white/60">
              Your platform fee drops with each tier. At scale, the savings dwarf the subscription cost.
            </p>
          </div>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <th className="pb-3 pr-4 font-medium text-white/50">Monthly licensing revenue</th>
                  <th className="pb-3 px-4 font-medium text-white/50">Free (15% fee)</th>
                  <th className="pb-3 px-4 font-medium text-white/50">Pro ($49 + 9%)</th>
                  <th className="pb-3 pl-4 font-medium text-white/50">Enterprise ($199 + 5%)</th>
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

        {/* ── FAQ ── */}
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

        {/* ── Bottom CTA ── */}
        <section className="py-20 px-6" style={{ backgroundColor: "#F9FAFB" }}>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#040042" }}>
              Start protecting your writing today
            </h2>
            <p className="text-base mb-10 leading-relaxed" style={{ color: "#6B7280" }}>
              Join creators already earning from their content with Opedd.
            </p>
            <button
              onClick={() => navigate("/signup")}
              className="px-8 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: "#4A26ED" }}
            >
              Get started free
            </button>
            <p className="text-xs mt-8 tracking-wide" style={{ color: "#9CA3AF" }}>
              No credit card required · Cancel anytime · Setup in under 5 minutes
            </p>
            <p className="text-sm mt-6" style={{ color: "#6B7280" }}>
              Questions about enterprise pricing?{" "}
              <a href="mailto:support@opedd.com" className="text-[#4A26ED] hover:underline font-medium">support@opedd.com</a>
            </p>
          </div>
        </section>

        {/* Embedded Checkout modal */}
        {checkoutClientSecret && checkoutStripePromise && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => { setCheckoutClientSecret(null); setCheckoutStripePromise(null); }}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#040042] transition-colors"
              >
                <X size={16} />
              </button>
              <div className="p-2">
                <EmbeddedCheckoutProvider stripe={checkoutStripePromise} options={{ clientSecret: checkoutClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </TooltipProvider>
  );
}

/* ── Data ── */

type Feature = { t: string; ok: boolean };

const freeFeatures: Feature[] = [
  { t: "Up to 500 articles", ok: true },
  { t: "1 content source", ok: true },
  { t: "Reprint Rights widget", ok: true },
  { t: "License certificates (PDF)", ok: true },
  { t: "Community support", ok: true },
  { t: "Earning Center analytics", ok: false },
  { t: "API & webhooks", ok: false },
  { t: "Invoice PDFs", ok: false },
  { t: "Archive licenses", ok: false },
  { t: "AI defense policy (ai.txt)", ok: false },
];

const proFeatures: Feature[] = [
  { t: "Unlimited articles", ok: true },
  { t: "10 content sources", ok: true },
  { t: "All widget modes (card, badge, compact)", ok: true },
  { t: "License certificates + Invoice PDFs", ok: true },
  { t: "Earning Center analytics", ok: true },
  { t: "API access (1,000 req/day)", ok: true },
  { t: "Publisher webhooks", ok: true },
  { t: "Archive licenses (10/month)", ok: true },
  { t: "AI Access & Protection (ai.txt)", ok: true },
  { t: "5 team seats", ok: true },
  { t: "Priority email support", ok: true },
];

const enterpriseFeatures: Feature[] = [
  { t: "Everything in Pro", ok: true },
  { t: "Unlimited sources", ok: true },
  { t: "Full catalog indexing", ok: true },
  { t: "Unlimited archive licenses", ok: true },
  { t: "Unlimited API access", ok: true },
  { t: "On-chain blockchain proof (Tempo)", ok: true },
  { t: "Custom widget branding", ok: true },
  { t: "Unlimited team seats", ok: true },
  { t: "Dedicated account manager + Slack", ok: true },
  { t: "99.9% SLA", ok: true },
];

// Math rows recalculated: Free 15%, Pro $49+9%, Enterprise $199+5%
const mathRows = [
  { sales: "$500",    free: "$75 in fees",    pro: "$94 total",    proWin: false, ent: "$224 total",   entWin: false },
  { sales: "$1,000",  free: "$150 in fees",   pro: "$139 total",   proWin: true,  ent: "$249 total",   entWin: false },
  { sales: "$5,000",  free: "$750 in fees",   pro: "$499 total",   proWin: true,  ent: "$449 total",   entWin: true  },
  { sales: "$20,000", free: "$3,000 in fees", pro: "$1,849 total", proWin: true,  ent: "$1,199 total", entWin: true  },
  { sales: "$50,000", free: "$7,500 in fees", pro: "$4,549 total", proWin: true,  ent: "$2,699 total", entWin: true  },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes. Upgrades apply immediately. Downgrades apply at the next billing cycle." },
  {
    q: "What is the platform fee?",
    a: "Opedd takes a small percentage of each licensing transaction — only when you make a sale. Your plan determines your rate: 15% (Free), 9% (Pro), or 5% (Enterprise). There's nothing to pay if you earn nothing. Stripe processing fees (~2.9% + $0.30) apply separately.",
  },
  { q: 'What counts as an "article"?', a: "Any piece of content registered in your Earning Center — articles, essays, newsletters, reports, or podcast transcripts." },
  { q: "What is a 30-day trial?", a: "All paid plans include a 30-day free trial with full access. No credit card is required to start. During the trial, the article limit is waived — you can import your full catalog." },
  { q: "What is an archive license?", a: "A site-wide license covering all your content within a date range. Used for enterprise deals — for example, an AI company licensing your full archive." },
  { q: "What is AI Access & Protection?", a: "Opedd generates an ai.txt file that signals to AI crawlers which content is licensed. It also enables AI companies to purchase legal access to your work — so instead of scraping for free, they pay you." },
  { q: "Do I need a credit card for the free plan?", a: "No. Sign up and start licensing immediately — no card required." },
];

/* ── Fee Tooltip ── */

function FeeTip({ fee, dark }: { fee: string; dark?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info size={13} className="cursor-help flex-shrink-0" style={{ color: dark ? "rgba(255,255,255,0.4)" : "#9CA3AF" }} />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs">
        Opedd takes {fee}% of each sale. You keep the rest. No monthly fee on Free.
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Feature List ── */

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
