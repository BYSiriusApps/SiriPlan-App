import { createAdminClient } from "@/lib/supabase/server";
import {
  resolveTemplate,
  type WaPurpose,
  type WaParamSource,
  type WaStyle,
} from "@/lib/wa-templates/registry";
import { googleMapsLink } from "@/lib/wa-template";

/**
 * Meta onaylı WhatsApp şablon mesajı gönderiminin tek gerçek uygulaması.
 * Hem /api/whatsapp/send-template route'u (pg_cron'un net.http_post ile
 * çağırdığı HTTP uç noktası) hem de Next.js tarafındaki senkron
 * tetikleyiciler (iptal/revize/manuel gönder) bu fonksiyonu kullanır —
 * mantık iki yerde tekrar edilmesin diye.
 */

export interface SendPurposeTemplateParams {
  toPhone: string;
  orgId: string;
  purpose: WaPurpose;
  vars: Partial<Record<WaParamSource, string>>;
}

export type SendPurposeTemplateResult =
  | { sent: true; template: string }
  | { skipped: true; reason: string }
  | { error: string; detail?: string };

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return "90" + digits.slice(1);
  if (digits.length === 10) return "90" + digits;
  return digits;
}

export async function sendPurposeTemplate({
  toPhone,
  orgId,
  purpose,
  vars,
}: SendPurposeTemplateParams): Promise<SendPurposeTemplateResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return { skipped: true, reason: "whatsapp_not_configured" };
  }

  const supabase = await createAdminClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, wa_template_styles, phone, whatsapp_number, address")
    .eq("id", orgId)
    .single();

  if (!org) {
    return { skipped: true, reason: "org_not_found" };
  }

  const styles = (org.wa_template_styles ?? {}) as Record<string, string>;
  const style = (styles[purpose] ?? "sicak") as WaStyle;
  const def = resolveTemplate(purpose, style);
  if (!def) {
    return { skipped: true, reason: "template_not_found" };
  }

  const templateName = def.metaName;

  const businessPhone =
    vars.business_phone?.trim() ||
    org.phone?.trim() ||
    org.whatsapp_number?.trim() ||
    process.env.PLATFORM_SUPPORT_PHONE ||
    "";

  const locationLink = vars.location_link?.trim() || (org.address?.trim() ? googleMapsLink(org.address.trim()) : "");

  const paramValues: Record<WaParamSource, string> = {
    ...vars,
    business_name: org.name,
    business_phone: businessPhone,
    location_link: locationLink,
  } as Record<WaParamSource, string>;

  const bodyParameters = def.bodyParamOrder.map((source) => ({
    type: "text",
    text: paramValues[source] ?? "",
  }));

  const components: Record<string, unknown>[] = [{ type: "body", parameters: bodyParameters }];

  const to = normalizePhone(toPhone);

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "tr" },
        components,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return { error: "Meta API hatası", detail: errText };
  }

  return { sent: true, template: templateName };
}

/** Randevu tarihinden {{date}}/{{time}} param çiftini üretir (Europe/Istanbul). */
export function formatApptDateTime(appointmentAt: string): { date: string; time: string } {
  const d = new Date(appointmentAt);
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("day")}.${get("month")}.${get("year")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function remainingTimeLabel(hoursBefore: number): string {
  if (hoursBefore >= 24 && hoursBefore % 24 === 0) {
    const days = hoursBefore / 24;
    return `${days} gün`;
  }
  return `${hoursBefore} saat`;
}
