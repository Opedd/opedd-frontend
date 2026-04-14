import { useEffect, useState } from "react";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

export interface PlanDTO {
  id: "free" | "pro" | "enterprise";
  name: string;
  description: string;
  product_id?: string;
  monthly_cents?: number;
  annual_cents?: number;
  monthly_display: string;
  annual_total_display: string;
  annual_equivalent_display: string;
  platform_fee_rate: number;
  platform_fee_display: string;
  article_limit?: number;
  features: string[];
  highlighted: boolean;
}

export interface PlansData {
  plans: PlanDTO[];
  platform_fee_rates: { free: number; pro: number; enterprise: number };
}

// Fallback matches _shared/pricing.ts — used only if /plans endpoint is unreachable.
// Keep in sync with backend on price changes; backend is still the source of truth.
const FALLBACK: PlansData = {
  platform_fee_rates: { free: 0.15, pro: 0.09, enterprise: 0.05 },
  plans: [
    {
      id: "free",
      name: "Free",
      description: "Get started with the basics",
      monthly_display: "$0",
      annual_total_display: "$0",
      annual_equivalent_display: "$0",
      platform_fee_rate: 0.15,
      platform_fee_display: "15%",
      article_limit: 500,
      features: ["Up to 500 articles", "15% platform fee", "Standard support"],
      highlighted: false,
    },
    {
      id: "pro",
      name: "Pro",
      description: "For growing independent publishers",
      monthly_display: "$39",
      annual_total_display: "$374/year",
      annual_equivalent_display: "$31",
      platform_fee_rate: 0.09,
      platform_fee_display: "9%",
      features: [
        "Unlimited articles",
        "9% platform fee (vs 15% free)",
        "Custom webhooks",
        "Team members (up to 5)",
        "Priority support",
        "Advanced analytics",
      ],
      highlighted: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For media organisations & large catalogs",
      monthly_display: "$99",
      annual_total_display: "$950/year",
      annual_equivalent_display: "$79",
      platform_fee_rate: 0.05,
      platform_fee_display: "5%",
      features: [
        "Everything in Pro",
        "5% platform fee (vs 15% free)",
        "Unlimited team members",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
      ],
      highlighted: false,
    },
  ],
};

const CACHE_KEY = "opedd:plans:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

export function usePlans(): { data: PlansData; loading: boolean; error: string | null } {
  const [data, setData] = useState<PlansData>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL_MS) return data;
      }
    } catch {}
    return FALLBACK;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${EXT_SUPABASE_URL}/plans`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${EXT_ANON_KEY}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || "unknown error");
        const fresh: PlansData = json.data;
        if (!cancelled) {
          setData(fresh);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fresh, ts: Date.now() }));
          } catch {}
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load plans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export function getPlan(data: PlansData, id: PlanDTO["id"]): PlanDTO | undefined {
  return data.plans.find((p) => p.id === id);
}
