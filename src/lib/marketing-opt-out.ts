import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Pazarlama iletisi RET (opt-out) akışı — 6563 sayılı Kanun m.9 / İYS uyumu.
 *
 * Ticari elektronik ileti (kampanya, doğum günü) alan müşteri, mesajın
 * altındaki talimata göre "RET" (veya eşdeğeri) yazdığında bir daha
 * pazarlama iletisi almamalıdır. Bu modül hem gelen mesajın bir ret talebi
 * olup olmadığını tanır hem de reddi kalıcılaştırır:
 *   - customers.marketing_consent = false  (kampanya/doğum günü sorguları bunu okur)
 *   - customer_consents'e given=false denetim kaydı (append-only)
 *
 * İşlemsel bildirimler (randevu onay/hatırlatma/iptal) bu akıştan
 * ETKİLENMEZ — onlar zaten Yönetmelik m.6 kapsamında onaydan muaftır.
 */

/** Ret olarak kabul edilen tam-eşleşme anahtar kelimeler (büyük/küçük harf ve
 * baştaki/sondaki boşluk yok sayılır). Randevu iptali için "iptal" bilerek
 * DIŞARIDA bırakıldı — o akış cancel_token linkiyle yürür, karışmasın. */
const OPT_OUT_KEYWORDS = new Set([
  "ret",
  "stop",
  "dur",
  "cikis",
  "çıkış",
  "cıkıs",
  "abonelikten cik",
  "abonelikten çık",
  "iptal et",
  "istemiyorum",
  "unsubscribe",
]);

export function isMarketingOptOut(text: string | null | undefined): boolean {
  if (!text) return false;
  const norm = text
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[.!,;:]+$/, "")
    .replace(/\s+/g, " ");
  if (OPT_OUT_KEYWORDS.has(norm)) return true;
  // "RET" tek başına bir kelime olarak geçiyorsa (ör. "ret istiyorum")
  return /^(ret|stop|dur)\b/.test(norm) && norm.length <= 20;
}

type OptOutSource = "whatsapp_reply" | "sms_reply" | "email_reply" | "staff_panel";

/**
 * Bir telefonun tüm org kayıtları için pazarlama onayını geri çeker.
 * customer_id verilmezse org + phone ile eşleşen müşteri(ler) bulunur.
 * Idempotent — zaten reddi işlenmiş müşteride sessizce no-op gibi davranır
 * (yeni bir denetim kaydı yine de eklenir, çünkü ret tekrar teyit edilmiştir).
 */
export async function recordMarketingOptOut(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    phone: string;
    source: OptOutSource;
    customerId?: string | null;
    messageSnapshot?: string;
  }
): Promise<{ ok: boolean; affected: number }> {
  const { orgId, phone, source } = params;
  if (!orgId || !phone) return { ok: false, affected: 0 };

  let customerIds: string[] = params.customerId ? [params.customerId] : [];

  if (customerIds.length === 0) {
    const { data: matches } = await supabase
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .eq("phone", phone);
    customerIds = (matches ?? []).map((m: { id: string }) => m.id);
  }

  const nowIso = new Date().toISOString();

  await supabase
    .from("customers")
    .update({ marketing_consent: false, marketing_consent_at: null })
    .eq("org_id", orgId)
    .eq("phone", phone);

  const rows = (customerIds.length > 0 ? customerIds : [null]).map((cid) => ({
    org_id: orgId,
    customer_id: cid,
    phone,
    consent_type: "marketing",
    given: false,
    given_at: nowIso,
    source_channel: source,
    consent_text_snapshot: (params.messageSnapshot ?? "").slice(0, 500),
    captured_via: "opt_out_reply",
  }));

  const { error } = await supabase.from("customer_consents").insert(rows);
  if (error) return { ok: false, affected: 0 };

  return { ok: true, affected: customerIds.length };
}

/** Ticari iletinin (kampanya / doğum günü) altına eklenecek zorunlu ret satırı. */
export function optOutFooter(channel: "whatsapp" | "sms" | "email", locale?: string | null): string {
  const l = (locale ?? "tr").slice(0, 2);
  if (channel === "sms") {
    // SMS'te karakter maliyeti önemli — kısa tutulur. Sağlayıcı (NetGSM vb.)
    // İYS entegrasyonu üzerinden "RET" yanıtını ayrıca yakalar.
    return l === "en" ? "\nReply STOP to opt out" : "\nÇıkış: RET yazın";
  }
  const map: Record<string, string> = {
    tr: '\n\nBu tanıtım mesajlarını almak istemiyorsanız "RET" yazıp gönderin.',
    en: '\n\nIf you no longer wish to receive these promotional messages, reply "STOP".',
    ru: '\n\nЕсли вы больше не хотите получать рекламные сообщения, ответьте «СТОП».',
    ar: '\n\nإذا لم تعد ترغب في تلقّي هذه الرسائل الترويجية، اكتب «إيقاف».',
  };
  return map[l] ?? map.tr;
}
