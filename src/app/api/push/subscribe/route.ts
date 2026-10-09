import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getSessionUser } from "@/lib/supabase/server";

/**
 * POST /api/push/subscribe — giriş yapmış kullanıcı BU cihazı push'a kaydeder.
 * DELETE — aynı cihazın kaydını siler (yalnızca kendi kaydı).
 *
 * GÜVENLİK: user_id istekten değil oturumdan gelir. Tabloya yalnızca service_role
 * erişir; endpoint başka bir kullanıcıya aitse üzerine yazılmaz-silinmez
 * (aynı cihazda hesap değişince kayıt yeni kullanıcıya devredilir: bu, tarayıcı
 * aboneliğinin cihaza ait olması nedeniyle doğru davranıştır, ama devir yalnızca
 * oturum açmış çağıranın kendisine yapılır).
 */
const MAX_FIELD = 1024;

function isPushEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > MAX_FIELD) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (
    !isPushEndpoint(endpoint) ||
    typeof p256dh !== "string" || p256dh.length === 0 || p256dh.length > MAX_FIELD ||
    typeof auth !== "string" || auth.length === 0 || auth.length > MAX_FIELD
  ) {
    return NextResponse.json({ error: "Geçersiz abonelik." }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      endpoint,
      user_id: user.id,
      p256dh,
      auth,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ error: "Kaydedilemedi." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = body?.endpoint;
  if (!isPushEndpoint(endpoint)) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const admin = await createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
