"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Lock, Send, MessageSquareText, MessageCircle } from "lucide-react";
import type { Appointment } from "@/types/database";
import { renderWaTemplate, waMessageLink } from "@/lib/wa-template";

interface ApptActionsProps {
  appt: Appointment;
  viewerRole: string;
  viewerStaffId: string | null;
}

export default function ApptActions({ appt, viewerRole, viewerStaffId }: ApptActionsProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const ta = useTranslations("dashboard.apptActions");
  const [loading, setLoading] = useState<string | null>(null);
  const [tip, setTip] = useState("");
  const [extraIncome, setExtraIncome] = useState("");
  const [payMethod, setPayMethod] = useState("nakit");
  const [internalNote, setInternalNote] = useState(appt.internal_note || "");
  const [orgName, setOrgName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgLocationUrl, setOrgLocationUrl] = useState("");
  const [waTemplate, setWaTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((d) => {
        setOrgName(d.org?.name ?? "");
        setOrgAddress(d.org?.address ?? "");
        setOrgLocationUrl(d.org?.location_url ?? "");
        const s = (d.org?.settings_json ?? {}) as Record<string, unknown>;
        setWaTemplate(typeof s.wa_appointment_template === "string" ? s.wa_appointment_template : null);
      })
      .catch(() => {});
  }, []);

  const isDone = appt.status === "tamamlandi" || appt.status === "iptal" || appt.status === "gelmedi";
  const canAct = viewerRole !== "staff" || appt.staff_id === viewerStaffId;

  function openManualWaMessage() {
    const text = renderWaTemplate(waTemplate, {
      musteri: appt.customer_name,
      salon: orgName || "Salonumuz",
      appointmentAt: appt.appointment_at,
      hizmet: appt.service?.name,
      personel: appt.staff?.full_name,
      address: orgAddress,
      locationUrl: orgLocationUrl,
    });
    window.open(waMessageLink(appt.customer_phone, text), "_blank", "noopener,noreferrer");
  }

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
      toast.error(e.error || ta("genericError"));
    }
  }

  async function handleComplete() {
    setLoading("complete");
    const res = await fetch(`/api/appointments/${appt.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tip: parseFloat(tip) || 0,
        payment_method: payMethod,
        extra_income: parseFloat(extraIncome) || 0,
      }),
    });
    setLoading(null);
    if (res.ok) {
      toast.success(ta("toastCompleted"));
      router.refresh();
    } else {
      const e = await res.json();
      toast.error(e.error || ta("genericError"));
    }
  }

  async function saveNote() {
    await patch({ internal_note: internalNote }, "note", ta("toastNoteSaved"));
  }

  async function sendNotify(purpose: "onay" | "hatirlatma" | "iptal", actionKey: string, successMsg: string) {
    setLoading(actionKey);
    const res = await fetch(`/api/appointments/${appt.id}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(null);
    if (res.ok && body.sent) {
      toast.success(successMsg);
    } else if (res.ok && body.skipped) {
      toast.error(ta("waNotConnected"));
    } else {
      toast.error(body.error || ta("sendFailed"));
    }
  }

  async function sendSms(purpose: "onay" | "hatirlatma" | "iptal", actionKey: string, successMsg: string) {
    setLoading(actionKey);
    const res = await fetch(`/api/appointments/${appt.id}/notify-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(null);
    if (res.ok && body.sent) {
      toast.success(successMsg);
    } else if (res.ok && body.skipped) {
      toast.error(ta("smsNotConnected"));
    } else {
      toast.error(body.error || ta("smsSendFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {/* Internal note */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{ta("internalNoteTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="w-full text-sm border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] bg-background"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder={ta("internalNotePlaceholder")}
            disabled={isDone}
          />
          {!isDone && (
            <Button size="sm" variant="outline" onClick={saveNote} disabled={loading === "note"}>
              {loading === "note" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {ta("saveNote")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {!isDone && !canAct && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            {ta("lockedMessage")}
          </CardContent>
        </Card>
      )}

      {!isDone && canAct && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{ta("actionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appt.status === "talep" && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => patch({ status: "onaylandi" }, "approve", ta("toastApproved"))}
                disabled={!!loading}
              >
                {loading === "approve" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("approve")}
              </Button>
            )}

            {/* Complete form */}
            {(appt.status === "talep" || appt.status === "onaylandi") && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">{ta("completeSectionTitle")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{ta("tipLabel")}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={tip}
                      onChange={(e) => setTip(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{ta("paymentMethodLabel")}</Label>
                    <Select value={payMethod} onValueChange={(v) => v && setPayMethod(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nakit">{ta("paymentCash")}</SelectItem>
                        <SelectItem value="kart">{ta("paymentCard")}</SelectItem>
                        <SelectItem value="havale">{ta("paymentTransfer")}</SelectItem>
                        <SelectItem value="diger">{ta("paymentOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{ta("extraIncomeLabel")}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={extraIncome}
                    onChange={(e) => setExtraIncome(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {ta("extraIncomeHint")}
                  </p>
                </div>
                <Button className="w-full" onClick={handleComplete} disabled={!!loading}>
                  {loading === "complete" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {ta("markCompletedBtn")}
                </Button>
              </div>
            )}

            {/* No-show + Cancel */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => patch({ status: "gelmedi" }, "noshow", ta("toastNoShow"))}
                disabled={!!loading}
              >
                {loading === "noshow" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                {t("noShow")}
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => patch({ status: "iptal" }, "cancel", ta("toastCancelled"))}
                disabled={!!loading}
              >
                {loading === "cancel" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                {t("cancelAction")}
              </Button>
            </div>

            {/* Manuel WhatsApp mesajı — Meta'ya bağlı değil, kendi WhatsApp'ınızdan gönderilir */}
            {appt.customer_phone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openManualWaMessage}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                {ta("sendManualWaMessage")}
              </Button>
            )}

            {/* Manuel WhatsApp bildirimleri */}
            {appt.status === "onaylandi" && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => sendNotify("onay", "notify-confirm", ta("toastConfirmResent"))}
                  disabled={!!loading}
                >
                  {loading === "notify-confirm" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  {ta("resendConfirm")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => sendNotify("hatirlatma", "notify-reminder", ta("toastReminderSent"))}
                  disabled={!!loading}
                >
                  {loading === "notify-reminder" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  {ta("sendReminderNow")}
                </Button>
              </div>
            )}

            {/* Manuel SMS bildirimleri */}
            {appt.status === "onaylandi" && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => sendSms("onay", "sms-confirm", ta("toastConfirmSmsSent"))}
                  disabled={!!loading}
                >
                  {loading === "sms-confirm" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MessageSquareText className="h-3.5 w-3.5 mr-1" />}
                  {ta("sendConfirmSms")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => sendSms("hatirlatma", "sms-reminder", ta("toastReminderSmsSent"))}
                  disabled={!!loading}
                >
                  {loading === "sms-reminder" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MessageSquareText className="h-3.5 w-3.5 mr-1" />}
                  {ta("sendReminderSms")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {appt.status === "iptal" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => sendNotify("iptal", "notify-cancel", ta("toastCancelNoticeResent"))}
              disabled={!!loading}
            >
              {loading === "notify-cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              {ta("resendCancelNotice")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => sendSms("iptal", "sms-cancel", ta("toastCancelSmsSent"))}
              disabled={!!loading}
            >
              {loading === "sms-cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MessageSquareText className="h-3.5 w-3.5 mr-1" />}
              {ta("sendCancelSms")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
