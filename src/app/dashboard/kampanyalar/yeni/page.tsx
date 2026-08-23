"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Megaphone, Users, Search, X, Check, AlertCircle } from "lucide-react";

import { maskPhone } from "@/lib/phone";

interface PickerCustomer {
  id: string;
  full_name: string;
  phone: string;
  marketing_consent: boolean;
  score: number;
}

const CAMPAIGN_TYPES = [
  { value: "birthday", label: "🎂 Doğum Günü", desc: "Bugün doğum günü olan müşterilere otomatik mesaj" },
  { value: "inactive", label: "💤 İnaktif Müşteri", desc: "Belirli gün içinde gelmeyen müşterileri geri çek" },
  { value: "custom", label: "✏️ Özel Kampanya", desc: "Seçtiğin segmente serbest mesaj gönder" },
];

const VARIABLES: Record<string, string[]> = {
  birthday: ["{{musteri_adi}}", "{{salon_adi}}", "{{indirim_kodu}}"],
  inactive: ["{{musteri_adi}}", "{{salon_adi}}", "{{son_ziyaret_gun}}", "{{indirim_kodu}}"],
  custom: ["{{musteri_adi}}", "{{salon_adi}}"],
};

const TEMPLATES: Record<string, string> = {
  birthday: "Merhaba {{musteri_adi}}! 🎂 Doğum günün kutlu olsun! {{salon_adi}} olarak seni özel hissettirmek istiyoruz. Bu ay %20 indirim fırsatını kaçırma! 💇‍♀️",
  inactive: "Merhaba {{musteri_adi}}, sizi {{son_ziyaret_gun}} gündür göremediniz 😊 {{salon_adi}} olarak sizi tekrar ağırlamak isteriz. Size özel indirimle randevunuzu şimdi alın!",
  custom: "Merhaba {{musteri_adi}}, {{salon_adi}} olarak size özel bir kampanyamız var!",
};

export default function YeniKampanyaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "birthday",
    message_template: TEMPLATES.birthday,
    channel: "whatsapp",
    inactive_days: "60",
    scheduled_at: "",
  });
  const [kvkkConsent, setKvkkConsent] = useState(false);

  // ── Hedef müşteri seçimi (filtreleme + seçme) ──
  const [customers, setCustomers] = useState<PickerCustomer[]>([]);
  const [custSearch, setCustSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all");

  const [role, setRole] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch("/api/customers?limit=500")
      .then((r) => r.json())
      .then((d) => setCustomers(
        ((d.customers ?? []) as PickerCustomer[]).filter((c) => c.marketing_consent)
      ))
      .catch(() => {});

    fetch("/api/org")
      .then((r) => r.json())
      .then((d) => {
        setRole(d.role || null);
        setSettings(d.org?.settings_json || {});
      })
      .catch(() => {});
  }, []);

  const staffPhoneAccess = "staff_phone_access" in settings ? !!settings.staff_phone_access : true;
  const showPhone = role !== "staff" || staffPhoneAccess;

  const filteredCustomers = useMemo(() => {
    const q = custSearch.trim().toLocaleLowerCase("tr");
    if (!q) return customers;
    return customers.filter(
      (c) => c.full_name.toLocaleLowerCase("tr").includes(q) || (c.phone ?? "").includes(q)
    );
  }, [customers, custSearch]);

  function toggleCustomer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleTypeChange(type: string) {
    setForm((f) => ({
      ...f,
      type,
      message_template: TEMPLATES[type] || "",
    }));
  }

  function insertVariable(v: string) {
    setForm((f) => ({ ...f, message_template: f.message_template + " " + v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!form.name.trim()) return toast.error("Kampanya adı zorunlu");
    if (!form.message_template.trim()) return toast.error("Mesaj şablonu zorunlu");
    if (!kvkkConsent) return toast.error("KVKK onayı zorunludur. Müşterilerin rızasını doğrulayın.");

    const segment: Record<string, unknown> = {};
    if (form.type === "inactive") {
      segment.inactive_days = parseInt(form.inactive_days) || 60;
    }
    // Elle müşteri seçildiyse kampanya yalnızca onlara gider
    if (targetMode === "selected") {
      if (selectedIds.size === 0) return toast.error("En az bir müşteri seçin veya 'Tüm onaylı müşteriler'i işaretleyin");
      segment.customer_ids = Array.from(selectedIds);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          message_template: form.message_template,
          channel: form.channel,
          segment_json: segment,
          scheduled_at: form.scheduled_at || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Kampanya oluşturuldu — şimdi gönderebilirsiniz");
        router.push(`/dashboard/kampanyalar/${data.campaign.id}?created=1`);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || "Kampanya oluşturulamadı, bilinmeyen bir hata oluştu";
        setSubmitError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Sunucuya ulaşılamadı, internet bağlantınızı kontrol edip tekrar deneyin";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const vars = VARIABLES[form.type] || [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/kampanyalar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold brand-gradient-text">Yeni Kampanya</h1>
      </div>

      {submitError && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-xl border-2 border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CAMPAIGN_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                form.type === t.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium text-sm">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Kampanya Detayları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Kampanya Adı *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="örn. Haziran Doğum Günleri"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kanal</Label>
                <Select value={form.channel} onValueChange={(v) => v && setForm((f) => ({ ...f, channel: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.type === "inactive" && (
                <div className="space-y-1">
                  <Label>İnaktiflik Süresi (gün)</Label>
                  <Input
                    type="number"
                    min="7"
                    max="365"
                    value={form.inactive_days}
                    onChange={(e) => setForm((f) => ({ ...f, inactive_days: e.target.value }))}
                  />
                </div>
              )}

              {form.type === "custom" && (
                <div className="space-y-1">
                  <Label>Gönderim Tarihi</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Message template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mesaj Şablonu *</Label>
                <span className="text-xs text-muted-foreground">{form.message_template.length} karakter</span>
              </div>
              <textarea
                className="w-full text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] bg-background"
                value={form.message_template}
                onChange={(e) => setForm((f) => ({ ...f, message_template: e.target.value }))}
                placeholder="Mesaj şablonunuzu yazın..."
                required
              />
              {/* Variable chips */}
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground self-center">Değişken ekle:</span>
                {vars.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Hedef Müşteriler: filtrele + seç ── */}
        <Card className="kpi-tile border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Hedef Müşteriler
              <span className="text-xs font-normal text-muted-foreground">
                ({customers.length} kampanya onaylı)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetMode("all")}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-colors text-left ${
                  targetMode === "all" ? "border-primary bg-primary/5" : "border-border text-muted-foreground"
                }`}
              >
                Tüm onaylı müşteriler
                <span className="block text-xs font-normal text-muted-foreground">{customers.length} kişi</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("selected")}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-colors text-left ${
                  targetMode === "selected" ? "border-primary bg-primary/5" : "border-border text-muted-foreground"
                }`}
              >
                Müşteri seç
                <span className="block text-xs font-normal text-muted-foreground">
                  {selectedIds.size > 0 ? `${selectedIds.size} kişi seçildi` : "Listeden filtrele ve seç"}
                </span>
              </button>
            </div>

            {targetMode === "selected" && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Müşteri filtrele (isim / telefon)..."
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    className="pl-8 pr-8"
                  />
                  {custSearch && (
                    <button
                      type="button"
                      onClick={() => setCustSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(filteredCustomers.map((c) => c.id)))}
                    className="px-2.5 py-1 rounded-lg border hover:bg-accent transition-colors"
                  >
                    Görünenleri Seç ({filteredCustomers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="px-2.5 py-1 rounded-lg border hover:bg-accent transition-colors text-muted-foreground"
                  >
                    Seçimi Temizle
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {customers.length === 0 ? "Kampanya onaylı müşteri yok" : "Filtreye uyan müşteri yok"}
                    </p>
                  ) : (
                    filteredCustomers.map((c) => {
                      const checked = selectedIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCustomer(c.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                            checked ? "bg-primary/5" : "hover:bg-accent"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              checked ? "bg-primary border-primary" : "border-border"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{c.full_name}</span>
                            <span className="block text-xs text-muted-foreground">{showPhone ? c.phone : maskPhone(c.phone)}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KVKK Consent */}
        <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20 cursor-pointer">
          <input
            type="checkbox"
            checked={kvkkConsent}
            onChange={(e) => setKvkkConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-orange-600 shrink-0"
          />
          <span className="text-sm text-orange-800 dark:text-orange-300">
            <strong>KVKK Onayı:</strong> Mesaj göndereceğim müşterilerin ticari elektronik ileti almaya ve kişisel verilerinin bu amaçla işlenmesine açık rıza gösterdiğini onaylıyorum. İşletmem gerekli KVKK metnini müşterilere sunmuş ve onay almıştır.
          </span>
        </label>

        <Button type="submit" className="w-full" disabled={loading || !kvkkConsent}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Kampanya Oluştur
        </Button>
      </form>
    </div>
  );
}
