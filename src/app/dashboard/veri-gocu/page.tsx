"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Upload, FileText, CheckCircle2, Loader2, ArrowRight, Sheet, Printer } from "lucide-react";
import { HomeButton } from "@/components/dashboard/HomeButton";

const IMPORT_SOURCES = [
  { id: "salonappy", name: "Randevu Programı", icon: "💆", color: "border-orange-200 dark:border-orange-800" },
  { id: "arvengo", name: "Diğer Yazılım", icon: "📅", color: "border-blue-200 dark:border-blue-800" },
  { id: "excel", name: "Excel / CSV", icon: "📊", color: "border-green-200 dark:border-green-800" },
];

export default function VeriGocuPage() {
  const t = useTranslations("dashboard");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<"json" | "csv" | "excel" | "pdf" | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  async function handleExport(format: "json" | "csv" | "excel" | "pdf") {
    setExporting(format);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error();

      if (format === "pdf") {
        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
        }
        setExporting(null);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = format === "json"
        ? `siriplan-export-${today}.json`
        : format === "excel"
        ? `siriplan-export-${today}.xlsx`
        : `musteriler-${today}.csv`;
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
        // Zaten kayıtlı olanlar "aktarılmadı" değil "mükerrer" — kullanıcı 0
        // kayıt gördüğünde dosyasında mı yoksa sistemde mi sorun var bilmeli.
        const parts: string[] = [];
        if (data.duplicates) parts.push(`${data.duplicates} kayıt zaten mevcuttu`);
        if (data.skipped) parts.push(`${data.skipped} satır atlandı`);
        const detail = parts.length ? ` (${parts.join(", ")})` : "";
        if (data.imported > 0) {
          toast.success(`${data.imported} kayıt başarıyla aktarıldı!${detail}`);
        } else {
          toast.info(`Yeni kayıt eklenmedi.${detail}`);
        }
      } else {
        toast.error(data.error || "İçe aktarma başarısız.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    }
    setImporting(false);
  }

  const isTr = t("guide").includes("Kılavuzu");
  const isEn = t("guide").includes("User Guide");
  const isRu = t("guide").includes("Руководство");

  const getMigrateText = (key: string) => {
    if (key === "downloadTitle") return isTr ? "Verilerimi İndir" : isEn ? "Download My Data" : isRu ? "Скачать мои данные" : "تحميل بياناتي";
    if (key === "downloadDesc") return isTr ? "Tüm verileriniz size aittir. İstediğiniz zaman indirin." : isEn ? "All your data belongs to you. Download it anytime." : isRu ? "Все ваши данные принадлежат вам. Скачивайте в любое время." : "جميع بياناتك ملك لك. قم بتحميلها في أي وقت.";
    if (key === "excelInfo") return isTr ? "Excel: müşteriler, hizmetler, personel ve randevuları ayrı sayfalarda içerir. PDF: tarayıcı yazdırma ile kaydedin." : isEn ? "Excel: includes customers, services, staff and appointments on separate sheets. PDF: save via browser printing." : isRu ? "Excel: включает клиентов, услуги, персонал и записи на отдельных листах. PDF: сохраните через печать браузера." : "Excel: يتضمن العملاء والخدمات والموظفين والمواعيد في أوراق منفصلة. PDF: حفظ عبر طباعة المتصفح.";
    if (key === "importTitle") return isTr ? "Veri Aktar" : isEn ? "Import Data" : isRu ? "Импорт данных" : "استيراد البيانات";
    if (key === "importDesc") return isTr ? "Başka bir uygulamadan müşteri ve randevu verilerinizi aktarın" : isEn ? "Transfer your customer and appointment data from another application" : isRu ? "Перенесите данные клиентов и записей из другого приложения" : "انقل بيانات العملاء والمواعيد الخاصة بك من تطبيق آخر";
    if (key === "selectSource") return isTr ? "Kaynak seçin:" : isEn ? "Select source:" : isRu ? "Выберите источник:" : "اختر المصدر:";
    if (key === "dragDrop") return isTr ? "CSV, Excel veya JSON dosyası seçin" : isEn ? "Select CSV, Excel or JSON file" : isRu ? "Выберите файл CSV, Excel или JSON" : "حدد ملف CSV أو Excel أو JSON";
    if (key === "dragDropSub") return isTr ? "veya sürükle-bırak" : isEn ? "or drag and drop" : isRu ? "или перетащите сюда" : "أو قم بالسحب والإفلات";
    if (key === "importing") return isTr ? "İçe aktarılıyor..." : isEn ? "Importing..." : isRu ? "Импортирование..." : "جاري الاستيراد...";
    if (key === "migrateTitle") return isTr ? "Rakip uygulamadan geçiş yapmak mı istiyorsunuz?" : isEn ? "Do you want to switch from a competitor app?" : isRu ? "Хотите перейти из другого приложения?" : "هل تريد الانتقال من تطبيق منافس؟";
    return "";
  };

  const steps = [
    isTr ? "Yukarıdan kaynak seçin" : isEn ? "Select source above" : isRu ? "Выберите источник выше" : "اختر المصدر أعلاه",
    isTr ? "CSV, Excel veya JSON dosyanızı yükleyin" : isEn ? "Upload your CSV, Excel or JSON file" : isRu ? "Загрузите файл CSV, Excel или JSON" : "قم بتحميل ملف CSV أو Excel أو JSON",
    isTr ? "Verileriniz otomatik aktarılır" : isEn ? "Your data is imported automatically" : isRu ? "Данные импортируются автоматически" : "يتم استيراد بياناتك تلقائياً",
    isTr ? "Ziyaret ve harcama geçmişi korunur" : isEn ? "Visit and spending history is preserved" : isRu ? "История визитов и расходов сохраняется" : "يتم الحفاظ على تاريخ الزيارات والإنفاق",
  ];

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("dataMigrationPage.eyebrow")}</span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("dataMigrationPage.title")}</h1>
          </div>
          <HomeButton />
        </div>
        <p className="text-muted-foreground text-sm mt-1">{t("dataMigrationPage.subtitle")}</p>
      </div>

      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            {getMigrateText("downloadTitle")}
          </CardTitle>
          <CardDescription>{getMigrateText("downloadDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport("json")}
              disabled={!!exporting}
            >
              {exporting === "json" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              JSON ({isTr ? "Tam Veri" : isEn ? "Full Data" : isRu ? "Полные данные" : "بيانات كاملة"})
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport("csv")}
              disabled={!!exporting}
            >
              {exporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV ({isTr ? "Müşteriler" : isEn ? "Customers" : isRu ? "Клиенты" : "العملاء"})
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport("excel")}
              disabled={!!exporting}
            >
              {exporting === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sheet className="h-4 w-4 text-green-600" />}
              Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport("pdf")}
              disabled={!!exporting}
            >
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 text-red-500" />}
              PDF ({isTr ? "Yazdır" : isEn ? "Print" : isRu ? "Печать" : "طباعة"})
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {getMigrateText("excelInfo")}
          </p>
        </CardContent>
      </Card>

      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            {getMigrateText("importTitle")}
          </CardTitle>
          <CardDescription>{getMigrateText("importDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium">{getMigrateText("selectSource")}</p>
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
                <p className="text-sm font-medium">
                  {src.id === "salonappy" ? (isTr ? "Randevu Programı" : isEn ? "Booking App" : isRu ? "Программа записей" : "برنامج المواعيد") : src.id === "arvengo" ? (isTr ? "Diğer Yazılım" : isEn ? "Other Software" : isRu ? "Другое ПО" : "برنامج آخر") : "Excel / CSV"}
                </p>
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
                  <strong>{isTr ? "Not" : isEn ? "Note" : isRu ? "Примечание" : "ملاحظة"}:</strong>{" "}
                  {selectedSource === "salonappy" && (isTr ? "Randevu programınızdan CSV olarak veri dışa aktarın: Ayarlar → Veri Dışa Aktar" : isEn ? "Export data as CSV from your booking program: Settings → Export Data" : isRu ? "Экспортируйте данные в формате CSV: Настройки → Экспорт данных" : "قم بتصدير البيانات بتنسيق CSV من برنامج المواعيد: الإعدادات ← تصدير البيانات")}
                  {selectedSource === "arvengo" && (isTr ? "Mevcut yazılımınızdan dışa aktarın: Panel → Raporlar → Excel veya CSV İndir" : isEn ? "Export from your current software: Panel → Reports → Download Excel or CSV" : isRu ? "Экспортируйте из текущего ПО: Панель → Отчеты → Скачать Excel или CSV" : "قم بالتصدير من برنامجك الحالي: لوحة التحكم ← التقارير ← تنزيل Excel أو CSV")}
                  {selectedSource === "excel" && (isTr ? "Sütun başlıkları: Ad Soyad, Telefon (zorunlu) · E-posta, Doğum Tarihi, Notlar, Toplam Ziyaret, Toplam Harcama, Son Ziyaret (opsiyonel). CSV, Excel ve JSON desteklenir." : isEn ? "Column headers: Full Name, Phone (required) · Email, Birth Date, Notes, Total Visits, Total Spend, Last Visit (optional). CSV, Excel, and JSON are supported." : isRu ? "Заголовки столбцов: ФИО, Телефон (обязательно) · Email, Дата рождения, Примечания, Всего визитов, Всего расходов, Последний визит (опционально). Поддерживаются CSV, Excel и JSON." : "عناوين الأعمدة: الاسم الكامل، الهاتف (مطلوب) · البريد الإلكتروني، تاريخ الميلاد، ملاحظات، إجمالي الزيارات، إجمالي الإنفاق، آخر زيارة (اختياري). يتم دعم ملفات CSV و Excel و JSON.")}
                </p>
              </div>

              <label className="block">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  importing ? "opacity-50 pointer-events-none" : "hover:border-primary/50 hover:bg-accent/50"
                }`}>
                  {importing ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm">{getMigrateText("importing")}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">{getMigrateText("dragDrop")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{getMigrateText("dragDropSub")}</p>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,.xlsm,.json,.txt"
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

      <Card className="border border-primary/15 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5 text-card-foreground">
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-3 text-foreground">{getMigrateText("migrateTitle")}</p>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="text-foreground">{step}</span>
                {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
