import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { hasProTools } from "@/lib/entitlements";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";
import { startOfDay, endOfDay, format as formatDate } from "date-fns";
import { tr } from "date-fns/locale";

// PDF/Gün Sonu raporları müşteri adı/telefon gibi herkese açık randevu
// formundan gelen alanları ham HTML'e gömüyor — bu alanlar escape edilmezse
// raporu açan salon sahibinin oturumunda stored XSS çalışır.
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

// Ortak PDF/print iskeleti — logolu başlık, tutarlı tipografi, SiriPlan altbilgisi.
// origin mutlak URL: hem <a target=_blank> hem window.open("about:blank") yollarında
// logolar çözülsün (img-src 'self' data: https://*.supabase.co CSP'sine uyumlu).
function renderReportShell(opts: {
  origin: string;
  orgName: string;
  salonLogoUrl?: string | null;
  title: string;
  subtitle: string;
  body: string;
}): string {
  const { origin, orgName, salonLogoUrl, title, subtitle, body } = opts;
  const headerLogo = salonLogoUrl
    ? `<img class="logo" src="${escapeHtml(salonLogoUrl)}" alt="${escapeHtml(orgName)}">`
    : `<img class="logo" src="${origin}/brand/logo-full.png" alt="SiriPlan">`;
  const today = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(orgName)} — ${escapeHtml(title)}</title>
<style>
  :root { --rose: #e11d48; --rose-deep: #a10e38; --ink: #241722; --muted: #6d5c67; --line: #ece1db; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         font-size: 12px; color: var(--ink); padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .wrap { max-width: 900px; margin: 0 auto; padding: 28px 26px 60px; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px;
           border-bottom: 2px solid var(--rose); padding-bottom: 14px; margin-bottom: 20px; }
  header .logo { height: 38px; width: auto; object-fit: contain; }
  header .doc { text-align: right; }
  header .doc h1 { font-size: 17px; color: var(--rose-deep); font-weight: 700; }
  header .doc .org { font-size: 12px; color: var(--ink); font-weight: 600; margin-top: 1px; }
  header .doc .sub { font-size: 10.5px; color: var(--muted); margin-top: 2px; text-transform: capitalize; }
  .summary { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; }
  .card { flex: 1; min-width: 108px; border: 1px solid var(--line); border-radius: 10px; padding: 11px 12px; text-align: center; }
  .card .val { font-size: 17px; font-weight: 700; color: var(--rose-deep); }
  .card .lbl { font-size: 9.5px; color: var(--muted); margin-top: 3px; letter-spacing: .02em; text-transform: uppercase; }
  h2 { font-size: 13px; font-weight: 700; margin: 22px 0 8px; color: var(--ink);
       border-bottom: 1px solid var(--line); padding-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead { display: table-header-group; }
  th { background: var(--rose); color: #fff; padding: 6px 9px; text-align: left; font-weight: 600; }
  td { padding: 6px 9px; border-bottom: 1px solid #f3ecef; }
  tr { break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #fdf3f6; }
  .warn { display: flex; gap: 8px; align-items: flex-start; border: 1px solid #f0c674;
          background: #fff8e6; border-radius: 9px; padding: 10px 12px; margin: 4px 0 18px; font-size: 11px; color: #7a5c12; }
  .warn strong { color: #7a5c12; }
  .net { margin-top: 18px; padding: 12px 14px; border-radius: 10px; text-align: right; font-size: 14px; font-weight: 700; }
  .pill { display: inline-block; font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 999px;
          background: #f1e3e9; color: var(--rose-deep); margin-left: 6px; text-transform: uppercase; letter-spacing: .03em; }
  .spark { margin: 10px 0 4px; }
  footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center;
           gap: 6px; padding: 8px; font-size: 9.5px; color: var(--muted); border-top: 1px solid var(--line); background: #fff; }
  footer img { height: 13px; width: auto; }
  @media print { .wrap { padding-top: 10px; } @page { size: A4; margin: 14mm 12mm 18mm; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    ${headerLogo}
    <div class="doc">
      <h1>${escapeHtml(title)}</h1>
      <div class="org">${escapeHtml(orgName)}</div>
      <div class="sub">${escapeHtml(subtitle)}</div>
    </div>
  </header>
  ${body}
</div>
<footer>
  <img src="${origin}/icons/icon-mark.png" alt="SiriPlan"> SiriPlan · siriplan.com — otomatik oluşturuldu · ${today}
</footer>
<script>window.onload = () => window.print();</script>
</body>
</html>`;
}

// Basit inline-SVG sparkline (PDF içi — bağımlılıksız).
function sparklineSvg(values: number[]): string {
  if (values.length < 2) return "";
  const W = 520, H = 60, pad = 4;
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${pad + (i / (values.length - 1)) * (W - pad * 2)},${H - pad - (v / max) * (H - pad * 2)}`)
    .join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json"; // json | csv | excel | pdf
  const gun = searchParams.get("gun"); // yyyy-MM-dd — verilirse gün sonu özeti PDF'i üretilir

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member || !["owner", "manager"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // PDF rapor export Pro+ özelliğidir (fiyatlandırma: Starter "Veri export (CSV)"
  // içerir, PDF içermez). CSV / Excel / JSON her planda açık kalır.
  if (format === "pdf" && !hasProTools(member.organizations)) {
    return NextResponse.json(
      { error: "PDF rapor export yalnızca Pro ve Business planlarında kullanılabilir." },
      { status: 403 }
    );
  }

  const orgId = member.org_id;

  if (format === "pdf" && gun && /^\d{4}-\d{2}-\d{2}$/.test(gun)) {
    await logAudit({
      orgId, userId: user.id, action: "data_export", tableName: "appointments",
      details: { format: "pdf", scope: "gun_sonu", gun, role: member.role }, req,
    });
    return buildGunSonuPdf(supabase, orgId, gun, new URL(req.url).origin);
  }

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
    supabase.from("organizations").select("name, slug, email, phone, address, city, logo_url").eq("id", orgId).single(),
  ]);

  const origin = new URL(req.url).origin;

  const today = new Date().toISOString().slice(0, 10);

  // KVKK denetim izi: bu çağrı işletmenin TÜM müşteri listesini (ad, telefon,
  // e-posta, doğum tarihi, harcama geçmişi) tek dosyada dışarı çıkarır — veri
  // sızıntısı incelemesinde en kritik olay bu. Kim/ne zaman/hangi IP kayda geçer.
  await logAudit({
    orgId, userId: user.id, action: "data_export", tableName: "customers",
    details: {
      format,
      role: member.role,
      customer_count: customers?.length ?? 0,
      appointment_count: appointments?.length ?? 0,
    },
    req,
  });

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
    const orgRow = org as { name?: string; logo_url?: string | null } | null;
    const orgName = orgRow?.name || "Salon";
    const custCount = customers?.length || 0;
    const apptCount = appointments?.length || 0;
    const totalRevenue = (appointments || [])
      .filter((a) => a.status === "tamamlandi")
      .reduce((s, a) => s + Number(a.price), 0);

    const custRows = (customers || []).slice(0, 100).map((c) => `
      <tr>
        <td>${escapeHtml(c.full_name)}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${escapeHtml(c.email) || "-"}</td>
        <td>${Number(c.total_spend).toLocaleString("tr-TR")} ₺</td>
        <td>${c.visit_count}</td>
        <td>${c.score}</td>
      </tr>`).join("");

    const svcRows = (services || []).map((s) => `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.category_tag)}</td>
        <td>${s.duration_minutes} dk</td>
        <td>${Number(s.price).toLocaleString("tr-TR")} ₺</td>
        <td>${s.is_active ? "Aktif" : "Pasif"}</td>
      </tr>`).join("");

    const body = `
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
</table>`;

    const html = renderReportShell({
      origin,
      orgName,
      salonLogoUrl: orgRow?.logo_url,
      title: "Genel Rapor",
      subtitle: new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }),
      body,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}

const STATUS_TR: Record<string, string> = {
  talep: "Bekliyor",
  onaylandi: "Onaylı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  gelmedi: "Gelmedi",
};

async function buildGunSonuPdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  gun: string,
  origin: string,
) {
  const reportDay = new Date(gun + "T12:00:00");
  const dayStart = startOfDay(reportDay).toISOString();
  const dayEnd = endOfDay(reportDay).toISOString();
  const weekAgoStart = startOfDay(new Date(reportDay.getTime() - 6 * 86400000)).toISOString();

  const [{ data: org }, { data: dayAppts }, { data: dayExpenses }, { count: dayNewCust }, { data: weekAppts }] = await Promise.all([
    supabase.from("organizations").select("name, logo_url").eq("id", orgId).single(),
    supabase
      .from("appointments")
      .select("id, customer_name, appointment_at, status, price, tip, staff:staff!appointments_staff_id_fkey(full_name), service:services(name)")
      .eq("org_id", orgId)
      .gte("appointment_at", dayStart)
      .lte("appointment_at", dayEnd)
      .order("appointment_at"),
    supabase
      .from("expenses")
      .select("type, amount, category, description, note")
      .eq("org_id", orgId)
      .eq("date", gun),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    // Son 7 gün — üstteki ciro sparkline'ı için
    supabase
      .from("appointments")
      .select("appointment_at, price, tip, status")
      .eq("org_id", orgId)
      .eq("status", "tamamlandi")
      .gte("appointment_at", weekAgoStart)
      .lte("appointment_at", dayEnd),
  ]);

  type DayAppt = {
    id: string; customer_name: string; appointment_at: string; status: string;
    price: number; tip: number | null;
    staff?: { full_name: string } | null; service?: { name: string } | null;
  };
  const dAppts = (dayAppts ?? []) as unknown as DayAppt[];
  const dDone = dAppts.filter((a) => a.status === "tamamlandi");
  const dPending = dAppts.filter((a) => a.status === "talep" || a.status === "onaylandi");
  const dayRevenue = dDone.reduce((s, a) => s + Number(a.price) + Number(a.tip ?? 0), 0);
  const dayGider = (dayExpenses ?? []).filter((e) => e.type === "gider").reduce((s, e) => s + Number(e.amount), 0);
  const dayManuelGelir = (dayExpenses ?? []).filter((e) => e.type === "gelir").reduce((s, e) => s + Number(e.amount), 0);
  const dayCiro = dayRevenue + dayManuelGelir;
  const dayNet = dayCiro - dayGider;
  const orgRow = org as { name?: string; logo_url?: string | null } | null;
  const orgName = orgRow?.name || "Salon";

  // Son 7 gün — gün bazlı ciro toplamı (sparkline verisi)
  const weekByDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(reportDay.getTime() - (6 - i) * 86400000);
    weekByDay[formatDate(d, "yyyy-MM-dd")] = 0;
  }
  ((weekAppts ?? []) as { appointment_at: string; price: number; tip: number | null }[]).forEach((a) => {
    const key = a.appointment_at.slice(0, 10);
    if (key in weekByDay) weekByDay[key] += Number(a.price) + Number(a.tip ?? 0);
  });

  const apptRows = dAppts.map((a) => `
    <tr>
      <td>${formatDate(new Date(a.appointment_at), "HH:mm")}</td>
      <td>${escapeHtml(a.customer_name)}</td>
      <td>${escapeHtml(a.service?.name ?? "-")}${a.staff?.full_name ? ` · ${escapeHtml(a.staff.full_name)}` : ""}</td>
      <td>${STATUS_TR[a.status] ?? escapeHtml(a.status)}</td>
      <td style="text-align:right">${Number(a.price).toLocaleString("tr-TR")} ₺</td>
    </tr>`).join("");

  const expenseRows = (dayExpenses ?? []).map((e) => {
    const auto = (e.note ?? "").startsWith("Otomatik");
    return `
    <tr>
      <td>${e.type === "gelir" ? "Gelir" : "Gider"}${auto ? ` <span class="pill">Otomatik · Randevu</span>` : ""}</td>
      <td>${escapeHtml(e.category ?? "-")}</td>
      <td>${escapeHtml(e.description ?? "-")}${!auto ? ` <span class="pill" style="background:#eef1f4;color:#4b5563">Elle giriş</span>` : ""}</td>
      <td style="text-align:right">${e.type === "gelir" ? "+" : "-"}${Number(e.amount).toLocaleString("tr-TR")} ₺</td>
    </tr>`;
  }).join("");

  const pendingWarning = dPending.length > 0 ? `
<div class="warn">
  <span>⚠️</span>
  <span>
    <strong>${dPending.length} randevu hâlâ bekliyor</strong> (onaylı/beklemede) — gün cirosuna ve Gelir-Gider ekranına
    yansıması için gerçekleşenleri panelden <strong>“Tamamlandı”</strong> olarak işaretleyin.
  </span>
</div>` : "";

  const body = `
${pendingWarning}
<div class="summary">
  <div class="card"><div class="val">${dAppts.length}</div><div class="lbl">Randevu</div></div>
  <div class="card"><div class="val">${dDone.length}</div><div class="lbl">Tamamlanan</div></div>
  <div class="card"><div class="val">${dayCiro.toLocaleString("tr-TR")} ₺</div><div class="lbl">Gün Cirosu</div></div>
  <div class="card"><div class="val">${dayGider.toLocaleString("tr-TR")} ₺</div><div class="lbl">Gün Gideri</div></div>
  <div class="card"><div class="val">${dayNewCust ?? 0}</div><div class="lbl">Yeni Müşteri</div></div>
</div>

<h2>Son 7 Gün — Ciro Seyri</h2>
${sparklineSvg(Object.values(weekByDay))}

<h2>Gün İçi Randevu Dökümü</h2>
${dAppts.length === 0
  ? `<p style="color:#6d5c67;padding:8px 0">Bu günde randevu kaydı yok</p>`
  : `<table>
  <thead><tr><th>Saat</th><th>Müşteri</th><th>Hizmet · Personel</th><th>Durum</th><th style="text-align:right">Tutar</th></tr></thead>
  <tbody>${apptRows}</tbody>
</table>`}

${(dayExpenses ?? []).length > 0 ? `
<h2>Gün İçi Gelir &amp; Gider Kayıtları</h2>
<table>
  <thead><tr><th>Tür</th><th>Kategori</th><th>Açıklama</th><th style="text-align:right">Tutar</th></tr></thead>
  <tbody>${expenseRows}</tbody>
</table>` : ""}

<div class="net" style="background:${dayNet >= 0 ? "#ecfdf5" : "#fff7ed"};color:${dayNet >= 0 ? "#059669" : "#c2410c"}">
  Net Gün Sonu: ${dayNet >= 0 ? "+" : ""}${dayNet.toLocaleString("tr-TR")} ₺
</div>`;

  const html = renderReportShell({
    origin,
    orgName,
    salonLogoUrl: orgRow?.logo_url,
    title: "Gün Sonu Özeti",
    subtitle: formatDate(reportDay, "d MMMM yyyy, EEEE", { locale: tr }),
    body,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
