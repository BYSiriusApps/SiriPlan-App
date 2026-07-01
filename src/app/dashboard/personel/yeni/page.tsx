"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function PersonelYeniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    role: "Uzman",
    phone: "",
    email: "",
    commission_rate: "0",
    start_time: "09:00",
    end_time: "18:00",
    working_days: [1, 2, 3, 4, 5] as number[],
    preferred_language: "",
  });

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(d)
        ? f.working_days.filter((x) => x !== d)
        : [...f.working_days, d].sort(),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("İsim zorunlu");

    setLoading(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        commission_rate: (parseFloat(form.commission_rate) || 0) / 100,
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Personel eklendi");
      router.push("/dashboard/personel");
      router.refresh();
    } else {
      const e = await res.json();
      toast.error(e.error || "Hata oluştu");
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/personel" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Yeni Personel Ekle</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personel Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Ad Soyad *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Personel adı"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Unvan / Rol</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Uzman, Asistan..."
                />
              </div>
              <div className="space-y-1">
                <Label>Komisyon (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.commission_rate}
                  onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Telefon</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="05xx..."
                />
              </div>
              <div className="space-y-1">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="personel@..."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Tercih Edilen Dil</Label>
                <select
                  value={form.preferred_language}
                  onChange={(e) => setForm((f) => ({ ...f, preferred_language: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Belirtilmedi</option>
                  <option value="tr">🇹🇷 Türkçe</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="ar">🇸🇦 العربية</option>
                </select>
              </div>
            </div>

            {/* Working hours */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Çalışma Saatleri</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Başlangıç</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bitiş</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Working days */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Çalışma Günleri</Label>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i + 1)}
                    className={`flex-1 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                      form.working_days.includes(i + 1)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Personel Ekle
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
