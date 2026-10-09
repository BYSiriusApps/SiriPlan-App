// Web Push gönderimi (VAPID). Yalnızca sunucuda, service_role ile çalışır.
//
// İLKELER:
//  - Hiçbir zaman fırlatmaz: push sorunu randevu/bildirim akışını ASLA bozmaz.
//  - VAPID anahtarları yoksa ya da tablo henüz yoksa sessizce hiçbir şey yapmaz.
//  - Alıcılar org_members üyeliğinden çözülür (org_id sunucuda doğrulanmış
//    akıştan gelir): yalnızca o işletmenin SAHİBİ (+ varsa atanan personelin
//    kullanıcısı) bildirim alır — başka kiracıya asla gitmez.
//  - Gönderim süresi sınırlıdır (timeout) ki yavaş bir push servisi isteği tutmasın.
import { createAdminClient } from "@/lib/supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  /** Tıklanınca açılacak panel yolu — yalnızca "/" ile başlayan göreli yol. */
  url?: string;
  /** Aynı etiketli bildirimler birbirinin yerine geçer (yığılmayı önler). */
  tag?: string;
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let configured = false;

async function getWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return null;
  // Dinamik import: push kullanılmayan istekler paketi yüklemez.
  const mod = await import("web-push");
  const webpush = mod.default ?? mod;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@bysirius.com", pub, priv);
    configured = true;
  }
  return webpush;
}

/** Göreli, aynı-origin yol dışındaki her şeyi reddeder (açık yönlendirme önlemi). */
function safeUrl(url?: string): string {
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return url;
  return "/dashboard";
}

/**
 * İşletmenin sahip(ler)ine ve (verildiyse) atanan personele web push gönderir.
 * `assignedStaffId`: org_members.staff_id ile eşleşen personel kaydı.
 */
export async function sendPushToOrg(
  orgId: string,
  payload: PushPayload,
  assignedStaffId?: string | null
): Promise<void> {
  try {
    const webpush = await getWebPush();
    if (!webpush) return;

    const supabase = await createAdminClient();

    let q = supabase.from("org_members").select("user_id").eq("org_id", orgId);
    // staff_id filtre dizgesine girdiği için biçimi UUID olarak doğrulanır.
    q = assignedStaffId && UUID_RE.test(assignedStaffId)
      ? q.or(`role.eq.owner,staff_id.eq.${assignedStaffId}`)
      : q.eq("role", "owner");
    const { data: members } = await q;
    const userIds = Array.from(new Set((members ?? []).map((m: { user_id: string }) => m.user_id)));
    if (userIds.length === 0) return;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (!subs || subs.length === 0) return;

    const body = JSON.stringify({
      title: payload.title.slice(0, 120),
      body: payload.body.slice(0, 300),
      url: safeUrl(payload.url),
      tag: payload.tag,
    });

    const dead: string[] = [];
    await Promise.allSettled(
      (subs as SubRow[]).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 * 12, timeout: 5000 }
          );
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.endpoint);
        }
      })
    );

    if (dead.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", dead);
    }
  } catch {
    // Push hatası ana akışı engellememeli
  }
}
