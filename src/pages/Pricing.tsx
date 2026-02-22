import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Minus, ChevronDown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import opeddIcon from "@/assets/opedd-icon.svg";

/* ────────────────────────── data ────────────────────────── */

const plans = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    sub: "No credit card required",
    fee: "12%",
    feePill: "bg-amber-100 text-amber-700",
    cta: "Get started free",
    ctaClass:
      "border border-[#040042] text-[#040042] hover:bg-[#040042]/5 bg-white",
    cardClass: "bg-white border border-slate-200",
    textClass: "text-[#040042]",
    subTextClass: "text-slate-500",
    checkClass: "text-[#4A26ED]",
    dashClass: "text-slate-300",
    popular: false,
    features: [
      { t: "Up to 100 articles", ok: true },
      { t: "1 content source", ok: true },
      { t: "Badge widget", ok: true },
      { t: "License certificates", ok: true },
      { t: "Community support", ok: true },
      { t: "Analytics", ok: false },
      { t: "API & Webhooks", ok: false },
      { t: "Invoice PDFs", ok: false },
      { t: "Archive licenses", ok: false },
      { t: "AI defense policy", ok: false },
    ],
  },
  {
    name: "Pro",
    monthly: 79,
    annual: 65,
    annualTotal: 780,
    sub: "For serious publishers",
    fee: "7%",
    feePill: "bg-emerald-100 text-emerald-700",
    cta: "Start Pro",
    ctaClass: "bg-[#4A26ED] text-white hover:bg-[#3b1ec7]",
    cardClass:
      "bg-white border-2 border-[#4A26ED] shadow-lg shadow-[#4A26ED]/10 relative",
    textClass: "text-[#040042]",
    subTextClass: "text-slate-500",
    checkClass: "text-[#4A26ED]",
    dashClass: "text-slate-300",
    popular: true,
    features: [
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
    ],
  },
  {
    name: "Enterprise",
    monthly: 249,
    annual: 199,
    annualTotal: 2388,
    sub: "For media organizations",
    fee: "5%",
    feePill: "bg-white/15 text-white/80",
    cta: "Get started",
    ctaClass: "bg-white text-[#040042] hover:bg-slate-100",
    cardClass: "bg-[#040042] border border-white/10",
    textClass: "text-white",
    subTextClass: "text-white/60",
    checkClass: "text-white",
    dashClass: "text-white/20",
    popular: false,
    features: [
      { t: "Everything in Pro", ok: true },
      { t: "Unlimited sources", ok: true },
      { t: "Unlimited archive licenses", ok: true },
      { t: "Unlimited API access", ok: true },
      { t: "On-chain blockchain proof (Base)", ok: true },
      { t: "Custom widget branding", ok: true },
      { t: "Unlimited team seats", ok: true },
      { t: "Dedicated account manager", ok: true },
      { t: "Slack support + 99.9% SLA", ok: true },
    ],
  },
];

const mathRows = [
  {
    sales: "$1,000",
    free: "$120 fees",
    pro: "$149 total",
    proWin: false,
    ent: "$299 total",
    entWin: false,
  },
  {
    sales: "$5,000",
    free: "$600 fees",
    pro: "$429 total",
    proWin: true,
    ent: "$499 total",
    entWin: false,
  },
  {
    sales: "$15,000",
    free: "$1,800 fees",
    pro: "$1,129 total",
    proWin: true,
    ent: "$999 total",
    entWin: true,
  },
  {
    sales: "$50,000",
    free: "$6,000 fees",
    pro: "$3,579 total",
    proWin: true,
    ent: "$2,749 total",
    entWin: true,
  },
];

type CompRow = { label: string; free: string; pro: string; ent: string };
type CompGroup = { group: string; rows: CompRow[] };

const comparison: CompGroup[] = [
  {
    group: "Content",
    rows: [
      { label: "Articles registered", free: "100", pro: "Unlimited", ent: "Unlimited" },
      { label: "Content sources", free: "1", pro: "10", ent: "Unlimited" },
    ],
  },
  {
    group: "Widget",
    rows: [
      { label: "Badge mode", free: "✓", pro: "✓", ent: "✓" },
      { label: "Card mode", free: "—", pro: "✓", ent: "✓" },
      { label: "Compact mode", free: "—", pro: "✓", ent: "✓" },
      { label: "Custom branding", free: "—", pro: "—", ent: "✓" },
    ],
  },
  {
    group: "Licensing",
    rows: [
      { label: "License certificates", free: "✓", pro: "✓", ent: "✓" },
      { label: "Invoice PDFs", free: "—", pro: "✓", ent: "✓" },
      { label: "Archive licenses", free: "—", pro: "10/mo", ent: "Unlimited" },
      { label: "On-chain proof (Base blockchain)", free: "—", pro: "—", ent: "✓" },
    ],
  },
  {
    group: "Analytics & API",
    rows: [
      { label: "Analytics dashboard", free: "—", pro: "✓", ent: "✓" },
      { label: "Webhooks", free: "—", pro: "✓", ent: "Unlimited" },
      { label: "API access", free: "—", pro: "1K req/day", ent: "Unlimited" },
    ],
  },
  {
    group: "Protection",
    rows: [
      { label: "AI defense policy (ai.txt)", free: "—", pro: "✓", ent: "✓" },
    ],
  },
  {
    group: "Team",
    rows: [{ label: "Team seats", free: "1", pro: "5", ent: "Unlimited" }],
  },
  {
    group: "Support",
    rows: [
      { label: "Community docs", free: "✓", pro: "✓", ent: "✓" },
      { label: "Priority email", free: "—", pro: "✓", ent: "✓" },
      { label: "Dedicated account manager", free: "—", pro: "—", ent: "✓" },
      { label: "Slack support", free: "—", pro: "—", ent: "✓" },
      { label: "SLA", free: "—", pro: "—", ent: "99.9%" },
    ],
  },
  {
    group: "Platform fee",
    rows: [{ label: "Per transaction", free: "12%", pro: "7%", ent: "5%" }],
  },
];

const faqs = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes. Upgrades take effect immediately. Downgrades apply at the next billing cycle.",
  },
  {
    q: "What is the platform fee?",
    a: "Opedd takes a small percentage of each licensing transaction to operate the protocol. Your plan tier determines your rate (12%, 7%, or 5%). Stripe processing fees (~2.9% + $0.30) apply separately.",
  },
  {
    q: 'What counts as an "article"?',
    a: "Any piece of content registered in your library — articles, essays, reports, newsletters, or podcast transcripts.",
  },
  {
    q: "What is an archive license?",
    a: "A site-wide license covering all your content within a date range. Used for enterprise deals with AI companies or media groups (e.g., Bloomberg licensing your full 2024 archive).",
  },
  {
    q: "What is on-chain proof?",
    a: "Enterprise licenses are cryptographically recorded on the Base blockchain, giving buyers tamper-proof, permanent proof of their license — useful for legal and compliance teams.",
  },
  {
    q: "Do I need a credit card for the free plan?",
    a: "No. Sign up and start licensing immediately, no card required.",
  },
];

/* ────────────────────────── helpers ────────────────────────── */

function CellValue({ v, dark }: { v: string; dark?: boolean }) {
  if (v === "✓")
    return (
      <Check
        size={16}
        className={dark ? "text-white mx-auto" : "text-[#4A26ED] mx-auto"}
      />
    );
  if (v === "—")
    return (
      <Minus
        size={16}
        className={dark ? "text-white/20 mx-auto" : "text-slate-300 mx-auto"}
      />
    );
  return (
    <span className={dark ? "text-white/80 text-sm" : "text-slate-700 text-sm"}>
      {v}
    </span>
  );
}

/* ────────────────────────── component ────────────────────────── */

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { user } = useAuth();
  const ctaLink = user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ─── 1. Hero ─── */}
      <section className="pt-32 pb-16 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#4A26ED] bg-[#4A26ED]/10 px-4 py-1.5 rounded-full mb-6">
            Simple, transparent pricing
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-[#040042] leading-tight mb-4">
            License your content.
            <br className="hidden sm:block" /> Keep more of what you earn.
          </h1>
          <p className="text-lg text-slate-500 mb-10">
            Start free. Upgrade when your earnings make it obvious.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-100 p-1 rounded-full">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                !annual ? "bg-white text-[#040042] shadow-sm" : "text-slate-500"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                annual ? "bg-white text-[#040042] shadow-sm" : "text-slate-500"
              }`}
            >
              Annual
            </button>
            {annual && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                Save ~18%
              </span>
            )}
          </div>
        </motion.div>
      </section>

      {/* ─── 2. Cards ─── */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`rounded-2xl p-7 flex flex-col ${p.cardClass} ${
                p.popular ? "md:-mt-4 md:pb-9" : ""
              }`}
            >
              {p.popular && (
                <span className="self-start text-[11px] font-bold uppercase tracking-wider text-white bg-[#4A26ED] px-3 py-1 rounded-full mb-4">
                  Most Popular
                </span>
              )}
              <h3 className={`text-lg font-bold ${p.textClass}`}>{p.name}</h3>
              <div className="mt-3 mb-1 flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${p.textClass}`}>
                  ${annual ? p.annual : p.monthly}
                </span>
                {p.monthly > 0 && (
                  <span className={`text-sm ${p.subTextClass}`}>/ month</span>
                )}
              </div>
              {annual && p.annualTotal ? (
                <p className={`text-xs ${p.subTextClass} mb-1`}>
                  Billed ${p.annualTotal.toLocaleString()}/year
                </p>
              ) : null}
              <p className={`text-sm ${p.subTextClass} mb-5`}>{p.sub}</p>

              <Link
                to={ctaLink}
                className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${p.ctaClass}`}
              >
                {p.cta}
              </Link>

              <span
                className={`self-start text-[11px] font-semibold px-2.5 py-1 rounded-full mt-5 ${p.feePill}`}
              >
                {p.fee} platform fee
              </span>

              <ul className="mt-5 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f.t} className="flex items-start gap-2.5 text-sm">
                    {f.ok ? (
                      <Check size={16} className={`mt-0.5 flex-shrink-0 ${p.checkClass}`} />
                    ) : (
                      <Minus size={16} className={`mt-0.5 flex-shrink-0 ${p.dashClass}`} />
                    )}
                    <span className={f.ok ? p.textClass : p.dashClass}>
                      {f.t}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── 3. The Math ─── */}
      <section className="bg-[#040042] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            The upgrade pays for itself
          </h2>
          <p className="text-white/60">
            Our platform fee drops with each tier. At scale, your savings dwarf the subscription cost.
          </p>
        </div>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-left">
                <th className="pb-3 pr-4 font-medium">Monthly sales</th>
                <th className="pb-3 px-4 font-medium">Free (12%)</th>
                <th className="pb-3 px-4 font-medium">Pro ($79 + 7%)</th>
                <th className="pb-3 pl-4 font-medium">Enterprise ($249 + 5%)</th>
              </tr>
            </thead>
            <tbody>
              {mathRows.map((r) => (
                <tr key={r.sales} className="border-b border-white/5">
                  <td className="py-3.5 pr-4 text-white font-medium">{r.sales}</td>
                  <td className="py-3.5 px-4 text-white/70">{r.free}</td>
                  <td className="py-3.5 px-4 text-white/70">
                    {r.pro}
                    {r.proWin && (
                      <Check size={14} className="inline ml-1.5 text-emerald-400" />
                    )}
                  </td>
                  <td className="py-3.5 pl-4 text-white/70">
                    {r.ent}
                    {r.entWin && (
                      <Check size={14} className="inline ml-1.5 text-emerald-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-white/30 text-xs mt-6">
            * Stripe processing fees (approx. 2.9% + $0.30/transaction) apply separately.
          </p>
        </div>
      </section>

      {/* ─── 4. Feature Comparison ─── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[#040042] text-center mb-12">
            Compare all features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 pr-4 font-semibold text-[#040042] w-[40%]">
                    Feature
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-[#040042]">Free</th>
                  <th className="text-center py-3 px-4 font-semibold text-[#4A26ED]">Pro</th>
                  <th className="text-center py-3 pl-4 font-semibold text-[#040042]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((g) => (
                  <React.Fragment key={g.group}>
                    <tr>
                      <td
                        colSpan={4}
                        className="pt-6 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400"
                      >
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-slate-700">{r.label}</td>
                        <td className="py-3 px-4 text-center">
                          <CellValue v={r.free} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <CellValue v={r.pro} />
                        </td>
                        <td className="py-3 pl-4 text-center">
                          <CellValue v={r.ent} />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── 5. FAQ ─── */}
      <section className="py-20 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[#040042] text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-2">
            {faqs.map((f, i) => (
              <Accordion key={i} type="single" collapsible>
                <AccordionItem value={`faq-${i}`} className="border-b border-slate-100">
                  <AccordionTrigger className="text-left text-[#040042] font-medium text-sm hover:no-underline py-4">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-500 text-sm leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. Bottom CTA ─── */}
      <section className="bg-[#F9FAFB] py-20 px-6 text-center">
        <img src={opeddIcon} alt="" className="h-10 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-[#040042] mb-3">
          Start licensing your content today
        </h2>
        <p className="text-slate-500 mb-8">
          Join publishers already protecting their work with Opedd Protocol.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to={ctaLink}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#040042] text-white hover:bg-[#0a006e] transition-colors"
          >
            Get started free
          </Link>
          <a
            href="#"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-[#040042] hover:bg-slate-50 transition-colors"
          >
            See the docs
          </a>
        </div>
        <p className="text-xs text-slate-400 mt-5">
          No credit card required · Cancel anytime · Setup in under 5 minutes
        </p>
      </section>

      <Footer />
    </div>
  );
}
