import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Terminal, Search, ShoppingCart, ShieldCheck, Cpu } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  }),
};

const ENDPOINTS = [
  {
    icon: Search,
    name: "License Discovery",
    path: "/.well-known/opedd.json",
    description: "Agents discover licensing terms by fetching the publisher's opedd.json manifest — a machine-readable file declaring available content, prices, and license types.",
  },
  {
    icon: ShoppingCart,
    name: "Agent Purchase",
    path: "POST /functions/v1/agent-purchase",
    description: "Autonomous license acquisition. Agents submit buyer metadata, select a license type, and receive a license key in a single API call — no human checkout flow required.",
  },
  {
    icon: ShieldCheck,
    name: "Verify License",
    path: "GET /functions/v1/verify-license?key={key}",
    description: "Cryptographic proof of license validity. Returns the license holder, covered content, license type, and expiration status. Used for compliance auditing.",
  },
];

const DISCOVER_CODE = `// 1. Discover licensing terms from any publisher
const manifest = await fetch(
  "https://publisher.com/.well-known/opedd.json"
).then(r => r.json());

// 2. Select an article and purchase a license
const result = await fetch(
  "https://djdzcciayennqchjgybx.supabase.co/functions/v1/agent-purchase",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": OPEDD_ANON_KEY,
    },
    body: JSON.stringify({
      article_id: manifest.articles[0].id,
      license_type: "ai",
      buyer_email: "agent@yourcompany.com",
      buyer_name: "Training Pipeline v3",
      organization: "YourCo AI Labs",
      intended_use: "ai_training",
    }),
  }
).then(r => r.json());

console.log(result.license_key);
// → "OPEDD-A7X9-K3M2"`;

const MCP_CONFIG = `{
  "mcpServers": {
    "opedd": {
      "command": "npx",
      "args": ["opedd-mcp"],
      "env": {
        "OPEDD_API_KEY": "your-api-key"
      }
    }
  }
}`;

export default function ForAiAgents() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Header />

      {/* Hero */}
      <section className="bg-[#040042] pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#4A26ED]/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-[#7C3AED]/10 rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-4xl">
          <motion.div initial="hidden" animate="visible" className="text-center space-y-6">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/60 font-medium">
              <Cpu size={14} className="text-[#A78BFA]" />
              Agentic Licensing Protocol
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Built for AI agents
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              Three endpoints. One API call to discover, purchase, and verify content licenses — designed for autonomous AI systems that need licensed data at scale.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 pt-4">
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-white text-[#040042] text-sm font-bold hover:bg-white/90 transition-all"
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
          </motion.div>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-[#4A26ED] mb-3">Core Endpoints</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-[#111827] tracking-tight">Three primitives, infinite workflows</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-[#6B7280] mt-3 max-w-xl mx-auto">Every content licensing operation your agent needs — discovery, acquisition, and verification — maps to a single REST call.</motion.p>
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
                className="bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm hover:shadow-md hover:border-[#4A26ED]/20 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#4A26ED]/5 flex items-center justify-center mb-5 group-hover:bg-[#4A26ED]/10 transition-colors">
                  <ep.icon size={20} className="text-[#4A26ED]" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-1">{ep.name}</h3>
                <code className="text-xs font-mono text-[#4A26ED]/70 bg-[#4A26ED]/5 px-2 py-0.5 rounded">{ep.path}</code>
                <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">{ep.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-20 lg:py-28 bg-[#040042]">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-[#A78BFA] mb-3">Quick Start</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-white tracking-tight">Discover and license in one call</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-white/40 mt-3 max-w-xl mx-auto">Your agent discovers a publisher's content catalog, picks an article, and acquires a license — all programmatically.</motion.p>
          </motion.div>

          <motion.div variants={fadeUp} custom={3} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="bg-[#0D0D2B] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-white/30 text-xs font-mono ml-3">agent.ts</span>
              </div>
              <pre className="p-6 overflow-x-auto text-[13px] leading-relaxed">
                <code className="text-white/80 font-mono whitespace-pre">{DISCOVER_CODE}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MCP Server */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-5">
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-[#4A26ED]/5 border border-[#4A26ED]/15 rounded-full px-3.5 py-1 text-xs font-semibold text-[#4A26ED] uppercase tracking-wider">
                <Terminal size={13} />
                MCP Server
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold text-[#111827] tracking-tight">
                Native tool for Claude, Cursor & any MCP client
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-[#6B7280] leading-relaxed">
                Install the Opedd MCP server and your AI assistant gains direct access to content licensing — discovering articles, purchasing licenses, and verifying proofs without leaving the conversation.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex items-center gap-2">
                <div className="bg-[#F3F4F6] rounded-lg px-4 py-2.5 font-mono text-sm text-[#111827] border border-[#E5E7EB]">
                  npx opedd-mcp
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp} custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="bg-[#0D0D2B] rounded-2xl border border-[#1E1E3A] overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-white/30 text-xs font-mono ml-3">claude_desktop_config.json</span>
                </div>
                <pre className="p-6 overflow-x-auto text-[13px] leading-relaxed">
                  <code className="text-white/80 font-mono whitespace-pre">{MCP_CONFIG}</code>
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-[#F9FAFB] border-t border-[#E5E7EB]">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-6">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold text-[#111827] tracking-tight">Start licensing content today</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[#6B7280]">Read the full API reference, explore endpoints, and integrate Opedd into your AI pipeline.</motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex items-center justify-center gap-4 pt-2">
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-[#040042] text-white text-sm font-bold hover:bg-[#040042]/90 transition-all"
              >
                Full API Documentation
                <ExternalLink size={15} />
              </a>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-[#E5E7EB] text-[#111827] text-sm font-semibold hover:bg-white transition-all"
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
