import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = lines[0].includes(";") ? ";" : ",";

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").toLowerCase().trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]).map((v) => v.replace(/^"|"$/g, "").trim());
    if (values.every((v) => !v)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }

  return rows;
}

// Detect column meaning from various header names
function resolveField(row: Record<string, string>, ...candidates: string[]): string {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== "") return row[c];
  }
  return "";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) return NextResponse.json({ error: "Dosyada veri bulunamadı" }, { status: 400 });

  const firstRow = rows[0];
  const keys = Object.keys(firstRow);

  // Detect whether this is a services sheet or customers sheet
  const isServices = keys.some((k) =>
    ["hizmet adı", "hizmet", "service", "name", "süre", "duration", "fiyat", "price"].includes(k)
  ) && !keys.some((k) => ["telefon", "phone", "tel"].includes(k));

  let imported = 0;
  let skipped = 0;

  if (isServices) {
    // Import services
    const serviceRows = rows
      .map((row) => ({
        name: resolveField(row, "hizmet adı", "hizmet", "service", "name", "ad"),
        price: parseFloat(resolveField(row, "fiyat (₺)", "fiyat", "price", "ücret", "tutar") || "0"),
        duration_minutes: parseInt(resolveField(row, "süre (dk)", "süre", "duration", "dakika") || "30"),
        category_tag: resolveField(row, "kategori", "category", "category_tag") || "genel",
        description: resolveField(row, "açıklama", "description", "notlar") || null,
      }))
      .filter((s) => s.name);

    for (const svc of serviceRows) {
      // Upsert by name
      const { error } = await supabase.from("services").upsert(
        {
          org_id: member.org_id,
          name: svc.name,
          price: svc.price,
          duration_minutes: svc.duration_minutes || 30,
          category_tag: svc.category_tag || "genel",
          description: svc.description,
          is_active: true,
          contributes_loyalty: true,
        },
        { onConflict: "org_id,name", ignoreDuplicates: false }
      );
      if (!error) imported++;
      else skipped++;
    }
  } else {
    // Import customers
    const customerRows = rows
      .map((row) => ({
        full_name: resolveField(row, "ad soyad", "full_name", "isim", "name", "müşteri adı", "müşteri"),
        phone: resolveField(row, "telefon", "phone", "tel", "gsm", "cep"),
        email: resolveField(row, "e-posta", "email", "mail", "eposta") || null,
        birth_date: resolveField(row, "doğum tarihi", "birth_date", "dogum") || null,
        notes: resolveField(row, "notlar", "not", "notes", "açıklama") || null,
      }))
      .filter((c) => c.full_name && c.phone);

    for (const cust of customerRows) {
      const { error } = await supabase.from("customers").upsert(
        {
          org_id: member.org_id,
          full_name: cust.full_name,
          phone: normalizePhone(cust.phone),
          email: cust.email || null,
          birth_date: cust.birth_date || null,
          notes: cust.notes || null,
          source: "migration",
        },
        { onConflict: "org_id,phone", ignoreDuplicates: true }
      );
      if (!error) imported++;
      else skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, type: isServices ? "services" : "customers" });
}
