import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json"; // json | csv

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();
  if (!member || !["owner", "manager"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = member.org_id;

  // Fetch all data in parallel
  const [
    { data: customers },
    { data: appointments },
    { data: staff },
    { data: services },
    { data: campaigns },
    { data: org },
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("org_id", orgId),
    supabase.from("appointments").select("*, staff(full_name), service:services(name)").eq("org_id", orgId).order("appointment_at", { ascending: false }),
    supabase.from("staff").select("*").eq("org_id", orgId),
    supabase.from("services").select("*").eq("org_id", orgId),
    supabase.from("campaigns").select("*").eq("org_id", orgId),
    supabase.from("organizations").select("name, slug, email, phone, address, city").eq("id", orgId).single(),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    organization: org,
    customers: customers || [],
    appointments: appointments || [],
    staff: staff || [],
    services: services || [],
    campaigns: campaigns || [],
  };

  if (format === "json") {
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="siriplan-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  if (format === "csv") {
    // Export customers as CSV
    const headers = ["Ad Soyad", "Telefon", "E-posta", "Doğum Tarihi", "Toplam Harcama", "Ziyaret Sayısı", "Son Ziyaret", "Skor", "Kayıt Tarihi"];
    const rows = (customers || []).map((c) => [
      c.full_name, c.phone, c.email || "", c.birth_date || "",
      c.total_spend, c.visit_count, c.last_visit_at || "", c.score, c.created_at,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="musteriler-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}
