"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Camera, Loader2, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadImage } from "@/lib/upload-image";
import { hasVisualResultFeature } from "@/lib/customer-fields/visual-sectors";

interface Photo {
  id: string;
  note: string | null;
  taken_at: string;
  before_url: string | null;
  after_url: string | null;
}

interface Props {
  customerId: string;
  businessType: string | null | undefined;
}

export default function CustomerBeforeAfterPhotos({ customerId, businessType }: Props) {
  const enabled = hasVisualResultFeature(businessType);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/photos`);
      const data = await res.json();
      if (res.ok) setPhotos(data.photos ?? []);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  // Sektör uygun değilse kart hiç render edilmez — bkz. CustomerCustomFields/CustomerMetrics ile aynı desen.
  if (!enabled) return null;

  async function handleDelete(photoId: string) {
    if (!confirm("Bu fotoğraf çiftini kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Silinemedi");
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Fotoğraf silindi");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card className="kpi-tile border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Camera className="h-4 w-4" /> Önce / Sonra Fotoğrafları
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Bu alan müşterinin görüntüsünü (fotoğraf) içerir — KVKK kapsamında hassas kişisel
            veri sayılabilir. <strong>Yalnızca müşterinizden bu amaçla açık rıza aldıktan
            sonra</strong> fotoğraf yükleyin. Fotoğraflar herkese açık web sitenizde
            gösterilmez, yalnızca panelinizde saklanır; veri sorumlusu olarak saklama ve rıza
            yükümlülükleri işletmenize aittir.
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Yükleniyor…</p>
        ) : photos.length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground">Henüz fotoğraf eklenmedi.</p>
        ) : (
          <div className="space-y-3">
            {photos.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground">Önce</p>
                    <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
                      {p.before_url && (
                        <Image src={p.before_url} alt="Önce" fill sizes="200px" className="object-cover" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground">Sonra</p>
                    <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
                      {p.after_url && (
                        <Image src={p.after_url} alt="Sonra" fill sizes="200px" className="object-cover" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(p.taken_at), "d MMM yyyy", { locale: tr })}
                    </p>
                    {p.note && <p className="text-xs truncate">{p.note}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="shrink-0 h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    aria-label="Fotoğrafı sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <AddPhotoForm
            customerId={customerId}
            onCancel={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              load();
            }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full h-9 text-xs rounded-md border border-dashed border-input hover:bg-accent inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Önce/Sonra Fotoğrafı Ekle
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function AddPhotoForm({
  customerId,
  onCancel,
  onSaved,
}: {
  customerId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!beforeFile || !afterFile) {
      toast.error("Önce ve sonra fotoğraflarının ikisini de seçin");
      return;
    }
    if (!consent) {
      toast.error("Devam etmek için müşteri rızası onayını işaretleyin");
      return;
    }
    setSaving(true);
    try {
      const photoId = crypto.randomUUID();
      const [beforePath, afterPath] = await Promise.all([
        uploadImage({ kind: "customer-photo", id: customerId, photoId, slot: "before", file: beforeFile }),
        uploadImage({ kind: "customer-photo", id: customerId, photoId, slot: "after", file: afterFile }),
      ]);
      const res = await fetch(`/api/customers/${customerId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before_path: beforePath,
          after_path: afterPath,
          note: note.trim() || null,
          consent_confirmed: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Kaydedilemedi");
      toast.success("Fotoğraflar eklendi");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground block mb-1">Önce fotoğrafı</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)}
            className="w-full text-[11px] file:mr-2 file:h-7 file:px-2 file:rounded-md file:border-0 file:bg-accent file:text-accent-foreground file:text-[11px]"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground block mb-1">Sonra fotoğrafı</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)}
            className="w-full text-[11px] file:mr-2 file:h-7 file:px-2 file:rounded-md file:border-0 file:bg-accent file:text-accent-foreground file:text-[11px]"
          />
        </div>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Not (opsiyonel)"
        className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <label className="flex items-start gap-2 text-[11px] leading-snug cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span>
          Bu fotoğrafları yüklemeden önce müşterimden bu amaçla kullanılacağına dair açık
          rızasını aldım.
        </span>
      </label>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Kaydet
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="h-8 px-3 text-xs rounded-md border border-input hover:bg-accent inline-flex items-center gap-1.5"
        >
          <X className="h-3.5 w-3.5" /> Vazgeç
        </button>
      </div>
    </div>
  );
}
