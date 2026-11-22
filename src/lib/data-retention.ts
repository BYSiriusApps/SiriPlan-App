import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Veri saklama modu (Mini Lite = geçici/ephemeral).
 *
 * Plan bilgisi ASLA istemciden gelmez: org.plan her zaman sunucuda DB'den okunur.
 * DB tarafındaki karşılığı `plan_data_retention` tablosu + `org_is_ephemeral()`
 * (20261018_mini_lite_ephemeral.sql); iki liste birbiriyle uyumlu tutulur.
 *
 * Persistent planların (trial, mini, starter, pro, business) davranışı DEĞİŞMEZ:
 * buradaki her yardımcı onlar için no-op / null döner ve ek DB sorgusu atmaz.
 */
export const EPHEMERAL_PLANS = ["lite"] as const;

/** Persistent → ephemeral geçişte dışa aktarma süresi (gün). */
export const RETENTION_GRACE_DAYS = 30;

export interface RetentionOrg {
  plan?: string | null;
}

/** Bu plan randevu bitince verisini siler mi? (plan = sunucuda DB'den okunmuş değer) */
export function isEphemeralPlan(plan: string | null | undefined): boolean {
  return !!plan && (EPHEMERAL_PLANS as readonly string[]).includes(plan);
}

export function isEphemeralOrg(org: RetentionOrg | null | undefined): boolean {
  return isEphemeralPlan(org?.plan);
}

/** 0532***45 biçiminde maskeli telefon; mesaj logları/analitik için. */
export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-2)}`;
}

/** Geçiş (persistent → ephemeral) sonrası dışa aktarma süresi hâlâ açık mı? */
export function isInRetentionGrace(until: string | null | undefined, now: Date = new Date()): boolean {
  return !!until && new Date(until).getTime() > now.getTime();
}

export const EPHEMERAL_FORBIDDEN_MESSAGE =
  "Mini Lite planında veriler randevu tamamlanınca otomatik silinir; bu özellik bu planda kapalıdır. Müşteri kaydı, geçmiş, rapor ve dışa aktarma için Mini veya üstü bir plana geçin.";

/**
 * Mini Lite (ephemeral) kiracılarda geçmiş/müşteri/rapor/export gibi KALICI VERİ
 * uçlarını sunucu tarafında kapatır (UI gizlemek yetmez).
 *
 * - Persistent plan → null, ek sorgu YOK (mevcut davranış aynen).
 * - Ephemeral plan → 403. Tek istisna: persistent → ephemeral geçişte 30 günlük
 *   dışa aktarma süresi açıksa `read: true` çağrıları (GET/export) geçer.
 *
 * Kolon (data_retention_until) migration uygulanmadan yoksa hata "süre yok" sayılır
 * (kapalı kalır — gevşetme yönünde değil).
 */
export async function ephemeralBlocked(
  member: { organizations?: RetentionOrg | null; org_id?: string } | null | undefined,
  opts: { read?: boolean } = {},
): Promise<boolean> {
  const org = member?.organizations;
  if (!isEphemeralOrg(org)) return false;

  if (opts.read && member?.org_id) {
    try {
      const admin = await createAdminClient();
      const { data } = await admin
        .from("organizations")
        .select("data_retention_until")
        .eq("id", member.org_id)
        .maybeSingle();
      if (isInRetentionGrace((data as { data_retention_until?: string | null } | null)?.data_retention_until)) {
        return false;
      }
    } catch {
      /* süre okunamadı → kapalı kal */
    }
  }
  return true;
}

export async function ephemeralForbidden(
  member: { organizations?: RetentionOrg | null; org_id?: string } | null | undefined,
  opts: { read?: boolean } = {},
): Promise<NextResponse | null> {
  if (!(await ephemeralBlocked(member, opts))) return null;
  return NextResponse.json({ error: EPHEMERAL_FORBIDDEN_MESSAGE, code: "EPHEMERAL_PLAN" }, { status: 403 });
}

/**
 * Kapanmış (tamamlandi/iptal) ephemeral randevuyu KALICI sil. Çağıran, müşteri
 * bildirimini (iptal/onay şablonu) TETİKLEDİKTEN SONRA çağırır: şablon parametreleri
 * çağrı anında kopyalandığı için satırın silinmesi mesajı etkilemez.
 *
 * org plan'ı burada DB'den yeniden okunur (çağıranın taşıdığı değere güvenilmez);
 * persistent kiracıda hiçbir şey silinmez. PII loglanmaz.
 *
 * @returns silindi mi
 */
export async function hardDeleteIfEphemeral(orgId: string, appointmentId: string): Promise<boolean> {
  try {
    const admin = await createAdminClient();
    const { data: org } = await admin.from("organizations").select("plan").eq("id", orgId).maybeSingle();
    if (!isEphemeralOrg(org as RetentionOrg | null)) return false;

    // Çocuk satırlar: loyalty_redeems.appointment_id NO ACTION → önce bağı kopar.
    await admin.from("loyalty_redeems").update({ appointment_id: null }).eq("appointment_id", appointmentId);
    const { error } = await admin
      .from("appointments")
      .delete()
      .eq("id", appointmentId)
      .eq("org_id", orgId);
    if (error) {
      console.error("[data-retention] ephemeral silme başarısız:", error.code ?? "unknown");
      return false;
    }
    return true;
  } catch {
    console.error("[data-retention] ephemeral silme hatası");
    return false;
  }
}
