"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export default function MusteriYeniPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    birth_date: "",
    gender: "",
    notes: "",
    preferred_language: "",
  });
  const [dupMatch, setDupMatch] = useState<{ id: string; full_name: string } | null>(null);
  const phoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aynı telefonla mükerrer müşteri kaydı açmayı önlemek için — yazarken var olan
  // eşleşmeyi proaktif gösterir; kesin engel zaten POST /api/customers'ta (409).
  function checkDuplicatePhone(phone: string) {
    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) { setDupMatch(null); return; }
    phoneTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(phone)}&limit=5`);
        const json = await res.json();
        const hit = ((json.customers ?? []) as { id: string; full_name: string; phone: string }[]).find(
          (c) => c.phone.replace(/\D/g, "").endsWith(digits.slice(-9))
        );
        setDupMatch(hit ? { id: hit.id, full_name: hit.full_name } : null);
      } catch {
        setDupMatch(null);
      }
    }, 350);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("İsim zorunlu");
    if (!form.phone.trim()) return toast.error("Telefon zorunlu");

    setLoading(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        notes: form.notes.trim() || null,
        preferred_language: form.preferred_language || null,
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Müşteri eklendi");
      router.push("/dashboard/musteriler");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "Hata oluştu");
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/musteriler" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold brand-gradient-text">{t("customerNew.title")}</h1>
      </div>

      <Card className="kpi-tile border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("customerNew.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Ad Soyad *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Müşteri adı soyadı"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Telefon *</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: e.target.value }));
                    checkDuplicatePhone(e.target.value);
                  }}
                  placeholder="5xx xxx xx xx"
                  required
                />
                {dupMatch && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">
                      Bu telefon <strong>{dupMatch.full_name}</strong> adına zaten kayıtlı.
                    </span>
                    <Link href={`/dashboard/musteriler/${dupMatch.id}`} className="underline shrink-0">
                      Görüntüle →
                    </Link>
                  </div>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="musteri@ornek.com"
                />
              </div>
              <div className="space-y-1">
                <Label>Doğum Tarihi</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Cinsiyet</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v ?? "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kadin">Kadın</SelectItem>
                    <SelectItem value="erkek">Erkek</SelectItem>
                    <SelectItem value="diger">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tercih Edilen Dil</Label>
                <Select
                  value={form.preferred_language}
                  onValueChange={(v) => setForm((f) => ({ ...f, preferred_language: v ?? "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Belirtilmedi" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notlar</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Özel not veya bilgi..."
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("customerNew.submitButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
