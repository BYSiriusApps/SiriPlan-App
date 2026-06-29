"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search, X, Star, Clock, TrendingUp, Plus } from "lucide-react";
import type { Staff, Service } from "@/types/database";

const FAVORITES_KEY = "siriplan_fav_services";

function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}
function addFavorite(id: string) {
  const favs = getFavorites().filter((f) => f !== id);
  favs.unshift(id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs.slice(0, 10)));
}

interface SelectedService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export default function YeniRandevuPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    staff_id: "",
    appointment_at: "",
    note: "",
    source: "yuzyuze" as const,
  });

  // Multi-service state
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFavorites(getFavorites());
    Promise.all([
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/org").then((r) => r.json()),
    ])
      .then(([staffData, servicesData, orgData]) => {
        setStaff(staffData.staff || []);
        setServices(servicesData.services || []);
        setOrgId(orgData.org?.id || "");
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setDataLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const totalPrice = selectedServices.reduce((s, x) => s + x.price, 0);
  const totalDuration = selectedServices.reduce((s, x) => s + x.duration_minutes, 0);

  // Filtered services for dropdown
  const q = serviceSearch.toLowerCase();
  const notSelected = services.filter((s) => !selectedServices.find((x) => x.id === s.id));
  const filteredServices = q
    ? notSelected.filter((s) => s.name.toLowerCase().includes(q))
    : notSelected;

  // Sort: favorites first, then rest
  const favoriteServices = filteredServices.filter((s) => favorites.includes(s.id));
  const otherServices = filteredServices.filter((s) => !favorites.includes(s.id));
  const sortedServices = [...favoriteServices, ...otherServices];

  function selectService(svc: Service) {
    const item: SelectedService = {
      id: svc.id,
      name: svc.name,
      price: Number(svc.price),
      duration_minutes: svc.duration_minutes,
    };
    setSelectedServices((prev) => [...prev, item]);
    addFavorite(svc.id);
    setFavorites(getFavorites());
    setServiceSearch("");
    setShowServiceDropdown(false);
  }

  function removeService(id: string) {
    setSelectedServices((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id || selectedServices.length === 0 || !form.appointment_at) {
      return toast.error("Personel, en az bir hizmet ve tarih/saat zorunlu");
    }

    const [primaryService, ...extraServices] = selectedServices;

    setLoading(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        org_id: orgId,
        service_id: primaryService.id,
        extra_services_json: extraServices,
        // Total price and duration from all services
        total_price_override: totalPrice,
        total_duration_override: totalDuration,
      }),
    });
    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      toast.success("Randevu oluşturuldu");
      router.push(`/dashboard/randevular/${data.appointment.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata oluştu");
    }
  }

  const now = new Date();
  const minDate = now.toISOString().slice(0, 16);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/randevular" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Yeni Randevu</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Randevu Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer */}
              <div className="space-y-3 pb-3 border-b">
                <p className="text-sm font-medium text-muted-foreground">Müşteri Bilgileri</p>
                <div className="col-span-2 space-y-1">
                  <Label>Ad Soyad *</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                    placeholder="Müşteri adı"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Telefon *</Label>
                    <Input
                      type="tel"
                      value={form.customer_phone}
                      onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
                      placeholder="05xx..."
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>E-posta</Label>
                    <Input
                      type="email"
                      value={form.customer_email}
                      onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
                      placeholder="opsiyonel"
                    />
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Randevu Detayları</p>

                <div className="space-y-1">
                  <Label>Personel *</Label>
                  <Select value={form.staff_id} onValueChange={(v) => v && setForm((f) => ({ ...f, staff_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Personel seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Multi-service picker */}
                <div className="space-y-2">
                  <Label>Hizmetler *</Label>

                  {/* Selected services */}
                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-lg">
                      {selectedServices.map((svc) => (
                        <Badge key={svc.id} variant="secondary" className="text-xs gap-1 pr-1 py-1">
                          {svc.name}
                          <span className="text-muted-foreground">₺{svc.price.toLocaleString("tr-TR")}</span>
                          <button
                            type="button"
                            onClick={() => removeService(svc.id)}
                            className="ml-0.5 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  {selectedServices.length > 0 && (
                    <div className="flex gap-4 text-xs text-muted-foreground px-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Toplam: {totalDuration} dk
                      </span>
                      <span className="font-medium text-foreground">
                        ₺{totalPrice.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  )}

                  {/* Search + dropdown */}
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={selectedServices.length === 0 ? "Hizmet ara veya seç..." : "Başka hizmet ekle..."}
                        className="pl-9 pr-9"
                        value={serviceSearch}
                        onChange={(e) => {
                          setServiceSearch(e.target.value);
                          setShowServiceDropdown(true);
                        }}
                        onFocus={() => setShowServiceDropdown(true)}
                      />
                      {serviceSearch && (
                        <button
                          type="button"
                          onClick={() => setServiceSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {showServiceDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {sortedServices.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Hizmet bulunamadı</p>
                        ) : (
                          <>
                            {!serviceSearch && favoriteServices.length > 0 && (
                              <div className="px-3 pt-2 pb-1">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" /> Son Kullanılanlar
                                </p>
                              </div>
                            )}
                            {sortedServices.map((svc, idx) => {
                              const isFav = favorites.includes(svc.id);
                              const showDivider = !serviceSearch && isFav !== (sortedServices[idx - 1] ? favorites.includes(sortedServices[idx - 1].id) : isFav) && idx > 0;
                              return (
                                <div key={svc.id}>
                                  {showDivider && (
                                    <div className="px-3 pt-2 pb-1 border-t">
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Plus className="h-3 w-3" /> Tüm Hizmetler
                                      </p>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => selectService(svc)}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent text-sm transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      {isFav && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                                      <span className="text-left">{svc.name}</span>
                                    </span>
                                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                      {svc.duration_minutes}dk · ₺{Number(svc.price).toLocaleString("tr-TR")}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Tarih & Saat *</Label>
                  <Input
                    type="datetime-local"
                    min={minDate}
                    value={form.appointment_at}
                    onChange={(e) => setForm((f) => ({ ...f, appointment_at: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Kaynak</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as typeof form.source }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yuzyuze">Yüz yüze</SelectItem>
                      <SelectItem value="telefon">Telefon</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Not</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Opsiyonel not..."
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading || selectedServices.length === 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Randevu Oluştur
                {selectedServices.length > 0 && (
                  <span className="ml-2 opacity-80">· ₺{totalPrice.toLocaleString("tr-TR")}</span>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
