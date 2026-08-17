import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { sanitizeFilterValue } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  // İsteğe bağlı limit (kampanya müşteri seçici tüm listeyi çeker); üst sınır 500
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50") || 50, 1), 500);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("org_id", member.org_id)
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (search) {
    // `.or()` argümanı PostgREST'in kendi filtre dilidir; virgül/parantez gibi
    // karakterler yeni filtre koşulu açar. Ham kullanıcı girdisi buraya
    // gömüldüğünde sorgu mantığı değiştirilebiliyordu (PostgREST filtre
    // enjeksiyonu). Kiracı izolasyonu ayrıca `.eq("org_id", …)` ve RLS ile
    // korunuyor, yine de girdi burada temizleniyor.
    const safeSearch = sanitizeFilterValue(search);
    if (safeSearch) {
      query = query.or(`full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: data, total: count });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { full_name, phone, email, birth_date, gender, notes, tags, preferred_language } = body;

  if (!full_name || !phone) {
    return NextResponse.json({ error: "Ad ve telefon zorunlu" }, { status: 400 });
  }
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 10) {
    return NextResponse.json({ error: "Geçersiz telefon numarası" }, { status: 400 });
  }
  if (preferred_language && !["tr", "en", "ru", "ar"].includes(preferred_language)) {
    return NextResponse.json({ error: "Geçersiz dil" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: dup } = await supabase
    .from("customers")
    .select("id, full_name")
    .eq("org_id", member.org_id)
    .eq("phone", normalizedPhone)
    .maybeSingle();
  if (dup) {
    return NextResponse.json(
      { error: `Bu telefon numarası zaten kayıtlı (${dup.full_name})` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      org_id: member.org_id,
      full_name,
      phone: normalizedPhone,
      email: email || null,
      birth_date: birth_date || null,
      gender: gender || null,
      notes: notes || null,
      tags: tags || [],
      preferred_language: preferred_language || null,
      source: "manual",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu telefon numarası zaten kayıtlı" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data }, { status: 201 });
}
