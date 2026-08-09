import { createAdminClient } from "@/lib/supabase/server";

/**
 * Sağlayıcıdan bağımsız SMS gönderim katmanı. wa-templates/send.ts'deki
 * sendPurposeTemplate() ile aynı model: org'un seçtiği sağlayıcı ve
 * kimlik bilgilerine göre doğru HTTP çağrısına dispatch eder, çağıran
 * kod (API route, ileride cron) sağlayıcı detayını bilmek zorunda kalmaz.
 */

export type SmsProvider = "netgsm" | "vatansms" | "iletimerkezi";

export interface SendSmsParams {
  toPhone: string;
  orgId: string;
  message: string;
}

export type SendSmsResult =
  | { sent: true }
  | { skipped: true; reason: string }
  | { error: string; detail?: string };

/** SMS sağlayıcıları Türkiye'de 10 haneli yerel format bekler (başında 0/+90 olmadan). */
function toLocalPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

async function sendViaNetgsm(
  { username, password, senderId }: { username: string; password: string; senderId: string | null },
  toPhone: string,
  message: string
): Promise<SendSmsResult> {
  const params = new URLSearchParams({
    usercode: username,
    password,
    gsmno: toPhone,
    message,
    msgheader: senderId || username,
  });
  const res = await fetch(`https://api.netgsm.com.tr/sms/send/get?${params.toString()}`);
  const text = (await res.text()).trim();
  if (text.startsWith("00") || text.startsWith("01")) return { sent: true };
  return { error: "Netgsm API hatası", detail: text };
}

async function sendViaVatansms(
  { username, password, senderId }: { username: string; password: string; senderId: string | null },
  toPhone: string,
  message: string
): Promise<SendSmsResult> {
  const res = await fetch("https://api.vatansms.net/api/v1/1toN", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_id: username,
      api_key: password,
      sender: senderId || "",
      message_type: "normal",
      message,
      message_content_type: "bilgi",
      phones: [toPhone],
    }),
  });
  const body = await res.json().catch(() => null);
  if (res.ok && body?.status !== "error") return { sent: true };
  return { error: "VatanSMS API hatası", detail: JSON.stringify(body) };
}

async function sendViaIletimerkezi(
  { username, password, senderId }: { username: string; password: string; senderId: string | null },
  toPhone: string,
  message: string
): Promise<SendSmsResult> {
  const params = new URLSearchParams({
    kullanici: username,
    sifre: password,
    gonderen: senderId || "",
    mesaj: message,
    numaralar: toPhone,
  });
  const res = await fetch(`https://api.iletimerkezi.com/v1/send-sms/get?${params.toString()}`);
  const text = (await res.text()).trim();
  if (res.ok && !/hata|error/i.test(text)) return { sent: true };
  return { error: "İletimerkezi API hatası", detail: text };
}

export async function sendSms({ toPhone, orgId, message }: SendSmsParams): Promise<SendSmsResult> {
  const supabase = await createAdminClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("sms_notifications_enabled, sms_provider, sms_username, sms_password, sms_sender_id")
    .eq("id", orgId)
    .single();

  if (!org) return { skipped: true, reason: "org_not_found" };
  if (!org.sms_notifications_enabled) return { skipped: true, reason: "sms_disabled" };
  if (!org.sms_provider || !org.sms_username || !org.sms_password) {
    return { skipped: true, reason: "sms_not_configured" };
  }

  const creds = { username: org.sms_username, password: org.sms_password, senderId: org.sms_sender_id };
  const to = toLocalPhone(toPhone);

  switch (org.sms_provider as SmsProvider) {
    case "netgsm":
      return sendViaNetgsm(creds, to, message);
    case "vatansms":
      return sendViaVatansms(creds, to, message);
    case "iletimerkezi":
      return sendViaIletimerkezi(creds, to, message);
    default:
      return { skipped: true, reason: "unknown_provider" };
  }
}

/**
 * Platform seviyesinde (Siriplan'ın kendi hesabından) SMS gönderimi —
 * org'ların kendi müşteri SMS ayarlarından bağımsız. Deneme süresi bitimi
 * gibi platform bildirimleri için kullanılır; org'un sms_* alanları yerine
 * PLATFORM_SMS_* env değişkenlerini kullanır.
 */
export async function sendPlatformSms(toPhone: string, message: string): Promise<SendSmsResult> {
  const provider = process.env.PLATFORM_SMS_PROVIDER as SmsProvider | undefined;
  const username = process.env.PLATFORM_SMS_USERNAME;
  const password = process.env.PLATFORM_SMS_PASSWORD;
  const senderId = process.env.PLATFORM_SMS_SENDER_ID || null;

  if (!provider || !username || !password) {
    return { skipped: true, reason: "platform_sms_not_configured" };
  }

  const creds = { username, password, senderId };
  const to = toLocalPhone(toPhone);

  switch (provider) {
    case "netgsm":
      return sendViaNetgsm(creds, to, message);
    case "vatansms":
      return sendViaVatansms(creds, to, message);
    case "iletimerkezi":
      return sendViaIletimerkezi(creds, to, message);
    default:
      return { skipped: true, reason: "unknown_provider" };
  }
}
