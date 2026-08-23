import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_TEMPLATES: Record<string, Array<{ name: string; category: string; unit: string; current_stock: number; min_stock_alert: number; cost_price: number; sale_price: number }>> = {
  kuafor: [
    { name: "Şampuan (Nemlendirici) 1000ml", category: "Saç Bakımı", unit: "şişe", current_stock: 10, min_stock_alert: 3, cost_price: 180, sale_price: 350 },
    { name: "Saç Kremi 1000ml", category: "Saç Bakımı", unit: "şişe", current_stock: 8, min_stock_alert: 2, cost_price: 190, sale_price: 370 },
    { name: "Tüp Saç Boyası (Kestane No:5)", category: "Boya & Kimyasal", unit: "tüp", current_stock: 25, min_stock_alert: 5, cost_price: 75, sale_price: 150 },
    { name: "Oksidan Krem %6 (20 vol) 1000ml", category: "Boya & Kimyasal", unit: "şişe", current_stock: 5, min_stock_alert: 2, cost_price: 120, sale_price: 240 },
    { name: "Saç Açıcı Toz (Opal) 500g", category: "Boya & Kimyasal", unit: "kutu", current_stock: 4, min_stock_alert: 1, cost_price: 320, sale_price: 600 },
    { name: "Fön Sütü & Isı Koruyucu Sprey", category: "Şekillendirici", unit: "adet", current_stock: 12, min_stock_alert: 3, cost_price: 110, sale_price: 220 },
    { name: "Saç Spreyi (Sert Tutuş) 400ml", category: "Şekillendirici", unit: "kutu", current_stock: 15, min_stock_alert: 4, cost_price: 90, sale_price: 180 },
    { name: "Keratin Serum 100ml", category: "Saç Bakımı", unit: "şişe", current_stock: 6, min_stock_alert: 2, cost_price: 250, sale_price: 500 },
  ],
  berber: [
    { name: "Sakal Tıraş Köpüğü / Jeli 500ml", category: "Tıraş Ürünleri", unit: "kutu", current_stock: 12, min_stock_alert: 3, cost_price: 85, sale_price: 170 },
    { name: "Tıraş Sonrası Kolonya (Akdeniz) 400ml", category: "Tıraş Ürünleri", unit: "şişe", current_stock: 10, min_stock_alert: 3, cost_price: 95, sale_price: 190 },
    { name: "Tek Kullanımlık Jilet (100lü Kutu)", category: "Sarf Malzeme", unit: "kutu", current_stock: 5, min_stock_alert: 2, cost_price: 140, sale_price: 280 },
    { name: "Mat Vaks & Saç Şekillendirici 150ml", category: "Şekillendirici", unit: "kutu", current_stock: 18, min_stock_alert: 4, cost_price: 70, sale_price: 140 },
    { name: "Sakal Bakım Yağı 50ml", category: "Sakal Bakımı", unit: "şişe", current_stock: 8, min_stock_alert: 2, cost_price: 120, sale_price: 250 },
    { name: "Cilt Maskesi (Siyah Nokta)", category: "Cilt Bakımı", unit: "tüp", current_stock: 6, min_stock_alert: 2, cost_price: 130, sale_price: 260 },
  ],
  guzellik: [
    { name: "Cilt Temizleme Jeli 500ml", category: "Cilt Bakımı", unit: "şişe", current_stock: 6, min_stock_alert: 2, cost_price: 220, sale_price: 450 },
    { name: "Tonik & Gözenek Sıkılaştırıcı 250ml", category: "Cilt Bakımı", unit: "şişe", current_stock: 5, min_stock_alert: 2, cost_price: 190, sale_price: 380 },
    { name: "Hyalüronik Asit Serum 50ml", category: "Serum & Ampul", unit: "şişe", current_stock: 8, min_stock_alert: 3, cost_price: 350, sale_price: 750 },
    { name: "Kollajen Yüz Maskesi (10lu Kutu)", category: "Maske & Peeling", unit: "kutu", current_stock: 4, min_stock_alert: 1, cost_price: 280, sale_price: 600 },
    { name: "Ağda Kartuşu (Konserve 800g)", category: "Epilasyon & Ağda", unit: "kutu", current_stock: 12, min_stock_alert: 3, cost_price: 150, sale_price: 300 },
    { name: "Kalıcı Oje (Kırmızı No:12)", category: "Nail & Tırnak", unit: "şişe", current_stock: 15, min_stock_alert: 4, cost_price: 95, sale_price: 190 },
  ],
  dis_klinigi: [
    { name: "Kompozit Dolgu Malzemesi (A2)", category: "Dolgu & Tedavi", unit: "tüp", current_stock: 15, min_stock_alert: 3, cost_price: 350, sale_price: 700 },
    { name: "Lokal Anestezi Ampulü (100lü Kutu)", category: "Anestezi & İlaç", unit: "kutu", current_stock: 4, min_stock_alert: 1, cost_price: 450, sale_price: 900 },
    { name: "Steril Muayene Eldiveni (M Beden - 100lü)", category: "Sarf Malzeme", unit: "kutu", current_stock: 10, min_stock_alert: 2, cost_price: 180, sale_price: 360 },
    { name: "Diş Beyazlatma Jel Seti", category: "Estetik & Beyazlatma", unit: "kutu", current_stock: 6, min_stock_alert: 2, cost_price: 600, sale_price: 1500 },
    { name: "Diş Taşı Temizleme Ucu (Ultrasonik)", category: "Cerrahi Ürünler", unit: "adet", current_stock: 8, min_stock_alert: 2, cost_price: 250, sale_price: 500 },
  ],
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();
  const businessType = (body.type || "kuafor") as string;
  const templateItems = DEFAULT_TEMPLATES[businessType] || DEFAULT_TEMPLATES.kuafor;

  const rows = templateItems.map((item) => ({
    org_id: member.org_id,
    ...item,
  }));

  const { data: inserted, error } = await supabase
    .from("inventory_items")
    .insert(rows)
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: inserted || [] }, { status: 201 });
}
