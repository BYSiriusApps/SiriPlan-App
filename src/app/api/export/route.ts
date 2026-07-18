import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json"; // json | csv | excel | pdf

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member || !["owner", "manager"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = member.org_id;

  const [
    { data: customers },
    { data: appointments },
    { data: staff },
    { data: services },
    { data: campaigns },
    { data: org },
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("org_id", orgId),
    supabase.from("appointments").select("*, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)").eq("org_id", orgId).order("appointment_at", { ascending: false }),
    supabase.from("staff").select("*").eq("org_id", orgId),
    supabase.from("services").select("*").eq("org_id", orgId),
    supabase.from("campaigns").select("*").eq("org_id", orgId),
    supabase.from("organizations").select("name, slug, email, phone, address, city").eq("id", orgId).single(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const exportData = {
      exported_at: new Date().toISOString(),
      organization: org,
      customers: customers || [],
      appointments: appointments || [],
      staff: staff || [],
      services: services || [],
      campaigns: campaigns || [],
    };
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="siriplan-export-${today}.json"`,
      },
    });
  }

  if (format === "csv") {
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
        "Content-Disposition": `attachment; filename="musteriler-${today}.csv"`,
      },
    });
  }

  if (format === "excel") {
    const wb = XLSX.utils.book_new();

    // Customers sheet
    const custHeaders = ["Ad Soyad", "Telefon", "E-posta", "Doğum Tarihi", "Cinsiyet", "Toplam Harcama (₺)", "Ziyaret Sayısı", "Son Ziyaret", "Skor", "Sadakat Puanı", "Kayıt Tarihi"];
    const custRows = (customers || []).map((c) => [
      c.full_name, c.phone, c.email || "", c.birth_date || "", c.gender || "",
      Number(c.total_spend), c.visit_count,
      c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString("tr-TR") : "",
      c.score, c.loyalty_punches,
      new Date(c.created_at).toLocaleDateString("tr-TR"),
    ]);
    const wsCust = XLSX.utils.aoa_to_sheet([custHeaders, ...custRows]);
    wsCust["!cols"] = custHeaders.map((h) => ({ wch: Math.max(h.length + 2, 15) }));
    XLSX.utils.book_append_sheet(wb, wsCust, "Müşteriler");

    // Services sheet
    const svcHeaders = ["Hizmet Adı", "Kategori", "Süre (dk)", "Fiyat (₺)", "Durum"];
    const svcRows = (services || []).map((s) => [
      s.name, s.category_tag, s.duration_minutes, Number(s.price),
      s.is_active ? "Aktif" : "Pasif",
    ]);
    const wsSvc = XLSX.utils.aoa_to_sheet([svcHeaders, ...svcRows]);
    wsSvc["!cols"] = svcHeaders.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsSvc, "Hizmetler");

    // Staff sheet
    const staffHeaders = ["Ad Soyad", "Unvan", "Telefon", "E-posta", "Komisyon (%)", "Durum"];
    const staffRows = (staff || []).map((s) => [
      s.full_name, s.role, s.phone || "", s.email || "",
      Math.round((Number(s.commission_rate) || 0) * 100),
      s.is_active ? "Aktif" : "Pasif",
    ]);
    const wsStaff = XLSX.utils.aoa_to_sheet([staffHeaders, ...staffRows]);
    wsStaff["!cols"] = staffHeaders.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsStaff, "Personel");

    // Appointments sheet
    const apptHeaders = ["Tarih", "Müşteri", "Telefon", "Personel", "Hizmet", "Tutar (₺)", "Durum", "Kaynak"];
    const apptRows = (appointments || []).map((a) => [
      new Date(a.appointment_at).toLocaleString("tr-TR"),
      a.customer_name, a.customer_phone,
      (a.staff as { full_name?: string })?.full_name || "",
      (a.service as { name?: string })?.name || "",
      Number(a.price),
      a.status, a.source,
    ]);
    const wsAppt = XLSX.utils.aoa_to_sheet([apptHeaders, ...apptRows]);
    wsAppt["!cols"] = apptHeaders.map((h) => ({ wch: Math.max(h.length + 2, 16) }));
    XLSX.utils.book_append_sheet(wb, wsAppt, "Randevular");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="siriplan-export-${today}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const orgName = (org as { name?: string })?.name || "Salon";
    const custCount = customers?.length || 0;
    const apptCount = appointments?.length || 0;
    const totalRevenue = (appointments || [])
      .filter((a) => a.status === "tamamlandi")
      .reduce((s, a) => s + Number(a.price), 0);

    const custRows = (customers || []).slice(0, 100).map((c) => `
      <tr>
        <td>${c.full_name}</td>
        <td>${c.phone}</td>
        <td>${c.email || "-"}</td>
        <td>${Number(c.total_spend).toLocaleString("tr-TR")} ₺</td>
        <td>${c.visit_count}</td>
        <td>${c.score}</td>
      </tr>`).join("");

    const svcRows = (services || []).map((s) => `
      <tr>
        <td>${s.name}</td>
        <td>${s.category_tag}</td>
        <td>${s.duration_minutes} dk</td>
        <td>${Number(s.price).toLocaleString("tr-TR")} ₺</td>
        <td>${s.is_active ? "Aktif" : "Pasif"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${orgName} — Siriplan Raporu</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 24px; }
  h1 { font-size: 22px; color: #ec4899; margin-bottom: 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .card .val { font-size: 20px; font-weight: bold; color: #ec4899; }
  .card .lbl { font-size: 10px; color: #666; margin-top: 2px; }
  h2 { font-size: 14px; font-weight: bold; margin: 20px 0 8px; color: #111; border-bottom: 2px solid #ec4899; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #ec4899; color: white; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) td { background: #fdf2f8; }
  .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #999; }
  @media print {
    body { padding: 16px; }
    @page { margin: 1cm; }
  }
</style>
</head>
<body>
<h1>${orgName}</h1>
<p class="meta">Siriplan tarafından oluşturuldu — ${new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}</p>

<div class="summary">
  <div class="card"><div class="val">${custCount}</div><div class="lbl">Toplam Müşteri</div></div>
  <div class="card"><div class="val">${apptCount}</div><div class="lbl">Toplam Randevu</div></div>
  <div class="card"><div class="val">${totalRevenue.toLocaleString("tr-TR")} ₺</div><div class="lbl">Toplam Gelir</div></div>
  <div class="card"><div class="val">${services?.length || 0}</div><div class="lbl">Hizmet Sayısı</div></div>
</div>

<h2>Müşteriler${customers && customers.length > 100 ? " (ilk 100)" : ""}</h2>
<table>
  <thead><tr><th>Ad Soyad</th><th>Telefon</th><th>E-posta</th><th>Harcama</th><th>Ziyaret</th><th>Skor</th></tr></thead>
  <tbody>${custRows}</tbody>
</table>

<h2>Hizmetler</h2>
<table>
  <thead><tr><th>Hizmet Adı</th><th>Kategori</th><th>Süre</th><th>Fiyat</th><th>Durum</th></tr></thead>
  <tbody>${svcRows}</tbody>
</table>

<div class="footer">Bu rapor Siriplan (siriplan.com) tarafından otomatik oluşturulmuştur.</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}
