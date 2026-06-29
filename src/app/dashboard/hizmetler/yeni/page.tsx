"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search, Plus, Sparkles, PenLine } from "lucide-react";
import { SERVICE_CATALOG, searchCatalog, type CatalogService } from "@/lib/services/catalog";

const CATEGORIES = [
  { value: "sac", label: "Saç" },
  { value: "cilt", label: "Cilt" },
  { value: "tirnak", label: "Tırnak" },
  { value: "kas", label: "Kaş & Kirpik" },
  { value: "spa", label: "Spa & Masaj" },
  { value: "lazer", label: "Lazer & Epilasyon" },
  { value: "genel", label: "Genel" },
];

type Tab = "catalog" | "manual";

export default function YeniHizmetPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("catalog");
  const [orgType, setOrgType] = useState("kuafor");
  const [loading, setLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    name: "",
    duration_minutes: "45",
    price: "",
    category_tag: "genel",
    description: "",
    contributes_loyalty: true,
  });

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((d) => { if (d.org?.type) setOrgType(d.org.type); })
      .catch(() => {});
  }, []);

  const catalog = SERVICE_CATALOG[orgType] || SERVICE_CATALOG["kuafor"];
  const searchResults: CatalogService[] = catalogSearch.length >= 1
    ? searchCatalog(orgType, catalogSearch)
    : [];

  async function addFromCatalog(svc: CatalogService) {
    const key = svc.name;
    if (addedNames.has(key)) return;
    setAddingIds((s) => new Set(s).add(key));
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: svc.name,
          duration_minutes: svc.duration,
          price: svc.price,
          category_tag: svc.category,
          contributes_loyalty: true,
        }),
      });
      if (res.ok) {
        setAddedNames((s) => new Set(s).add(key));
        toast.success(`"${svc.name}" eklendi`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Eklenemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setAddingIds((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return toast.error("Ad ve fiyat zorunlu");
    setLoading(true);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        duration_minutes: parseInt(form.duration_minutes) || 30,
        price: parseFloat(form.price),
        category_tag: form.category_tag,
        description: form.description || null,
        contributes_loyalty: form.contributes_loyalty,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Hizmet eklendi");
      router.push("/dashboard/hizmetler");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata oluştu");
    }
  }

  const displayList = catalogSearch.length >= 1 ? null : catalog;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/hizmetler" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Hizmet Ekle</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
            tab === "catalog" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Katalogdan Seç
        </button>
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
            tab === "manual" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          <PenLine className="h-4 w-4" /> Manuel Gir
        </button>
      </div>

      {tab === "catalog" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hizmet ara... (örn: manikür, keratin, botoks)"
              className="pl-9"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>

          {/* Search results */}
          {catalogSearch.length >= 1 && (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  &quot;{catalogSearch}&quot; bulunamadı — Manuel Gir sekmesinden ekleyebilirsiniz
                </p>
              ) : (
                searchResults.map((svc) => (
                  <ServiceCatalogRow
                    key={svc.name}
                    svc={svc}
                    added={addedNames.has(svc.name)}
                    loading={addingIds.has(svc.name)}
                    onAdd={() => addFromCatalog(svc)}
                  />
                ))
              )}
            </div>
          )}

          {/* Category groups */}
          {!catalogSearch && displayList && displayList.map((cat) => (
            <div key={cat.label}>
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                <span>{cat.icon}</span> {cat.label}
              </h3>
              <div className="space-y-1.5">
                {cat.services.map((svc) => (
                  <ServiceCatalogRow
                    key={svc.name}
                    svc={svc}
                    added={addedNames.has(svc.name)}
                    loading={addingIds.has(svc.name)}
                    onAdd={() => addFromCatalog(svc)}
                  />
                ))}
              </div>
            </div>
          ))}

          {addedNames.size > 0 && (
            <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/hizmetler")}>
              Tamamlandı — Hizmetler Sayfasına Dön ({addedNames.size} hizmet eklendi)
            </Button>
          )}
        </div>
      )}

      {tab === "manual" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Manuel Hizmet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Hizmet Adı *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="örn. Özel Saç Bakımı"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fiyat (₺) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="örn. 500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Süre (dakika) *</Label>
                  <Input
                    type="number"
                    min="5"
                    max="480"
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select value={form.category_tag} onValueChange={(v) => v && setForm((f) => ({ ...f, category_tag: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Açıklama (opsiyonel)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Kısa açıklama..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.contributes_loyalty}
                  onChange={(e) => setForm((f) => ({ ...f, contributes_loyalty: e.target.checked }))}
                  className="accent-primary"
                />
                <span className="text-sm">Sadakat puanı kazandırsın</span>
              </label>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Hizmet Ekle
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ServiceCatalogRow({
  svc, added, loading, onAdd,
}: {
  svc: CatalogService;
  added: boolean;
  loading: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{svc.name}</p>
        <p className="text-xs text-muted-foreground">{svc.duration} dk</p>
      </div>
      <div className="flex items-center gap-3 ml-3">
        <span className="text-sm font-semibold text-primary">₺{svc.price.toLocaleString("tr-TR")}</span>
        <Button
          type="button"
          size="sm"
          variant={added ? "outline" : "default"}
          className="h-7 px-2.5 text-xs"
          onClick={onAdd}
          disabled={added || loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : added ? "✓ Eklendi" : <><Plus className="h-3 w-3 mr-1" />Ekle</>}
        </Button>
      </div>
    </div>
  );
}
