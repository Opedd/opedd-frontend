import { describe, it, expect } from "vitest";
import { derivePricingGaps, type PricingState, type PricingGap } from "./pricing-gaps";

// Sort gaps deterministically for assertion stability — derivePricingGaps
// preserves Object.keys(VALID_COMBINATIONS) order, which is stable but
// implementation-dependent. Sort by lic+model for tests so a future
// reorder of VALID_COMBINATIONS doesn't flake assertions.
function sortGaps(gaps: PricingGap[]): PricingGap[] {
  return [...gaps].sort((a, b) => {
    const k1 = `${a.license_type}:${a.payment_model}`;
    const k2 = `${b.license_type}:${b.payment_model}`;
    return k1.localeCompare(k2);
  });
}

describe("derivePricingGaps — KI #126 banner trigger conditions", () => {
  describe("4 resolver-throws now reachable post-KI-130 (the failure cohort the banner exists for)", () => {
    it("flags ai_training subscription + one_time when wizard enables tier without per-tier price (no legacy fallback)", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_training: { enabled: true },
          },
        },
        default_ai_price: 25,
        default_human_price: 8,
      };
      const gaps = sortGaps(derivePricingGaps(state));
      expect(gaps).toEqual([
        { license_type: "ai_training", payment_model: "one_time" },
        { license_type: "ai_training", payment_model: "subscription" },
      ]);
    });

    it("flags ai_retrieval one_time + metered when only legacy default_ai_price is set (covers subscription only)", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_retrieval: { enabled: true },
          },
        },
        default_ai_price: 25,
      };
      const gaps = sortGaps(derivePricingGaps(state));
      expect(gaps).toEqual([
        { license_type: "ai_retrieval", payment_model: "metered" },
        { license_type: "ai_retrieval", payment_model: "one_time" },
      ]);
    });

    it("fires the full 4-gap cohort for the canonical wizard-onboarded publisher", () => {
      // The exact shape KI #126 observed on publisher f55c63ae after B.1 wizard.
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_training: { enabled: true },
            ai_retrieval: { enabled: true },
            human_per_article: { enabled: true },
            human_full_archive: { price_annual: 48000 },
          },
        },
        default_ai_price: 25,
        default_human_price: 8,
      };
      const gaps = sortGaps(derivePricingGaps(state));
      expect(gaps).toEqual([
        { license_type: "ai_retrieval", payment_model: "metered" },
        { license_type: "ai_retrieval", payment_model: "one_time" },
        { license_type: "ai_training", payment_model: "one_time" },
        { license_type: "ai_training", payment_model: "subscription" },
      ]);
    });
  });

  describe("legacy default fallbacks suppress gaps (resolver Step 5 mirror)", () => {
    it("default_human_price > 0 covers human_per_article one_time", () => {
      const state: PricingState = {
        pricing_rules: { license_types: { human_per_article: { enabled: true } } },
        default_human_price: 8,
      };
      expect(derivePricingGaps(state)).toEqual([]);
    });

    it("default_ai_price > 0 covers ai_retrieval subscription only — NOT one_time or metered", () => {
      const state: PricingState = {
        pricing_rules: { license_types: { ai_retrieval: { enabled: true } } },
        default_ai_price: 25,
      };
      const gaps = sortGaps(derivePricingGaps(state));
      // subscription suppressed via fallback; one_time + metered remain
      expect(gaps).toEqual([
        { license_type: "ai_retrieval", payment_model: "metered" },
        { license_type: "ai_retrieval", payment_model: "one_time" },
      ]);
    });

    it("default_human_price=0 leaves human_per_article one_time as a gap", () => {
      const state: PricingState = {
        pricing_rules: { license_types: { human_per_article: { enabled: true } } },
        default_human_price: 0,
      };
      expect(derivePricingGaps(state)).toEqual([
        { license_type: "human_per_article", payment_model: "one_time" },
      ]);
    });
  });

  describe("per-tier price suppresses gap for that payment_model only", () => {
    it("ai_training.price set → only subscription remains as gap", () => {
      const state: PricingState = {
        pricing_rules: { license_types: { ai_training: { enabled: true, price: 100 } } },
      };
      expect(derivePricingGaps(state)).toEqual([
        { license_type: "ai_training", payment_model: "subscription" },
      ]);
    });

    it("ai_retrieval all 3 payment-model fields set → zero gaps", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_retrieval: {
              enabled: true,
              price: 35,
              price_annual: 12000,
              price_metered: 0.05,
            },
          },
        },
      };
      expect(derivePricingGaps(state)).toEqual([]);
    });

    it("human_full_archive.price_annual set → no gap (single valid model satisfied)", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: { human_full_archive: { price_annual: 48000 } },
        },
      };
      expect(derivePricingGaps(state)).toEqual([]);
    });
  });

  describe("happy paths — banner does NOT fire", () => {
    it("publisher with full Settings/Pricing config across all 4 tiers → zero gaps", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_training: { enabled: true, price: 50, price_annual: 60000 },
            ai_retrieval: { enabled: true, price: 35, price_annual: 12000, price_metered: 0.05 },
            human_per_article: { enabled: true, price: 8 },
            human_full_archive: { enabled: true, price_annual: 48000 },
          },
        },
        default_human_price: 0,
        default_ai_price: 0,
      };
      expect(derivePricingGaps(state)).toEqual([]);
    });

    it("publisher who explicitly disabled all AI tiers → zero gaps (only human side enabled)", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_training: { enabled: false },
            ai_retrieval: { enabled: false },
            human_per_article: { enabled: true },
          },
        },
        default_human_price: 8,
      };
      expect(derivePricingGaps(state)).toEqual([]);
    });

    it("empty pricing_rules + no defaults → zero gaps (no tiers configured = no claims to honour)", () => {
      const state: PricingState = { pricing_rules: { license_types: {} } };
      expect(derivePricingGaps(state)).toEqual([]);
    });

    it("missing pricing_rules entirely → zero gaps (defensive)", () => {
      expect(derivePricingGaps({})).toEqual([]);
      expect(derivePricingGaps({ pricing_rules: null })).toEqual([]);
      expect(derivePricingGaps({ pricing_rules: {} })).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("zero/negative price treated as missing", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_training: { enabled: true, price: 0, price_annual: -5 },
          },
        },
      };
      expect(sortGaps(derivePricingGaps(state))).toEqual([
        { license_type: "ai_training", payment_model: "one_time" },
        { license_type: "ai_training", payment_model: "subscription" },
      ]);
    });

    it("absent enabled field is treated as enabled (matches wizard write semantics)", () => {
      // Wizard always writes `enabled: true/false`; absent enabled on an
      // existing entry can happen via direct API or admin tooling.
      // Mirror resolver: resolver looks up the price field directly and
      // doesn't gate on enabled, so banner errs toward visibility.
      const state: PricingState = {
        pricing_rules: { license_types: { ai_training: {} } },
      };
      expect(sortGaps(derivePricingGaps(state))).toEqual([
        { license_type: "ai_training", payment_model: "one_time" },
        { license_type: "ai_training", payment_model: "subscription" },
      ]);
    });

    it("non-number price values are treated as missing", () => {
      const state: PricingState = {
        pricing_rules: {
          license_types: {
            ai_training: {
              enabled: true,
              price: "100" as unknown as number,
              price_annual: null as unknown as number,
            },
          },
        },
      };
      expect(sortGaps(derivePricingGaps(state))).toEqual([
        { license_type: "ai_training", payment_model: "one_time" },
        { license_type: "ai_training", payment_model: "subscription" },
      ]);
    });
  });
});
