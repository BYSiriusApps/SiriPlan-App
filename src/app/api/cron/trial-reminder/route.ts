import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendTrialEndingEmail } from "@/lib/email/send";
import { sendPlatformSms } from "@/lib/sms";
import { isCronAuthorized } from "@/lib/webhook-signature";

export const runtime = "nodejs";

// Deneme süresi dolan işletmelere 2 gün kala ve bittiği gün otomatik
// e-posta + SMS hatırlatması. Mobil uygulama (App Store/Play Store) panel
// içinde ödeme/fiyat linki göstermediği için, yükseltme yolu bu kanal —
// mesajlar siriplan.com'a yönlendirir (bkz. src/lib/email/send.ts
// sendTrialEndingEmail, upgradeLink).

type OrgRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locale: string | null;
  plan: string;
  trial_ends_at: string | null;
};

// 2 gün kala giden tanıtım SMS'i. Türkçe karakter kullanılmaz (GSM-7: tek parça
// ~160 karakter; Türkçe karakter Unicode'a düşüp 70'lik parçalara böler, ücret artar).
// SUNUM_PATH: herkese açık sunum (public/sunum.html; proxy dosya uzantılı yolları atlar)
// (bkz. docs/GELISTIRME-LISTESI.md §11).
const SUNUM_PATH = "/sunum.html";
const SUPPORT_WA_PHONE = "0535 503 26 34";

// SMS'te "https://" gereksiz karakter; telefonlar alan adını yine link yapar.
function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function buildTwoDaySms(orgName: string, appUrl: string): string {
  return (
    `SiriPlan: "${orgName}" ucretsiz denemeniz 2 gun sonra bitiyor. ` +
    `Ozellikler ve sunum: ${shortUrl(appUrl)}${SUNUM_PATH} ` +
    `Plan secip odeme/abonelik baslatmak icin: ${shortUrl(appUrl)}/auth/plan-sec (verileriniz silinmez). ` +
    `Destek WhatsApp: ${SUPPORT_WA_PHONE}`
  );
}

// Platform SMS hattı yalnızca Türkiye cep numaralarına gönderir
// (sendPlatformSms yerel 10 haneli 5XXXXXXXXX formatı bekler).
function isTurkishMobile(phone: string): boolean {
  const d = phone.replace(/\D/g, "");
  const local =
    d.startsWith("90") && d.length === 12 ? d.slice(2) : d.startsWith("0") && d.length === 11 ? d.slice(1) : d;
  return /^5\d{9}$/.test(local);
}

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Pencereler bilerek geniş tutulur (cron günde bir kez çalışır) —
  // gerçek tekilleştirme trial_reminder_*_sent_at damgasıyla yapılır.
  const twoDayWindowStart = new Date(now.getTime() + 1 * dayMs).toISOString();
  const twoDayWindowEnd = new Date(now.getTime() + 3 * dayMs).toISOString();
  const expiredWindowStart = new Date(now.getTime() - 3 * dayMs).toISOString();

  const { data: twoDayOrgs } = await supabase
    .from("organizations")
    .select("id, name, email, phone, locale, plan, trial_ends_at")
    .eq("plan", "trial")
    .is("trial_reminder_2d_sent_at", null)
    .gte("trial_ends_at", twoDayWindowStart)
    .lte("trial_ends_at", twoDayWindowEnd)
    .limit(500);

  const { data: expiredOrgs } = await supabase
    .from("organizations")
    .select("id, name, email, phone, locale, plan, trial_ends_at")
    .eq("plan", "trial")
    .is("trial_reminder_0d_sent_at", null)
    .gte("trial_ends_at", expiredWindowStart)
    .lte("trial_ends_at", now.toISOString())
    .limit(500);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";
  let sent2d = 0;
  let sent0d = 0;

  for (const org of (twoDayOrgs || []) as OrgRow[]) {
    if (org.email) {
      try {
        await sendTrialEndingEmail({ to: org.email, orgName: org.name, daysLeft: 2 });
      } catch {}
    }
    if (org.phone && (org.locale ?? "tr") === "tr" && isTurkishMobile(org.phone)) {
      try {
        await sendPlatformSms(org.phone, buildTwoDaySms(org.name, appUrl));
      } catch {}
    }
    await supabase.from("organizations").update({ trial_reminder_2d_sent_at: now.toISOString() }).eq("id", org.id);
    sent2d++;
  }

  for (const org of (expiredOrgs || []) as OrgRow[]) {
    if (org.email) {
      try {
        await sendTrialEndingEmail({ to: org.email, orgName: org.name, daysLeft: 0 });
      } catch {}
    }
    if (org.phone) {
      try {
        await sendPlatformSms(
          org.phone,
          `SiriPlan: "${org.name}" icin ucretsiz deneme sureniz sona erdi. Odeme/abonelik baslatmak icin: ${shortUrl(appUrl)}/auth/plan-sec`
        );
      } catch {}
    }
    await supabase.from("organizations").update({ trial_reminder_0d_sent_at: now.toISOString() }).eq("id", org.id);
    sent0d++;
  }

  return NextResponse.json({ sent_2d: sent2d, sent_0d: sent0d });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
