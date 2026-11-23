import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/webhook-signature";

export const runtime = "nodejs";

/**
 * Mini Lite (geçici veri modu) yedek silme turu.
 *
 *  1) purge_ephemeral_appointments: tamamlandi/iptal VEYA bitişi 24 saatten eski randevular.
 *     Yalnızca ephemeral planlar; gelecek/devam eden randevuya dokunmaz (hatırlatma cron'u etkilenmez).
 *  2) purge_expired_retention_history: persistent → ephemeral geçişten 30 gün sonra eski geçmiş.
 *
 * Birincil silme anlık (API kancaları) ve — varsa — pg_cron (saatlik) çalışır; bu uç
 * Vercel günlük cron'uyla aynı fonksiyonları çağıran GÜVENCEDİR. İdempotent; yalnızca service
 * role. Yanıtta yalnızca sayılar döner — kişisel veri loglanmaz/dönmez.
 * Migration henüz uygulanmadıysa 200 + skipped döner (cron'u kırmaz).
 */
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  const { data: appts, error: apptErr } = await supabase.rpc("purge_ephemeral_appointments", { p_org: null });
  if (apptErr) {
    console.error("[purge-ephemeral] randevu silme atlandı:", apptErr.code ?? "unknown");
    return NextResponse.json({ skipped: true, reason: "rpc_unavailable" });
  }

  const { data: history, error: histErr } = await supabase.rpc("purge_expired_retention_history", { p_org: null });
  if (histErr) {
    console.error("[purge-ephemeral] geçmiş silme atlandı:", histErr.code ?? "unknown");
  }

  return NextResponse.json({
    appointments_deleted: Number(appts ?? 0),
    history_rows_deleted: histErr ? null : Number(history ?? 0),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
