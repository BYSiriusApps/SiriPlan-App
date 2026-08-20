"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Phone, Star, Calendar, Megaphone, MegaphoneOff, MessageCircle, Search, X, ArrowDownWideNarrow, ArrowUpNarrowWide, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/types/database";
import { maskPhone } from "@/lib/phone";

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function scoreEmoji(score: number) {
  if (score >= 70) return "🟢";
  if (score >= 40) return "🟡";
  return "🔴";
}

const SORTS = [
  { value: "last_visit" },
  { value: "name" },
  { value: "score" },
  { value: "spend" },
  { value: "visits" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

/** Yön düğmesinin metni sıralama türüne göre değişir — "A → Z" ile "Yeniden eskiye" aynı şey değil. */
function directionLabel(t: ReturnType<typeof useTranslations>, sortBy: SortValue, asc: boolean): string {
  if (sortBy === "name") return asc ? t("customerList.direction.nameAsc") : t("customerList.direction.nameDesc");
  if (sortBy === "last_visit") return asc ? t("customerList.direction.lastVisitAsc") : t("customerList.direction.lastVisitDesc");
  return asc ? t("customerList.direction.defaultAsc") : t("customerList.direction.defaultDesc");
}

interface Props {
  customers: Customer[];
  showPhoneButtons: boolean;
  initialKampanya?: boolean;
  /** Silme butonu — yalnızca sahip / `delete_customers` izni olan üyeler için. */
  canDelete?: boolean;
}

/**
 * Müşteri listesi — arama kutusuna yazdıkça (akıllı klavye gibi) anında
 * filtreler; sunucuya gitmez. Filtre temizleme (X) butonu vardır.
 */
export function CustomerList({ customers, showPhoneButtons, initialKampanya = false, canDelete = false }: Props) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("last_visit");
  // false = azalan (en yeni/en yüksek üstte) — listenin bugüne kadarki davranışı.
  const [asc, setAsc] = useState(false);
  const [kampanyaOnly, setKampanyaOnly] = useState(initialKampanya);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Silinen kartlar router.refresh() tamamlanana kadar listede kalmasın.
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);

    if (!res.ok) {
      toast.error(data.error ?? "Müşteri silinemedi");
      return;
    }

    setRemovedIds((prev) => [...prev, deleteTarget.id]);
    setDeleteTarget(null);
    toast.success(
      data.mode === "anonymized"
        ? "Müşterinin kişisel bilgileri silindi. Randevu ve ciro geçmişi raporlar için anonim olarak korundu."
        : "Müşteri silindi"
    );
    router.refresh();
  }

  function changeSort(value: SortValue) {
    setSortBy(value);
    // İsim seçilince beklenen yön A→Z, diğerlerinde "en yeni / en çok" üstte.
    setAsc(value === "name");
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    let list = removedIds.length ? customers.filter((c) => !removedIds.includes(c.id)) : customers;
    if (needle) {
      list = list.filter(
        (c) =>
          c.full_name.toLocaleLowerCase("tr").includes(needle) ||
          // Numara maskeliyken telefonla aramayı da kapat: aksi halde maskeleme
          // delinirdi — rakam ekleyip "listede kaldı mı" diye bakarak gizlenen
          // haneler tek tek çözülebilirdi.
          (showPhoneButtons &&
          (c.phone ?? "").replace(/\D/g, "").includes(needle.replace(/\D/g, "") || " ")
          )
      );
    }
    if (kampanyaOnly) list = list.filter((c) => c.marketing_consent);

    // dir = 1 artan, -1 azalan. Karşılaştırmalar tek yerde artan olarak yazılıp
    // yönle çarpılıyor; her sıralama için iki ayrı dal tutmak hataya açıktı.
    const dir = asc ? 1 : -1;
    return [...list].sort((a, b) => {
      // Türkçe alfabe: "Çiğdem" ile "Cansu" düz karşılaştırmada yanlış sıralanır.
      if (sortBy === "name") return dir * a.full_name.localeCompare(b.full_name, "tr");
      if (sortBy === "score") return dir * (a.score - b.score);
      if (sortBy === "spend") return dir * (Number(a.total_spend) - Number(b.total_spend));
      if (sortBy === "visits") return dir * (a.visit_count - b.visit_count);
      const at = a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0;
      const bt = b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0;
      return dir * (at - bt);
    });
  }, [customers, q, sortBy, asc, kampanyaOnly, showPhoneButtons, removedIds]);

  const hasFilter = q.trim() !== "" || kampanyaOnly;
  const onayliSayisi = customers.filter((c) => c.marketing_consent).length;

  return (
    <>
      {/* Arama + sıralama + filtre temizleme */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("customerList.searchPlaceholder")}
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              title={t("customerList.clearSearch")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap items-center">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => changeSort(s.value)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                sortBy === s.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent"
              )}
            >
              {t(`customerList.sort.${s.value === "last_visit" ? "lastVisit" : s.value === "name" ? "name" : s.value === "score" ? "score" : s.value === "spend" ? "spend" : "visits"}`)}
            </button>
          ))}
          <button
            onClick={() => setAsc((v) => !v)}
            title={t("customerList.toggleSort")}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-colors flex items-center gap-1.5"
          >
            {asc ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />}
            {directionLabel(t, sortBy, asc)}
          </button>
          <button
            onClick={() => setKampanyaOnly((v) => !v)}
            title={t("customerList.marketingOnly")}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5",
              kampanyaOnly ? "bg-green-600 text-white border-green-600" : "border-border hover:bg-accent"
            )}
          >
            <Megaphone className="h-3.5 w-3.5" />
            {t("customerList.marketingOnly")}
          </button>
          {hasFilter && (
            <button
              onClick={() => { setQ(""); setKampanyaOnly(false); }}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              {t("customerList.clearFilters")}
            </button>
          )}
        </div>
      </div>

      {/* Sonuç bilgisi */}
      <p className="text-xs text-muted-foreground -mt-2">
        {hasFilter
          ? t("customerList.resultCountWithFilter", { count: filtered.length, total: customers.length })
          : t("customerList.resultCount", { count: filtered.length })}
        {onayliSayisi > 0 && !hasFilter && (
          <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
            · {t("customerList.marketingApproved", { count: onayliSayisi })}
          </span>
        )}
      </p>

      {/* Müşteri kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{hasFilter ? t("customerList.noResults") : t("customerList.noCustomers")}</p>
            {hasFilter && (
              <button
                onClick={() => { setQ(""); setKampanyaOnly(false); }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                {t("customerList.clearFilters")}
              </button>
            )}
          </div>
        ) : (
          filtered.map((cust) => {
            const waPhone = (cust.phone ?? "").replace(/\D/g, "").replace(/^0/, "90");
            return (
              <Card key={cust.id} className="kpi-tile border-0 shadow-none transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Link href={`/dashboard/musteriler/${cust.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/25 to-accent/40 flex items-center justify-center font-heading font-semibold text-primary shrink-0 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                        {cust.full_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{cust.full_name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          {/* showPhoneButtons=false → bu kullanıcı "personel"
                              rolünde ve Ayarlar'da telefon erişimi kapatılmış.
                              Numarayı maskelemezsek ayar yalnızca arama
                              butonlarını gizlemiş, numarayı yine göstermiş
                              olurdu (bkz. lib/phone.ts maskPhone). */}
                          <span className="truncate">
                            {showPhoneButtons ? cust.phone : maskPhone(cust.phone)}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                      {(showPhoneButtons || canDelete) && (
                        <div className="flex items-center gap-1">
                          {showPhoneButtons && (
                            <>
                              <a href={`tel:${cust.phone}`} title={t("customerList.call")}
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors">
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                              <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" title={t("customerList.whatsapp")}
                                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-colors">
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title={t("customerList.deleteCustomer")}
                              aria-label={t("customerList.deleteCustomerAria", { name: cust.full_name })}
                              onClick={() => setDeleteTarget(cust)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground/50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {cust.marketing_consent ? (
                          <span title={t("customerList.marketingAcceptedTitle")}>
                            <Megaphone className="h-3.5 w-3.5 text-green-500" />
                          </span>
                        ) : (
                          <span title={t("customerList.marketingMissingTitle")}>
                            <MegaphoneOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </span>
                        )}
                        <Badge variant="outline" className={cn("text-xs", scoreColor(cust.score))}>
                          {scoreEmoji(cust.score)} {cust.score}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border/60">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("customerList.visit")}</p>
                      <p className="font-semibold text-sm tabular-nums">{cust.visit_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("customerList.spend")}</p>
                      <p className="font-semibold text-sm tabular-nums">₺{Number(cust.total_spend).toLocaleString("tr-TR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("customerList.score")}</p>
                      <p className="font-semibold text-sm flex items-center justify-center gap-0.5 tabular-nums">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {cust.loyalty_punches}
                      </p>
                    </div>
                  </div>

                  {cust.last_visit_at && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("customerList.lastVisit", { date: format(new Date(cust.last_visit_at), "d MMM yyyy", { locale: tr }) })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              {t("customerList.deleteDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t.rich("customerList.deleteDialogDescription", {
                name: deleteTarget?.full_name ?? "",
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            {t("customerList.deleteDialogHint")}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("customerList.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("customerList.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
