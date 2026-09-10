import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getActiveMember } from "@/lib/active-org";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { limitByIp, tooManyRequests } from "@/lib/rate-limit";
import { sniffImageType } from "@/lib/image-verify";

// sharp yerel bir C++ modülüdür — Edge runtime'da çalışmaz.
export const runtime = "nodejs";

/**
 * Panel görsel yüklemelerinin TEK giriş kapısı (logo, kapak, hizmet/kategori foto).
 *
 * NEDEN BU UÇ VAR: Eskiden tarayıcı görseli doğrudan Supabase Storage'a
 * yüklüyordu; tek denetim istemcideki `file.type` idi (uydurulabilir) ve dosya
 * hiçbir yerde yeniden kodlanmıyordu — gömülü script/polyglot/EXIF yükü olduğu
 * gibi saklanıp herkese açık URL'den servis ediliyordu. Artık:
 *   1. içerik magic-byte ile doğrulanır (SVG dâhil raster olmayan her şey reddedilir),
 *   2. görsel sharp ile PİKSEL PİKSEL yeniden üretilir — çıktı yalnızca yeni
 *      raster veridir, orijinaldeki her türlü gömülü yük atılır,
 *   3. yazım `service_role` ile yapılır; bucket'ların `authenticated` INSERT/UPDATE
 *      politikaları kaldırıldığı için tarayıcıdan doğrudan yazım artık mümkün değil.
 *
 * Depolama yolu HER ZAMAN sunucuda, oturumdaki org_id'den kurulur — istemcinin
 * gönderdiği yol asla kullanılmaz (çapraz-kiracı yazım engeli).
 */

type Kind = "logo" | "cover" | "category" | "category-gallery" | "service";

const KIND_CONFIG: Record<Kind, { bucket: string; maxDim: number; needsId: boolean }> = {
  logo: { bucket: "org-logos", maxDim: 1024, needsId: false },
  cover: { bucket: "org-logos", maxDim: 1920, needsId: false },
  category: { bucket: "service-photos", maxDim: 1024, needsId: true },
  "category-gallery": { bucket: "service-photos", maxDim: 1600, needsId: true },
  service: { bucket: "service-photos", maxDim: 1024, needsId: true },
};

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildPath(kind: Kind, orgId: string, id: string | null, photoId: string | null): string {
  switch (kind) {
    case "logo": return `${orgId}/logo.webp`;
    case "cover": return `${orgId}/cover.webp`;
    case "category": return `${orgId}/categories/${id}.webp`;
    case "category-gallery": return `${orgId}/categories/${id}/${photoId}.webp`;
    case "service": return `${orgId}/services/${id}.webp`;
  }
}

export async function POST(req: NextRequest) {
  const rl = limitByIp(req, "uploads", 30, 60_000);
  if (!rl.ok) return tooManyRequests(rl);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const kind = String(form.get("kind") || "") as Kind;
  if (!(kind in KIND_CONFIG)) {
    return NextResponse.json({ error: "Geçersiz yükleme türü" }, { status: 400 });
  }
  const config = KIND_CONFIG[kind];

  const id = form.get("id") ? String(form.get("id")) : null;
  const photoId = form.get("photoId") ? String(form.get("photoId")) : null;

  if (config.needsId && (!id || !UUID_RE.test(id))) {
    return NextResponse.json({ error: "Geçersiz kayıt kimliği" }, { status: 400 });
  }
  if (kind === "category-gallery" && (!photoId || !UUID_RE.test(photoId))) {
    return NextResponse.json({ error: "Geçersiz fotoğraf kimliği" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "Dosya boyutu geçersiz (en fazla 15 MB)." }, { status: 400 });
  }

  const inputBuf = Buffer.from(await file.arrayBuffer());

  // 1) İçerik denetimi: gerçekten raster görsel mi? SVG ve diğer her şey reddedilir.
  if (!sniffImageType(new Uint8Array(inputBuf.subarray(0, 32)))) {
    return NextResponse.json(
      { error: "Geçersiz görsel dosyası. Sadece JPG, PNG veya WebP yükleyin." },
      { status: 400 },
    );
  }

  // 2) sharp ile yeniden kodlama — gömülü yükü atar, metadata'yı düşürür,
  //    EXIF oryantasyonunu piksele işler, boyutu sınırlar.
  let output: Buffer;
  try {
    const pipeline = sharp(inputBuf, {
      limitInputPixels: 40_000_000, // ~40 MP — "decompression bomb" koruması
      failOn: "error",
      animated: false, // animasyonlu GIF/WebP ilk kareye indirilir
    })
      .rotate()
      .resize(config.maxDim, config.maxDim, { fit: "inside", withoutEnlargement: true });

    const meta = await sharp(inputBuf, { limitInputPixels: 40_000_000 }).metadata();
    output = await pipeline
      .webp(meta.hasAlpha ? { quality: 90 } : { quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Görsel işlenemedi. Farklı bir dosya deneyin." }, { status: 400 });
  }

  // 3) Yazım: service_role ile, yol oturumdaki org'a sabitlenmiş.
  const path = buildPath(kind, member.org_id, id, photoId);
  const admin = await createAdminClient();
  const { error: upErr } = await admin.storage
    .from(config.bucket)
    .upload(path, output, { upsert: true, contentType: "image/webp", cacheControl: "3600" });

  if (upErr) {
    return NextResponse.json({ error: "Yükleme başarısız: " + upErr.message }, { status: 502 });
  }

  const { data: pub } = admin.storage.from(config.bucket).getPublicUrl(path);
  return NextResponse.json({ url: `${pub.publicUrl}?t=${Date.now()}` });
}
