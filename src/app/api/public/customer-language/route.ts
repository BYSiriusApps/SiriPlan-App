import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { limitByIp } from "@/lib/rate-limit";

// Anonim online randevu sayfası (/r/[slug]) için: müşteri telefon numarasını
// girdiğinde, daha önce kaydedilmiş dil tercihini bulup sayfayı o dilde açmak
// üzere kullanılır. Gizlilik: sadece preferred_language döner, başka hiçbir
// müşteri verisi bu uçtan sızmaz.
export async function GET(req: NextRequest) {
  // Bu uç bir "müşteri var mı?" sorgusuna dönüştürülebilir: bir bot telefon
  // numaralarını tek tek deneyerek belirli bir salonun müşteri listesini
  // çıkarabilir. Yanıt zaten tek bir dil kodundan ibaret; buradaki tavan
  // sayımı (enumeration) pratik olmaktan çıkarır. Gerçek bir ziyaretçi bu ucu
  // form doldururken bir-iki kez çağırır.
  const limit = limitByIp(req, "customer-language", 20, 10 * 60 * 1000);
  if (!limit.ok) {
    // Sayım denemesine bilgi sızdırmamak için hata değil, "bilinmiyor" dönülür.
    return NextResponse.json({ preferred_language: null });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const phone = searchParams.get("phone");

  if (!slug || !phone || phone.length < 10) {
    return NextResponse.json({ preferred_language: null });
  }

  const supabase = await createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!org) return NextResponse.json({ preferred_language: null });

  const { data: customer } = await supabase
    .from("customers")
    .select("preferred_language")
    .eq("org_id", org.id)
    .eq("phone", phone)
    .single();

  return NextResponse.json({ preferred_language: customer?.preferred_language ?? null });
}
