/**
 * Panel görsellerini `/api/uploads` üzerinden yükler.
 *
 * Eskiden her çağrı noktası `supabase.storage.from(bucket).upload(...)` ile
 * doğrudan Storage'a yazıyordu. Artık sunucu görseli doğrular + sharp ile
 * yeniden kodlar + service_role ile yazar (bkz. src/app/api/uploads/route.ts).
 * Dönen `url` cache-bust son ekini zaten içerir.
 */

export type UploadKind = "logo" | "cover" | "category" | "category-gallery" | "service" | "customer-photo";

export async function uploadImage(opts: {
  kind: UploadKind;
  /** category / category-gallery / service / customer-photo için zorunlu (ilgili kaydın UUID'si). */
  id?: string;
  /** category-gallery: galerideki fotoğrafın UUID'si. customer-photo: önce/sonra çiftinin UUID'si. */
  photoId?: string;
  /** yalnız customer-photo: "before" | "after". */
  slot?: "before" | "after";
  file: File | Blob;
}): Promise<string> {
  const fd = new FormData();
  fd.append("kind", opts.kind);
  if (opts.id) fd.append("id", opts.id);
  if (opts.photoId) fd.append("photoId", opts.photoId);
  if (opts.slot) fd.append("slot", opts.slot);
  fd.append("file", opts.file);

  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const body = (await res.json().catch(() => null)) as { url?: string; path?: string; error?: string } | null;

  // customer-photo gibi private bucket'larda `path` döner (herkese açık URL yok).
  const result = body?.url ?? body?.path;
  if (!res.ok || !result) {
    throw new Error(body?.error || "Görsel yüklenemedi.");
  }
  return result;
}
