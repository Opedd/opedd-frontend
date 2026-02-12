import React, { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Search,
  Shield,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface RegistryEntry {
  license_key: string;
  article_title: string;
  article_id: string;
  publisher_name: string;
  license_type: string;
  verified_at: string;
  verification_count: number;
  source_url?: string;
}

interface VerifyResult {
  valid: boolean;
  data?: Record<string, unknown>;
  message?: string;
}

export default function Registry() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "human" | "ai">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Verify section
  const [verifyKey, setVerifyKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/registry`, {
          headers: { apikey: EXT_ANON_KEY },
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setEntries(result.data?.entries || []);
        }
      } catch (err) {
        console.error("Registry fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter !== "all") {
      list = list.filter((e) => e.license_type === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.article_title?.toLowerCase().includes(q) ||
          e.license_key?.toLowerCase().includes(q) ||
          e.publisher_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, filter, search]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = async () => {
    if (!verifyKey.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(
        `${EXT_SUPABASE_URL}/functions/v1/verify-license?key=${encodeURIComponent(verifyKey.trim())}`,
        { headers: { apikey: EXT_ANON_KEY } }
      );
      const result = await res.json();
      if (res.ok && result.success) {
        setVerifyResult({ valid: true, data: result.data });
      } else {
        setVerifyResult({ valid: false, message: result.error?.message || "License not found." });
      }
    } catch {
      setVerifyResult({ valid: false, message: "Verification failed. Please try again." });
    } finally {
      setVerifying(false);
    }
  };

  const truncateKey = (key: string) => {
    if (key.length <= 16) return key;
    return key.slice(0, 12) + "…" + key.slice(-4);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        {/* Hero */}
        <section className="bg-[#040042] text-white py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8 max-w-5xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
                <Shield size={14} className="text-[#4A26ED]" />
                <span className="text-xs font-semibold tracking-wide uppercase text-white/80">Public Ledger</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold mb-4 leading-tight">Registry of Proof</h1>
              <p className="text-base lg:text-lg text-white/60 max-w-2xl mx-auto">
                A transparent, public ledger of verified content licenses on the Opedd Protocol.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Verify a License */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="container mx-auto px-4 lg:px-8 max-w-5xl py-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#040042]/40 mb-3">Verify a License</h2>
            <div className="flex gap-2 max-w-lg">
              <Input
                placeholder="Enter license key (e.g. OP-XXXX-XXXX)"
                value={verifyKey}
                onChange={(e) => setVerifyKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                className="h-11 font-mono text-sm"
              />
              <Button
                onClick={handleVerify}
                disabled={verifying || !verifyKey.trim()}
                className="h-11 px-6 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white shrink-0"
              >
                {verifying ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
              </Button>
            </div>
            {verifyResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-xl border ${
                  verifyResult.valid
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {verifyResult.valid ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <XCircle size={18} className="text-red-600" />
                  )}
                  <span className={`font-semibold text-sm ${verifyResult.valid ? "text-emerald-700" : "text-red-700"}`}>
                    {verifyResult.valid ? "License Verified" : "Not Found"}
                  </span>
                </div>
                {verifyResult.valid && verifyResult.data && (
                  <div className="mt-2 text-xs text-emerald-800 space-y-0.5">
                    {verifyResult.data.article_title && <p><span className="font-medium">Article:</span> {String(verifyResult.data.article_title)}</p>}
                    {verifyResult.data.license_type && <p><span className="font-medium">Type:</span> {String(verifyResult.data.license_type)}</p>}
                    {verifyResult.data.licensee && <p><span className="font-medium">Licensee:</span> {String(verifyResult.data.licensee)}</p>}
                  </div>
                )}
                {!verifyResult.valid && (
                  <p className="text-xs text-red-600 mt-1">{verifyResult.message}</p>
                )}
              </motion.div>
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="container mx-auto px-4 lg:px-8 max-w-5xl py-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#040042]/30" />
              <Input
                placeholder="Search titles, keys, or publishers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "human", "ai"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === f
                      ? "bg-[#040042] text-white"
                      : "bg-slate-100 text-[#040042]/60 hover:bg-slate-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "human" ? "Human" : "AI"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Registry Feed */}
        <section className="container mx-auto px-4 lg:px-8 max-w-5xl pb-16">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[#4A26ED]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <FileText size={40} className="text-slate-300 mx-auto" />
              <p className="text-[#040042]/50 text-sm">
                {entries.length === 0
                  ? "No verified licenses yet. Be the first publisher to license your content on Opedd."
                  : "No results match your search."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <motion.div
                  key={entry.license_key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-[#4A26ED]/20 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Title & Publisher */}
                    <div className="flex-1 min-w-0">
                      <a
                        href={entry.source_url || `/l/${entry.article_id}`}
                        target={entry.source_url ? "_blank" : undefined}
                        rel={entry.source_url ? "noopener noreferrer" : undefined}
                        className="text-sm font-semibold text-[#040042] hover:text-[#4A26ED] transition-colors truncate block"
                      >
                        {entry.article_title}
                        {entry.source_url && <ExternalLink size={11} className="inline ml-1.5 -mt-0.5" />}
                      </a>
                      <p className="text-xs text-[#040042]/40 mt-0.5">{entry.publisher_name}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          entry.license_type === "ai"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {entry.license_type === "ai" ? "AI" : "Human"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <Shield size={9} />
                        Verified {entry.verification_count > 1 ? `${entry.verification_count}x` : ""}
                      </Badge>
                    </div>

                    {/* Key + Time */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11px] font-mono text-[#040042]/50 bg-slate-50 px-2 py-1 rounded">
                          {truncateKey(entry.license_key)}
                        </code>
                        <button
                          onClick={() => handleCopy(entry.license_key)}
                          className="p-1 rounded hover:bg-slate-100 text-[#040042]/40"
                        >
                          {copiedKey === entry.license_key ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-[#040042]/30 whitespace-nowrap">
                        {formatDistanceToNow(new Date(entry.verified_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
