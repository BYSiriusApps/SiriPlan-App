import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getSessionUser } from "@/lib/supabase/server";

/**
 * POST /api/push/device — giriş yapmış kullanıcı BU iOS cihazını (FCM token) push'a kaydeder.
 * DELETE — aynı token'ın kaydını siler (yalnızca kendi kaydı).
 *
 * GÜVENLİK: /api/push/subscribe ile aynı model. user_id istekten değil oturumdan gelir;
 * tabloya yalnızca service_role erişir. Aynı cihazda hesap değişince kayıt yeni
 * oturumdaki kullanıcıya devredilir (token cihaza aittir). Alıcı kapsamı (hangi
 * işletme/rol) gönderim anında org_members'tan çözülür — burada org tutulmaz.
 */
const MAX_TOKEN = 4096;
// FCM kayıt token'ları "<kimlik>:<gövde>" biçimindedir (URL-safe karakterler).
const TOKEN_RE = /^[A-Za-z0-9_-]{10,200}:[A-Za-z0-9_-]{20,}$/;

function isFcmToken(v: unknown): v is string {
  return typeof v === "string" && v.length <= MAX_TOKEN && TOKEN_RE.test(v);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!isFcmToken(body?.token)) return NextResponse.json({ error: "Geçersiz token." }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from("push_device_tokens").upsert(
    {
      token: body.token,
      user_id: user.id,
      platform: "ios",
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );
  if (error) return NextResponse.json({ error: "Kaydedilemedi." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!isFcmToken(body?.token)) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const admin = await createAdminClient();
  await admin.from("push_device_tokens").delete().eq("token", body.token).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
