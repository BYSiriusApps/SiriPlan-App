// Web Push gönderimi (VAPID) + iOS uygulaması için FCM. Yalnızca sunucuda, service_role ile çalışır.
//
// İLKELER:
//  - Hiçbir zaman fırlatmaz: push sorunu randevu/bildirim akışını ASLA bozmaz.
//  - VAPID anahtarları yoksa ya da tablo henüz yoksa sessizce hiçbir şey yapmaz.
//  - Alıcılar org_members üyeliğinden çözülür (org_id sunucuda doğrulanmış
//    akıştan gelir) — başka kiracıya asla gitmez:
//      * sahip ve yönetici: işletmenin TÜM bildirimleri (randevu, talep, stok…)
//      * personel: yalnızca KENDİNE atanan randevu/talep bildirimleri
//  - Gönderim süresi sınırlıdır (timeout) ki yavaş bir push servisi isteği tutmasın.
import { createAdminClient } from "@/lib/supabase/server";
import { isFcmConfigured, sendFcm, type FcmMessage } from "@/lib/fcm";

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
 * İşletmenin sahip ve yöneticilerine, ayrıca (verildiyse) atanan personele web push gönderir.
 * `assignedStaffId`: org_members.staff_id ile eşleşen personel kaydı; verilmezse
 * (ör. stok uyarısı) personele hiçbir şey gitmez.
 */
export async function sendPushToOrg(
  orgId: string,
  payload: PushPayload,
  assignedStaffId?: string | null
): Promise<void> {
  try {
    const webpush = await getWebPush();
    const fcmOn = isFcmConfigured();
    if (!webpush && !fcmOn) {
      console.warn("[web-push] VAPID/FCM yapılandırılmamış, push gönderilmedi");
      return;
    }

    const supabase = await createAdminClient();

    const { data: members } = await supabase
      .from("org_members")
      .select("user_id, role, staff_id")
      .eq("org_id", orgId);
    const userIds = Array.from(
      new Set(
        (members ?? [])
          .filter(
            (m: { user_id: string; role: string; staff_id: string | null }) =>
              m.role === "owner" ||
              m.role === "manager" ||
              (!!assignedStaffId && m.staff_id === assignedStaffId)
          )
          .map((m: { user_id: string }) => m.user_id)
      )
    );
    if (userIds.length === 0) return;

    const title = payload.title.slice(0, 120);
    const text = payload.body.slice(0, 300);
    const url = safeUrl(payload.url);

    // Web Push (Android/Chrome) ve FCM (iOS uygulaması) birbirinden bağımsız çalışır;
    // biri başarısız olursa ya da yapılandırılmamışsa diğerini etkilemez.
    await Promise.allSettled([
      webpush ? sendWebPush(supabase, webpush, userIds, JSON.stringify({ title, body: text, url, tag: payload.tag })) : null,
      fcmOn ? sendIosPush(supabase, userIds, { title, body: text, url, tag: payload.tag }) : null,
    ]);
  } catch {
    // Push hatası ana akışı engellememeli
  }
}

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

async function sendWebPush(
  supabase: AdminClient,
  webpush: NonNullable<Awaited<ReturnType<typeof getWebPush>>>,
  userIds: string[],
  body: string
): Promise<void> {
  try {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (!subs || subs.length === 0) return;

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
          else console.error("[web-push] gönderim hatası", code ?? "", (err as Error)?.message ?? "");
        }
      })
    );

    if (dead.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", dead);
    }
  } catch {
    /* Web Push hatası FCM'i ya da ana akışı engellememeli */
  }
}

/** iOS uygulaması cihazlarına FCM ile gönderir (aynı alıcı kümesi: userIds). */
async function sendIosPush(supabase: AdminClient, userIds: string[], msg: FcmMessage): Promise<void> {
  try {
    const { data: rows } = await supabase.from("push_device_tokens").select("token").in("user_id", userIds);
    const tokens = (rows ?? []).map((r: { token: string }) => r.token);
    if (tokens.length === 0) return;
    const dead = await sendFcm(tokens, msg);
    if (dead.length > 0) {
      await supabase.from("push_device_tokens").delete().in("token", dead);
    }
  } catch {
    /* iOS push hatası Web Push'u ya da ana akışı engellememeli */
  }
}
