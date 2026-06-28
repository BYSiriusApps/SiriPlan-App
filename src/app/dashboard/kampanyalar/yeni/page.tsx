"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Megaphone } from "lucide-react";

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
  const [form, setForm] = useState({
    name: "",
    type: "birthday",
    message_template: TEMPLATES.birthday,
    channel: "whatsapp",
    inactive_days: "60",
    scheduled_at: "",
  });

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
    if (!form.name.trim()) return toast.error("Kampanya adı zorunlu");
    if (!form.message_template.trim()) return toast.error("Mesaj şablonu zorunlu");

    const segment: Record<string, unknown> = {};
    if (form.type === "inactive") {
      segment.inactive_days = parseInt(form.inactive_days) || 60;
    }

    setLoading(true);
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
    setLoading(false);

    if (res.ok) {
      toast.success("Kampanya oluşturuldu");
      router.push("/dashboard/kampanyalar");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata oluştu");
    }
  }

  const vars = VARIABLES[form.type] || [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/kampanyalar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Yeni Kampanya</h1>
      </div>

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

        <Card className="border-0 shadow-sm">
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Kampanya Oluştur
        </Button>
      </form>
    </div>
  );
}
