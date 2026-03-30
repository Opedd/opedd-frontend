import { motion } from "framer-motion";
import { Check, X, Zap, Crown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Free",
    icon: Zap,
    price: "$0",
    period: "forever",
    description: "500 articles free — perfect for getting started with content licensing",
    features: [
      { name: "500 articles indexed", included: true },
      { name: "Human licensing & content reuse", included: true },
      { name: "Basic AI protection", included: true },
      { name: "Ownership tracking", included: true },
      { name: "Advanced AI licensing", included: false },
      { name: "Custom widget branding", included: false },
      { name: "Analytics dashboard", included: false },
      { name: "API access", included: false },
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    icon: Crown,
    price: "$49",
    period: "/month",
    description: "Advanced AI licensing with full ownership tracking for serious creators",
    features: [
      { name: "Unlimited articles", included: true },
      { name: "Human licensing & content reuse", included: true },
      { name: "Advanced AI licensing", included: true },
      { name: "Full ownership tracking", included: true },
      { name: "Detailed analytics", included: true },
      { name: "Custom widget branding", included: true },
      { name: "Priority support", included: true },
      { name: "API access", included: false },
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Building2,
    price: "$199",
    period: "/month",
    description: "For media teams and large publications",
    features: [
      { name: "Unlimited articles", included: true },
      { name: "Human licensing & reuse", included: true },
      { name: "Advanced AI licensing", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "Enterprise analytics", included: true },
      { name: "White-label widget", included: true },
      { name: "SLA guarantee", included: true },
      { name: "Full API access", included: true },
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 px-6 bg-navy-deep scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-soft-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-alice-gray max-w-2xl mx-auto">
            Choose the plan that fits your publishing needs. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative rounded-2xl p-8 ${
                tier.popular
                  ? "bg-white/5 border-2 border-[#4A26ED] shadow-[0_0_40px_rgba(74,38,237,0.15)]"
                  : "bg-white/5 border border-white/20"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-oxford text-soft-white text-sm font-semibold px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${
                    tier.popular
                      ? "bg-[#4A26ED]/20 text-[#A78BFA]"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  <tier.icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-soft-white mb-2">
                  {tier.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-soft-white">
                    {tier.price}
                  </span>
                  <span className="text-alice-gray">{tier.period}</span>
                </div>
                <p className="text-sm text-alice-gray">
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-oxford flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-alice-gray/40 flex-shrink-0" />
                    )}
                    <span
                      className={
                        feature.included
                          ? "text-soft-white"
                          : "text-alice-gray/40"
                      }
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.popular ? "default" : "outline"}
                className="w-full"
                size="lg"
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
        >
          <div className="p-6 border-b border-soft-white/10">
            <h3 className="text-2xl font-bold text-soft-white">
              Feature Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-4 font-semibold text-soft-white">
                    Feature
                  </th>
                  <th className="text-center p-4 font-semibold text-soft-white">
                    Free
                  </th>
                  <th className="text-center p-4 font-semibold text-oxford">
                    Pro
                  </th>
                  <th className="text-center p-4 font-semibold text-soft-white">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Articles Indexed", free: "500", pro: "Unlimited", enterprise: "Unlimited" },
                  { feature: "RSS Feeds", free: "1", pro: "10", enterprise: "Unlimited" },
                  { feature: "Human Licensing & Reuse", free: true, pro: true, enterprise: true },
                  { feature: "Basic AI Protection", free: true, pro: true, enterprise: true },
                  { feature: "Advanced AI Licensing", free: false, pro: true, enterprise: true },
                  { feature: "Analytics Dashboard", free: false, pro: "Detailed", enterprise: "Enterprise" },
                  { feature: "Widget Customization", free: false, pro: true, enterprise: true },
                  { feature: "Secure Rights Ledger", free: true, pro: true, enterprise: true },
                  { feature: "API Access", free: false, pro: false, enterprise: "Full" },
                  { feature: "Support", free: "Community", pro: "Priority", enterprise: "Dedicated" },
                ].map((row, index) => (
                  <tr
                    key={row.feature}
                    className={index % 2 === 0 ? "bg-transparent" : "bg-white/5"}
                  >
                    <td className="p-4 text-soft-white font-medium">
                      {row.feature}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <Check className="w-5 h-5 text-oxford mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-alice-gray/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-alice-gray">{row.free}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="w-5 h-5 text-oxford mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-alice-gray/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-soft-white font-medium">{row.pro}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? (
                          <Check className="w-5 h-5 text-oxford mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-alice-gray/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-alice-gray">{row.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
