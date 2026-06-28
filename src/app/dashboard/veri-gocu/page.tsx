"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Upload, FileText, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

const IMPORT_SOURCES = [
  { id: "salonappy", name: "SalonAppy", icon: "💆", color: "border-orange-200 dark:border-orange-800" },
  { id: "arvengo", name: "Arvengo", icon: "📅", color: "border-blue-200 dark:border-blue-800" },
  { id: "excel", name: "Excel / CSV", icon: "📊", color: "border-green-200 dark:border-green-800" },
];

export default function VeriGocuPage() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  async function handleExport(format: "json" | "csv") {
    setExporting(format);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json"
        ? `siriplan-export-${new Date().toISOString().slice(0, 10)}.json`
        : `musteriler-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Veriler indirildi!");
    } catch {
      toast.error("İndirme başarısız.");
    }
    setExporting(null);
  }

  async function handleImport(file: File) {
    if (!selectedSource) { toast.error("Lütfen kaynak seçin."); return; }
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", selectedSource);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.imported} kayıt başarıyla aktarıldı!`);
      } else {
        toast.error(data.error || "İçe aktarma başarısız.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    }
    setImporting(false);
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Veri Göçü</h1>
        <p className="text-muted-foreground text-sm">Verilerinizi aktarın veya güvenle indirin</p>
      </div>

      {/* Export section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Verilerimi İndir
          </CardTitle>
          <CardDescription>Tüm verileriniz size aittir. İstediğiniz zaman indirin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport("json")}
              disabled={exporting === "json"}
            >
              {exporting === "json" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              JSON (Tam Veri)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport("csv")}
              disabled={exporting === "csv"}
            >
              {exporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV (Müşteriler)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            JSON dosyası: tüm randevular, müşteriler, personel, hizmetler ve kampanyaları içerir.
          </p>
        </CardContent>
      </Card>

      {/* Import section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Veri Aktar
          </CardTitle>
          <CardDescription>Başka bir uygulamadan müşteri ve randevu verilerinizi aktarın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium">Kaynak seçin:</p>
          <div className="grid grid-cols-3 gap-3">
            {IMPORT_SOURCES.map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  selectedSource === src.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : `${src.color} hover:border-primary/50`
                }`}
              >
                <div className="text-2xl mb-1">{src.icon}</div>
                <p className="text-sm font-medium">{src.name}</p>
                {selectedSource === src.id && (
                  <CheckCircle2 className="h-4 w-4 text-primary mx-auto mt-1" />
                )}
              </button>
            ))}
          </div>

          {selectedSource && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Not:</strong>{" "}
                  {selectedSource === "salonappy" && "SalonAppy'den CSV olarak veri dışa aktarın: Ayarlar → Veri Dışa Aktar"}
                  {selectedSource === "arvengo" && "Arvengo'dan dışa aktarın: Panel → Raporlar → Excel İndir"}
                  {selectedSource === "excel" && "İlk sütun: Ad Soyad, İkinci: Telefon, Üçüncü: E-posta (opsiyonel)"}
                </p>
              </div>

              <label className="block">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  importing ? "opacity-50 pointer-events-none" : "hover:border-primary/50 hover:bg-accent/50"
                }`}>
                  {importing ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm">İçe aktarılıyor...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">CSV veya Excel dosyası seçin</p>
                      <p className="text-xs text-muted-foreground mt-1">veya sürükle-bırak</p>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    disabled={importing}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImport(file);
                    }}
                  />
                </div>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-fuchsia-50 dark:from-rose-950/30 dark:to-fuchsia-950/30">
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-3">Rakip uygulamadan geçiş yapmak mı istiyorsunuz?</p>
          <div className="space-y-2">
            {[
              "Yukarıdan kaynak seçin",
              "CSV dosyanızı yükleyin",
              "Verileriniz otomatik aktarılır",
              "Tüm geçmişiniz korunur",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <span>{step}</span>
                {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
