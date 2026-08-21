import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizePermissions } from "@/lib/permissions";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";

// token 48 karakterlik hex üretiliyor (aynı desen: accept/route.ts)
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

/**
 * POST /api/staff/invite/register — hesabı olmayan davetli personel için
 * "hesap oluştur + davete katıl" tek adımı.
 *
 * NEDEN VAR: /auth/giris sayfasındaki genel "Ücretsiz deneyin" linki
 * /auth/kayit'a gider — o sayfa YENİ bir işletme kurar (salon adı, vergi no
 * vb.). Davetli bir personelin hesabı yoksa oraya düşmesi yanlış işletme
 * oluşturmasına yol açar. Bu uç, davet bağlamından hiç çıkmadan (bkz.
 * /auth/davet) doğru organizasyona `staff`/`manager` rolüyle bağlı bir hesap
 * açar — accept/route.ts'teki org_members oluşturma mantığının aynısı,
 * farkı yalnızca önce bir Supabase Auth kullanıcısı yaratması.
 */
export async function POST(req: NextRequest) {
  const ipLimit = limitByIp(req, "staff-invite-register", 10, 60 * 60 * 1000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit) as unknown as NextResponse;

  const body = await req.json().catch(() => ({}));
  const { token, full_name, password } = body as { token?: unknown; full_name?: unknown; password?: unknown };

  if (typeof token !== "string" || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Geçersiz davet bağlantısı" }, { status: 400 });
  }
  if (typeof full_name !== "string" || full_name.trim().length < 2) {
    return NextResponse.json({ error: "Ad soyad gerekli" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı" }, { status: 400 });
  }

  const admin = await createAdminClient();

  const { data: invite, error: fetchErr } = await admin
    .from("staff_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (fetchErr || !invite) {
    return NextResponse.json({ error: "Davet geçersiz veya süresi dolmuş" }, { status: 404 });
  }

  if (!invite.email) {
    // Telefonla gönderilmiş davetlerde e-posta yok — bu akış e-posta/şifre
    // gerektirir, bu durumda mevcut giriş akışı kullanılmalı.
    return NextResponse.json(
      { error: "Bu davette e-posta bilgisi yok. Zaten hesabınız varsa giriş yaparak devam edin." },
      { status: 400 }
    );
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  });

  if (createErr) {
    const msg = /already.*registered/i.test(createErr.message)
      ? "Bu e-posta ile zaten bir hesabınız var. Lütfen giriş yaparak devam edin."
      : createErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = created.user.id;

  // Rol/izinler burada da daraltılır — accept/route.ts'teki gerekçenin aynısı:
  // davet satırı service role ile okunur (RLS yok), oluşturulurken yapılan
  // doğrulamaya körü körüne güvenilmez.
  const inviteRole = invite.role === "manager" ? "manager" : "staff";
  const { error: memberErr } = await admin.from("org_members").insert({
    org_id: invite.org_id,
    user_id: userId,
    role: inviteRole,
    staff_id: invite.staff_id ?? null,
    permissions_json: sanitizePermissions(invite.permissions_json),
  });

  if (memberErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  await admin
    .from("staff_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Oturumu kur — /api/auth/login'deki aynı cookie-aware client deseni.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (signInErr) {
    // Hesap ve üyelik oluşturuldu ama oturum otomatik açılamadı — kullanıcı
    // normal giriş ekranından devam edebilir, veri kaybı yok.
    return NextResponse.json({ success: true, requiresLogin: true });
  }

  return NextResponse.json({ success: true, org_id: invite.org_id });
}
