"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";

// 15 dakikalık randevu slotları: 08:00, 08:15, ... 20:45
export const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  for (const m of [0, 15, 30, 45]) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

/** Yerel saatle "yyyy-MM-ddTHH:mm" üretir (UTC kayması yapmaz). */
export function toLocalDateTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Şimdiki zamanı bir sonraki 15dk slotuna yuvarlar. */
export function nextSlot(dateStr?: string): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const now = new Date();
  // Bugünse şu andan sonraki slot; başka günse 09:00
  if (base.toDateString() === now.toDateString() || !dateStr) {
    const d = new Date(now);
    d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15, 0, 0);
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
}

/**
 * Tarih + 15 dakikalık saat slotu seçici.
 * datetime-local yerine kullanılır: dakika dakika uğraştırmaz,
 * 14:30 / 14:45 / 15:00 gibi net slotlar sunar.
 */
export function DateTimeSlotPicker({ value, onChange, minDate }: Props) {
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
          {TIME_SLOTS.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
