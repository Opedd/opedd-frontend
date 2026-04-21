import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  ArrowRight, ExternalLink, Terminal, Search, ShoppingCart, ShieldCheck,
  Cpu, Globe, BookOpen, Webhook, Layers, Link2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

const ENDPOINTS = [
  {
    icon: Search,
    badge: "GET",
    name: "License Discovery",
    path: "/.well-known/opedd.json",
    description: "Agents discover a publisher's full content catalog — pricing, license types, available articles, and agent instructions — from a single machine-readable manifest.",
  },
  {
    icon: ShoppingCart,
    badge: "POST",
    name: "Agent Purchase",
    path: "/agent-purchase",
    description: "Autonomous license acquisition with no pre-auth. Pay via Stripe payment method or USDC on Tempo. Returns a license key immediately — no human checkout flow.",
  },
  {
    icon: ShieldCheck,
    badge: "GET",
    name: "Verify License",
    path: "/verify-license?key={key}",
    description: "Cryptographic proof of license validity with on-chain verification via Tempo. Returns holder, covered content, license type, expiry, and blockchain proof.",
  },
  {
    icon: Globe,
    badge: "GET",
    name: "Registry of Proof",
    path: "/registry?license_key={key}",
    description: "Query the immutable on-chain license registry by key, article, publisher, or browse the global feed. Every issued license is registered on the Tempo blockchain.",
  },
  {
    icon: BookOpen,
    badge: "X-API-Key",
    name: "Publisher API",
    path: "/api",
    description: "Server-to-server API for programmatic catalog access. List articles, purchase licenses in bulk, verify keys, and query usage — all authenticated with your API key.",
  },
  {
    icon: Webhook,
    badge: "POST",
    name: "Buyer Webhooks",
    path: "/register-buyer-webhook",
    description: "Archive license holders register a webhook to receive content.published events when new articles are added — enabling live, push-based content delivery pipelines.",
  },
];

const LICENSE_TYPES = [
  { key: "human", label: "Human", color: "text-blue-600 bg-blue-50 border-blue-100", desc: "Editorial republication rights. Journalists, researchers, analysts." },
  { key: "ai_inference", label: "AI Inference", color: "text-violet-600 bg-violet-50 border-violet-100", desc: "RAG pipelines, retrieval-augmented generation, real-time AI context." },
  { key: "ai", label: "AI Training", color: "text-purple-600 bg-purple-50 border-purple-100", desc: "Model fine-tuning and pre-training datasets. One-time bulk license." },
  { key: "archive", label: "Archive", color: "text-emerald-600 bg-emerald-50 border-emerald-100", desc: "Full catalog access for a publisher. Time-bounded (valid_from → valid_until)." },
];

const AGENT_CODE = `// 1. Discover the publisher's catalog
const manifest = await fetch(
  "https://publisher.com/.well-known/opedd.json"
).then(r => r.json());

// manifest.articles[0] → { id, title, human_price, ai_price, ... }

// 2. Purchase a license (Stripe payment method)
const license = await fetch(
  "https://api.opedd.com/agent-purchase",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      article_id: manifest.articles[0].id,
      license_type: "ai_inference",   // human | ai_inference | ai | archive
      buyer_email: "pipeline@yourco.com",
      buyer_name: "RAG Pipeline v2",
      organization: "YourCo AI Labs",
      intended_use: "ai_training",    // personal | editorial | commercial
                                      // ai_training | corporate
      payment: {
        method: "stripe_pm",
        payment_method_id: "pm_xxxxxxxxxxxx",
      },
      // Or pay with USDC on Tempo:
      // payment: { method: "usdc", tx_hash: "0x...", chain: "tempo" }
    }),
  }
).then(r => r.json());

console.log(license.data.license_key);
// → "OPEDD-A7X9-K3M2" (registered on-chain on Tempo)

// 3. Verify at any time
const proof = await fetch(
  \`https://api.opedd.com/verify-license?key=\${license.data.license_key}\`
).then(r => r.json());

console.log(proof.data.blockchain_status);
// → "confirmed" — immutable proof on Tempo`;

const PUBLISHER_API_CODE = `// Server-to-server: list your articles
const articles = await fetch(
  "https://api.opedd.com/api?action=articles&limit=50",
  {
    headers: { "X-API-Key": "op_your_api_key_here" },
  }
).then(r => r.json());

// Batch purchase for a content pipeline
const batch = await fetch("https://api.opedd.com/api", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "op_your_api_key_here",
  },
  body: JSON.stringify({
    action: "batch_purchase",
    article_ids: ["id-1", "id-2", "id-3"],
    license_type: "ai_inference",
    buyer_email: "pipeline@yourco.com",
  }),
}).then(r => r.json());`;

const MCP_CONFIG = `{
  "mcpServers": {
    "opedd": {
      "command": "npx",
      "args": ["opedd-mcp"],
      "env": {
        "OPEDD_BUYER_EMAIL": "you@yourco.com",
        "OPEDD_PAYMENT_METHOD_ID": "pm_xxxxxxxxxxxx",
        "OPEDD_API_KEY": "op_your_api_key"
      }
    }
  }
}`;

const MCP_TOOLS = [
  { name: "lookup_content", desc: "Search Opedd's catalog by topic, publisher, or URL" },
  { name: "purchase_license", desc: "Acquire a license key for any article in one call" },
  { name: "verify_license", desc: "Check validity and on-chain proof of any license key" },
  { name: "browse_registry", desc: "Query the global immutable license registry" },
  { name: "list_publisher_content", desc: "List all articles from a specific publisher" },
];

export default function ForAiAgents() {
  useDocumentTitle("For AI Agents — Opedd");
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <SEO
        title="Opedd for AI Agents — Content Licensing API"
        description="Discover, purchase, and verify content licenses via API. Native MCP server for Claude and Cursor."
        path="/for-ai-agents"
      />
      <Header />

      {/* Hero */}
      <section className="bg-navy-deep pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-full max-w-[600px] h-[600px] bg-oxford/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-full max-w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="text-center space-y-6">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/60 font-medium">
              <Cpu size={14} className="text-violet-400" />
              Agentic Licensing Protocol
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Built for AI agents
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              Discover, purchase, and verify content licenses programmatically — with on-chain proof on Tempo, USDC payments, and a native MCP server for Claude and Cursor.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 pt-4 flex-wrap">
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-white text-navy-deep text-sm font-bold hover:bg-white/90 transition-all"
              >
                Read the docs
                <ExternalLink size={15} />
              </a>
              <a
                href="#endpoints"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5 transition-all"
              >
                Explore endpoints
                <ArrowRight size={15} />
              </a>
            </motion.div>

            {/* On-chain callout */}
            <motion.div variants={fadeUp} custom={4} className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 mt-4">
              <Link2 size={16} className="text-violet-400 shrink-0" />
              <span className="text-sm text-white/60">Every license issued is registered on-chain — <span className="text-white/80 font-medium">Tempo · OpeddRegistry.sol</span></span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* License Types */}
      <section className="py-16 border-b border-gray-200">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">License Types</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Four license types, one API</motion.h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LICENSE_TYPES.map((lt, i) => (
              <motion.div
                key={lt.key}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border mb-3 ${lt.color}`}>
                  {lt.label}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{lt.desc}</p>
                <code className={`text-[11px] font-mono mt-3 block ${lt.color.split(" ")[0]}`}>{lt.key}</code>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-oxford mb-3">Core Endpoints</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Purpose-built for autonomous workflows</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-gray-500 mt-3 max-w-xl mx-auto">Every content licensing operation your agent needs — discovery, acquisition, verification, and proof — maps to a clean REST call.</motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {ENDPOINTS.map((ep, i) => (
              <motion.div
                key={ep.name}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm hover:shadow-md hover:border-oxford/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-oxford/5 flex items-center justify-center group-hover:bg-oxford/10 transition-colors">
                    <ep.icon size={20} className="text-oxford" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">{ep.badge}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{ep.name}</h3>
                <code className="text-xs font-mono text-oxford/70 bg-oxford/5 px-2 py-0.5 rounded">{ep.path}</code>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{ep.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example — Agent Purchase */}
      <section className="py-20 lg:py-28 bg-navy-deep">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">Quick Start</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-white tracking-tight">Discover, license, and verify in three calls</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-white/40 mt-3 max-w-xl mx-auto">Your agent discovers a publisher's catalog, acquires a license with Stripe or USDC, and gets cryptographic on-chain proof — all programmatically.</motion.p>
          </motion.div>

          <motion.div variants={fadeUp} custom={3} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <span className="text-slate-400 text-xs font-mono ml-3">agent.ts</span>
              </div>
              <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-[13px] leading-relaxed">
                <code className="text-slate-700 font-mono whitespace-pre block">{AGENT_CODE}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Publisher API */}
      <section className="py-20 lg:py-28 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-5">
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-oxford/5 border border-oxford/15 rounded-full px-3.5 py-1 text-xs font-semibold text-oxford uppercase tracking-wider">
                <Layers size={13} />
                Publisher API
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-gray-900 tracking-tight">
                Server-to-server integration
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-gray-500 leading-relaxed">
                Authenticate with your <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono border border-gray-200">X-API-Key</code> header to access your full catalog, run batch purchases, verify keys at scale, and query usage — all server-to-server. Your API key is in Settings → API Keys.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="space-y-2">
                {[
                  { action: "articles", desc: "List and search your article catalog" },
                  { action: "purchase", desc: "Single-article license purchase" },
                  { action: "batch_purchase", desc: "Bulk license acquisition" },
                  { action: "verify", desc: "Verify any license key" },
                  { action: "usage", desc: "Query license usage and analytics" },
                ].map((item) => (
                  <div key={item.action} className="flex items-center gap-3">
                    <code className="text-xs font-mono text-oxford bg-oxford/5 px-2 py-0.5 rounded border border-oxford/10 shrink-0">{item.action}</code>
                    <span className="text-sm text-gray-500">{item.desc}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp} custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  </div>
                  <span className="text-slate-400 text-xs font-mono ml-3">publisher-api.ts</span>
                </div>
                <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-[13px] leading-relaxed">
                  <code className="text-slate-700 font-mono whitespace-pre block">{PUBLISHER_API_CODE}</code>
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* MCP Server */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-5">
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-oxford/5 border border-oxford/15 rounded-full px-3.5 py-1 text-xs font-semibold text-oxford uppercase tracking-wider">
                <Terminal size={13} />
                MCP Server
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-gray-900 tracking-tight">
                Native tool for Claude, Cursor & any MCP client
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-gray-500 leading-relaxed">
                Install the Opedd MCP server and your AI assistant gains direct access to content licensing — discovering articles, purchasing licenses, verifying proofs, and browsing the on-chain registry without leaving the conversation.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex items-center gap-2">
                <div className="bg-gray-100 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-900 border border-gray-200">
                  npx opedd-mcp
                </div>
              </motion.div>
              <motion.div variants={fadeUp} custom={4} className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">5 tools included</p>
                {MCP_TOOLS.map((tool) => (
                  <div key={tool.name} className="flex items-start gap-3">
                    <code className="text-[11px] font-mono text-oxford bg-oxford/5 px-2 py-0.5 rounded border border-oxford/10 shrink-0 mt-0.5">{tool.name}</code>
                    <span className="text-sm text-gray-500">{tool.desc}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp} custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  </div>
                  <span className="text-slate-400 text-xs font-mono ml-3">claude_desktop_config.json</span>
                </div>
                <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-[13px] leading-relaxed">
                  <code className="text-slate-700 font-mono whitespace-pre block">{MCP_CONFIG}</code>
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* On-chain Registry */}
      <section className="py-16 bg-gradient-to-r from-navy-deep to-navy-deep">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1 text-xs font-semibold text-violet-400 uppercase tracking-wider">
                <Link2 size={13} />
                On-Chain Registry
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Every license lives on Tempo</h2>
              <p className="text-white/50 leading-relaxed text-sm">
                Every license Opedd issues — human, AI, archive — is registered on the <span className="text-white/80">OpeddRegistry smart contract</span> deployed on Tempo. Verify any license key on-chain, independently of Opedd's infrastructure.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <code className="text-xs font-mono text-violet-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg break-all">
                  0x7c3830c22cb7dd0742f0da38b9f1403aee1f50ad
                </code>
              </div>
            </div>
            <div className="shrink-0 grid grid-cols-2 gap-3 text-center">
              {[
                { label: "Network", value: "Tempo" },
                { label: "Status", value: "Live" },
                { label: "Payment", value: "Stripe + USDC" },
                { label: "Proof", value: "On-chain" },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl px-5 py-3">
                  <div className="text-xs text-white/40 mb-1">{item.label}</div>
                  <div className="text-sm font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-6">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold text-gray-900 tracking-tight">Start licensing content today</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-gray-500">Read the full API reference, explore all endpoints, and integrate Opedd into your AI pipeline in minutes.</motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex items-center justify-center gap-4 pt-2 flex-wrap">
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-navy-deep text-white text-sm font-bold hover:bg-navy-deep/90 transition-all"
              >
                Full API Documentation
                <ExternalLink size={15} />
              </a>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-gray-200 text-gray-900 text-sm font-semibold hover:bg-white transition-all"
              >
                Create publisher account
                <ArrowRight size={15} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
