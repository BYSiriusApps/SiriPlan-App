import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { googleMapsLink } from "@/lib/wa-template";

// Müşteriye giden WhatsApp mesajlarında (bkz. wa-templates/send.ts) uzun ve
// çirkin bir Google Maps arama linki yerine kısa "siriplan.com/k/<slug>"
// gösterilsin diye eklendi — WhatsApp mesaj gövdesi HTML/markdown link
// desteklemediği için metni "Konum Bilgisi" gibi özel bir yazıyla
// değiştiremiyoruz (yalnızca Meta onaylı buton bileşenleriyle mümkün, bkz.
// wa-templates/registry.ts'teki hasUrlButton notları), ama linki kısaltıp
// görünümünü sadeleştirebiliyoruz. Herkese açıktır (oturum yok), bu yüzden
// diğer /r/[slug] gibi service role ile okunur (anon kilidi, bkz.
// 20260817_public_data_lockdown.sql).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createAdminClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("slug, address, location_url")
    .eq("slug", slug)
    .maybeSingle();

  const destination =
    org?.location_url?.trim() || (org?.address?.trim() ? googleMapsLink(org.address.trim()) : "");

  if (!destination) {
    return NextResponse.redirect(new URL(`/r/${slug}`, _req.url));
  }
  return NextResponse.redirect(destination);
}
