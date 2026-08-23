"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { toast } from "sonner";
import {
  Package, Plus, Trash2, Pencil, AlertTriangle, ArrowUpRight, ArrowDownRight,
  RefreshCw, Search, Loader2, Sparkles, TrendingUp, DollarSign, Layers
} from "lucide-react";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_alert: number;
  cost_price: number;
  sale_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  type: "in" | "out" | "adjust";
  quantity: number;
  unit_price: number | null;
  note: string | null;
  created_at: string;
  item?: { name: string; unit: string } | null;
}

const EMPTY_ITEM = {
  name: "",
  category: "Saç Bakımı",
  unit: "adet",
  current_stock: "0",
  min_stock_alert: "5",
  cost_price: "0",
  sale_price: "0",
};

const fmt = (n: number) => `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StokPage() {
  const t = useTranslations("dashboard");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [savingItem, setSavingItem] = useState(false);

  const [showTxModal, setShowTxModal] = useState(false);
  const [txTargetItem, setTxTargetItem] = useState<InventoryItem | null>(null);
  const [txForm, setTxForm] = useState({ type: "in" as "in" | "out" | "adjust", quantity: "1", note: "" });
  const [savingTx, setSavingTx] = useState(false);

  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resItems, resTx] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/transactions"),
      ]);
      if (resItems.ok) {
        const d = await resItems.json();
        setItems(d.items || []);
      }
      if (resTx.ok) {
        const d = await resTx.json();
        setTransactions(d.transactions || []);
      }
    } catch {
      toast.error("Stok verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.category) set.add(i.category); });
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchCategory = selectedCategory === "all" || i.category === selectedCategory;
      const matchSearch = !search.trim() || i.name.toLocaleLowerCase("tr").includes(search.trim().toLocaleLowerCase("tr"));
      return matchCategory && matchSearch;
    });
  }, [items, selectedCategory, search]);

  // KPI stats
  const totalProducts = items.length;
  const criticalStockCount = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock_alert)).length;
  const totalStockValue = items.reduce((sum, i) => sum + (Number(i.current_stock) * Number(i.cost_price || 0)), 0);

  // Load template catalog
  async function handleLoadTemplate(type = "kuafor") {
    setLoadingTemplate(true);
    try {
      const res = await fetch("/api/inventory/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        toast.success("Örnek stok kataloğu eklendi!");
        fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Katalog eklenemedi");
      }
    } catch {
      toast.error("Katalog eklenemedi");
    } finally {
      setLoadingTemplate(false);
    }
  }

  // Open item form for edit or new
  function openItemForm(item?: InventoryItem) {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category: item.category || "Saç Bakımı",
        unit: item.unit || "adet",
        current_stock: String(item.current_stock),
        min_stock_alert: String(item.min_stock_alert),
        cost_price: String(item.cost_price || 0),
        sale_price: String(item.sale_price || 0),
      });
    } else {
      setEditingItem(null);
      setItemForm(EMPTY_ITEM);
    }
    setShowItemModal(true);
  }

  async function handleSaveItem() {
    if (!itemForm.name.trim()) {
      toast.error("Ürün adı zorunludur");
      return;
    }
    setSavingItem(true);
    try {
      const isEdit = !!editingItem;
      const res = await fetch("/api/inventory", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingItem.id } : {}),
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          current_stock: itemForm.current_stock,
          min_stock_alert: itemForm.min_stock_alert,
          cost_price: itemForm.cost_price,
          sale_price: itemForm.sale_price,
        }),
      });
      if (res.ok) {
        toast.success(isEdit ? "Ürün güncellendi" : "Yeni ürün eklendi");
        setShowItemModal(false);
        fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Kayıt başarısız");
      }
    } catch {
      toast.error("Kayıt başarısız");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Ürün silindi");
        fetchData();
      } else {
        toast.error("Ürün silinemedi");
      }
    } catch {
      toast.error("Ürün silinemedi");
    }
  }

  // Open transaction modal
  function openTxModal(item: InventoryItem, type: "in" | "out" | "adjust" = "in") {
    setTxTargetItem(item);
    setTxForm({ type, quantity: "1", note: "" });
    setShowTxModal(true);
  }

  async function handleSaveTx() {
    if (!txTargetItem) return;
    const qty = Number(txForm.quantity);
    if (!qty || qty <= 0) {
      toast.error("Geçerli bir miktar girin");
      return;
    }
    setSavingTx(true);
    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: txTargetItem.id,
          type: txForm.type,
          quantity: qty,
          note: txForm.note,
        }),
      });
      if (res.ok) {
        toast.success("Stok hareketi kaydedildi");
        setShowTxModal(false);
        fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "İşlem başarısız");
      }
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setSavingTx(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary/70">ÖN MUHASEBE & STOK</span>
            <HomeButton />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            Stok Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground">Ürün stoğu, kritik stok uyarıları ve mal giriş/çıkış takibi</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {items.length === 0 && (
            <Button
              variant="outline"
              onClick={() => handleLoadTemplate("kuafor")}
              disabled={loadingTemplate}
              className="gap-2"
            >
              {loadingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
              Örnek Katalog Yükle
            </Button>
          )}
          <Button onClick={() => openItemForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Ürün Ekle
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="kpi-tile border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Toplam Ürün Çeşidi</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{totalProducts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-tile border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Kritik Stok Uyarısı</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${criticalStockCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                {criticalStockCount}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${criticalStockCount > 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30" : "bg-muted text-muted-foreground"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-tile border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Toplam Stok Değeri (Maliyet)</p>
              <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{fmt(totalStockValue)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ürün adı ara..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              selectedCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Tüm Kategoriler ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Product List Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Henüz stok ürünü bulunmuyor</p>
              <Button size="sm" onClick={() => openItemForm()} className="gap-2">
                <Plus className="h-4 w-4" /> Ürün Ekle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="p-3 pl-4">Ürün Adı</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-center">Stok Durumu</th>
                    <th className="p-3 text-right">Maliyet Fiyatı</th>
                    <th className="p-3 text-right">Satış Fiyatı</th>
                    <th className="p-3 text-right pr-4">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const isCritical = Number(item.current_stock) <= Number(item.min_stock_alert);
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="p-3 pl-4 font-medium">
                          <p className="leading-snug">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">Birim: {item.unit}</p>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {item.category || "Genel"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`font-bold tabular-nums text-sm ${isCritical ? "text-amber-600 dark:text-amber-400" : ""}`}>
                              {item.current_stock} {item.unit}
                            </span>
                            {isCritical && (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Kritik Sınır ({item.min_stock_alert})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right tabular-nums">{fmt(Number(item.cost_price || 0))}</td>
                        <td className="p-3 text-right tabular-nums font-semibold text-primary">{fmt(Number(item.sale_price || 0))}</td>
                        <td className="p-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              title="Stok Giriş/Çıkış"
                              onClick={() => openTxModal(item, "in")}
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              Giriş/Çıkış
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Düzenle"
                              onClick={() => openItemForm(item)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                              title="Sil"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Modal (Add/Edit) */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editingItem ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Ürün Adı *</Label>
              <Input
                className="mt-1"
                placeholder="Örn: Şampuan 1000ml"
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori</Label>
                <Input
                  className="mt-1"
                  placeholder="Örn: Saç Bakımı"
                  value={itemForm.category}
                  onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div>
                <Label>Ölçü Birimi</Label>
                <Select value={itemForm.unit} onValueChange={(v) => setItemForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adet">adet</SelectItem>
                    <SelectItem value="şişe">şişe</SelectItem>
                    <SelectItem value="kutu">kutu</SelectItem>
                    <SelectItem value="tüp">tüp</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="gram">gram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mevcut Stok</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={itemForm.current_stock}
                  onChange={(e) => setItemForm((f) => ({ ...f, current_stock: e.target.value }))}
                />
              </div>
              <div>
                <Label>Kritik Stok Uyarısı</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={itemForm.min_stock_alert}
                  onChange={(e) => setItemForm((f) => ({ ...f, min_stock_alert: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Maliyet Fiyatı (₺)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.5"
                  value={itemForm.cost_price}
                  onChange={(e) => setItemForm((f) => ({ ...f, cost_price: e.target.value }))}
                />
              </div>
              <div>
                <Label>Satış Fiyatı (₺)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.5"
                  value={itemForm.sale_price}
                  onChange={(e) => setItemForm((f) => ({ ...f, sale_price: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowItemModal(false)}>İptal</Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingItem ? "Güncelle" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal (Stock In / Out / Adjust) */}
      <Dialog open={showTxModal} onOpenChange={setShowTxModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Stok Hareketi: {txTargetItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>İşlem Türü</Label>
              <Select value={txForm.type} onValueChange={(v) => setTxForm((f) => ({ ...f, type: v as "in" | "out" | "adjust" }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">➕ Stok Girişi (Mal Alımı)</SelectItem>
                  <SelectItem value="out">➖ Stok Çıkışı (Kullanım / Satış)</SelectItem>
                  <SelectItem value="adjust">✏️ Stok Düzeltme (Sayım)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{txForm.type === "adjust" ? "Yeni Stok Miktarı" : "Miktar"}</Label>
              <Input
                className="mt-1"
                type="number"
                min="0.1"
                step="1"
                value={txForm.quantity}
                onChange={(e) => setTxForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>

            <div>
              <Label>Açıklama / Not (opsiyonel)</Label>
              <Input
                className="mt-1"
                placeholder="Örn: Fatura No, Kullanılan Hizmet vb."
                value={txForm.note}
                onChange={(e) => setTxForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTxModal(false)}>İptal</Button>
            <Button onClick={handleSaveTx} disabled={savingTx}>
              {savingTx && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              İşlemi Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
