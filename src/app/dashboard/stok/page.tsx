"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { useTranslations, useLocale } from "next-intl";
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
  RefreshCw, Search, Loader2, Sparkles, TrendingUp, DollarSign, Layers, Mic, Check,
  ScanLine, Barcode as BarcodeIcon, Printer
} from "lucide-react";
import { formatMoney, CURRENCY_SYMBOL } from "@/lib/currency";
import { useMicAccess } from "@/components/dashboard/useMicAccess";
import { useVoiceConfirmCommand } from "@/components/dashboard/useVoiceConfirmCommand";
import { usePlan } from "@/components/dashboard/PlanContext";
import { isInternalBarcode } from "@/lib/barcode";

interface ParsedInventoryCmd {
  action: "add" | "update_stock" | "update_price";
  item_id?: string;
  item_name?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  price?: number;
  direction?: "in" | "out" | "adjust";
}

const BarcodeScanner = dynamic(() => import("@/components/dashboard/BarcodeScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  ),
});

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_alert: number;
  cost_price: number;
  sale_price: number;
  barcode?: string | null;
  barcode_source?: string | null;
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

// Sayısal alanlarda önceki "0" değerinin üzerine yazılınca "05" gibi baştaki
// sıfırın kalmasını önler (mobil klavyede imleç mevcut "0"ın sonuna düşüyor).
function stripLeadingZero(v: string): string {
  return v.replace(/^0+(?=\d)/, "");
}

const EMPTY_ITEM = {
  name: "",
  category: "Saç Bakımı",
  unit: "adet",
  current_stock: "0",
  min_stock_alert: "5",
  cost_price: "0",
  sale_price: "0",
  barcode: "",
};

export default function StokPage() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tm = useTranslations("dashboard.mic");
  const tb = useTranslations("dashboard.stockPage.barcode");
  const locale = useLocale();
  const { requestMic, micDialog, speechLang } = useMicAccess();
  const { proTools } = usePlan(); // sesli stok komutu Pro+ (API'de 403 ile de korunur)
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
  const [txForm, setTxForm] = useState({ type: "in" as "in" | "out" | "adjust", quantity: "1", unit_price: "", note: "" });
  const [savingTx, setSavingTx] = useState(false);

  // ── Barkodla satış ──
  const [showBarcodeSell, setShowBarcodeSell] = useState(false);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [barcodeSellItem, setBarcodeSellItem] = useState<InventoryItem | null>(null);
  const [barcodeUnknown, setBarcodeUnknown] = useState<string | null>(null);
  const [barcodeSellQty, setBarcodeSellQty] = useState("1");
  const [barcodeSellPrice, setBarcodeSellPrice] = useState("");
  const [barcodeSelling, setBarcodeSelling] = useState(false);
  // Ürün formundaki mini tarayıcı
  const [showFormScanner, setShowFormScanner] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [currency, setCurrency] = useState("TRY");
  const fmt = useCallback((n: number) => formatMoney(n, currency, locale), [currency, locale]);

  // ── Sesli stok komutu (Pro+) ──
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceLiveTranscript, setVoiceLiveTranscript] = useState("");
  const [voiceParsed, setVoiceParsed] = useState<ParsedInventoryCmd | null>(null);
  const [isConfirmingInventory, setIsConfirmingInventory] = useState(false);
  const [voiceConfirmResponse, setVoiceConfirmResponse] = useState("");
  const [confirmingInventoryBusy, setConfirmingInventoryBusy] = useState(false);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const voiceRecRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((d) => {
        const settings = (d.org?.settings_json ?? {}) as Record<string, unknown>;
        if (typeof settings.currency === "string") setCurrency(settings.currency);
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => () => { try { voiceRecRef.current?.abort(); } catch {} }, []);

  const startVoiceStock = useCallback(async () => {
    if (!proTools) { toast.error(tm("proOnly")); return; }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error(tm("unsupported")); return; }
    const ok = await requestMic();
    if (!ok) return;

    try { voiceRecRef.current?.abort(); } catch {}
    const rec = new SR();
    voiceRecRef.current = rec;
    rec.lang = speechLang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    let accum = "";
    let done = false;
    const stopTimer = setTimeout(() => { try { rec.stop(); } catch {} }, 10000);

    rec.onstart = () => {
      setVoiceListening(true);
      setIsConfirmingInventory(false);
      setVoiceLiveTranscript("");
      toast(tm("stockListening"), { id: "voice-stock", icon: "🎤", duration: 10000 });
    };
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) accum += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setVoiceLiveTranscript((accum + interim).trim());
    };
    rec.onerror = (/* eslint-disable-line @typescript-eslint/no-explicit-any */ ev: any) => {
      if (ev?.error === "no-speech") return;
      clearTimeout(stopTimer);
      setVoiceListening(false);
      setVoiceLiveTranscript("");
      toast.dismiss("voice-stock");
      if (ev?.error !== "aborted") toast.error(tm("captureFailed"));
    };
    rec.onend = async () => {
      if (done) return;
      done = true;
      clearTimeout(stopTimer);
      setVoiceListening(false);
      setVoiceLiveTranscript("");
      voiceRecRef.current = null;
      toast.dismiss("voice-stock");
      const transcript = accum.trim();
      if (!transcript) { toast.error(tm("notUnderstood")); return; }
      toast.loading(tm("processing"), { id: "voice-stock-p" });
      try {
        const res = await fetch("/api/ai/voice-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, intent: "inventory", parseOnly: true }),
        });
        const data = await res.json();
        toast.dismiss("voice-stock-p");
        if (!res.ok) { toast.error(data.error || tm("analyzeFailed")); return; }
        // "Onayla / Düzelt" ile teyit edilmeden hiçbir stok yazılmaz — yanlış
        // duyulan miktar/fiyat sessizce stoğa işlenmesin (randevu akışındaki
        // aynı doğrulama deseni).
        if (data.actionTaken === "confirm_inventory" && data.parsed) {
          setVoiceParsed(data.parsed);
          setVoiceConfirmResponse(data.response || "");
          setIsConfirmingInventory(true);
        } else if (data.response) {
          toast(data.response, { icon: "📦", duration: 7000 });
        } else {
          toast.error(tm("notUnderstood"));
        }
      } catch {
        toast.dismiss("voice-stock-p");
        toast.error(tm("analyzeFailed"));
      }
    };

    rec.start();
  }, [proTools, requestMic, speechLang, tm]);

  const cancelVoiceInventory = useCallback(() => {
    setIsConfirmingInventory(false);
    setVoiceParsed(null);
    setVoiceConfirmResponse("");
  }, []);

  const confirmVoiceInventory = useCallback(async () => {
    if (!voiceParsed) return;
    setConfirmingInventoryBusy(true);
    try {
      const res = await fetch("/api/ai/voice-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "inventory", confirmedInventory: voiceParsed }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || tm("analyzeFailed")); return; }
      if (data.actionTaken === "inventory_updated" || data.actionTaken === "inventory_added") {
        toast.success(data.response);
        if (data.lowStock) toast(tm("stockLow"), { icon: "⚠️", duration: 8000 });
        fetchData();
        // Bu sayfa kendi state'ini /api/inventory'den ayrı çekiyor —
        // dashboard/layout.tsx'teki kritik stok şeridi ve Sidebar/MobileNav
        // rozeti (lowStockCount/pendingWorkCount) AYRI bir server sorgusu,
        // router.refresh() olmadan güncellenmez.
        router.refresh();
      } else {
        toast.error(data.response || tm("analyzeFailed"));
      }
    } catch {
      toast.error(tm("analyzeFailed"));
    } finally {
      setConfirmingInventoryBusy(false);
      setIsConfirmingInventory(false);
      setVoiceParsed(null);
      setVoiceConfirmResponse("");
    }
  }, [voiceParsed, tm, fetchData, router]);

  // Eller serbest: özet açılınca "onayla" veya "düzelt" komutlarını dinler —
  // randevu oluşturmadaki aynı hook, stok sesli komutunda eksik alan kavramı
  // olmadığı için tamamlama komutu düzelt ile aynı davranır (yeniden dinler).
  const { cmdListening: invCmdListening, stopCmd: stopInvCmd } = useVoiceConfirmCommand({
    active: proTools && isConfirmingInventory,
    hasMissing: false,
    speechLang,
    onConfirm: confirmVoiceInventory,
    onEdit: cancelVoiceInventory,
    onCompleteMissing: startVoiceStock,
    toasts: {
      listening: tm("voiceCmdListening"),
      confirmed: tm("voiceCmdConfirmed"),
      editing: tm("voiceCmdCancelled"),
      notUnderstood: tm("voiceCmdNotUnderstood"),
    },
    onToast: (m) => toast(m, { icon: "🎙️", duration: 4000 }),
  });

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
        barcode: item.barcode || "",
      });
    } else {
      setEditingItem(null);
      setItemForm(EMPTY_ITEM);
    }
    setShowFormScanner(false);
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
          barcode: itemForm.barcode.trim(),
        }),
      });
      if (res.ok) {
        toast.success(isEdit ? "Ürün güncellendi" : "Yeni ürün eklendi");
        setShowItemModal(false);
        fetchData();
        router.refresh();
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
        router.refresh();
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
    setTxForm({
      type,
      quantity: "1",
      unit_price: type === "in" ? String(item.cost_price || "") : type === "out" ? String(item.sale_price || "") : "",
      note: "",
    });
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
          unit_price: txForm.unit_price ? Number(txForm.unit_price) : null,
          note: txForm.note,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Stok hareketi kaydedildi");
        if (d.lowStock) toast(tb("nowLow", { name: txTargetItem.name }), { icon: "⚠️", duration: 8000 });
        setShowTxModal(false);
        fetchData();
        router.refresh();
      } else {
        toast.error(d.error || "İşlem başarısız");
      }
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setSavingTx(false);
    }
  }

  // ── Barkodla satış akışı ──
  const openBarcodeSell = useCallback(() => {
    setBarcodeSellItem(null);
    setBarcodeUnknown(null);
    setBarcodeSellQty("1");
    setBarcodeSellPrice("");
    setShowBarcodeSell(true);
  }, []);

  const handleBarcodeDetected = useCallback(async (code: string) => {
    setBarcodeLookupLoading(true);
    setBarcodeUnknown(null);
    try {
      const res = await fetch(`/api/inventory/barcode-lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.item) {
        setBarcodeSellItem(data.item as InventoryItem);
        setBarcodeSellQty("1");
        setBarcodeSellPrice(String(data.item.sale_price || ""));
      } else {
        setBarcodeSellItem(null);
        setBarcodeUnknown(code);
      }
    } catch {
      toast.error(tb("lookupFailed"));
    } finally {
      setBarcodeLookupLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBarcodeSell = useCallback(async () => {
    if (!barcodeSellItem) return;
    const qty = Number(barcodeSellQty);
    if (!qty || qty <= 0) { toast.error(tb("invalidQty")); return; }
    setBarcodeSelling(true);
    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: barcodeSellItem.id,
          type: "out",
          quantity: qty,
          unit_price: barcodeSellPrice ? Number(barcodeSellPrice) : null,
          note: tb("saleNote"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(tb("sold", { name: barcodeSellItem.name, qty }));
        if (data.lowStock) toast(tb("nowLow", { name: barcodeSellItem.name }), { icon: "⚠️", duration: 8000 });
        setBarcodeSellItem(null);
        setBarcodeUnknown(null);
        fetchData();
        router.refresh();
      } else {
        toast.error(data.error || tb("sellFailed"));
      }
    } catch {
      toast.error(tb("sellFailed"));
    } finally {
      setBarcodeSelling(false);
    }
  }, [barcodeSellItem, barcodeSellQty, barcodeSellPrice, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const linkUnknownToProduct = useCallback(() => {
    if (!barcodeUnknown) return;
    setShowBarcodeSell(false);
    setEditingItem(null);
    setItemForm({ ...EMPTY_ITEM, barcode: barcodeUnknown });
    setShowFormScanner(false);
    setShowItemModal(true);
  }, [barcodeUnknown]);

  const handleGenerateBarcode = useCallback(async () => {
    setGeneratingBarcode(true);
    try {
      // Sunucu üretsin (çakışma kontrolü + kiracı-benzersiz). Kaydetmeden önizleme
      // için: yeni üründe geçici olarak PING atmayıp yalnızca kaydederken üretmek
      // yerine burada anlık üretim için hafif bir uç yok; bu yüzden formu
      // "üret" işareti ile kaydederiz. Basit yol: kaydı üret bayrağıyla POST/PUT.
      const isEdit = !!editingItem;
      if (!itemForm.name.trim()) { toast.error(tb("nameFirst")); return; }
      const res = await fetch("/api/inventory", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingItem.id } : {}),
          name: itemForm.name, category: itemForm.category, unit: itemForm.unit,
          current_stock: itemForm.current_stock, min_stock_alert: itemForm.min_stock_alert,
          cost_price: itemForm.cost_price, sale_price: itemForm.sale_price,
          generateBarcode: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.item) {
        setItemForm((f) => ({ ...f, barcode: data.item.barcode || "" }));
        setEditingItem(data.item as InventoryItem);
        toast.success(tb("generated"));
        fetchData();
      } else {
        toast.error(data.error || tb("generateFailed"));
      }
    } catch {
      toast.error(tb("generateFailed"));
    } finally {
      setGeneratingBarcode(false);
    }
  }, [editingItem, itemForm]); // eslint-disable-line react-hooks/exhaustive-deps

  const printBarcodeLabel = useCallback(async (item: InventoryItem) => {
    if (!item.barcode) return;
    try {
      const dataUrl = await QRCode.toDataURL(item.barcode, { width: 320, margin: 1 });
      const w = window.open("", "_blank", "width=420,height=520");
      if (!w) return;
      w.document.write(
        `<html><head><title>${item.name}</title></head>` +
        `<body style="font-family:system-ui,sans-serif;text-align:center;padding:24px;margin:0">` +
        `<img src="${dataUrl}" style="width:220px;height:220px" alt="barcode"/>` +
        `<div style="font-size:15px;font-weight:600;margin-top:8px">${item.name}</div>` +
        `<div style="font-family:monospace;font-size:13px;color:#555;margin-top:2px">${item.barcode}</div>` +
        `<button onclick="window.print()" style="margin-top:16px;padding:8px 20px;font-size:14px;cursor:pointer">Yazdır</button>` +
        `</body></html>`
      );
      w.document.close();
    } catch {
      toast.error(tb("printFailed"));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Select bileşeninin gövdesi (children) açıkça verilmezse, seçili değerin
  // etiketini içerideki öğelerden otomatik çözmeye çalışıyor; ama JSX içerik
  // her zaman güvenilir eşleşmiyor ve ham value ("out" gibi) görünebiliyor.
  // Bu yüzden etiketleri burada tanımlayıp SelectValue'a açıkça veriyoruz.
  const UNIT_OPTIONS = [
    { value: "adet", label: t("stockPage.unitPcs") },
    { value: "şişe", label: t("stockPage.unitBottle") },
    { value: "kutu", label: t("stockPage.unitBox") },
    { value: "tüp", label: t("stockPage.unitTube") },
    { value: "ml", label: "ml" },
    { value: "gram", label: t("stockPage.unitGram") },
  ];
  const unitLabel = (v: string) => UNIT_OPTIONS.find((o) => o.value === v)?.label ?? v;

  const TX_TYPE_OPTIONS: { value: "in" | "out" | "adjust"; icon: string; label: string }[] = [
    { value: "in", icon: "➕", label: t("stockPage.txTypeIn") },
    { value: "out", icon: "➖", label: t("stockPage.txTypeOut") },
    { value: "adjust", icon: "✏️", label: t("stockPage.txTypeAdjust") },
  ];
  const txTypeLabel = (v: string) => {
    const opt = TX_TYPE_OPTIONS.find((o) => o.value === v);
    return opt ? `${opt.icon} ${opt.label}` : v;
  };

  const getStokText = (key: string) => t(`stockPage.${key}`);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {proTools && micDialog}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary/70">{t("stockPage.eyebrow")}</span>
            <HomeButton />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            {t("stockPage.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("stockPage.subtitle")}</p>
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
              {getStokText("loadTemplate")}
            </Button>
          )}
          {proTools && (
            <Button
              variant="outline"
              onClick={startVoiceStock}
              disabled={voiceListening}
              className={`gap-2 text-primary border-primary/20 hover:bg-primary/5 hover:text-primary ${voiceListening ? "border-red-500 text-red-500 animate-pulse" : ""}`}
              title={tm("stockHint")}
            >
              <Mic className="h-4 w-4" />
              {tm("fillByVoice")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={openBarcodeSell}
            className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20"
          >
            <ScanLine className="h-4 w-4" />
            {tb("scanSell")}
          </Button>
          <Button onClick={() => openItemForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            {getStokText("newProduct")}
          </Button>
        </div>
      </div>

      {/* Voice Listening Alert */}
      {voiceListening && !isConfirmingInventory && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold flex items-center gap-2">
              <Mic className="h-4 w-4 text-red-500 animate-pulse" />
              {tm("stockListening")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => voiceRecRef.current?.stop?.()}
              className="h-7 px-2 text-xs hover:bg-red-500/20 text-red-600 shrink-0"
            >
              {tm("finishListening")}
            </Button>
          </div>
          {voiceLiveTranscript && (
            <p className="text-[11px] text-foreground/80 bg-background/60 rounded-lg px-2.5 py-1.5">
              <span className="opacity-60">{tm("heard")}: </span>{voiceLiveTranscript}
            </p>
          )}
        </div>
      )}

      {/* Voice Confirmation Box */}
      {isConfirmingInventory && voiceParsed && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Check className="h-4 w-4" />
            {tm("confirmTitle")}
          </h3>
          <p className="text-sm text-foreground/90">{voiceConfirmResponse}</p>
          {invCmdListening && (
            <div className="flex items-center justify-between gap-2 text-[11px] rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2 text-red-600">
              <span className="flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 animate-pulse" />
                {tm("voiceCmdListening")}
              </span>
              <button type="button" onClick={stopInvCmd} className="underline shrink-0">
                {tm("voiceCmdStop")}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={confirmVoiceInventory}
              disabled={confirmingInventoryBusy}
              className="flex-1 min-w-[120px] gap-1.5"
            >
              {confirmingInventoryBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {tm("confirmSave")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={cancelVoiceInventory}
              disabled={confirmingInventoryBusy}
              className="flex-1 min-w-[100px]"
            >
              {tm("confirmEdit")}
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="kpi-tile border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{getStokText("totalProducts")}</p>
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
              <p className="text-xs text-muted-foreground font-medium">{getStokText("criticalStock")}</p>
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
              <p className="text-xs text-muted-foreground font-medium">{getStokText("totalStockValue")}</p>
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
            placeholder={t("stockPage.searchPlaceholder")}
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
            {t("stockPage.allCategories")} ({items.length})
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
              <p className="text-sm text-muted-foreground">{t("stockPage.noProductsYet")}</p>
              <Button size="sm" onClick={() => openItemForm()} className="gap-2">
                <Plus className="h-4 w-4" /> {t("stockPage.addProduct")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="p-3 pl-4">{t("stockPage.productName")}</th>
                    <th className="p-3">{t("stockPage.categoryLabel")}</th>
                    <th className="p-3 text-center">{t("stockPage.stockStatus")}</th>
                    <th className="p-3 text-right">{t("stockPage.costPrice")}</th>
                    <th className="p-3 text-right">{t("stockPage.salePrice")}</th>
                    <th className="p-3 text-right pr-4">{t("stockPage.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const isCritical = Number(item.current_stock) <= Number(item.min_stock_alert);
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="p-3 pl-4 font-medium">
                          <p className="leading-snug">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t("stockPage.unitShort")}: {item.unit}</p>
                          {item.barcode && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                              <BarcodeIcon className="h-3 w-3" />
                              {item.barcode}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {item.category || t("stockPage.generalCategory")}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`font-bold tabular-nums text-sm ${isCritical ? "text-amber-600 dark:text-amber-400" : ""}`}>
                              {item.current_stock} {item.unit}
                            </span>
                            {isCritical && (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {t("stockPage.criticalLimit")} ({item.min_stock_alert})
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
                              title={t("stockPage.stockInOut")}
                              onClick={() => openTxModal(item, "in")}
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              {t("stockPage.stockInOutShort")}
                            </Button>
                            {item.barcode && isInternalBarcode(item.barcode) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                title={tb("printLabel")}
                                onClick={() => printBarcodeLabel(item)}
                              >
                                <Printer className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title={t("stockPage.editBtn")}
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
              {editingItem 
                ? t("stockPage.editProduct")
                : t("stockPage.newProduct")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>{t("stockPage.productName")} *</Label>
              <Input
                className="mt-1"
                placeholder={t("stockPage.productNamePlaceholder")}
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("stockPage.categoryLabel")}</Label>
                <Input
                  className="mt-1"
                  placeholder={t("stockPage.categoryPlaceholder")}
                  value={itemForm.category}
                  onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t("stockPage.unitOfMeasure")}</Label>
                <Select value={itemForm.unit} onValueChange={(v) => setItemForm((f) => ({ ...f, unit: v || "adet" }))}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue>{(v: string) => unitLabel(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("stockPage.currentStock")}</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={itemForm.current_stock}
                  onChange={(e) => setItemForm((f) => ({ ...f, current_stock: stripLeadingZero(e.target.value) }))}
                />
              </div>
              <div>
                <Label>{t("stockPage.criticalStock")}</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={itemForm.min_stock_alert}
                  onChange={(e) => setItemForm((f) => ({ ...f, min_stock_alert: stripLeadingZero(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("stockPage.costPrice")} ({CURRENCY_SYMBOL[currency] ?? "₺"})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.5"
                  value={itemForm.cost_price}
                  onChange={(e) => setItemForm((f) => ({ ...f, cost_price: stripLeadingZero(e.target.value) }))}
                />
              </div>
              <div>
                <Label>{t("stockPage.salePrice")} ({CURRENCY_SYMBOL[currency] ?? "₺"})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.5"
                  value={itemForm.sale_price}
                  onChange={(e) => setItemForm((f) => ({ ...f, sale_price: stripLeadingZero(e.target.value) }))}
                />
              </div>
            </div>

            {/* Barkod */}
            <div>
              <Label>{tb("field")}</Label>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <BarcodeIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 font-mono"
                    placeholder={tb("fieldPlaceholder")}
                    value={itemForm.barcode}
                    onChange={(e) => setItemForm((f) => ({ ...f, barcode: e.target.value }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setShowFormScanner((s) => !s)}
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  {tb("scan")}
                </Button>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  disabled={generatingBarcode}
                  className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 disabled:opacity-50"
                >
                  {generatingBarcode ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {tb("generate")}
                </button>
                {itemForm.barcode && isInternalBarcode(itemForm.barcode.trim().toUpperCase()) && editingItem && (
                  <button
                    type="button"
                    onClick={() => editingItem && printBarcodeLabel({ ...editingItem, barcode: itemForm.barcode.trim().toUpperCase() })}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    <Printer className="h-3 w-3" />
                    {tb("printLabel")}
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{tb("fieldHint")}</p>
              {showFormScanner && (
                <div className="mt-2 rounded-lg border border-border p-2">
                  <BarcodeScanner
                    onDetect={(code) => {
                      setItemForm((f) => ({ ...f, barcode: code }));
                      setShowFormScanner(false);
                      toast.success(tb("scanned", { code }));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowItemModal(false)}>
              {t("stockPage.cancel")}
            </Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingItem
                ? t("stockPage.update")
                : t("stockPage.save")}
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
              {t("stockPage.stockTransactionTitle")}: {txTargetItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>{t("stockPage.transactionType")}</Label>
              <Select
                value={txForm.type}
                onValueChange={(v) => {
                  const newType = v as "in" | "out" | "adjust";
                  setTxForm((f) => ({
                    ...f,
                    type: newType,
                    unit_price:
                      newType === "in"
                        ? String(txTargetItem?.cost_price || "")
                        : newType === "out"
                        ? String(txTargetItem?.sale_price || "")
                        : "",
                  }));
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: string) => txTypeLabel(v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.icon} {o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{txForm.type === "adjust" ? t("stockPage.newStockLevel") : t("stockPage.quantity")}</Label>
              <Input
                className="mt-1"
                type="number"
                min="0.1"
                step="1"
                value={txForm.quantity}
                onChange={(e) => setTxForm((f) => ({ ...f, quantity: stripLeadingZero(e.target.value) }))}
              />
            </div>

            {txForm.type !== "adjust" && (
              <div>
                <Label>{t("stockPage.unitPrice")} ({CURRENCY_SYMBOL[currency] ?? "₺"})</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.5"
                  value={txForm.unit_price}
                  onChange={(e) => setTxForm((f) => ({ ...f, unit_price: stripLeadingZero(e.target.value) }))}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t(txForm.type === "in" ? "stockPage.defaultPriceNoteCost" : "stockPage.defaultPriceNoteSale", {
                    price: fmt(Number(txForm.type === "in" ? txTargetItem?.cost_price : txTargetItem?.sale_price) || 0),
                  })}
                </p>
              </div>
            )}

            <div>
              <Label>{t("stockPage.descNoteLabel")}</Label>
              <Input
                className="mt-1"
                placeholder={t("stockPage.descNotePlaceholder")}
                value={txForm.note}
                onChange={(e) => setTxForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTxModal(false)}>
              {t("stockPage.cancel")}
            </Button>
            <Button onClick={handleSaveTx} disabled={savingTx}>
              {savingTx && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("stockPage.saveTransaction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barkodla Satış */}
      <Dialog open={showBarcodeSell} onOpenChange={setShowBarcodeSell}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-emerald-600" />
              {tb("scanTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {!barcodeSellItem && (
              <BarcodeScanner onDetect={handleBarcodeDetected} busy={barcodeLookupLoading} />
            )}

            {barcodeLookupLoading && (
              <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tb("looking")}
              </div>
            )}

            {barcodeUnknown && !barcodeSellItem && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                <p className="font-medium text-amber-800 dark:text-amber-300">{tb("notLinked")}</p>
                <p className="mt-0.5 font-mono text-xs text-amber-700 dark:text-amber-400">{barcodeUnknown}</p>
                <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={linkUnknownToProduct}>
                  <Plus className="h-3.5 w-3.5" /> {tb("linkToProduct")}
                </Button>
              </div>
            )}

            {barcodeSellItem && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold leading-snug">{barcodeSellItem.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{barcodeSellItem.barcode}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={Number(barcodeSellItem.current_stock) <= Number(barcodeSellItem.min_stock_alert) ? "text-amber-600 border-amber-300" : ""}
                  >
                    {tb("remaining")}: {barcodeSellItem.current_stock} {barcodeSellItem.unit}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{tb("qtyLabel")}</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="1"
                      step="1"
                      value={barcodeSellQty}
                      onChange={(e) => setBarcodeSellQty(stripLeadingZero(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>{tb("priceLabel")} ({CURRENCY_SYMBOL[currency] ?? "₺"})</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      step="0.5"
                      value={barcodeSellPrice}
                      onChange={(e) => setBarcodeSellPrice(stripLeadingZero(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => { setBarcodeSellItem(null); setBarcodeUnknown(null); }}
                    className="text-xs text-muted-foreground underline underline-offset-2"
                  >
                    {tb("scanAnother")}
                  </button>
                  <Button onClick={handleBarcodeSell} disabled={barcodeSelling} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                    {barcodeSelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownRight className="h-4 w-4" />}
                    {tb("sell")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
