import { NextRequest, NextResponse } from "next/server";
import { isMobileApp } from "@/lib/mobile-app";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { isSupportedLanguage } from "@/lib/languages";

// Migration 009/014/20260808 uygulanmamış veritabanlarında PostgREST bu
// kolonları tanımaz; personel kaydı bunlar olmadan yine de oluşturulabilsin.
function isMissingLanguageColumn(message: string): boolean {
  return message.includes("preferred_language");
}
function isMissingBaseSalaryColumn(message: string): boolean {
  return message.includes("base_salary");
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data, error } = await supabase
    .from("staff")
    .select("*, staff_services(service_id, services(id, name))")
    .eq("org_id", member.org_id)
    .eq("is_active", true)
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // `currentStaffId`: isteği yapan kullanıcının kendi personel kaydı (varsa) —
  // randevu formu personel belirtilmediğinde bunu otomatik seçer.
  return NextResponse.json({ staff: data, currentStaffId: member.staff_id ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { full_name, role, phone, email, commission_rate, base_salary, start_time, end_time, working_days, preferred_language } = body;

  if (!full_name) return NextResponse.json({ error: "İsim zorunlu" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role !== "owner") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  // Server-side quota: check max_staff limit
  const { data: org } = await supabase
    .from("organizations")
    .select("max_staff")
    .eq("id", member.org_id)
    .single();

  if (org) {
    const { count } = await supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("org_id", member.org_id)
      .eq("is_active", true);

    if (count !== null && count >= (org.max_staff ?? 3)) {
      return NextResponse.json(
        {
          // Native uygulamada (App Store/Play Store) plan yükseltme çağrısı
          // gösterilmez — hata metni de bir yönlendirme yüzeyidir.
          error: (await isMobileApp())
            ? `Plan limitine ulaşıldı (maks. ${org.max_staff ?? 3} personel).`
            : `Plan limitine ulaşıldı (maks. ${org.max_staff ?? 3} personel). Planı yükseltin.`,
        },
        { status: 403 }
      );
    }
  }

  // Normalize commission_rate to 0-1 decimal range stored in NUMERIC(4,3).
  // Frontend sends already-divided value (0.4 for 40%), but guard against
  // legacy/cached clients that send the raw percentage (40).
  const rawRate = parseFloat(commission_rate) || 0;
  const normalizedRate = rawRate > 1 ? rawRate / 100 : rawRate;
  const clampedRate = Math.min(1, Math.max(0, normalizedRate));

  const insertRow: Record<string, unknown> = {
    org_id: member.org_id,
    full_name,
    role: role || "Uzman",
    phone: phone || null,
    email: email || null,
    commission_rate: clampedRate,
    base_salary: Math.max(0, parseFloat(base_salary) || 0),
    start_time: start_time || "09:00",
    end_time: end_time || "18:00",
    working_days: working_days || [1, 2, 3, 4, 5],
    preferred_language: isSupportedLanguage(preferred_language) ? preferred_language : null,
    is_active: true,
  };

  let { data, error } = await supabase.from("staff").insert(insertRow).select().single();

  if (error && isMissingLanguageColumn(error.message)) {
    delete insertRow.preferred_language;
    ({ data, error } = await supabase.from("staff").insert(insertRow).select().single());
  }
  if (error && isMissingBaseSalaryColumn(error.message)) {
    delete insertRow.base_salary;
    ({ data, error } = await supabase.from("staff").insert(insertRow).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}
