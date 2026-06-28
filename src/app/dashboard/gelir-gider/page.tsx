"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Trash2, Loader2,
  DollarSign, ArrowUpCircle, ArrowDownCircle
} from "lucide-react";

type Expense = {
  id: string;
  type: "gelir" | "gider";
  category: string;
  amount: number;
  description: string;
  note?: string;
  date: string;
  payment_method: string;
  created_at: string;
};

const CATEGORIES_GELIR = [
  { value: "randevu", label: "Randevu Geliri" },
  { value: "urun", label: "Ürün Satışı" },
  { value: "komisyon", label: "Komisyon" },
  { value: "diger", label: "Diğer Gelir" },
];

const CATEGORIES_GIDER = [
  { value: "kira", label: "Kira" },
  { value: "personel", label: "Personel Maaşı" },
  { value: "malzeme", label: "Malzeme / Stok" },
  { value: "fatura", label: "Fatura (Su/Elektrik/İnternet)" },
  { value: "pazarlama", label: "Pazarlama & Reklam" },
  { value: "bakim", label: "Bakım & Tamir" },
  { value: "vergi", label: "Vergi & Muhasebe" },
  { value: "diger", label: "Diğer Gider" },
];

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const fmt = (n: number) => `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function GelirGiderPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "gelir" | "gider">("all");

  const [form, setForm] = useState({
    type: "gider" as "gelir" | "gider",
    category: "diger",
    amount: "",
    description: "",
    note: "",
    date: now.toISOString().slice(0, 10),
    payment_method: "nakit",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/expenses?year=${year}&month=${month}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalGelir  = entries.filter((e) => e.type === "gelir").reduce((s, e) => s + Number(e.amount), 0);
  const totalGider  = entries.filter((e) => e.type === "gider").reduce((s, e) => s + Number(e.amount), 0);
  const netKar      = totalGelir - totalGider;

  const visible = entries.filter((e) => filterType === "all" || e.type === filterType);

  async function handleSave() {
    if (!form.amount || !form.description || !form.date) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Kayıt eklendi");
      setShowForm(false);
      setForm({ type: "gider", category: "diger", amount: "", description: "", note: "", date: now.toISOString().slice(0, 10), payment_method: "nakit" });
      fetchData();
    } else {
      toast.error("Kayıt eklenemedi");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Silindi"); fetchData(); }
    else toast.error("Silinemedi");
  }

  const categoryLabel = (type: string, cat: string) => {
    const list = type === "gelir" ? CATEGORIES_GELIR : CATEGORIES_GIDER;
    return list.find((c) => c.value === cat)?.label ?? cat;
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gelir & Gider</h1>
          <p className="text-muted-foreground text-sm">Finansal kayıtlarınızı takip edin</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Kayıt Ekle
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Gelir</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalGelir)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Gider</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">{fmt(totalGider)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${netKar >= 0 ? "bg-blue-50 dark:bg-blue-950/20" : "bg-orange-50 dark:bg-orange-950/20"}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${netKar >= 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
              {netKar >= 0
                ? <TrendingUp className="h-5 w-5 text-blue-600" />
                : <TrendingDown className="h-5 w-5 text-orange-600" />
              }
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Kâr / Zarar</p>
              <p className={`text-xl font-bold ${netKar >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"}`}>
                {netKar >= 0 ? "+" : ""}{fmt(netKar)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              {MONTHS[month - 1]} {year} — Kayıtlar
            </CardTitle>
            <div className="flex gap-1">
              {(["all", "gelir", "gider"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t === "all" ? "Tümü" : t === "gelir" ? "Gelir" : "Gider"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Bu dönem için kayıt yok</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
                İlk Kaydı Ekle
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Table header — hidden on mobile */}
              <div className="hidden md:grid grid-cols-[100px_1fr_140px_120px_100px_40px] gap-3 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                <span>Tarih</span>
                <span>Açıklama</span>
                <span>Kategori</span>
                <span>Ödeme</span>
                <span className="text-right">Tutar</span>
                <span />
              </div>

              {visible.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[100px_1fr_140px_120px_100px_40px] items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  {/* Mobile: stacked */}
                  <div className="md:contents">
                    <span className="hidden md:block text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("tr-TR")}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{e.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 md:hidden">
                        {new Date(e.date).toLocaleDateString("tr-TR")} · {categoryLabel(e.type, e.category)}
                      </p>
                      {e.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{e.note}</p>}
                    </div>
                    <div className="hidden md:block">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {categoryLabel(e.type, e.category)}
                      </Badge>
                    </div>
                    <span className="hidden md:block text-xs text-muted-foreground capitalize">
                      {e.payment_method}
                    </span>
                    <span className={`hidden md:block text-sm font-semibold text-right ${e.type === "gelir" ? "text-emerald-600" : "text-red-600"}`}>
                      {e.type === "gelir" ? "+" : "-"}{fmt(Number(e.amount))}
                    </span>
                  </div>

                  {/* Mobile amount + delete */}
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold md:hidden ${e.type === "gelir" ? "text-emerald-600" : "text-red-600"}`}>
                      {e.type === "gelir" ? "+" : "-"}{fmt(Number(e.amount))}
                    </span>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Gelir Dağılımı", type: "gelir", cats: CATEGORIES_GELIR, color: "bg-emerald-500" },
            { label: "Gider Dağılımı", type: "gider", cats: CATEGORIES_GIDER, color: "bg-red-500" },
          ].map(({ label, type, cats, color }) => {
            const typeEntries = entries.filter((e) => e.type === type);
            const total = typeEntries.reduce((s, e) => s + Number(e.amount), 0);
            if (total === 0) return null;
            const byCategory = cats.map((c) => ({
              label: c.label,
              value: typeEntries.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0),
            })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

            return (
              <Card key={type} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {byCategory.map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="font-medium">{fmt(c.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${(c.value / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Kayıt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Type */}
            <div className="grid grid-cols-2 gap-2">
              {(["gelir", "gider"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t, category: "diger" }))}
                  className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    form.type === t
                      ? t === "gelir"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {t === "gelir" ? "💰 Gelir" : "💸 Gider"}
                </button>
              ))}
            </div>

            <div>
              <Label>Kategori</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? f.category }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(form.type === "gelir" ? CATEGORIES_GELIR : CATEGORIES_GIDER).map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tutar (₺) *</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tarih *</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Açıklama *</Label>
              <Input
                className="mt-1"
                placeholder="Kira Ödemesi, Malzeme Alımı..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <Label>Ödeme Yöntemi</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v ?? f.payment_method }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nakit">Nakit</SelectItem>
                  <SelectItem value="kart">Kart</SelectItem>
                  <SelectItem value="havale">Havale / EFT</SelectItem>
                  <SelectItem value="çek">Çek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Not (isteğe bağlı)</Label>
              <Input
                className="mt-1"
                placeholder="Ek bilgi..."
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                İptal
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
