"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import type { Appointment } from "@/types/database";

export default function ApptActions({ appt }: { appt: Appointment }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [tip, setTip] = useState("");
  const [payMethod, setPayMethod] = useState("nakit");
  const [internalNote, setInternalNote] = useState(appt.internal_note || "");

  const isDone = appt.status === "tamamlandi" || appt.status === "iptal" || appt.status === "gelmedi";

  async function patch(updates: Record<string, unknown>, actionKey: string, successMsg: string) {
    setLoading(actionKey);
    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setLoading(null);
    if (res.ok) {
      toast.success(successMsg);
      router.refresh();
    } else {
      const e = await res.json();
      toast.error(e.error || "Hata oluştu");
    }
  }

  async function handleComplete() {
    setLoading("complete");
    const res = await fetch(`/api/appointments/${appt.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tip: parseFloat(tip) || 0, payment_method: payMethod }),
    });
    setLoading(null);
    if (res.ok) {
      toast.success("Randevu tamamlandı ✓");
      router.refresh();
    } else {
      const e = await res.json();
      toast.error(e.error || "Hata oluştu");
    }
  }

  async function saveNote() {
    await patch({ internal_note: internalNote }, "note", "Not kaydedildi");
  }

  return (
    <div className="space-y-4">
      {/* Internal note */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dahili Not</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="w-full text-sm border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] bg-background"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Personel için dahili not..."
            disabled={isDone}
          />
          {!isDone && (
            <Button size="sm" variant="outline" onClick={saveNote} disabled={loading === "note"}>
              {loading === "note" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Notu Kaydet
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {!isDone && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">İşlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appt.status === "talep" && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => patch({ status: "onaylandi" }, "approve", "Randevu onaylandı")}
                disabled={!!loading}
              >
                {loading === "approve" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Onayla
              </Button>
            )}

            {/* Complete form */}
            {(appt.status === "talep" || appt.status === "onaylandi") && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">Tamamla</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Bahşiş (₺)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={tip}
                      onChange={(e) => setTip(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ödeme Yöntemi</Label>
                    <Select value={payMethod} onValueChange={(v) => v && setPayMethod(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nakit">Nakit</SelectItem>
                        <SelectItem value="kart">Kart</SelectItem>
                        <SelectItem value="havale">Havale</SelectItem>
                        <SelectItem value="diger">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={handleComplete} disabled={!!loading}>
                  {loading === "complete" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Tamamlandı Olarak İşaretle
                </Button>
              </div>
            )}

            {/* No-show + Cancel */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => patch({ status: "gelmedi" }, "noshow", "No-show olarak işaretlendi")}
                disabled={!!loading}
              >
                {loading === "noshow" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                Gelmedi
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => patch({ status: "iptal" }, "cancel", "Randevu iptal edildi")}
                disabled={!!loading}
              >
                {loading === "cancel" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                İptal Et
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
