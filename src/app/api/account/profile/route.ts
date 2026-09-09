import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveMember } from "@/lib/active-org";
import { isSupportedLanguage } from "@/lib/languages";

/**
 * PATCH /api/account/profile — giriş yapmış kullanıcı KENDİ personel profilini
 * düzenler (ad, telefon, adres, panel dili).
 *
 * GÜVENLİK: Yalnızca `getActiveMember()` ile çözülen kullanıcının kendi
 * `org_members.staff_id` satırına dokunulur (service role kullanılır ama hedef
 * satır çağıranın kimliğinden türetilir, istekten DEĞİL). staff_id yoksa
 * (bağlantısız davet) ilk kayıtta bir staff satırı oluşturulup üyeliğe bağlanır.
 * Rol / izinler bu uçtan ASLA değişmez.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const rawName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const rawAddress = typeof body.address === "string" ? body.address.trim() : "";
  const lang = typeof body.preferred_language === "string" ? body.preferred_language : "";

  if (rawName.length < 2 || rawName.length > 80) {
    return NextResponse.json({ error: "Ad soyad 2-80 karakter olmalı." }, { status: 400 });
  }
  if (rawPhone.length > 30) {
    return NextResponse.json({ error: "Telefon numarası geçersiz." }, { status: 400 });
  }
  if (rawAddress.length > 300) {
    return NextResponse.json({ error: "Adres en fazla 300 karakter olabilir." }, { status: 400 });
  }
  const preferred_language = isSupportedLanguage(lang) ? lang : null;

  const admin = await createAdminClient();

  const fields: Record<string, unknown> = {
    full_name: rawName,
    phone: rawPhone || null,
    address: rawAddress || null,
    preferred_language,
  };

  let staffId = member.staff_id;

  if (staffId) {
    let { error } = await admin
      .from("staff")
      .update(fields)
      .eq("id", staffId)
      .eq("org_id", member.org_id); // savunma amaçlı — id zaten üyelikten geliyor
    // `address` kolonu migration gecikirse (42703) o alan atılıp tekrar denenir.
    if (error && /address/.test(error.message)) {
      delete fields.address;
      ({ error } = await admin.from("staff").update(fields).eq("id", staffId).eq("org_id", member.org_id));
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Bağlantısız üyelik → yeni staff satırı oluştur ve üyeliğe bağla.
    let ins = await admin
      .from("staff")
      .insert({ org_id: member.org_id, role: "Personel", is_active: true, ...fields })
      .select("id")
      .single();
    if (ins.error && /address/.test(ins.error.message)) {
      delete fields.address;
      ins = await admin
        .from("staff")
        .insert({ org_id: member.org_id, role: "Personel", is_active: true, ...fields })
        .select("id")
        .single();
    }
    if (ins.error || !ins.data) {
      return NextResponse.json({ error: ins.error?.message ?? "Profil oluşturulamadı" }, { status: 500 });
    }
    staffId = ins.data.id;
    await admin.from("org_members").update({ staff_id: staffId }).eq("org_id", member.org_id).eq("user_id", user.id);
  }

  // Panel dilini hesaba da yaz (giriş bootstrap'ı ve diğer cihazlar için).
  if (preferred_language) {
    await supabase.auth.updateUser({ data: { locale: preferred_language } });
  }

  const res = NextResponse.json({ success: true, staff_id: staffId, locale: preferred_language });
  if (preferred_language) {
    res.cookies.set("NEXT_LOCALE", preferred_language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return res;
}
