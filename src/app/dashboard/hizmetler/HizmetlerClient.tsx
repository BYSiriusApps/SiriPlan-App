"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { resizeImageFile } from "@/lib/image-resize";
import {
  Scissors, Clock, Star, Pencil, Loader2, Trash2, Users, ChevronRight,
  ArrowUp, ArrowDown, ImagePlus, X, Check,
} from "lucide-react";
import { toast } from "sonner";
import type { Service, ServiceCategory, Staff } from "@/types/database";
import { CURRENCIES, formatServicePrice } from "@/lib/currency";

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

const NO_CATEGORY = "__none__";

interface Props {
  initialServices: Service[];
  initialCategories: ServiceCategory[];
  canEdit: boolean;
  orgId: string;
}

export function HizmetlerClient({ initialServices, initialCategories, canEdit, orgId }: Props) {
  const t = useTranslations("dashboard");
  const [services, setServices] = useState<Service[]>(initialServices);
  const [categories] = useState<ServiceCategory[]>(initialCategories);
  const [detailTarget, setDetailTarget] = useState<Service | null>(null);
  const [detailStaff, setDetailStaff] = useState<Staff[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [editingStaff, setEditingStaff] = useState(false);
  const [staffSelection, setStaffSelection] = useState<Set<string>>(new Set());
  const [savingStaff, setSavingStaff] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    name: "", price: "", currency: "TRY", duration_minutes: "",
    is_bookable_online: true, category_id: NO_CATEGORY,
  });

  useEffect(() => {
    if (!canEdit) return;
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAllStaff(d?.staff || []))
      .catch(() => {});
  }, [canEdit]);

  async function openDetail(svc: Service) {
    setDetailTarget(svc);
    setEditing(false);
    setEditingStaff(false);
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
    setEditingStaff(false);
    setConfirmDelete(false);
  }

  function startEditStaff() {
    setStaffSelection(new Set(detailStaff.map((s) => s.id)));
    setEditingStaff(true);
  }

  function toggleStaffSelection(staffId: string) {
    setStaffSelection((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  }

  async function handleSaveStaff() {
    if (!detailTarget) return;
    setSavingStaff(true);
    const res = await fetch(`/api/services/${detailTarget.id}/staff`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_ids: Array.from(staffSelection) }),
    });
    setSavingStaff(false);
    if (res.ok) {
      setDetailStaff(allStaff.filter((s) => staffSelection.has(s.id)));
      setEditingStaff(false);
      toast.success("Personel ataması güncellendi");
    } else {
      const d = await res.json().catch(() => null);
      toast.error(d?.error || "Güncellenemedi");
    }
  }

  function startEdit() {
    if (!detailTarget) return;
    setEditForm({
      name: detailTarget.name,
      price: detailTarget.price !== null ? String(detailTarget.price) : "",
      currency: detailTarget.currency ?? "TRY",
      duration_minutes: detailTarget.duration_minutes !== null ? String(detailTarget.duration_minutes) : "",
      is_bookable_online: detailTarget.is_bookable_online,
      category_id: detailTarget.category_id ?? NO_CATEGORY,
    });
    setEditing(true);
    setConfirmDelete(false);
  }

  async function handleSave() {
    if (!detailTarget) return;
    if (editForm.is_bookable_online && (!editForm.price.trim() || !editForm.duration_minutes.trim())) {
      toast.error(t("servicesPage.onlineRequiresPriceDuration"));
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/services/${detailTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        price: editForm.price.trim() ? parseFloat(editForm.price) : null,
        currency: editForm.currency,
        duration_minutes: editForm.duration_minutes.trim() ? parseInt(editForm.duration_minutes) : null,
        is_bookable_online: editForm.is_bookable_online,
        category_id: editForm.category_id === NO_CATEGORY ? null : editForm.category_id,
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !detailTarget) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir resim dosyası seçin");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Dosya boyutu 3MB'dan küçük olmalı");
      return;
    }
    setUploadingPhoto(true);
    const resized = await resizeImageFile(file);
    const supabase = createClient();
    const ext = resized.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${orgId}/services/${detailTarget.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("service-photos")
      .upload(path, resized, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast.error("Yükleme başarısız: " + upErr.message);
      setUploadingPhoto(false);
      return;
    }
    const { data: pub } = supabase.storage.from("service-photos").getPublicUrl(path);
    const photo_url = `${pub.publicUrl}?t=${Date.now()}`;
    const res = await fetch(`/api/services/${detailTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url }),
    });
    setUploadingPhoto(false);
    if (res.ok) {
      const { service } = await res.json();
      setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
      setDetailTarget(service);
      toast.success("Fotoğraf güncellendi");
    } else {
      toast.error("Kaydedilemedi");
    }
  }

  async function handlePhotoRemove() {
    if (!detailTarget) return;
    setUploadingPhoto(true);
    const res = await fetch(`/api/services/${detailTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url: null }),
    });
    setUploadingPhoto(false);
    if (res.ok) {
      const { service } = await res.json();
      setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
      setDetailTarget(service);
    }
  }

  async function moveService(svc: Service, direction: "up" | "down", siblings: Service[]) {
    setMovingId(svc.id);
    const res = await fetch(`/api/services/${svc.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setMovingId(null);
    if (!res.ok) {
      toast.error("Sıralama değiştirilemedi");
      return;
    }
    const idx = siblings.findIndex((s) => s.id === svc.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const target = siblings[targetIdx];
    setServices((prev) => prev.map((s) => {
      if (s.id === svc.id) return { ...s, display_order: target.display_order };
      if (s.id === target.id) return { ...s, display_order: svc.display_order };
      return s;
    }));
  }

  const categorySorted = [...categories].sort((a, b) => a.display_order - b.display_order);
  const categorizedGroups = categorySorted
    .map((cat) => ({
      key: cat.id,
      label: cat.name,
      services: services.filter((s) => s.category_id === cat.id).sort((a, b) => a.display_order - b.display_order),
    }))
    .filter((g) => g.services.length > 0);

  const uncategorized = services.filter((s) => !s.category_id);
  const legacyTags = [...new Set(uncategorized.map((s) => s.category_tag))];
  const legacyGroups = legacyTags.map((tag) => ({
    key: tag,
    label: tag,
    services: uncategorized.filter((s) => s.category_tag === tag).sort((a, b) => a.display_order - b.display_order),
  }));

  const groups = [...categorizedGroups, ...legacyGroups];

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

      {groups.map((group) => (
        <div key={group.key}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 capitalize">
            {group.label}
          </h2>
          <div className="space-y-2">
            {group.services.map((service, idx) => (
              <Card
                key={service.id}
                className="kpi-tile border-0 shadow-none group cursor-pointer"
                onClick={() => openDetail(service)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {service.photo_url ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 relative">
                        <Image src={service.photo_url} alt={service.name} fill sizes="40px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Scissors className="h-5 w-5 text-primary" />
                      </div>
                    )}
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
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        disabled={idx === 0 || movingId === service.id}
                        onClick={() => moveService(service, "up", group.services)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        disabled={idx === group.services.length - 1 || movingId === service.id}
                        onClick={() => moveService(service, "down", group.services)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">
                          {service.price !== null ? formatServicePrice(service.price, service.currency) : t("servicesPage.noPriceSet")}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration_minutes !== null ? `${service.duration_minutes}dk` : "—"}
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
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
                {/* Photo */}
                {canEdit && (
                  <div>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    {detailTarget.photo_url ? (
                      <div className="relative rounded-xl overflow-hidden h-32 w-full">
                        <Image src={detailTarget.photo_url} alt={detailTarget.name} fill className="object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                            {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={handlePhotoRemove} disabled={uploadingPhoto}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline" className="w-full gap-2 h-16 border-dashed"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        {t("servicesPage.addPhotoButton")}
                      </Button>
                    )}
                  </div>
                )}

                {/* Price & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {detailTarget.price !== null ? formatServicePrice(detailTarget.price, detailTarget.currency) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("servicesPage.detailPriceLabel")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {detailTarget.duration_minutes !== null ? (
                        <>
                          {detailTarget.duration_minutes}
                          <span className="text-sm font-normal text-muted-foreground">dk</span>
                        </>
                      ) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("servicesPage.detailDurationLabel")}</p>
                  </div>
                </div>

                {detailTarget.description && (
                  <p className="text-sm text-muted-foreground">{detailTarget.description}</p>
                )}

                {/* Staff list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {t("servicesPage.staffListTitle")}
                    </p>
                    {canEdit && !editingStaff && !loadingDetail && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={startEditStaff}>
                        <Pencil className="h-3 w-3" /> Düzenle
                      </Button>
                    )}
                  </div>
                  {loadingDetail ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yükleniyor…
                    </div>
                  ) : editingStaff ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Hiçbiri seçilmezse tüm aktif personel bu hizmeti verebilir kabul edilir (kısıtlama yok).
                      </p>
                      {allStaff.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-1">Kayıtlı personel yok.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                          {allStaff.map((s) => {
                            const checked = staffSelection.has(s.id);
                            return (
                              <label
                                key={s.id}
                                className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleStaffSelection(s.id)}
                                  className="rounded text-primary"
                                />
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary text-xs shrink-0">
                                  {s.full_name[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{s.full_name}</p>
                                  {s.role && <p className="text-xs text-muted-foreground truncate">{s.role}</p>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setEditingStaff(false)} disabled={savingStaff}>
                          {t("servicesPage.cancelButton")}
                        </Button>
                        <Button className="flex-1 gap-1.5" onClick={handleSaveStaff} disabled={savingStaff}>
                          {savingStaff ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          {t("servicesPage.saveButton")}
                        </Button>
                      </div>
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
                        {categories.length > 0 && (
                          <div>
                            <Label>{t("servicesPage.categoryLabel")}</Label>
                            <Select value={editForm.category_id} onValueChange={(v) => v && setEditForm((f) => ({ ...f, category_id: v }))}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_CATEGORY}>{t("servicesPage.noCategory")}</SelectItem>
                                {categorySorted.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Fiyat</Label>
                            <div className="flex gap-1.5 mt-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={t("servicesPage.priceOptionalPlaceholder")}
                                value={editForm.price}
                                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                              />
                              <Select value={editForm.currency} onValueChange={(v) => v && setEditForm((f) => ({ ...f, currency: v }))}>
                                <SelectTrigger className="w-[86px] shrink-0"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CURRENCIES.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Süre (dk)</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              min="5"
                              step="5"
                              placeholder={t("servicesPage.durationOptionalPlaceholder")}
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
                        {!editForm.is_bookable_online && (
                          <p className="text-xs text-muted-foreground">{t("servicesPage.priceOptionalHint")}</p>
                        )}
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
