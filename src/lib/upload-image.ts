/**
 * Panel görsellerini `/api/uploads` üzerinden yükler.
 *
 * Eskiden her çağrı noktası `supabase.storage.from(bucket).upload(...)` ile
 * doğrudan Storage'a yazıyordu. Artık sunucu görseli doğrular + sharp ile
 * yeniden kodlar + service_role ile yazar (bkz. src/app/api/uploads/route.ts).
 * Dönen `url` cache-bust son ekini zaten içerir.
 */

export type UploadKind = "logo" | "cover" | "category" | "category-gallery" | "service";

export async function uploadImage(opts: {
  kind: UploadKind;
  /** category / category-gallery / service için zorunlu (ilgili kaydın UUID'si). */
  id?: string;
  /** yalnız category-gallery: galerideki fotoğrafın UUID'si. */
  photoId?: string;
  file: File | Blob;
}): Promise<string> {
  const fd = new FormData();
  fd.append("kind", opts.kind);
  if (opts.id) fd.append("id", opts.id);
  if (opts.photoId) fd.append("photoId", opts.photoId);
  fd.append("file", opts.file);

  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const body = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;

  if (!res.ok || !body?.url) {
    throw new Error(body?.error || "Görsel yüklenemedi.");
  }
  return body.url;
}
