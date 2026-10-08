import { createAdminClient } from "@/lib/supabase/server";

/**
 * SMS kontörü (tek seferlik paket, Stripe ile satılır). Tablo/fonksiyonlar
 * supabase/migrations/20261010_sms_credits.sql'de; yalnızca service role
 * erişir — bu yüzden tüm çağrılar admin client ile yapılır.
 *
 * AÇIK GEÇ: altyapı henüz kurulmamışsa ya da geçici bir DB hatası varsa
 * "kontör yok" gibi davranılır; kendi sağlayıcısını bağlamış kiracıların SMS
 * akışı bu modülden etkilenmez (bkz. sendSms).
 */

/** Tek paketteki SMS adedi. */
export const SMS_PACK_CREDITS = 1000;

/** Bakiye varsa 1 kontör düşer (atomik). */
export async function consumeSmsCredit(orgId: string): Promise<boolean> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("consume_sms_credit", { p_org: orgId });
    if (error) {
      console.error(`[sms-credits] consume hata — org=${orgId}:`, error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error(`[sms-credits] consume istisna — org=${orgId}:`, e);
    return false;
  }
}

/** Gönderim başarısız olduysa düşen kontörü geri verir. */
export async function releaseSmsCredit(orgId: string): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { error } = await admin.rpc("release_sms_credit", { p_org: orgId });
    if (error) console.error(`[sms-credits] release hata — org=${orgId}:`, error.message);
  } catch (e) {
    console.error(`[sms-credits] release istisna — org=${orgId}:`, e);
  }
}

/** Kalan kontör (panel göstergesi için). Okunamazsa 0. */
export async function getSmsCredits(orgId: string): Promise<number> {
  try {
    const admin = await createAdminClient();
    const { data } = await admin.from("org_sms_credits").select("balance").eq("org_id", orgId).maybeSingle();
    return (data as { balance?: number } | null)?.balance ?? 0;
  } catch {
    return 0;
  }
}
