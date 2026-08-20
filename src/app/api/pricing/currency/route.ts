import { NextRequest, NextResponse } from "next/server";
import { getVisitorPricing } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pricing = getVisitorPricing(req.headers);

  return NextResponse.json({
    currency: pricing.currency,
    plans: pricing.plans,
  });
}
