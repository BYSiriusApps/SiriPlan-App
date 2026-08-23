import Stripe from "stripe";

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

export const PLANS = {
  starter: {
    name: "Starter",
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || "",
    price_monthly: 29,
    price_annual: 24,
    max_staff: 8,
    max_appointments_monthly: 999999,
    features: {
      feature_ai: false,
      feature_campaigns: false,
      feature_gamification: false,
      feature_api: false,
      feature_whitelabel: false,
      feature_website: false,
    },
  },
  pro: {
    name: "Pro",
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
    price_monthly: 39,
    price_annual: 32,
    max_staff: 999,
    max_appointments_monthly: 999999,
    features: {
      feature_ai: false,
      feature_campaigns: true,
      feature_gamification: true,
      feature_api: false,
      feature_whitelabel: false,
      feature_website: true,
    },
  },
  business: {
    name: "Business",
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || "",
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || "",
    price_monthly: 99,
    price_annual: 81,
    max_staff: 999,
    max_appointments_monthly: 999999,
    features: {
      feature_ai: true,
      feature_campaigns: true,
      feature_gamification: true,
      feature_api: true,
      feature_whitelabel: false,
      feature_website: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
