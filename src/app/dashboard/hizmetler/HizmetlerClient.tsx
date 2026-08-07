"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { cn } from "@/lib/utils";
import { Scissors, Clock, Star, Pencil, Loader2, Trash2, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Service, Staff } from "@/types/database";

const CATEGORY_COLORS: Record<string, string> = {
  sac: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  cilt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  tirnak: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  kas: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  spa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  lazer: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  genel: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  diger: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
};

interface Props {
  initialServices: Service[];
  canEdit: boolean;
}

export function HizmetlerClient({ initialServices, canEdit }: Props) {
  const t = useTranslations("dashboard");
  const [services, setServices] = useState<Service[]>(initialServices);
  const [detailTarget, setDetailTarget] = useState<Service | null>(null);
  const [detailStaff, setDetailStaff] = useState<Staff[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", price: "", duration_minutes: "", is_bookable_online: true });

  async function openDetail(svc: Service) {
    setDetailTarget(svc);
    setEditing(false);
    setConfirmDelete(false);
    setDetailStaff([]);
    setLoadingDetail(true);
    const res = await fetch(`/api/services/${svc.id}`);
    if (res.ok) {
      const data = await res.json();
      setDetailStaff(data.staff || []);
    }
    setLoadingDetail(false);
  }

  function closeDetail() {
    setDetailTarget(null);
    setEditing(false);
    setConfirmDelete(false);
  }

  function startEdit() {
    if (!detailTarget) return;
    setEditForm({
      name: detailTarget.name,
      price: String(detailTarget.price),
      duration_minutes: String(detailTarget.duration_minutes),
      is_bookable_online: detailTarget.is_bookable_online,
    });
    setEditing(true);
    setConfirmDelete(false);
  }

  async function handleSave() {
    if (!detailTarget) return;
    setSaving(true);
    const res = await fetch(`/api/services/${detailTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        price: parseFloat(editForm.price) || 0,
        duration_minutes: parseInt(editForm.duration_minutes) || detailTarget.duration_minutes,
        is_bookable_online: editForm.is_bookable_online,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { service } = await res.json();
      setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
      setDetailTarget(service);
      setEditing(false);
      toast.success("Hizmet güncellendi");
    } else {
      const d = await res.json();
      toast.error(d.error || "Güncellenemedi");
    }
  }

  async function handleDelete() {
    if (!detailTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/services/${detailTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setServices((prev) => prev.filter((s) => s.id !== detailTarget.id));
      closeDetail();
      toast.success("Hizmet kaldırıldı");
    } else {
      toast.error("Hizmet kaldırılamadı");
    }
  }

  const categories = [...new Set(services.map((s) => s.category_tag))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">{t("servicesPage.eyebrow")}</span>
              <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("services")}</h1>
            </div>
            <HomeButton />
          </div>
          <p className="text-muted-foreground text-sm mt-1">{services.length} hizmet</p>
        </div>
        <Link
          href="/dashboard/hizmetler/yeni"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t("servicesPage.addButton")}
        </Link>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 capitalize">
            {cat}
          </h2>
          <div className="space-y-2">
            {services
              .filter((s) => s.category_tag === cat)
              .map((service) => (
                <Card
                  key={service.id}
                  className="kpi-tile border-0 shadow-none group cursor-pointer"
                  onClick={() => openDetail(service)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Scissors className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{service.name}</p>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", CATEGORY_COLORS[service.category_tag] || CATEGORY_COLORS.genel)}
                          >
                            {service.category_tag}
                          </Badge>
                          {!service.is_active && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {t("servicesPage.inactiveBadge")}
                            </Badge>
                          )}
                          {!service.is_bookable_online && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {t("servicesPage.hiddenOnlineBadge")}
                            </Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm">₺{Number(service.price).toLocaleString("tr-TR")}</p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes}dk
                          </p>
                          {service.contributes_loyalty && (
                            <p className="text-[10px] text-amber-600 flex items-center justify-end gap-0.5">
                              <Star className="h-3 w-3 fill-amber-500" />{t("servicesPage.loyaltyPointsHint")}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Scissors className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t("servicesPage.emptyText")}</p>
        </div>
      )}

      {/* Detail / Edit Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={(o) => { if (!o) closeDetail(); }}>
        <DialogContent className="max-w-md">
          {detailTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {detailTarget.name}
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-normal", CATEGORY_COLORS[detailTarget.category_tag] || CATEGORY_COLORS.genel)}
                  >
                    {detailTarget.category_tag}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {/* Price & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      ₺{Number(detailTarget.price).toLocaleString("tr-TR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("servicesPage.detailPriceLabel")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {detailTarget.duration_minutes}
                      <span className="text-sm font-normal text-muted-foreground">dk</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("servicesPage.detailDurationLabel")}</p>
                  </div>
                </div>

                {detailTarget.description && (
                  <p className="text-sm text-muted-foreground">{detailTarget.description}</p>
                )}

                {/* Staff list */}
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Users className="h-4 w-4" />
                    {t("servicesPage.staffListTitle")}
                  </p>
                  {loadingDetail ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yükleniyor…
                    </div>
                  ) : detailStaff.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">
                      {t("servicesPage.noStaffAssigned")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailStaff.map((s) => (
                        <div key={s.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary text-sm shrink-0">
                            {s.full_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.full_name}</p>
                            {s.role && <p className="text-xs text-muted-foreground">{s.role}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit / Delete section */}
                {canEdit && (
                  <div className="border-t pt-4">
                    {editing ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold">{t("servicesPage.editServiceTitle")}</p>
                        <div>
                          <Label>Hizmet Adı</Label>
                          <Input
                            className="mt-1"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Fiyat (₺)</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              min="0"
                              step="0.01"
                              value={editForm.price}
                              onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Süre (dk)</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              min="5"
                              step="5"
                              value={editForm.duration_minutes}
                              onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.is_bookable_online}
                            onChange={(e) => setEditForm((f) => ({ ...f, is_bookable_online: e.target.checked }))}
                          />
                          Online randevu sayfasında göster
                        </label>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                            {t("servicesPage.cancelButton")}
                          </Button>
                          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("servicesPage.saveButton")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 gap-2" onClick={startEdit}>
                          <Pencil className="h-4 w-4" />
                          {t("servicesPage.editButton")}
                        </Button>
                        {confirmDelete ? (
                          <>
                            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
                              {t("servicesPage.noButton")}
                            </Button>
                            <Button
                              variant="destructive"
                              className="flex-1 gap-2"
                              onClick={handleDelete}
                              disabled={deleting}
                            >
                              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                              {t("servicesPage.confirmRemoveButton")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                            onClick={() => setConfirmDelete(true)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("servicesPage.removeButton")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
