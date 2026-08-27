"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";

/** Verilen dakika aralığında (15/30/60) 08:00-20:45 arası randevu slotları üretir. */
export function buildTimeSlots(stepMinutes: number): string[] {
  const step = [15, 30, 60].includes(stepMinutes) ? stepMinutes : 15;
  const slots: string[] = [];
  for (let totalMin = 8 * 60; totalMin < 21 * 60; totalMin += step) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

/** Yerel saatle "yyyy-MM-ddTHH:mm" üretir (UTC kayması yapmaz). */
export function toLocalDateTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Şimdiki zamanı bir sonraki randevu slotuna (stepMinutes) yuvarlar. */
export function nextSlot(dateStr?: string, stepMinutes = 15): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const now = new Date();
  // Bugünse şu andan sonraki slot; başka günse 09:00
  if (base.toDateString() === now.toDateString() || !dateStr) {
    const d = new Date(now);
    d.setMinutes(Math.ceil((d.getMinutes() + 1) / stepMinutes) * stepMinutes, 0, 0);
    if (d.getHours() < 8) d.setHours(9, 0, 0, 0);
    if (d.getHours() > 20) {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    }
    return toLocalDateTimeValue(d);
  }
  base.setHours(9, 0, 0, 0);
  return toLocalDateTimeValue(base);
}

interface Props {
  /** "yyyy-MM-ddTHH:mm" (yerel) */
  value: string;
  onChange: (value: string) => void;
  minDate?: string; // yyyy-MM-dd
  /** Randevu dilimi (dk) — Ayarlar > Randevu Dilimi Aralığı'ndan gelir. Varsayılan 15. */
  slotMinutes?: number;
}

/**
 * Tarih + saat slotu seçici (Ayarlar'daki randevu dilimine göre 15/30/60dk).
 * datetime-local yerine kullanılır: dakika dakika uğraştırmaz, net slotlar sunar.
 */
export function DateTimeSlotPicker({ value, onChange, minDate, slotMinutes = 15 }: Props) {
  const timeSlots = useMemo(() => buildTimeSlots(slotMinutes), [slotMinutes]);
  const datePart = value ? value.slice(0, 10) : "";
  const timePart = value ? value.slice(11, 16) : "";

  function setDate(d: string) {
    if (!d) return;
    onChange(`${d}T${timePart || "09:00"}`);
  }

  function setTime(t: string) {
    if (!t) return;
    onChange(`${datePart || new Date().toISOString().slice(0, 10)}T${t}`);
  }

  // Dar ekranda yan yana sıkışıp üst üste binmesin diye alt alta,
  // ≥400px genişlikte yan yana dizilir. min-w-0: native date input'un
  // içsel genişliği grid hücresini taşırmasın.
  return (
    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
      <Input
        type="date"
        value={datePart}
        min={minDate}
        onChange={(e) => setDate(e.target.value)}
        className="w-full min-w-0"
        required
      />
      <Select value={timePart || undefined} onValueChange={(v) => v && setTime(v)}>
        <SelectTrigger className="w-full min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Saat" />
          </span>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {timeSlots.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
