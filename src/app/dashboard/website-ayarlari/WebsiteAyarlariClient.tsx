"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { resizeImageFile } from "@/lib/image-resize";
import { WEBSITE_PALETTES, type WebsitePaletteKey } from "@/lib/website-palettes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard3D } from "@/components/ui/GlassCard3D";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Save, Loader2, Check, ImageUp, X, MapPin, Star, Plus,
  ArrowUp, ArrowDown, Pencil, Trash2, ExternalLink, Copy, ImagePlus,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Organization, Service, ServiceCategory } from "@/types/database";
import { formatServicePrice } from "@/lib/currency";

const NO_CATEGORY = "__none__";

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard3D className="glass-card" glow intensity={3}>
      <div className="panel-header">
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase text-primary">
          <Icon className="h-4 w-4" />
          {title}
        </span>
      </div>
      <div className="px-4 py-3.5 space-y-3">
        {description && <p className="text-xs text-muted-foreground -mt-1">{description}</p>}
        {children}
      </div>
    </GlassCard3D>
  );
}

interface Props {
  org: Organization;
  initialCategories: ServiceCategory[];
  initialServices: Service[];
}

export function WebsiteAyarlariClient({ org: initialOrg, initialCategories, initialServices }: Props) {
  const [org, setOrg] = useState<Organization>(initialOrg);
  const [categories, setCategories] = useState<ServiceCategory[]>(initialCategories);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [saving, setSaving] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategoryId, setNewServiceCategoryId] = useState(NO_CATEGORY);
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("");
  const [addingService, setAddingService] = useState(false);
  const [serviceBusyId, setServiceBusyId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [locating, setLocating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryBusyId, setCategoryBusyId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // SSR ile client'ta aynı ilk render'ı vermek için origin sadece mount sonrası eklenir
  // (yoksa server "/r/slug" render eder, client "https://.../r/slug" render eder — hydration mismatch).
  const relativeUrl = `/r/${org.slug}`;
  const [publicUrl, setPublicUrl] = useState(relativeUrl);
  useEffect(() => {
    setPublicUrl(`${window.location.origin}${relativeUrl}`);
  }, [relativeUrl]);

  function setField<K extends keyof Organization>(field: K, value: Organization[K]) {
    setOrg((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        website_enabled: org.website_enabled,
        website_palette: org.website_palette,
        website_tagline: org.website_tagline,
        google_review_url: org.google_review_url,
        address: org.address,
        location_url: org.location_url,
      })
      .eq("id", org.id);
    setSaving(false);
    if (error) {
      toast.error("Kayıt başarısız: " + error.message);
    } else {
      toast.success("Website ayarları kaydedildi!");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız konum özelliğini desteklemiyor");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setField("location_url", `https://www.google.com/maps?q=${latitude},${longitude}`);
        setLocating(false);
        toast.success("Konumunuz alındı");
      },
      () => {
        setLocating(false);
        toast.error("Konum alınamadı — tarayıcınızdan konum izni vermeniz gerekiyor");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir resim dosyası seçin");
      return;
    }
    setUploadingCover(true);
    const resized = await resizeImageFile(file, 1920);
    const supabase = createClient();
    const ext = resized.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${org.id}/cover.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("org-logos")
      .upload(path, resized, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast.error("Yükleme başarısız: " + upErr.message);
      setUploadingCover(false);
      return;
    }
    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
    const cover_url = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from("organizations").update({ cover_url }).eq("id", org.id);
    setUploadingCover(false);
    if (dbErr) {
      toast.error("Kaydedilemedi: " + dbErr.message);
    } else {
      setField("cover_url", cover_url);
      toast.success("Kapak fotoğrafı güncellendi!");
    }
  }

  async function handleCoverRemove() {
    const supabase = createClient();
    const { error } = await supabase.from("organizations").update({ cover_url: null }).eq("id", org.id);
    if (!error) setField("cover_url", null);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    const res = await fetch("/api/service-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    setAddingCategory(false);
    if (res.ok) {
      const { category } = await res.json();
      setCategories((prev) => [...prev, category]);
      setNewCategoryName("");
    } else {
      toast.error("Kategori eklenemedi");
    }
  }

  async function handleRenameCategory(id: string) {
    if (!editingCategoryName.trim()) return;
    setCategoryBusyId(id);
    const res = await fetch(`/api/service-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingCategoryName.trim() }),
    });
    setCategoryBusyId(null);
    if (res.ok) {
      const { category } = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
      setEditingCategoryId(null);
    } else {
      toast.error("Güncellenemedi");
    }
  }

  async function handleDeleteCategory(id: string) {
    setCategoryBusyId(id);
    const res = await fetch(`/api/service-categories/${id}`, { method: "DELETE" });
    setCategoryBusyId(null);
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error("Silinemedi");
    }
  }

  async function handleMoveCategory(cat: ServiceCategory, direction: "up" | "down") {
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    setCategoryBusyId(cat.id);
    const res = await fetch(`/api/service-categories/${cat.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setCategoryBusyId(null);
    if (!res.ok) {
      toast.error("Sıralama değiştirilemedi");
      return;
    }
    const target = sorted[targetIdx];
    setCategories((prev) => prev.map((c) => {
      if (c.id === cat.id) return { ...c, display_order: target.display_order };
      if (c.id === target.id) return { ...c, display_order: cat.display_order };
      return c;
    }));
  }

  async function handleCategoryPhotoUpload(catId: string, file: File) {
    setCategoryBusyId(catId);
    const resized = await resizeImageFile(file);
    const supabase = createClient();
    const ext = resized.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${org.id}/categories/${catId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("service-photos")
      .upload(path, resized, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast.error("Yükleme başarısız: " + upErr.message);
      setCategoryBusyId(null);
      return;
    }
    const { data: pub } = supabase.storage.from("service-photos").getPublicUrl(path);
    const photo_url = `${pub.publicUrl}?t=${Date.now()}`;
    const res = await fetch(`/api/service-categories/${catId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url }),
    });
    setCategoryBusyId(null);
    if (res.ok) {
      const { category } = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === catId ? category : c)));
    }
  }

  async function handleAddService() {
    if (!newServiceName.trim()) return;
    setAddingService(true);
    const hasPrice = !!newServicePrice.trim();
    const hasDuration = !!newServiceDuration.trim();
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newServiceName.trim(),
        category_id: newServiceCategoryId === NO_CATEGORY ? null : newServiceCategoryId,
        price: hasPrice ? newServicePrice : undefined,
        duration_minutes: hasDuration ? newServiceDuration : undefined,
        is_bookable_online: hasPrice && hasDuration,
      }),
    });
    setAddingService(false);
    if (res.ok) {
      const { service } = await res.json();
      setServices((prev) => [...prev, service]);
      setNewServiceName("");
      setNewServiceCategoryId(NO_CATEGORY);
      setNewServicePrice("");
      setNewServiceDuration("");
      toast.success("Hizmet eklendi");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Hizmet eklenemedi");
    }
  }

  async function handleDeleteService(id: string) {
    setServiceBusyId(id);
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    setServiceBusyId(null);
    if (res.ok) {
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Hizmet kaldırıldı");
    } else {
      toast.error("Hizmet kaldırılamadı");
    }
  }

  async function handleServiceCategoryChange(id: string, categoryId: string) {
    setServiceBusyId(id);
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_id: categoryId === NO_CATEGORY ? null : categoryId }),
    });
    setServiceBusyId(null);
    if (res.ok) {
      const { service } = await res.json();
      setServices((prev) => prev.map((s) => (s.id === id ? service : s)));
    } else {
      toast.error("Kategori güncellenemedi");
    }
  }

  async function handleServicePhotoUpload(id: string, file: File) {
    setServiceBusyId(id);
    const resized = await resizeImageFile(file);
    const supabase = createClient();
    const ext = resized.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${org.id}/services/${id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("service-photos")
      .upload(path, resized, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast.error("Yükleme başarısız: " + upErr.message);
      setServiceBusyId(null);
      return;
    }
    const { data: pub } = supabase.storage.from("service-photos").getPublicUrl(path);
    const photo_url = `${pub.publicUrl}?t=${Date.now()}`;
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url }),
    });
    setServiceBusyId(null);
    if (res.ok) {
      const { service } = await res.json();
      setServices((prev) => prev.map((s) => (s.id === id ? service : s)));
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);
  const palettes = Object.entries(WEBSITE_PALETTES) as [WebsitePaletteKey, typeof WEBSITE_PALETTES[WebsitePaletteKey]][];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">Pro Özellik</span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">Website Ayarları</h1>
          </div>
          <HomeButton />
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </Button>
      </div>

      {/* Public link + on/off */}
      <SectionCard icon={Globe} title="Randevu Sayfanız">
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
          <Link href={relativeUrl} target="_blank" className="flex-1 text-sm font-medium text-primary truncate hover:underline flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {publicUrl}
          </Link>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copyLink}>
            {linkCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
          <Checkbox
            id="website_enabled"
            checked={org.website_enabled}
            onCheckedChange={(checked) => setField("website_enabled", !!checked)}
            className="mt-0.5"
          />
          <label htmlFor="website_enabled" className="cursor-pointer flex-1">
            <p className="text-sm font-medium">Website görünümünü aç</p>
            <p className="text-xs text-muted-foreground">
              Açıksa randevu linkiniz; kapak fotoğrafı, hizmet kategorileri ve fiyatlarıyla birlikte tam bir
              işletme sayfası olarak görüntülenir. Kapalıysa ziyaretçiler doğrudan sade randevu formunu görür.
            </p>
          </label>
        </div>
      </SectionCard>

      {/* Palette */}
      <SectionCard icon={Star} title="Renk Paleti" description="Website sayfanızın renklerini seçin.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {palettes.map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => setField("website_palette", key)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors ${
                org.website_palette === key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <span className="w-6 h-6 rounded-full shrink-0 border border-border/60" style={{ backgroundColor: p.swatch }} />
              <span className="text-xs font-medium flex-1">{p.label}</span>
              {org.website_palette === key && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Cover photo */}
      <SectionCard icon={ImageUp} title="Kapak Fotoğrafı" description="Sayfanızın en üstünde geniş şekilde gösterilir.">
        {org.cover_url ? (
          <div className="relative rounded-xl overflow-hidden h-40 w-full">
            <Image src={org.cover_url} alt="Kapak" fill className="object-cover" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <label className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-background/90 cursor-pointer hover:bg-background">
                {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </label>
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={handleCoverRemove} disabled={uploadingCover}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 h-24 rounded-xl border border-dashed cursor-pointer hover:bg-muted/40 text-sm text-muted-foreground">
            {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Kapak fotoğrafı ekle
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
          </label>
        )}
      </SectionCard>

      {/* About / address / directions */}
      <SectionCard icon={MapPin} title="Hakkında, Adres ve Yol Tarifi">
        <div>
          <Label>Kısa Tanıtım Yazısı</Label>
          <Textarea
            className="mt-1"
            rows={2}
            placeholder="Örn. 10 yıldır Kadıköy'de güzelliğinize hizmet veriyoruz."
            value={org.website_tagline ?? ""}
            onChange={(e) => setField("website_tagline", e.target.value)}
          />
        </div>
        <div>
          <Label>Adres</Label>
          <Textarea
            className="mt-1"
            rows={2}
            value={org.address ?? ""}
            onChange={(e) => setField("address", e.target.value)}
          />
        </div>
        <div>
          <Label>Google Maps Yol Tarifi Linki</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={org.location_url ?? ""}
              onChange={(e) => setField("location_url", e.target.value)}
              placeholder="https://maps.google.com/..."
            />
            <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating} className="shrink-0 gap-1.5">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Konumumu Kullan
            </Button>
          </div>
        </div>
        <div>
          <Label>Google Yorumları Linki</Label>
          <Input
            className="mt-1"
            value={org.google_review_url ?? ""}
            onChange={(e) => setField("google_review_url", e.target.value)}
            placeholder="https://g.page/r/.../review"
          />
        </div>
      </SectionCard>

      {/* Categories */}
      <SectionCard
        icon={Star}
        title="Hizmet Kategorileri"
        description="Website sayfanızda hizmetleriniz bu kategoriler altında gruplanır. Hizmeti kategoriye atamak için Hizmetler sayfasından hizmeti açın."
      >
        <div className="flex gap-2">
          <Input
            placeholder="Yeni kategori adı (örn. Saç Bakımı)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          />
          <Button onClick={handleAddCategory} disabled={addingCategory || !newCategoryName.trim()} className="shrink-0 gap-1.5">
            {addingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ekle
          </Button>
        </div>

        {sortedCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Henüz kategori eklenmedi.</p>
        ) : (
          <div className="space-y-2">
            {sortedCategories.map((cat, idx) => {
              const count = services.filter((s) => s.category_id === cat.id).length;
              const busy = categoryBusyId === cat.id;
              return (
                <div key={cat.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border">
                  <label className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative bg-muted cursor-pointer">
                    {cat.photo_url ? (
                      <Image src={cat.photo_url} alt={cat.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleCategoryPhotoUpload(cat.id, f); }}
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    {editingCategoryId === cat.id ? (
                      <div className="flex gap-1.5">
                        <Input
                          className="h-8 text-sm"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRenameCategory(cat.id)}
                          autoFocus
                        />
                        <Button size="sm" className="h-8" onClick={() => handleRenameCategory(cat.id)} disabled={busy}>Kaydet</Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{count} hizmet</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0 || busy} onClick={() => handleMoveCategory(cat, "up")}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === sortedCategories.length - 1 || busy} onClick={() => handleMoveCategory(cat, "down")}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={busy} onClick={() => handleDeleteCategory(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link href="/dashboard/hizmetler" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Hizmetler sayfasında toplu düzenle <ExternalLink className="h-3 w-3" />
        </Link>
      </SectionCard>

      {/* Services */}
      <SectionCard
        icon={Scissors}
        title="Hizmetler"
        description="Website sayfanızda görünecek hizmetleri buradan ekleyip çıkarabilir, fotoğraf yükleyip kategoriye atayabilirsiniz. Fiyat ve süreyi boş bırakırsanız hizmet sadece vitrin amaçlı gösterilir, online randevu alınamaz."
      >
        <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
          <Input
            placeholder="Yeni hizmet adı (örn. Fön Çekimi)"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Select value={newServiceCategoryId} onValueChange={(v) => v && setNewServiceCategoryId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori">
                  {() => (newServiceCategoryId === NO_CATEGORY ? "Kategorisiz" : sortedCategories.find((c) => c.id === newServiceCategoryId)?.name ?? "Kategori")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Kategorisiz</SelectItem>
                {sortedCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number" min="0" step="0.01" placeholder="Fiyat (opsiyonel)"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
            />
            <Input
              type="number" min="5" step="5" placeholder="Süre dk (opsiyonel)"
              value={newServiceDuration}
              onChange={(e) => setNewServiceDuration(e.target.value)}
            />
          </div>
          <Button onClick={handleAddService} disabled={addingService || !newServiceName.trim()} className="w-full gap-1.5">
            {addingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Hizmet Ekle
          </Button>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Henüz hizmet eklenmedi.</p>
        ) : (
          <div className="space-y-2">
            {services.map((svc) => {
              const busy = serviceBusyId === svc.id;
              return (
                <div key={svc.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border">
                  <label className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative bg-muted cursor-pointer">
                    {svc.photo_url ? (
                      <Image src={svc.photo_url} alt={svc.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleServicePhotoUpload(svc.id, f); }}
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{svc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {svc.price !== null ? formatServicePrice(svc.price, svc.currency) : "Fiyat belirtilmemiş"}
                      {svc.duration_minutes !== null ? ` • ${svc.duration_minutes} dk` : ""}
                    </p>
                  </div>
                  <Select
                    value={svc.category_id ?? NO_CATEGORY}
                    onValueChange={(v) => v && handleServiceCategoryChange(svc.id, v)}
                  >
                    <SelectTrigger className="w-[140px] h-8 shrink-0 text-xs">
                      <SelectValue>
                        {() => (svc.category_id ? sortedCategories.find((c) => c.id === svc.category_id)?.name ?? "Kategorisiz" : "Kategorisiz")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Kategorisiz</SelectItem>
                      {sortedCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0"
                    disabled={busy} onClick={() => handleDeleteService(svc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
