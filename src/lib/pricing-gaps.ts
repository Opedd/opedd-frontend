/**
 * KI #126 — derive resolver-reachable pricing gaps for a publisher.
 *
 * Mirrors the cascade in opedd-backend `_shared/pricing.ts:resolvePrice`.
 * Returns the list of (license_type, payment_model) tuples that buyer-
 * facing endpoints (post-KI-130 4-vocab acceptance) can reach but that
 * would throw `PRICING_RULE_NOT_CONFIGURED` at checkout because no
 * per-tier price is set AND no legacy default fallback applies.
 *
 * Pure function — no React, no fetch — drives the Dashboard pricing-gap
 * banner (KI #126 closure).
 */

export type LicenseType =
  | "ai_training"
  | "ai_retrieval"
  | "human_per_article"
  | "human_full_archive";

export type PaymentModel = "one_time" | "subscription" | "metered";

export interface PricingGap {
  license_type: LicenseType;
  payment_model: PaymentModel;
}

export interface PricingState {
  pricing_rules?: {
    license_types?: Partial<
      Record<
        LicenseType,
        {
          enabled?: boolean;
          price?: number;
          price_annual?: number;
          price_metered?: number;
          [k: string]: unknown;
        }
      >
    >;
    [k: string]: unknown;
  } | null;
  default_human_price?: number | null;
  default_ai_price?: number | null;
}

// Mirrors VALID_COMBINATIONS in opedd-backend `_shared/pricing.ts`.
const VALID_COMBINATIONS: Record<LicenseType, ReadonlyArray<PaymentModel>> = {
  ai_training: ["subscription", "one_time"],
  ai_retrieval: ["metered", "subscription", "one_time"],
  human_per_article: ["one_time"],
  human_full_archive: ["subscription"],
};

const PAYMENT_MODEL_FIELD: Record<PaymentModel, "price" | "price_annual" | "price_metered"> = {
  one_time: "price",
  subscription: "price_annual",
  metered: "price_metered",
};

export function derivePricingGaps(state: PricingState): PricingGap[] {
  const gaps: PricingGap[] = [];
  const lt = state.pricing_rules?.license_types ?? {};
  const defaultHuman = Number(state.default_human_price ?? 0);
  const defaultAi = Number(state.default_ai_price ?? 0);

  for (const lic of Object.keys(VALID_COMBINATIONS) as LicenseType[]) {
    const entry = lt[lic];
    if (!entry) continue;
    if (entry.enabled === false) continue;

    for (const model of VALID_COMBINATIONS[lic]) {
      const v = entry[PAYMENT_MODEL_FIELD[model]];
      if (typeof v === "number" && v > 0) continue;

      // Legacy default fallbacks — must mirror resolver Step 5 in
      // opedd-backend `_shared/pricing.ts`. Only two legacy mappings
      // exist; any drift from the resolver is a banner false-negative.
      if (lic === "human_per_article" && model === "one_time" && defaultHuman > 0) continue;
      if (lic === "ai_retrieval" && model === "subscription" && defaultAi > 0) continue;

      gaps.push({ license_type: lic, payment_model: model });
    }
  }
  return gaps;
}
