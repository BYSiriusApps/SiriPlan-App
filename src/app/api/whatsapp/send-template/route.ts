import { NextRequest, NextResponse } from "next/server";
import { sendPurposeTemplate } from "@/lib/wa-templates/send";
import type { WaParamSource, WaPurpose } from "@/lib/wa-templates/registry";

export const runtime = "nodejs";

/**
 * Supabase pg_cron + pg_net tarafından her 5 dakikada bir tetiklenir
 * (bkz. migration 017) — hatırlatma gönderimi için. Ayrıca panel
 * tarafındaki iptal/revize/manuel-gönder tetikleyicileri de aynı
 * HTTP sözleşmesini kullanabilir. Gerçek gönderim mantığı
 * src/lib/wa-templates/send.ts'de (sendPurposeTemplate) tek yerde yaşar.
 */

interface SendTemplateBody {
  to_phone: string;
  org_id: string;
  purpose: WaPurpose;
  vars: Partial<Record<WaParamSource, string>>;
}

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<SendTemplateBody>;
  const { to_phone, org_id, purpose, vars } = body;

  if (!to_phone || !org_id || !purpose || !vars) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
  }

  const result = await sendPurposeTemplate({ toPhone: to_phone, orgId: org_id, purpose, vars });

  if ("error" in result) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
