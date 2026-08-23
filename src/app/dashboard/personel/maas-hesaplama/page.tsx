"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowLeft, Wallet, Loader2, CheckCircle2, Info } from "lucide-react";

type PayrollRow = {
  staff_id: string;
  full_name: string;
  base_salary: number;
  commission_rate: number;
  revenue: number;
  tip: number;
  commission_amount: number;
  total: number;
};

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const fmt = (n: number) => `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MaasHesaplamaPage() {
  const t = useTranslations("dashboard");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSavedIds(new Set());
    const res = await fetch(`/api/staff-payroll?year=${year}&month=${month}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows ?? []);
    } else {
      toast.error("Yüklenemedi");
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function recordAsExpense(row: PayrollRow) {
    if (row.total <= 0) return;
    setSavingId(row.staff_id);
    const lastDay = new Date(year, month, 0).getDate();
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "gider",
        category: "personel",
        amount: row.total,
        description: `${MONTHS[month - 1]} ${year} maaşı — ${row.full_name}`,
        note: `Taban ₺${row.base_salary.toLocaleString("tr-TR")} + Komisyon ₺${row.commission_amount.toLocaleString("tr-TR")} (%${Math.round(row.commission_rate * 100)}) + Bahşiş ₺${row.tip.toLocaleString("tr-TR")}`,
        date: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        payment_method: "havale",
      }),
    });
    setSavingId(null);
    if (res.ok) {
      toast.success(`${row.full_name} için gider kaydedildi`);
      setSavedIds((prev) => new Set(prev).add(row.staff_id));
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || "Kaydedilemedi");
    }
  }

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/personel" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("staffPage.salaryEyebrow")}</span>
          <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("staffPage.salaryTitle")}</h1>
        </div>
        <HomeButton />
      </div>

      <p className="text-sm text-muted-foreground flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        {t("staffPage.salarySubtitle")}
      </p>

      <div className="flex items-center gap-3">
        <Select value={String(month)} onValueChange={(v) => v && setMonth(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => v && setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{MONTHS[month - 1]} {year} Maaş Dökümü</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aktif personel bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Personel</th>
                    <th className="p-3 font-medium text-right">Taban</th>
                    <th className="p-3 font-medium text-right">Ciro</th>
                    <th className="p-3 font-medium text-right">Komisyon</th>
                    <th className="p-3 font-medium text-right">Bahşiş</th>
                    <th className="p-3 font-medium text-right">Toplam</th>
                    <th className="p-3 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {rows.map((r) => (
                    <tr key={r.staff_id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{r.full_name}</td>
                      <td className="p-3 text-right text-muted-foreground">{fmt(r.base_salary)}</td>
                      <td className="p-3 text-right text-muted-foreground">{fmt(r.revenue)}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {fmt(r.commission_amount)} <span className="text-[11px]">(%{Math.round(r.commission_rate * 100)})</span>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{fmt(r.tip)}</td>
                      <td className="p-3 text-right font-semibold text-primary">{fmt(r.total)}</td>
                      <td className="p-3 text-right">
                        {savedIds.has(r.staff_id) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Kaydedildi
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={r.total <= 0 || savingId === r.staff_id}
                            onClick={() => recordAsExpense(r)}
                          >
                            {savingId === r.staff_id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                            Gider Olarak Kaydet
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="p-3 font-semibold" colSpan={5}>Genel Toplam</td>
                    <td className="p-3 text-right font-bold tabular-nums">{fmt(grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
