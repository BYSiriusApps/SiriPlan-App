import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";

// Herkese açık randevu sayfası için GEÇİCİ saat kilidi (soft hold): bir ziyaretçi
// saate tıkladığında o saat birkaç dakika diğer ziyaretçilere "dolu" görünür.
// Kilit yalnızca görsel önlemdir — gerçek çakışma kontrolü /api/appointments'ta
// aynen sürer; tablo yoksa / hata olursa istemci kilitsiz devam eder (ana akış
// hiçbir koşulda bu uca bağımlı değildir).
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const HOLDER_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Kilit ömrü; istemci seçili saatte yaklaşık 90 sn'de bir yeniler. */
const SLOT_HOLD_TTL_MS = 4 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Bir ziyaretçi seçim başına birkaç istek atar; tavan sahte holder_id ile
  // takvimi kilitlemeye çalışan botları keser.
  const limit = limitByIp(req, "slot-hold", 40, 60_000);
  if (!limit.ok) return tooManyRequests(limit) as unknown as NextResponse;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const holderId = typeof body.holder_id === "string" ? body.holder_id : "";
  const action = body.action === "release" ? "release" : "hold";
  if (!slug || !HOLDER_RE.test(holderId)) {
    return NextResponse.json({ error: "Geçersiz parametre" }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: "Salon bulunamadı" }, { status: 404 });

  if (action === "release") {
    await supabase.from("slot_holds").delete().eq("org_id", org.id).eq("holder_id", holderId);
    return NextResponse.json({ ok: true });
  }

  const date = typeof body.date === "string" ? body.date : "";
  const slot = typeof body.slot === "string" ? body.slot : "";
  const staffId = typeof body.staff_id === "string" ? body.staff_id : null;
  if (!DATE_RE.test(date) || !SLOT_RE.test(slot) || (staffId !== null && !UUID_RE.test(staffId))) {
    return NextResponse.json({ error: "Geçersiz parametre" }, { status: 400 });
  }

  // Personel bu organizasyona ait olmalı (başka kiracıya kilit yazılamaz).
  if (staffId) {
    const { data: st } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .eq("org_id", org.id)
      .maybeSingle();
    if (!st) return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const holdKey = staffId ?? `any:${holderId}`;

  // Bu ziyaretçinin önceki (farklı) kilidi serbest kalır: aynı anda tek saat tutar.
  await supabase
    .from("slot_holds")
    .delete()
    .eq("org_id", org.id)
    .eq("holder_id", holderId)
    .or(`hold_date.neq.${date},slot.neq.${slot},hold_key.neq.${holdKey}`);

  // Süresi dolmuş kilitler bu anahtar için temizlenir ki yeni kilit alınabilsin.
  await supabase
    .from("slot_holds")
    .delete()
    .eq("org_id", org.id)
    .eq("hold_date", date)
    .eq("slot", slot)
    .lt("expires_at", nowIso);

  const expiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MS).toISOString();
  const { error } = await supabase.from("slot_holds").insert({
    org_id: org.id,
    staff_id: staffId,
    hold_date: date,
    slot,
    holder_id: holderId,
    hold_key: holdKey,
    expires_at: expiresAt,
  });

  if (!error) return NextResponse.json({ ok: true, held: true });

  // Aynı anahtarda kilit var: benimse süresini uzat, başkasınınsa reddet.
  if (error.code === "23505") {
    const { data: refreshed } = await supabase
      .from("slot_holds")
      .update({ expires_at: expiresAt })
      .eq("org_id", org.id)
      .eq("hold_date", date)
      .eq("slot", slot)
      .eq("hold_key", holdKey)
      .eq("holder_id", holderId)
      .select("id");
    if (refreshed && refreshed.length > 0) return NextResponse.json({ ok: true, held: true });
    return NextResponse.json({ ok: false, held: false, reason: "taken" }, { status: 409 });
  }

  // Tablo yok / geçici hata: kilitsiz devam (istemci hatayı yok sayar).
  return NextResponse.json({ ok: true, held: false, reason: "unavailable" });
}
